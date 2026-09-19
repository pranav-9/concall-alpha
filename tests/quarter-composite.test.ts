import assert from "node:assert/strict";

import {
  blendQuarterLeg,
  blendQuarterLegFromSeries,
  mean4Q,
  mean4QFromSeries,
  meanLatestScored,
  quarterSeriesFromNewestFirst,
  RECENCY_WEIGHTS,
} from "../lib/quarter-composite";

// ---------------------------------------------------------------------------
// Unit: the helper's own contract.
// ---------------------------------------------------------------------------

// Empty / all-null → null (a no-data company is unranked, never a phantom 0).
assert.equal(mean4Q([]), null, "empty → null");
assert.equal(mean4Q([null, undefined, null]), null, "all-null → null");
assert.equal(mean4Q([Number.NaN, Number.POSITIVE_INFINITY]), null, "non-finite → null");

// One print → itself (a 1-quarter company's 4Q avg is its single score).
assert.equal(mean4Q([7.5]), 7.5, "single print → itself");

// Averages only the 4 NEWEST scored values (caller passes newest-first).
assert.equal(mean4Q([8, 7, 6, 5]), 6.5, "exactly 4 → mean of 4");
assert.equal(mean4Q([8, 6, 4]), 6, "fewer than 4 → mean of what exists");
assert.equal(mean4Q([9, 8, 7, 6, 5, 4]), 7.5, "more than 4 → only the newest 4");

// FILTER-then-slice: a null inside the newest 4 must NOT shrink the window to 3,
// it reaches to the next scored print — this is the exact Python behaviour and
// the subtle bug the old slice-then-filter path had.
assert.equal(mean4Q([8, null, 7, 6, 5]), 6.5, "null in window reaches past it (8,7,6,5)");
assert.equal(
  mean4Q([null, 8, null, 6, null, 4, null, 2]),
  5,
  "interleaved nulls skipped: newest 4 scored are 8,6,4,2",
);

// meanLatestScored generalises to any window (the board's 12Q avg uses n=12).
assert.equal(meanLatestScored([10, 8, 6, 4, 2], 12), 6, "n larger than list → all of it");
assert.equal(meanLatestScored([10, 8, 6, 4, 2], 2), 9, "n=2 → newest two");

// ---------------------------------------------------------------------------
// Cross-implementation parity (T8): mean4Q must reproduce the quarter leg that
// concallyser/scripts/compute_composite_score.py computes, or the live Read
// ranks on a different 4Q mean than the coverage cut and the D2 bug reopens.
//
// The existing tests/fixtures/composite-score-cross-impl.json pins the FORMULA
// but is blind to which quarter value is fed in. This oracle pins the SELECTION:
// it transcribes the pipeline's window logic and asserts the TS helper matches
// it across the shapes that actually differ (nulls in-window, gaps, duplicate/
// superseded quarters, <4 prints). It runs offline — no DB — so CI can enforce
// it. A live-data spot-check fixture can be layered on later, but the algorithm
// is what silently drifts, and that is what this pins.
// ---------------------------------------------------------------------------

type Print = { fy: number; qtr: number; score: number | null };

// Transcribed from compute_composite_score.py lines 211-222: keep rows that have
// a score (the scoring_meta filter is applied upstream by the query, so it is
// out of scope for the mean itself), sort NEWEST-first by (fy, qtr), take the
// latest QTR_WINDOW = 4, average. Returns null when the window is empty.
function pythonAvg4Q(prints: Print[]): number | null {
  const scored = prints.filter((p) => p.score != null && Number.isFinite(p.score));
  scored.sort((a, b) => b.fy - a.fy || b.qtr - a.qtr);
  const window = scored.slice(0, 4);
  if (window.length === 0) return null;
  return window.reduce((s, p) => s + (p.score as number), 0) / window.length;
}

