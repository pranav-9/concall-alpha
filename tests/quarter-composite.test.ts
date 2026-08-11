import assert from "node:assert/strict";

import { mean4Q, mean4QFromSeries, meanLatestScored } from "../lib/quarter-composite";

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
// build == cache-hit == board (T4). The overview cache derives its 4Q leg from
// quarter_series (oldest→newest, null-filtered, capped at 8) on BOTH the fresh
// build path and the cache-hit path; the board derives it from the raw
// newest-first prints. All three must land on the same number, or the company
// page and the leaderboard disagree on the same company. This pins
// mean4QFromSeries(quarter_series) == mean4Q(rawNewestFirst).
// ---------------------------------------------------------------------------

// Mirrors company-overview-cache.ts's quarter_series construction: newest ≤8
// prints, nulls dropped, reversed to oldest→newest.
function quarterSeriesFromRows(rowsNewestFirst: Array<number | null>): number[] | null {
  const series = rowsNewestFirst
    .slice(0, 8)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .reverse();
  return series.length > 0 ? series : null;
}

const rowVectors: Array<{ name: string; rows: Array<number | null> }> = [
  { name: "clean 5 prints", rows: [8.1, 7.6, 7.9, 6.4, 5.0] },
  { name: "null inside newest 4", rows: [8.0, null, 7.0, 6.0, 5.0] },
  { name: "fewer than 4", rows: [8.0, 6.0] },
  { name: "more than 8 (series caps at 8; newest 4 identical)", rows: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] },
  { name: "single print", rows: [7.3] },
  { name: "all null", rows: [null, null] },
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

console.log("quarter-composite: all assertions passed");
