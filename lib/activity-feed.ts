import "server-only";
import { isCompanyNew } from "@/lib/company-freshness";
import { createClient } from "@/lib/supabase/server";
import { collapseConsecutiveSameCompanyUpdates } from "@/app/(hero)/recent-score-updates-utils";

type RawQuarterRow = {
  company_code: string;
  score: number;
  fy: number;
  qtr: number;
  quarter_label?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type RawGrowthRow = {
  company: string;
  fiscal_year?: string | number | null;
  growth_score?: string | number | null;
  run_timestamp?: string | null;
};

type RawBusinessSnapshotRow = {
  company: string;
  generated_at?: string | null;
  snapshot_phase?: number | null;
  snapshot_source?: string | null;
};

type RawKeyVariablesRow = {
  company_code: string;
  generated_at?: string | null;
  deep_treatment?: unknown;
};

type RawGuidanceRow = {
  company_code: string;
  guidance_key: string;
  generated_at?: string | null;
  guidance_type?: string | null;
  guidance_text?: string | null;
  status?: string | null;
  latest_view?: string | null;
  status_reason?: string | null;
};

export type UpdateType =
  | "quarter"
  | "growth"
  | "business_snapshot"
  | "key_variables"
  | "guidance_monitor";

export type GuidanceBatchThread = {
  guidanceKey: string;
  label: string;
  statusLabel: string | null;
  contextLabel: string | null;
};

export type UnifiedUpdate = {
  id: string;
  type: UpdateType;
  companyName: string;
  companyCode: string | null;
  companyIsNew: boolean;
  score: number | null;
  priorScore: number | null;
  detail: string;
  sourceLabel: string;
  contextLabel: string | null;
  atRaw: string | null;
  atMs: number;
  fy?: number;
  qtr?: number;
  guidanceThreads?: GuidanceBatchThread[];
  artifactHref: string | null;
};

export const UPDATE_TYPE_LABELS: Record<UpdateType, string> = {
  quarter: "Quarter Score",
  growth: "Growth Update",
  business_snapshot: "Biz Snapshot",
  key_variables: "Key Variables",
  guidance_monitor: "Guidance Monitor",
};

const parseDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseScore = (value: string | number | null | undefined) => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatActivityDate = (value: string | null) => {
  const date = parseDate(value);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

export const formatRelativeActivityTime = (value: string | null) => {
  const date = parseDate(value);
  if (!date) return "Date unavailable";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return formatActivityDate(value);
};

const ARTIFACT_ANCHOR: Record<UpdateType, string> = {
  quarter: "sentiment-score",
  growth: "future-growth",
  business_snapshot: "business-overview",
  key_variables: "key-variables",
  guidance_monitor: "guidance-history",
};

const buildArtifactHref = (type: UpdateType, companyCode: string | null) => {
  if (!companyCode) return null;
  return `/company/${companyCode}#${ARTIFACT_ANCHOR[type]}`;
};

const eventTimeMs = (value: string | null | undefined) =>
  parseDate(value)?.getTime() ?? 0;

const formatFeedLabel = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.replace(/\b\w/g, (char) => char.toUpperCase());
};

const parseJsonValue = (value: unknown): unknown => {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
};

const extractDeepTreatmentCount = (value: unknown) => {
  const parsed = parseJsonValue(value);
  if (Array.isArray(parsed)) return parsed.length;
  if (parsed && typeof parsed === "object") {
    const variables = (parsed as { variables?: unknown }).variables;
    if (Array.isArray(variables)) return variables.length;
  }
  return null;
};

export const typeChipClass = (type: UpdateType) => {
  if (type === "quarter") {
    return "bg-sky-100 border-sky-300 text-sky-700 dark:bg-sky-900/30 dark:border-sky-700/40 dark:text-sky-200";
  }
  if (type === "growth") {
    return "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700/40 dark:text-emerald-200";
  }
  if (type === "business_snapshot" || type === "key_variables") {
    return "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-900/30 dark:border-slate-700/40 dark:text-slate-200";
  }
  return "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700/40 dark:text-amber-200";
};

const GUIDANCE_STATUS_PRIORITY: Record<string, number> = {
  revised: 0,
  delayed: 1,
  active: 2,
  not_yet_clear: 3,
  met: 4,
  dropped: 5,
  unknown: 6,
};

const normalizeStatusKey = (value: string | null | undefined) =>
  value?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "unknown";

const guidanceStatusRank = (value: string | null | undefined) => {
  const normalized = normalizeStatusKey(value);
  return GUIDANCE_STATUS_PRIORITY[normalized] ?? GUIDANCE_STATUS_PRIORITY.unknown;
};

const buildGuidanceThreadLabel = (row: RawGuidanceRow) =>
  formatFeedLabel(row.guidance_type) || formatFeedLabel(row.guidance_text) || "Thread";

const buildGuidanceThreadContext = (row: RawGuidanceRow) =>
  formatFeedLabel(row.status) ||
  formatFeedLabel(row.latest_view) ||
  formatFeedLabel(row.status_reason) ||
  null;

const buildGuidanceBatchPreview = (threads: GuidanceBatchThread[]) => {
  if (threads.length === 0) return null;
  const visibleThreads = threads.slice(0, 2).map((thread) =>
    thread.statusLabel ? `${thread.label} · ${thread.statusLabel}` : thread.label,
  );
  const moreCount = threads.length - visibleThreads.length;
  if (moreCount > 0) {
    visibleThreads.push(`+${moreCount} more`);
  }
  return visibleThreads.join(" · ");
};

export type GetUnifiedUpdatesOptions = {
  limit: number;
  collapseSameCompanyRuns?: boolean;
};

export async function getUnifiedUpdates({
  limit,
  collapseSameCompanyRuns = true,
}: GetUnifiedUpdatesOptions): Promise<UnifiedUpdate[]> {
  const supabase = await createClient();
  const [{ data: quarterRows }, { data: growthRows }] =
    await Promise.all([
      supabase
        .from("concall_analysis")
        .select(
          "company_code,score,fy,qtr,quarter_label,updated_at,created_at",
        )
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("growth_outlook")
        .select("company,fiscal_year,growth_score,run_timestamp")
        .order("run_timestamp", { ascending: false })
        .limit(120),
    ]);

  const [
    { data: businessSnapshotRows },
    { data: keyVariablesRows },
    { data: guidanceRows },
  ] = await Promise.all([
    supabase
      .from("business_snapshot")
      .select("company, generated_at, snapshot_phase, snapshot_source")
      .order("generated_at", { ascending: false })
      .limit(160),
    supabase
      .from("key_variables_snapshot")
      .select("company_code, generated_at, deep_treatment")
      .order("generated_at", { ascending: false })
      .limit(160),
    supabase
      .from("guidance_tracking")
      .select(
        "id, company_code, guidance_key, generated_at, guidance_type, guidance_text, status, latest_view, status_reason",
      )
      .order("generated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(400),
  ]);

  const updates: UnifiedUpdate[] = [];
  const allQuarterRows = (quarterRows ?? []) as RawQuarterRow[];
  const quarterCandidatesPerCompany = new Map<string, UnifiedUpdate[]>();
  allQuarterRows.forEach((row) => {
    const atRaw = row.updated_at ?? row.created_at ?? null;
    const atMs = eventTimeMs(atRaw);
    const quarterLabel = row.quarter_label ?? `Q${row.qtr} FY${row.fy}`;
    const companyKey = row.company_code?.trim().toUpperCase();
    if (!companyKey) return;
    const candidate: UnifiedUpdate = {
      id: `quarter-${companyKey}`,
      type: "quarter",
      companyName: row.company_code,
      companyCode: row.company_code ?? null,
      companyIsNew: false,
      score: parseScore(row.score),
      priorScore: null,
      detail: quarterLabel,
      sourceLabel: "Quarter Score",
      contextLabel: null,
      atRaw,
      atMs,
      fy: typeof row.fy === "number" ? row.fy : undefined,
      qtr: typeof row.qtr === "number" ? row.qtr : undefined,
      artifactHref: buildArtifactHref("quarter", row.company_code ?? null),
    };
    const arr = quarterCandidatesPerCompany.get(companyKey) ?? [];
    arr.push(candidate);
    quarterCandidatesPerCompany.set(companyKey, arr);
  });
  quarterCandidatesPerCompany.forEach((arr) => {
    arr.sort((a, b) => {
      const fyDiff = (b.fy ?? -Infinity) - (a.fy ?? -Infinity);
      if (fyDiff !== 0) return fyDiff;
      const qtrDiff = (b.qtr ?? -Infinity) - (a.qtr ?? -Infinity);
      if (qtrDiff !== 0) return qtrDiff;
      return b.atMs - a.atMs;
    });
    const latest = arr[0];
    const prior = arr.find(
      (item) => item.fy !== latest.fy || item.qtr !== latest.qtr,
    );
    if (prior && prior.score != null) {
      latest.priorScore = prior.score;
    }
    updates.push(latest);
  });

  const growthCandidatesPerCompany = new Map<string, UnifiedUpdate[]>();
  ((growthRows ?? []) as RawGrowthRow[]).forEach((row) => {
    const key = row.company?.toUpperCase();
    if (!key) return;
    const companyCode = row.company ?? null;
    const companyName = row.company;
    const fy = row.fiscal_year != null ? String(row.fiscal_year) : null;
    const atRaw = row.run_timestamp ?? null;
    const atMs = eventTimeMs(atRaw);
    const candidate: UnifiedUpdate = {
      id: `growth-${key}`,
      type: "growth",
      companyName,
      companyCode,
      companyIsNew: false,
      score: parseScore(row.growth_score),
      priorScore: null,
      detail: fy ? `${fy} outlook` : "Growth outlook",
      sourceLabel: "Growth Update",
      contextLabel: null,
      atRaw,
      atMs,
      artifactHref: buildArtifactHref("growth", companyCode),
    };
    const arr = growthCandidatesPerCompany.get(key) ?? [];
    arr.push(candidate);
    growthCandidatesPerCompany.set(key, arr);
  });
  growthCandidatesPerCompany.forEach((arr) => {
    arr.sort((a, b) => b.atMs - a.atMs);
    const latest = arr[0];
    const prior = arr[1];
    if (prior && prior.score != null) {
      latest.priorScore = prior.score;
    }
    updates.push(latest);
  });

  const latestSnapshotPerCompany = new Map<string, UnifiedUpdate>();
  ((businessSnapshotRows ?? []) as RawBusinessSnapshotRow[]).forEach((row) => {
    const companyCode = row.company?.trim();
    if (!companyCode) return;
    const atRaw = row.generated_at ?? null;
    const atMs = eventTimeMs(atRaw);
    const detail =
      row.snapshot_phase != null
        ? `Phase ${row.snapshot_phase}`
        : formatFeedLabel(row.snapshot_source) || "Refreshed";
    const candidate: UnifiedUpdate = {
      id: `snapshot-${companyCode}`,
      type: "business_snapshot",
      companyName: companyCode,
      companyCode,
      companyIsNew: false,
      score: null,
      priorScore: null,
      detail,
      sourceLabel: "Biz Snapshot",
      contextLabel: null,
      atRaw,
      atMs,
      artifactHref: buildArtifactHref("business_snapshot", companyCode),
    };
    const existing = latestSnapshotPerCompany.get(companyCode);
    if (!existing || candidate.atMs > existing.atMs) {
      latestSnapshotPerCompany.set(companyCode, candidate);
    }
  });
  updates.push(...latestSnapshotPerCompany.values());

  // industry_context rows carry no change content (always "Refreshed" pings),
  // so they are intentionally not added to the unified feed. Re-introduce only
  // when the upstream table starts emitting a meaningful per-row signal.

  const latestKeyVariablesPerCompany = new Map<string, UnifiedUpdate>();
  ((keyVariablesRows ?? []) as RawKeyVariablesRow[]).forEach((row) => {
    const companyCode = row.company_code?.trim();
    if (!companyCode) return;
    const atRaw = row.generated_at ?? null;
    const atMs = eventTimeMs(atRaw);
    const variableCount = extractDeepTreatmentCount(row.deep_treatment);
    const candidate: UnifiedUpdate = {
      id: `key-variables-${companyCode}`,
      type: "key_variables",
      companyName: companyCode,
      companyCode,
      companyIsNew: false,
      score: null,
      priorScore: null,
      detail:
        variableCount != null
          ? `${variableCount} variable${variableCount === 1 ? "" : "s"} tracked`
          : "Variables refreshed",
      sourceLabel: "Key Variables",
      contextLabel: null,
      atRaw,
      atMs,
      artifactHref: buildArtifactHref("key_variables", companyCode),
    };
    const existing = latestKeyVariablesPerCompany.get(companyCode);
    if (!existing || candidate.atMs > existing.atMs) {
      latestKeyVariablesPerCompany.set(companyCode, candidate);
    }
  });
  updates.push(...latestKeyVariablesPerCompany.values());


  const latestGuidanceBatches = new Map<string, UnifiedUpdate>();
  ((guidanceRows ?? []) as RawGuidanceRow[]).forEach((row) => {
    const companyCode = row.company_code?.trim();
    const guidanceKey = row.guidance_key?.trim();
    if (!companyCode || !guidanceKey) return;
    const atRaw = row.generated_at ?? null;
    const atMs = eventTimeMs(atRaw);
    const threadLabel = buildGuidanceThreadLabel(row);
    const threadContext = buildGuidanceThreadContext(row);
    const threadStatus = formatFeedLabel(row.status);
    const thread: GuidanceBatchThread = {
      guidanceKey,
      label: threadLabel,
      statusLabel: threadStatus,
      contextLabel: threadContext,
    };

    if (!atRaw) {
      const candidate: UnifiedUpdate = {
        id: `guidance-${companyCode}-${guidanceKey}`,
        type: "guidance_monitor",
        companyName: companyCode,
        companyCode,
        companyIsNew: false,
        score: null,
        priorScore: null,
        detail: threadContext ? `${threadLabel} · ${threadContext}` : threadLabel,
        sourceLabel: "Guidance Monitor",
        contextLabel: threadStatus ? `${threadStatus} update` : "Guidance",
        atRaw,
        atMs,
        artifactHref: buildArtifactHref("guidance_monitor", companyCode),
      };
      const existing = latestGuidanceBatches.get(candidate.id);
      if (!existing || candidate.atMs > existing.atMs) {
        latestGuidanceBatches.set(candidate.id, candidate);
      }
      return;
    }

    const batchKey = `${companyCode}::${atRaw}`;
    const existing = latestGuidanceBatches.get(batchKey);
    if (!existing) {
      latestGuidanceBatches.set(batchKey, {
        id: `guidance-batch-${companyCode}-${atMs}`,
        type: "guidance_monitor",
        companyName: companyCode,
        companyCode,
        companyIsNew: false,
        score: null,
        priorScore: null,
        detail: "",
        sourceLabel: "Guidance Monitor",
        contextLabel: null,
        atRaw,
        atMs,
        guidanceThreads: [thread],
        artifactHref: buildArtifactHref("guidance_monitor", companyCode),
      });
      return;
    }

    existing.guidanceThreads = [...(existing.guidanceThreads ?? []), thread];
    if (atMs > existing.atMs) {
      existing.atMs = atMs;
      existing.atRaw = atRaw;
    }
  });
  latestGuidanceBatches.forEach((item) => {
    if (item.guidanceThreads && item.guidanceThreads.length > 1) {
      item.guidanceThreads = [...item.guidanceThreads].sort((a, b) => {
        const statusDiff = guidanceStatusRank(a.statusLabel) - guidanceStatusRank(b.statusLabel);
        if (statusDiff !== 0) return statusDiff;
        return a.guidanceKey.localeCompare(b.guidanceKey);
      });
    }

    if (item.guidanceThreads && item.guidanceThreads.length > 0) {
      const threads = item.guidanceThreads;
      const batchCount = threads.length;
      item.detail = buildGuidanceBatchPreview(threads) ?? "Guidance updates";
      item.contextLabel = `${batchCount} update${batchCount === 1 ? "" : "s"}`;
      if (batchCount === 1) {
        const [thread] = threads;
        item.detail = thread.contextLabel
          ? `${thread.label} · ${thread.contextLabel}`
          : thread.label;
      }
    }
  });
  updates.push(...latestGuidanceBatches.values());

  const companyCodes = Array.from(
    new Set(
      updates
        .map((item) => item.companyCode?.trim())
        .filter((item): item is string => Boolean(item)),
    ),
  );

  if (companyCodes.length > 0) {
    const { data: companyRows } = await supabase
      .from("company")
      .select("code, name, created_at")
      .in("code", companyCodes);

    const companyNameMap = new Map<string, string>();
    const companyFreshnessMap = new Map<string, boolean>();
    (companyRows ?? []).forEach((row: { code: string; name?: string | null; created_at?: string | null }) => {
      companyNameMap.set(row.code.toUpperCase(), row.name?.trim() || row.code);
      companyFreshnessMap.set(row.code.toUpperCase(), isCompanyNew(row.created_at ?? null));
    });

    updates.forEach((item) => {
      if (!item.companyCode) return;
      const companyKey = item.companyCode.toUpperCase();
      item.companyName = companyNameMap.get(companyKey) ?? item.companyCode;
      item.companyIsNew = companyFreshnessMap.get(companyKey) ?? false;
    });
  }

  const typePriority: Record<UpdateType, number> = {
    quarter: 0,
    growth: 1,
    business_snapshot: 2,
    key_variables: 3,
    guidance_monitor: 4,
  };

  const sortedUpdates = [...updates].sort((a, b) => {
    if (b.atMs !== a.atMs) return b.atMs - a.atMs;
    const typeDiff = typePriority[a.type] - typePriority[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.id.localeCompare(b.id);
  });

  const finalUpdates = collapseSameCompanyRuns
    ? collapseConsecutiveSameCompanyUpdates(sortedUpdates)
    : sortedUpdates;

  return finalUpdates.slice(0, limit);
}
