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
// Methodology locked 2026-05-14, extended 2026-05-29 (added `missed`):
//   - met            → counts, on_time=true
//   - missed         → counts, on_time=false (target not achieved per mgmt
//                      acknowledgement — the canonical bad-faith signal)
//   - delayed        → counts, on_time=false (mgmt admitted delay)
//   - dropped        → counts, on_time=false (walked back; bad-faith signal)
//   - revised        → counts, on_time=false (conservative: Phase 6 does
//                      not distinguish revised-up from revised-down; treat
//                      as deviation from original signal)
//   - active         → does NOT count (still in window)
//   - not_yet_clear  → does NOT count (conservative: horizon elapsed but
//                      no outcome evidence retrieved — can't grade what
//                      we can't see)
//   - unknown        → does NOT count (defensive: from guidance-snapshot
//                      normalizer when status field is missing/invalid)
//
// Tier thresholds (unchanged from /plan-eng-review):
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

export function countsForGrade(statusKey: NormalizedGuidanceStatusKey): boolean {
  switch (statusKey) {
    case "met":
    case "missed":
    case "delayed":
    case "dropped":
    case "revised":
      return true;
    case "active":
    case "not_yet_clear":
    case "unknown":
      return false;
  }
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
