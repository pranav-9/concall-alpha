import type {
  NormalizedGuidanceStatusKey,
  WalkTheTalkTier,
} from "./types";

// ---------------------------------------------------------------------------
// Walk-the-talk grade computation. Pure logic, no I/O.
//
// Architecture (2026-05-14 pivot): operates on Phase 6 guidance_snapshot
// status enum, not the legacy guidance_lineage_v1 status enum. The Phase 6
// status keys are coarser (no slippage_quarters precision), so the on-time
// rule simplifies to "status === met".
//
// Which commitments COUNT toward the ratio is decided by
// classifyGuidanceItem / isGradedForTier in
// lib/guidance-tracking/verdict.ts, not here — that logic is horizon-aware
// (2026-09-06 unification: a revision/delay whose horizon is still ahead
// stays live and ungraded; `delayed` is always graded, regardless of its
// new horizon, so a company can't escape the tier by repeatedly moving its
// own goalpost). Read that file for the current methodology; this file
// used to also decide "which count" via a status-only `countsForGrade`,
// which is now deleted to avoid two functions answering the same question
// (/plan-eng-review Issue 1, 2026-09-06).
//
// Tier thresholds (unchanged since /plan-eng-review, 2026-05-14):
//   ≥90% on time     → reliable
//   75-89%           → mixed
//   50-74%           → erratic
//   <50%             → weak
//   total < 3        → not_enough_data
// ---------------------------------------------------------------------------

export const MIN_COMMITMENTS_FOR_GRADE = 3;

export function isOnTime(statusKey: NormalizedGuidanceStatusKey): boolean {
  return statusKey === "met";
}

export function computeTier(
  onTimeCount: number,
  totalCount: number,
): WalkTheTalkTier {
  if (totalCount < MIN_COMMITMENTS_FOR_GRADE) {
    return "not_enough_data";
  }
  const pct = onTimeCount / totalCount;
  if (pct >= 0.9) return "reliable";
  if (pct >= 0.75) return "mixed";
  if (pct >= 0.5) return "erratic";
  return "weak";
}
