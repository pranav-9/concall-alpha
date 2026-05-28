// Walk-the-talk types.
//
// Architecture (2026-05-14 pivot): walk-the-talk is a derived view over
// Phase 6 guidance_snapshot.guidance_items[]. The pipeline does the LLM
// extraction; this layer transforms the already-normalized snapshot into
// the display shape consumed by walk-the-talk-section.tsx. No new table,
// no per-company curation, no Phase 8 dependency.
//
// Input substrate: lib/guidance-snapshot/types.ts → NormalizedGuidanceSnapshot
//                  + its guidanceItems: NormalizedGuidanceItem[]

import type {
  NormalizedGuidanceItem,
  NormalizedGuidanceStatusKey,
} from "@/lib/guidance-tracking/types";

// ---------------------------------------------------------------------------
// Walk-the-talk tier vocabulary. Mirrors moat-analysis's emerald/sky/amber/rose
// semantic-color system.
// ---------------------------------------------------------------------------

export type WalkTheTalkTier =
  | "reliable" //   ≥90% on time
  | "mixed" //      75–89%
  | "erratic" //    50–74%
  | "weak" //       <50%
  | "not_enough_data"; // total counted < 3

export const TIER_LABELS: Record<WalkTheTalkTier, string> = {
  reliable: "Reliable",
  mixed: "Mixed",
  erratic: "Erratic",
  weak: "Weak",
  not_enough_data: "Not enough data",
};

export type WalkTheTalkCategory =
  | "capex"
  | "capacity"
  | "revenue"
  | "margin"
  | "other";

// Phase 6 v2 family → walk-the-talk display category.
// Phase 6 narrowed scope: only growth + margin families. capex / capacity /
// other buckets will be empty until additional families are added in a
// later phase.
export function mapGuidanceFamilyToCategory(
  guidanceFamily: string | null | undefined,
): WalkTheTalkCategory {
  switch ((guidanceFamily ?? "").toLowerCase()) {
    case "growth":
      return "revenue";
    case "margin":
      return "margin";
    default:
      return "other";
  }
}

// ---------------------------------------------------------------------------
// Display rows. Each row in the matrix drawer is one normalized guidance
// item (= one Phase 6 commitment thread). No quarter-precision slippage —
// guidance_snapshot doesn't carry it. Approximate slippage signal lives in
// the trail's mention_type 'delay' counts (rendered separately if needed).
// ---------------------------------------------------------------------------

export type WalkTheTalkCommitmentRow = {
  guidance_key: string;
  label: string;             // guidance_text
  category: WalkTheTalkCategory;
  raw_guidance_type: string | null;
  source_quarter: string | null;   // firstMentionPeriod
  target_period: string | null;    // targetPeriod (may not be a quarter — could be "FY26" or "next 12 months")
  latest_quarter: string | null;   // latestMentionPeriod
  status_key: NormalizedGuidanceStatusKey;
  status_label: string;
  status_reason: string | null;
  latest_view: string | null;
  on_time: boolean;          // applied via statusKey → outcome rule (see grade-utils)
  counts_for_grade: boolean;
  delay_mention_count: number; // number of trail entries with mention_type 'delay'
};

export type WalkTheTalkCategoryBucket = {
  category: WalkTheTalkCategory;
  tier: WalkTheTalkTier;
  on_time_count: number;
  total_count: number;
};

export type WalkTheTalkSchemaStatus = "present" | "missing";

export type NormalizedWalkTheTalk = {
  ticker: string;
  schemaStatus: WalkTheTalkSchemaStatus;
  asOfQuarter: string | null;     // latest mention period across all items
  analysisWindowQuarters: number | null; // pass-through from guidance_snapshot
                                          // (schema constant 4; NOT the
                                          // actual data span — use dataSpan*
                                          // fields below for the real window).

  // Real data span across all tracked commitments. Computed from
  // min(firstMentionPeriod) and max(latestMentionPeriod). Drives the
  // "Q1 FY25 → Q4 FY26" badge in the section header. Both null when no
  // commitments have quarter labels.
  dataSpanStart: string | null;
  dataSpanEnd: string | null;

  updatedAtRaw: string | null;

  overall: {
    tier: WalkTheTalkTier;
    onTimeCount: number;
    totalCount: number;
  };

  // Per-category buckets. Empty categories suppressed (only categories with
  // ≥1 grade-counting commitment appear).
  byCategory: WalkTheTalkCategoryBucket[];

  // ALL guidance items shown in the matrix drawer (counted AND not-counted).
  commitments: WalkTheTalkCommitmentRow[];
};

// Re-export for caller convenience.
export type { NormalizedGuidanceItem, NormalizedGuidanceStatusKey };