// How every caller feeds the helper: the company's prints sorted newest-first,
// mapped to their scores. This mirrors getConcallData's `companyRecords`
// (already newest-first) and the overview cache's `quarter_series` (reversed).
function tsAvg4Q(prints: Print[]): number | null {
  const newestFirst = [...prints].sort((a, b) => b.fy - a.fy || b.qtr - a.qtr);
  return mean4Q(newestFirst.map((p) => p.score));
}

const vectors: Array<{ name: string; prints: Print[] }> = [
  {
    name: "clean 4 contiguous quarters",
    prints: [
      { fy: 27, qtr: 1, score: 8.1 },
      { fy: 26, qtr: 4, score: 7.6 },
      { fy: 26, qtr: 3, score: 7.9 },
      { fy: 26, qtr: 2, score: 6.4 },
    ],
  },
  {
    name: "more than 4 — only newest 4 count",
    prints: [
      { fy: 27, qtr: 1, score: 8.0 },
      { fy: 26, qtr: 4, score: 7.0 },
      { fy: 26, qtr: 3, score: 6.0 },
      { fy: 26, qtr: 2, score: 5.0 },
      { fy: 26, qtr: 1, score: 1.0 },
      { fy: 25, qtr: 4, score: 0.5 },
    ],
  },
  {
    name: "null score inside the newest 4",
    prints: [
      { fy: 27, qtr: 1, score: 8.0 },
      { fy: 26, qtr: 4, score: null },
      { fy: 26, qtr: 3, score: 7.0 },
      { fy: 26, qtr: 2, score: 6.0 },
      { fy: 26, qtr: 1, score: 5.0 },
    ],
  },
  {
    name: "gap in fy/qtr (missing Q3) — still 4 newest scored",
    prints: [
      { fy: 27, qtr: 1, score: 8.0 },
      { fy: 26, qtr: 4, score: 7.0 },
      { fy: 26, qtr: 2, score: 6.0 },
      { fy: 26, qtr: 1, score: 5.0 },
    ],
  },
  {
    name: "single print",
    prints: [{ fy: 27, qtr: 1, score: 7.3 }],
  },
  {
    name: "two prints only",
    prints: [
      { fy: 27, qtr: 1, score: 8.0 },
      { fy: 26, qtr: 4, score: 6.0 },
    ],
  },
  {
    name: "unsorted input (helper caller sorts newest-first)",
    prints: [
      { fy: 26, qtr: 2, score: 6.4 },
      { fy: 27, qtr: 1, score: 8.1 },
      { fy: 26, qtr: 3, score: 7.9 },
      { fy: 26, qtr: 4, score: 7.6 },
    ],
  },
  {
    name: "all null",
    prints: [
      { fy: 27, qtr: 1, score: null },
      { fy: 26, qtr: 4, score: null },
    ],
  },
  {
    name: "fy rollover Q4→Q1 ordered correctly",
    prints: [
      { fy: 27, qtr: 1, score: 9.0 },
      { fy: 26, qtr: 4, score: 3.0 },
      { fy: 26, qtr: 3, score: 3.0 },
      { fy: 26, qtr: 2, score: 3.0 },
    ],
  },
];

for (const { name, prints } of vectors) {
  const py = pythonAvg4Q(prints);
  const ts = tsAvg4Q(prints);
  if (py === null) {
    assert.equal(ts, null, `${name}: Python null, TS ${ts}`);
  } else {
    assert.ok(ts != null, `${name}: TS null, Python ${py}`);
    assert.ok(
      Math.abs(ts - py) < 1e-9,
      `${name}: TS 4Q mean ${ts} != Python 4Q mean ${py} — the board would rank on a ` +
        `different quarter leg than compute_composite_score.py`,
    );
  }
}

// ---------------------------------------------------------------------------
// Flat-mean series/raw parity (T4). The overview cache persists quarter_series
// (oldest→newest, null-filtered, capped at 8, built by quarterSeriesFromNewestFirst)
// and the board works from raw newest-first prints. This pins
// mean4QFromSeries(quarter_series) == mean4Q(rawNewestFirst) for the flat-mean
// shape (the "4Q" column). The LIVE Read parity is the blend block further down.
// ---------------------------------------------------------------------------

