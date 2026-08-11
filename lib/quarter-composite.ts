// The trailing-quarter mean: the ONE definition of "the latest N scored quarters,
// averaged" shared by every surface that shows a standing quarter number — the
// leaderboard board (app/company/get-concall-data.ts), the company-page Read and
// its ConcallScore ring (lib/company-overview-cache.ts), and the homepage hero
// (lib/home-featured-read.ts).
//
// WHY ONE HELPER. The quarter leg is also computed on the pipeline side by
// concallyser/scripts/compute_composite_score.py, which averages the latest 4
// scored prints for the coverage cut. Until 2026-08-11 the live surfaces fed
// classifyBoardRead the SINGLE latest quarter while the cut used the 4Q mean, so
// a company greyed as below-cut could still out-rank on the live Read. Unifying
// every live surface on this 4Q mean is what makes the board reconcile with the
// cut on the quarter leg. Route all four sites through here so they can't drift
// into three subtly different "4Q averages".
//
// SELECTION, pinned to the Python side. Take the N NEWEST prints that HAVE a
// score, then average them. This is FILTER-then-slice, not slice-then-filter: a
// null-score row inside the newest N must not shrink the window, because
// compute_composite_score.py drops null-score rows BEFORE it takes its 4
// (`if ... r.get("score") is not None` → sort newest-first → `v[:QTR_WINDOW]`).
// Callers therefore pass scores NEWEST-FIRST.

/**
 * Mean of the N newest scored values in a newest-first list. Nulls/NaN are
 * skipped, not counted as zero and not counted toward N. Returns null when no
 * scored value exists (a no-data company is unranked, never a phantom 0).
 */
export function meanLatestScored(
  scores: ReadonlyArray<number | null | undefined>,
  n: number,
): number | null {
  const scored: number[] = [];
  for (const s of scores) {
    if (typeof s === "number" && Number.isFinite(s)) {
      scored.push(s);
      if (scored.length === n) break;
    }
  }
  if (scored.length === 0) return null;
  return scored.reduce((a, b) => a + b, 0) / scored.length;
}

/** The trailing 4-quarter mean — the standing quarter leg on every live surface. */
export function mean4Q(scores: ReadonlyArray<number | null | undefined>): number | null {
  return meanLatestScored(scores, 4);
}

// RECENCY-WEIGHTED quarter leg — the LIVE OVERALL BOARD ordering leg (2026-08-11).
//
// "Latest counts double": the newest scored print weighs 0.4, each of the prior
// three 0.2, so the latest carries exactly twice any single earlier quarter. The
// 4Q mean (mean4Q) already CONTAINS the latest, so a naive 0.5*latest + 0.5*mean4Q
// would put an effective 0.625 on the latest — this weight vector avoids that and
// is honest about the emphasis.
//
// Weights RENORMALISE over however many scored prints exist: 3 -> 0.5/0.25/0.25,
// 2 -> 0.667/0.333, 1 -> 1.0. A thin-history company is scored on what it has,
// never on phantom quarters. Same FILTER-then-slice selection as meanLatestScored
// (a null inside the newest 4 must not shrink the window). Caller passes scores
// NEWEST-FIRST. Returns null when no scored value exists.
//
// DELIBERATELY diverges from the coverage cut, which stays on the flat 4Q mean
// (concallyser/compute_composite_score.py): recency belongs in the live ORDERING,
// not in the reviewed membership decision, whose 100/101 boundary sits inside the
// re-score noise floor and must stay stable. The old live=latest / cut=4Q split
// was retired in the WHY note above because a greyed company could out-rank kept
// ones; this split is safe because the greyed-tail PIN (score-board-table.tsx)
// now holds every greyed row at the bottom regardless of its live Read.
export const RECENCY_WEIGHTS = [0.4, 0.2, 0.2, 0.2] as const;

export function blendQuarterLeg(
  scores: ReadonlyArray<number | null | undefined>,
  weights: ReadonlyArray<number> = RECENCY_WEIGHTS,
): number | null {
  const scored: number[] = [];
  for (const s of scores) {
    if (typeof s === "number" && Number.isFinite(s)) {
      scored.push(s);
      if (scored.length === weights.length) break;
    }
  }
  if (scored.length === 0) return null;
  let weightSum = 0;
  let acc = 0;
  for (let i = 0; i < scored.length; i++) {
    weightSum += weights[i];
    acc += weights[i] * scored[i];
  }
  return acc / weightSum;
}

/**
 * The 4Q mean from an OLDEST→NEWEST series (the shape the overview cache persists
 * as quarter_series). Reverses to the newest-first order mean4Q expects. Used on
 * BOTH the overview build path and its cache-hit path so a freshly built row and
 * a served one produce the identical quarter leg — the one place build/cache-hit
 * parity is enforced.
 */
export function mean4QFromSeries(
  series: ReadonlyArray<number | null | undefined> | null | undefined,
): number | null {
  if (!series || series.length === 0) return null;
  return mean4Q([...series].reverse());
}
