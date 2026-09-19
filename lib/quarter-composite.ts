// The standing quarter leg: ONE definition per shape, shared by every surface
// that shows a standing quarter number.
//
//   - blendQuarterLeg / blendQuarterLegFromSeries — the RECENCY-WEIGHTED 4Q leg.
//     This is what every LIVE Read uses: the leaderboard board (app/company/
//     get-concall-data.ts → score-board-rows), sectors, watchlists, themes, the
//     company-page Read (lib/company-overview-cache.ts) and the homepage hero
//     (lib/home-featured-read.ts). Same company, same number, everywhere.
//   - mean4Q / mean4QFromSeries — the FLAT 4Q mean. Displayed as the "4Q" trail
//     column and mirrored by the coverage cut (compute_composite_score.py). It is
//     NOT a Read input anywhere on the live site any more.
//
// 2026-09-19: the overview and hero were still feeding the flat mean into
// classifyBoardRead while the board fed the blend, so the same company showed a
// different Read on its own page than on /leaderboards (SKYGOLD: 7.5 vs 7.4 —
// blend 8.0 vs mean 8.025 crossed the one-decimal line). Both now use the blend.
//
// WHY ONE HELPER (history). The quarter leg is also computed on the pipeline
// side by concallyser/scripts/compute_composite_score.py, which averages the
// latest 4 scored prints for the coverage cut. Until 2026-08-11 the live surfaces
// fed classifyBoardRead the SINGLE latest quarter while the cut used the 4Q mean,
// so a greyed below-cut company could out-rank on the live Read; the live
// surfaces were then unified on the 4Q mean, and on 2026-08-11 the live leg moved
// to the recency blend (the cut stays on the mean). Every leg computation lives
// in this file so the surfaces cannot drift into subtly different definitions.
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

/** The FLAT trailing 4-quarter mean — the "4Q" trail column and the coverage
 *  cut's leg (compute_composite_score.py). NOT a live Read input. */
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
 * Build the persisted quarter_series shape from NEWEST-FIRST scores: drop the
 * unscored rows FIRST, then keep the newest `cap`, then reverse to
 * oldest→newest. Filter-then-slice, same as the board's leg selection above — a
 * null inside the newest `cap` raw rows must not shrink the window, or the page
 * and the board would blend different quarters. Returns null when nothing is
 * scored. Used by lib/company-overview-cache.ts's build path and pinned against
 * the board in tests/quarter-composite.test.ts.
 */
export function quarterSeriesFromNewestFirst(
  scoresNewestFirst: ReadonlyArray<number | null | undefined>,
  cap = 8,
): number[] | null {
  const scored: number[] = [];
  for (const s of scoresNewestFirst) {
    if (typeof s === "number" && Number.isFinite(s)) {
      scored.push(s);
      if (scored.length === cap) break;
    }
  }
  if (scored.length === 0) return null;
  return scored.reverse();
}

/**
 * The 4Q mean from an OLDEST→NEWEST series (the shape the overview cache persists
 * as quarter_series). Reverses to the newest-first order mean4Q expects. No live
 * caller since 2026-09-19 (the Read moved to blendQuarterLegFromSeries); kept as
 * the flat-mean twin, pinned by tests, for any future "4Q" column fed from a
 * persisted series.
 */
export function mean4QFromSeries(
  series: ReadonlyArray<number | null | undefined> | null | undefined,
): number | null {
  if (!series || series.length === 0) return null;
  return mean4Q([...series].reverse());
}

/**
 * The recency-weighted leg from an OLDEST→NEWEST series (quarter_series, or the
 * hero's trail.points). Reverses to the newest-first order blendQuarterLeg
 * expects. Used on BOTH the overview build path and its cache-hit path so a
 * freshly built row and a served one produce the identical quarter leg — and the
 * same one the board computes from raw newest-first rows (pinned by the parity
 * block in tests/quarter-composite.test.ts).
 */
export function blendQuarterLegFromSeries(
  series: ReadonlyArray<number | null | undefined> | null | undefined,
): number | null {
  if (!series || series.length === 0) return null;
  return blendQuarterLeg([...series].reverse());
}
