import type { NormalizedGuidanceSnapshot } from "@/lib/guidance-snapshot/types";
import type { NormalizedGuidanceItem } from "@/lib/guidance-tracking/types";

import { computeTier, countsForGrade, isOnTime } from "./grade-utils";
import {
  mapGuidanceFamilyToCategory,
  type NormalizedWalkTheTalk,
  type WalkTheTalkCategory,
  type WalkTheTalkCategoryBucket,
  type WalkTheTalkCommitmentRow,
  type WalkTheTalkTier,
} from "./types";

// ---------------------------------------------------------------------------
// Walk-the-talk normalize. Pure transform.
//
// Input: a NormalizedGuidanceSnapshot (already produced by
// lib/guidance-snapshot/normalize.ts from a Phase 6 row).
// Output: NormalizedWalkTheTalk consumed by walk-the-talk-section.tsx.
//
// No I/O. No external state. Methodology constants live in grade-utils.ts.
// ---------------------------------------------------------------------------

function countDelayMentions(item: NormalizedGuidanceItem): number {
  return item.trail.filter(
    (t) => (t.mentionType ?? "").toLowerCase() === "delay",
  ).length;
}

function buildCommitmentRow(
  item: NormalizedGuidanceItem,
): WalkTheTalkCommitmentRow {
  const statusKey = item.statusKey;
  const rawGuidanceType =
    item.guidanceFamily && item.metricSubtype
      ? `${item.guidanceFamily}/${item.metricSubtype}`
      : item.guidanceFamily;
  return {
    guidance_key: item.guidanceKey,
    label: item.guidanceText,
    category: mapGuidanceFamilyToCategory(item.guidanceFamily),
    raw_guidance_type: rawGuidanceType,
    source_quarter: item.firstMentionPeriod,
    target_period: item.horizonLabel,
    latest_quarter: item.latestMentionPeriod,
    status_key: statusKey,
    status_label: item.statusLabel,
    status_reason: item.statusReason,
    latest_view: item.latestView,
    on_time: isOnTime(statusKey),
    counts_for_grade: countsForGrade(statusKey),
    delay_mention_count: countDelayMentions(item),
  };
}

function buildCategoryBuckets(
  rows: ReadonlyArray<WalkTheTalkCommitmentRow>,
): WalkTheTalkCategoryBucket[] {
  const order: WalkTheTalkCategory[] = [
    "capex",
    "capacity",
    "revenue",
    "margin",
    "other",
  ];
  const buckets: WalkTheTalkCategoryBucket[] = [];

  for (const category of order) {
    const inCategory = rows.filter(
      (r) => r.category === category && r.counts_for_grade,
    );
    if (inCategory.length === 0) continue;

    const onTime = inCategory.filter((r) => r.on_time).length;
    const total = inCategory.length;

    buckets.push({
      category,
      tier: computeTier(onTime, total),
      on_time_count: onTime,
      total_count: total,
    });
  }

  return buckets;
}

function emptyOverall() {
  return {
    tier: "not_enough_data" as WalkTheTalkTier,
    onTimeCount: 0,
    totalCount: 0,
  };
}

// Phase 6 quarter labels are "Q1 FY26" (space-separated, two-digit FY).
// Compare numerically when parseable; fall back to localeCompare.
const Q_FY_RE = /^Q\s*([1-4])\s*FY\s*([0-9]{2,4})$/i;

function parseQuarter(s: string): { q: number; fy: number } | null {
  const m = s.trim().match(Q_FY_RE);
  if (!m) return null;
  const q = parseInt(m[1], 10);
  const fyRaw = m[2];
  const fy =
    fyRaw.length === 4 ? parseInt(fyRaw, 10) : 2000 + parseInt(fyRaw, 10);
  return { q, fy };
}

function compareQuarters(a: string, b: string): number {
  const pa = parseQuarter(a);
  const pb = parseQuarter(b);
  if (pa && pb) {
    if (pa.fy !== pb.fy) return pa.fy - pb.fy;
    return pa.q - pb.q;
  }
  return a.localeCompare(b);
}

function pickLatestQuarter(
  rows: ReadonlyArray<WalkTheTalkCommitmentRow>,
): string | null {
  const candidates = rows
    .map((r) => r.latest_quarter)
    .filter((q): q is string => typeof q === "string" && q.length > 0);
  if (candidates.length === 0) return null;
  return [...candidates].sort(compareQuarters).pop() ?? null;
}

// Real data span: earliest firstMentionPeriod → latest latestMentionPeriod.
// Drives the section header badge ("Q1 FY25 → Q4 FY26"). Honest about the
// LLM input window regardless of the schema's analysis_window_quarters
// constant. Phase 6 walks the trail across all source documents — typically
// 2 years when --concall-limit 8 is passed.
function pickDataSpan(
  rows: ReadonlyArray<WalkTheTalkCommitmentRow>,
): { start: string | null; end: string | null } {
  const firsts = rows
    .map((r) => r.source_quarter)
    .filter((q): q is string => typeof q === "string" && q.length > 0);
  const latests = rows
    .map((r) => r.latest_quarter)
    .filter((q): q is string => typeof q === "string" && q.length > 0);

  const start =
    firsts.length === 0 ? null : [...firsts].sort(compareQuarters)[0];
  const end =
    latests.length === 0 ? null : [...latests].sort(compareQuarters).pop() ?? null;

  return { start, end };
}

export function normalizeWalkTheTalk(
  snapshot: NormalizedGuidanceSnapshot | null | undefined,
  fallbackTicker?: string,
): NormalizedWalkTheTalk {
  if (!snapshot || snapshot.guidanceItems.length === 0) {
    return {
      ticker: snapshot?.companyCode ?? fallbackTicker ?? "",
      schemaStatus: "missing",
      asOfQuarter: null,
      analysisWindowQuarters: snapshot?.analysisWindowQuarters ?? null,
      dataSpanStart: null,
      dataSpanEnd: null,
      updatedAtRaw: snapshot?.updatedAtRaw ?? null,
      overall: emptyOverall(),
      byCategory: [],
      commitments: [],
    };
  }

  const commitments = snapshot.guidanceItems.map(buildCommitmentRow);
  const byCategory = buildCategoryBuckets(commitments);

  const graded = commitments.filter((c) => c.counts_for_grade);
  const onTimeCount = graded.filter((c) => c.on_time).length;
  const totalCount = graded.length;
  const overallTier = computeTier(onTimeCount, totalCount);

  const span = pickDataSpan(commitments);

  return {
    ticker: snapshot.companyCode,
    schemaStatus: "present",
    asOfQuarter: pickLatestQuarter(commitments),
    analysisWindowQuarters: snapshot.analysisWindowQuarters,
    dataSpanStart: span.start,
    dataSpanEnd: span.end,
    updatedAtRaw: snapshot.updatedAtRaw,
    overall: {
      tier: overallTier,
      onTimeCount,
      totalCount,
    },
    byCategory,
    commitments,
  };
}