// The REAL series builder company-overview-cache.ts uses — imported, not
// re-implemented, so a change to its cap or null handling is exercised here.
const quarterSeriesFromRows = (rowsNewestFirst: Array<number | null>) =>
  quarterSeriesFromNewestFirst(rowsNewestFirst);

// The builder's own contract: filter-then-slice, oldest→newest, null when empty.
assert.deepEqual(quarterSeriesFromNewestFirst([]), null, "series: empty → null");
assert.deepEqual(quarterSeriesFromNewestFirst([null, undefined]), null, "series: all null → null");
assert.deepEqual(quarterSeriesFromNewestFirst([8, null, 7]), [7, 8], "series: null dropped, reversed");
assert.deepEqual(
  quarterSeriesFromNewestFirst([null, null, null, null, null, null, null, null, 8, 7, 6, 5]),
  [5, 6, 7, 8],
  "series: 8 nulls in front do not shrink the window (filter-then-slice)",
);
assert.deepEqual(
  quarterSeriesFromNewestFirst([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]),
  [2, 3, 4, 5, 6, 7, 8, 9],
  "series: caps at the newest 8 scored",
);

const rowVectors: Array<{ name: string; rows: Array<number | null> }> = [
  { name: "clean 5 prints", rows: [8.1, 7.6, 7.9, 6.4, 5.0] },
  { name: "null inside newest 4", rows: [8.0, null, 7.0, 6.0, 5.0] },
  { name: "fewer than 4", rows: [8.0, 6.0] },
  { name: "more than 8 (series caps at 8; newest 4 identical)", rows: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] },
  { name: "single print", rows: [7.3] },
  { name: "all null", rows: [null, null] },
  // Nulls stacked at the front: slice-then-filter would blend only [8,7,6] on the
  // page while the board blends [8,7,6,5]. Codex adversarial probe, 2026-09-19.
  { name: "null-heavy front, 4 scored behind", rows: [null, null, null, null, null, 8, 7, 6, 5] },
  { name: "8 nulls then 4 scored (beyond the old slice window)", rows: [null, null, null, null, null, null, null, null, 8, 7, 6, 5] },
];
for (const { name, rows } of rowVectors) {
  const boardLeg = mean4Q(rows); // board: raw newest-first
  const cacheLeg = mean4QFromSeries(quarterSeriesFromRows(rows)); // cache: via quarter_series
  if (boardLeg === null) {
    assert.equal(cacheLeg, null, `${name}: board null, cache ${cacheLeg}`);
  } else {
    assert.ok(
      cacheLeg != null && Math.abs(cacheLeg - boardLeg) < 1e-9,
      `${name}: board 4Q ${boardLeg} != cache 4Q ${cacheLeg} — company page and board ` +
        `would show a different standing quarter leg for the same company`,
    );
  }
}

// ---------------------------------------------------------------------------
// blendQuarterLeg — the recency-weighted LIVE board leg (2026-08-11). "Latest
// counts double": 0.4/0.2/0.2/0.2 over the newest 4 scored, renormalised over
// however many exist. Same FILTER-then-slice selection as mean4Q.
// ---------------------------------------------------------------------------

// Weight vector is the intended shape: latest is exactly double each prior.
assert.deepEqual([...RECENCY_WEIGHTS], [0.4, 0.2, 0.2, 0.2], "recency weights");
assert.equal(RECENCY_WEIGHTS[0] / RECENCY_WEIGHTS[1], 2, "latest counts double a prior quarter");

const approx = (a: number | null, b: number, msg: string) => {
  assert.ok(a != null && Math.abs(a - b) < 1e-9, `${msg} (got ${a}, want ${b})`);
};

// Empty / all-null → null (a no-data company is unranked, never a phantom 0).
assert.equal(blendQuarterLeg([]), null, "empty → null");
assert.equal(blendQuarterLeg([null, undefined, Number.NaN]), null, "all non-finite → null");

