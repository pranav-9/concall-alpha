import Link from "next/link";
import ConcallScore from "@/components/concall-score";
import { isCompanyNew } from "@/lib/company-freshness";
import { createClient } from "@/lib/supabase/server";
import { collapseConsecutiveSameCompanyUpdates } from "./recent-score-updates-utils";

export const revalidate = 120;

type RawQuarterRow = {
  company_code: string;
  score: number;
  fy: number;
  qtr: number;
  quarter_label?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  company?: { name: string | null }[] | { name: string | null } | null;
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

type RawIndustryContextRow = {
  company: string;
  generated_at?: string | null;
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

type RawGuidanceSnapshotRow = {
  company_code: string;
  generated_at?: string | null;
};

type UpdateType =
  | "quarter"
  | "growth"
  | "business_snapshot"
  | "industry_context"
  | "key_variables"
  | "guidance_monitor";

type GuidanceBatchThread = {
  guidanceKey: string;
  label: string;
  statusLabel: string | null;
  contextLabel: string | null;
};

type UnifiedUpdate = {
  id: string;
  type: UpdateType;
  companyName: string;
  companyCode: string | null;
  companyIsNew: boolean;
  score: number | null;
  detail: string;
  sourceLabel: string;
  contextLabel: string | null;
  atRaw: string | null;
  atMs: number;
  guidanceThreads?: GuidanceBatchThread[];
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

const formatDate = (value: string | null) => {
  const date = parseDate(value);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
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

const typeChipClass = (type: UpdateType) => {
  if (type === "quarter") {
    return "bg-sky-100 border-sky-300 text-sky-700 dark:bg-sky-900/30 dark:border-sky-700/40 dark:text-sky-200";
  }
  if (type === "growth") {
    return "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700/40 dark:text-emerald-200";
  }
  if (type === "business_snapshot") {
    return "bg-violet-100 border-violet-300 text-violet-700 dark:bg-violet-900/30 dark:border-violet-700/40 dark:text-violet-200";
  }
  if (type === "industry_context") {
    return "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-900/30 dark:border-slate-700/40 dark:text-slate-200";
  }
  if (type === "key_variables") {
    return "bg-cyan-100 border-cyan-300 text-cyan-700 dark:bg-cyan-900/30 dark:border-cyan-700/40 dark:text-cyan-200";
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

async function getUnifiedUpdates(limit: number) {
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
    { data: industryContextRows },
    { data: keyVariablesRows },
    { data: guidanceSnapshotRows },
    { data: guidanceRows },
  ] = await Promise.all([
    supabase
      .from("business_snapshot")
      .select("company, generated_at, snapshot_phase, snapshot_source")
      .order("generated_at", { ascending: false })
      .limit(160),
    supabase
      .from("company_industry_analysis")
      .select("company, generated_at")
      .order("generated_at", { ascending: false })
      .limit(160),
    supabase
      .from("key_variables_snapshot")
      .select("company_code, generated_at, deep_treatment")
      .order("generated_at", { ascending: false })
      .limit(160),
    supabase
      .from("guidance_snapshot")
      .select("company_code, generated_at")
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
  const latestQuarterPerCompany = new Map<string, UnifiedUpdate>();
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
      detail: quarterLabel,
      sourceLabel: "Quarter Score",
      contextLabel: null,
      atRaw,
      atMs,
    };
    const existing = latestQuarterPerCompany.get(companyKey);
    if (!existing || candidate.atMs > existing.atMs) {
      latestQuarterPerCompany.set(companyKey, candidate);
    }
  });
  updates.push(...latestQuarterPerCompany.values());

  const latestGrowthPerCompany = new Map<string, UnifiedUpdate>();
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
      detail: fy ? `${fy} outlook` : "Growth outlook",
      sourceLabel: "Growth Update",
      contextLabel: null,
      atRaw,
      atMs,
    };
    const existing = latestGrowthPerCompany.get(key);
    if (!existing || candidate.atMs > existing.atMs) {
      latestGrowthPerCompany.set(key, candidate);
    }
  });
  updates.push(...latestGrowthPerCompany.values());

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
      detail,
      sourceLabel: "Biz Snapshot",
      contextLabel: null,
      atRaw,
      atMs,
    };
    const existing = latestSnapshotPerCompany.get(companyCode);
    if (!existing || candidate.atMs > existing.atMs) {
      latestSnapshotPerCompany.set(companyCode, candidate);
    }
  });
  updates.push(...latestSnapshotPerCompany.values());

  const latestIndustryContextPerCompany = new Map<string, UnifiedUpdate>();
  ((industryContextRows ?? []) as RawIndustryContextRow[]).forEach((row) => {
    const companyCode = row.company?.trim();
    if (!companyCode) return;
    const atRaw = row.generated_at ?? null;
    const atMs = eventTimeMs(atRaw);
    const candidate: UnifiedUpdate = {
      id: `industry-context-${companyCode}`,
      type: "industry_context",
      companyName: companyCode,
      companyCode,
      companyIsNew: false,
      score: null,
      detail: "",
      sourceLabel: "Industry Context",
      contextLabel: "Refreshed",
      atRaw,
      atMs,
    };
    const existing = latestIndustryContextPerCompany.get(companyCode);
    if (!existing || candidate.atMs > existing.atMs) {
      latestIndustryContextPerCompany.set(companyCode, candidate);
    }
  });
  updates.push(...latestIndustryContextPerCompany.values());

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
      detail:
        variableCount != null
          ? `${variableCount} variable${variableCount === 1 ? "" : "s"} tracked`
          : "Variables refreshed",
      sourceLabel: "Key Variables",
      contextLabel: null,
      atRaw,
      atMs,
    };
    const existing = latestKeyVariablesPerCompany.get(companyCode);
    if (!existing || candidate.atMs > existing.atMs) {
      latestKeyVariablesPerCompany.set(companyCode, candidate);
    }
  });
  updates.push(...latestKeyVariablesPerCompany.values());

  const latestGuidanceSnapshots = new Map<string, UnifiedUpdate>();
  ((guidanceSnapshotRows ?? []) as RawGuidanceSnapshotRow[]).forEach((row) => {
    const companyCode = row.company_code?.trim();
    if (!companyCode) return;
    const atRaw = row.generated_at ?? null;
    const atMs = eventTimeMs(atRaw);
    const candidate: UnifiedUpdate = {
      id: `guidance-snapshot-${companyCode}`,
      type: "guidance_monitor",
      companyName: companyCode,
      companyCode,
      companyIsNew: false,
      score: null,
      detail: "",
      sourceLabel: "Guidance Monitor",
      contextLabel: "Refreshed",
      atRaw,
      atMs,
    };
    const existing = latestGuidanceSnapshots.get(companyCode);
    if (!existing || candidate.atMs > existing.atMs) {
      latestGuidanceSnapshots.set(companyCode, candidate);
    }
  });
  updates.push(...latestGuidanceSnapshots.values());

  const latestGuidanceBatches = new Map<string, UnifiedUpdate>();
  ((guidanceRows ?? []) as RawGuidanceRow[]).forEach((row) => {
    const companyCode = row.company_code?.trim();
    const guidanceKey = row.guidance_key?.trim();
    if (!companyCode || !guidanceKey) return;
    if (latestGuidanceSnapshots.has(companyCode)) return;
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
        detail: threadContext ? `${threadLabel} · ${threadContext}` : threadLabel,
        sourceLabel: "Guidance Monitor",
        contextLabel: threadStatus ? `${threadStatus} update` : "Guidance",
        atRaw,
        atMs,
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
        detail: "",
        sourceLabel: "Guidance Monitor",
        contextLabel: null,
        atRaw,
        atMs,
        guidanceThreads: [thread],
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
    industry_context: 3,
    key_variables: 4,
    guidance_monitor: 5,
  };

  const sortedUpdates = [...updates].sort((a, b) => {
    if (b.atMs !== a.atMs) return b.atMs - a.atMs;
    const typeDiff = typePriority[a.type] - typePriority[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.id.localeCompare(b.id);
  });

  return collapseConsecutiveSameCompanyUpdates(sortedUpdates).slice(0, limit);
}

export default async function RecentScoreUpdates({
  heroPanel = false,
}: {
  heroPanel?: boolean;
} = {}) {
  const isCompact = heroPanel;
  const updates = await getUnifiedUpdates(isCompact ? 9 : 6);
  if (updates.length === 0) return null;

  const headerClass = isCompact
    ? "px-3 py-2.5 border-b border-border"
    : "p-3 sm:p-4 border-b border-border";
  const titleClass = isCompact
    ? "text-base font-bold tracking-[-0.01em] text-foreground"
    : "text-base sm:text-lg font-bold text-foreground";
  const subtitleClass = isCompact
    ? "text-[11px] text-muted-foreground leading-tight"
    : "text-xs text-muted-foreground leading-relaxed";
  const rowClass = isCompact
    ? "flex items-start justify-between gap-2 px-3 py-2 hover:bg-accent/70 transition-colors"
    : "flex items-center justify-between gap-2.5 px-3 py-2.5 hover:bg-accent/70 transition-colors";
  const companyNameClass = isCompact
    ? "text-[13px] font-semibold leading-tight text-foreground truncate"
    : "text-sm font-semibold text-foreground truncate";
  const metaRowClass = isCompact
    ? "mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]"
    : "mt-0.5 flex flex-wrap items-center gap-2 text-xs";
  const chipClass = isCompact
    ? "text-[10px] px-2 py-0.5 rounded-full border font-medium leading-none"
    : "text-[11px] px-2.5 py-0.5 rounded-full border font-medium";
  const dateClass = isCompact
    ? "text-[10px] text-muted-foreground"
    : "text-[11px] text-muted-foreground";
  const detailClass = isCompact
    ? "text-[10px] text-muted-foreground line-clamp-1"
    : "text-[11px] text-muted-foreground line-clamp-1";
  const footerClass = isCompact
    ? "px-3 pb-2 pt-1 sm:border-t sm:border-border"
    : "px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-border";

  return (
    <section className={heroPanel ? "h-full w-full" : "w-[95%] sm:w-[90%] pt-6 sm:pt-8"}>
      <div className={heroPanel ? "flex h-full flex-col rounded-xl border border-border bg-card" : "rounded-xl border border-border bg-card"}>
        <div className={headerClass}>
          <h2 className={titleClass}>
            Latest Updates
          </h2>
          <p className={subtitleClass}>
            Recent activity across covered companies
          </p>
        </div>

        <div className={heroPanel ? "flex-1 divide-y divide-border overflow-y-auto" : "divide-y divide-border"}>
          {updates.map((item, index) => {
            const mobileOnlyHidden = heroPanel && index === 8 ? "hidden sm:block sm:border-t-0" : "";
            const row = (
              <div className={rowClass}>
                <div className="min-w-0">
                  <p className={companyNameClass}>
                    {item.companyName}
                    {item.companyIsNew && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-medium leading-none text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                        New
                      </span>
                    )}
                  </p>
                  <div className={metaRowClass}>
                    <span
                      className={`${chipClass} ${typeChipClass(item.type)}`}
                    >
                      {item.sourceLabel}
                    </span>
                    {item.detail &&
                      item.type !== "guidance_monitor" && (
                      <span className={detailClass}>
                        {item.detail}
                      </span>
                    )}
                    <span className={dateClass}>{formatDate(item.atRaw)}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {typeof item.score === "number" ? (
                    <ConcallScore score={item.score} size="sm" />
                  ) : item.contextLabel ? (
                    <span
                      className={`${chipClass} ${typeChipClass(item.type)}`}
                    >
                      {item.contextLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            );

            if (!item.companyCode) {
              return (
                <div key={item.id} className={mobileOnlyHidden}>
                  {row}
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={`/company/${item.companyCode}`}
                prefetch={false}
                className={mobileOnlyHidden}
              >
                {row}
              </Link>
            );
          })}
        </div>

        <div className={footerClass}>
          <Link
            href="/company"
            prefetch={false}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            View all companies
          </Link>
        </div>
      </div>
    </section>
  );
}