// 4 scored: exact 0.4/0.2/0.2/0.2. Latest=10, priors=0 → 4.0, NOT the flat mean 2.5.
approx(blendQuarterLeg([10, 0, 0, 0]), 4, "latest carries 0.4, not 0.25");
approx(blendQuarterLeg([8, 7, 6, 5]), 0.4 * 8 + 0.2 * (7 + 6 + 5), "4 scored weighted");
// A single hot latest moves the leg only partway, not fully (spike-damping).
approx(blendQuarterLeg([10, 5, 5, 5]), 0.4 * 10 + 0.2 * 15, "spike moves leg to 7, not 10");

// Renormalise when fewer than 4 exist.
approx(blendQuarterLeg([9]), 9, "1 print → itself (weight renormalised to 1.0)");
approx(blendQuarterLeg([9, 3]), (0.4 * 9 + 0.2 * 3) / 0.6, "2 prints → 0.667/0.333");
approx(blendQuarterLeg([9, 3, 3]), (0.4 * 9 + 0.2 * 3 + 0.2 * 3) / 0.8, "3 prints → 0.5/0.25/0.25");

// More than 4 → only the newest 4 weighted; the 5th is ignored.
approx(blendQuarterLeg([8, 7, 6, 5, 100]), 0.4 * 8 + 0.2 * (7 + 6 + 5), "5th print ignored");

// FILTER-then-slice: a null inside the newest 4 must NOT shrink the window or
// shift weights — it reaches to the next scored print (matches mean4Q).
approx(
  blendQuarterLeg([8, null, 7, 6, 5]),
  0.4 * 8 + 0.2 * (7 + 6 + 5),
  "null in window reaches past it (8,7,6,5)",
);

// Degenerate weight arg: no positive weight → guarded by scored.length check only,
// so pass the default in practice. A custom flat vector reproduces the mean.
approx(blendQuarterLeg([8, 6, 4, 2], [1, 1, 1, 1]), 5, "flat custom weights → mean");


// ---------------------------------------------------------------------------
// Cross-surface parity for the LIVE Read leg (2026-09-19). The board computes
// blendQuarterLeg from raw newest-first rows; the company page and the homepage
// hero compute blendQuarterLegFromSeries from an oldest→newest series. Same
// company, same number — SKYGOLD showed Read 7.5 on its page and 7.4 on the
// board when the page was still on the flat mean (8.025 vs blend 8.0).
// ---------------------------------------------------------------------------

for (const { name, rows } of rowVectors) {
  const boardLeg = blendQuarterLeg(rows);
  const pageLeg = blendQuarterLegFromSeries(quarterSeriesFromRows(rows));
  if (boardLeg === null) {
    assert.equal(pageLeg, null, `${name}: board null, page ${pageLeg}`);
  } else {
    assert.ok(
      pageLeg != null && Math.abs(pageLeg - boardLeg) < 1e-9,
      `${name}: board blend ${boardLeg} != page blend ${pageLeg} — company page and ` +
        `board would show a different Read for the same company`,
    );
  }
}

// The SKYGOLD case itself, pinned: newest-first 7.9, 7.4, 8.5, 8.3.
approx(blendQuarterLeg([7.9, 7.4, 8.5, 8.3]), 8.0, "SKYGOLD blend");
approx(blendQuarterLegFromSeries([8.3, 8.5, 7.4, 7.9]), 8.0, "SKYGOLD blend via series");
assert.equal(blendQuarterLegFromSeries(null), null, "null series → null");
assert.equal(blendQuarterLegFromSeries([]), null, "empty series → null");


// ---------------------------------------------------------------------------
// blendQuarterLegFromSeries — the series-shaped entry's own contract, beyond the
// parity loop above (which only ever feeds it a null-free, ≤8-long series via
// quarterSeriesFromRows). These pin the branches the two live callers rely on:
// the overview cache's `?? latestScore` fallback fires ONLY on a null/empty
// series, and the homepage hero feeds an UNCAPPED oldest→newest trail.points.
// ---------------------------------------------------------------------------

// undefined (missing column) → null, same as null/[] — the overview cache's
// `?? latestScore` fallback then takes over.
assert.equal(blendQuarterLegFromSeries(undefined), null, "undefined series → null");
// A non-empty series with no finite value is ALSO null (no phantom 0 leg).
assert.equal(
  blendQuarterLegFromSeries([null, undefined, Number.NaN]),
  null,
  "all non-finite series → null",
);

// Nulls INSIDE an oldest→newest series: FILTER-then-slice survives the reversal.
// Oldest→newest [5, 6, 7, null, 8] is newest-first [8, null, 7, 6, 5] → the null
// reaches past to 5, so all four of 8,7,6,5 are weighted — never 8,7,6 on 0.5/0.25/0.25.
approx(
  blendQuarterLegFromSeries([5, 6, 7, null, 8]),
  0.4 * 8 + 0.2 * (7 + 6 + 5),
  "null inside series reaches past it after reversal",
);
approx(
  blendQuarterLegFromSeries([5, 6, 7, null, 8]),
  blendQuarterLeg([8, null, 7, 6, 5]) as number,
  "series-with-null == newest-first-with-null",
);

// Fewer than 4 in series form renormalises exactly like the newest-first entry
// (a thin-history company on its own page == that company on the board).
approx(blendQuarterLegFromSeries([9]), 9, "1-print series → itself");
approx(blendQuarterLegFromSeries([3, 9]), (0.4 * 9 + 0.2 * 3) / 0.6, "2-print series: newest is LAST");
approx(blendQuarterLegFromSeries([3, 3, 9]), (0.4 * 9 + 0.4 * 3) / 0.8, "3-print series → 0.5/0.25/0.25");

// The hero feeds every scored quarter (trail.points is uncapped — a long-history
// company can have 12+). Only the NEWEST 4 may count; the older 8 are ignored.
{
  const twelveOldestFirst = [1, 1, 1, 1, 1, 1, 1, 1, 5, 6, 7, 8];
  approx(
    blendQuarterLegFromSeries(twelveOldestFirst),
    0.4 * 8 + 0.2 * (7 + 6 + 5),
    "12-point trail: only newest 4 weighted, older 8 ignored",
  );
  approx(
    blendQuarterLegFromSeries(twelveOldestFirst),
    blendQuarterLeg([...twelveOldestFirst].reverse()) as number,
    "12-point trail == board blend of the same prints newest-first",
  );
}

// The regression this fix closes: on SKYGOLD's prints the FLAT mean (8.025) and
// the BLEND (8.0) straddle a one-decimal rounding line, which is exactly how the
// page read 7.5 while the board read 7.4. The series entry must be the blend,
// not the mean — pin both numbers so a future "simplify to mean4QFromSeries"
// re-opens this test, not the bug.
{
  const skygoldOldestFirst = [8.3, 8.5, 7.4, 7.9];
  approx(mean4QFromSeries(skygoldOldestFirst), 8.025, "SKYGOLD flat mean is 8.025");
  approx(blendQuarterLegFromSeries(skygoldOldestFirst), 8.0, "SKYGOLD blend is 8.0");
  assert.notEqual(
    blendQuarterLegFromSeries(skygoldOldestFirst),
    mean4QFromSeries(skygoldOldestFirst),
    "the live Read leg is the blend, not the flat mean",
  );
}

// Input is not mutated: the overview cache persists quarter_series AFTER deriving
// the leg from it, and the hero re-reads trail.points for the sparkline — an
// in-place reverse would flip the persisted/rendered order.
{
  const series = [6.0, 6.7, 6.4];
  blendQuarterLegFromSeries(series);
  assert.deepEqual(series, [6.0, 6.7, 6.4], "series is not reversed in place");
}

console.log("quarter-composite: blendQuarterLegFromSeries contract ok");

console.log("quarter-composite: all assertions passed");
