import assert from "node:assert/strict";

import {
  buildReadDistribution,
  layoutMarkerLabels,
  percentileOf,
  quantile,
  silvermanBandwidth,
} from "../lib/read-distribution";

// ---------------------------------------------------------------------------
// Quantiles
// ---------------------------------------------------------------------------

assert.equal(quantile([1, 2, 3], 0.5), 2, "odd-length median is the middle value");
assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5, "even-length median interpolates");
assert.equal(quantile([5], 0.5), 5, "single value");
assert.ok(Number.isNaN(quantile([], 0.5)), "empty population has no median");

// ---------------------------------------------------------------------------
// Bandwidth. The bounds are the reason this function exists — see the comment
// in lib/read-distribution.ts. Both ends must hold or the curve degenerates.
// ---------------------------------------------------------------------------

const identical = Array.from({ length: 60 }, () => 6.5);
assert.equal(
  silvermanBandwidth(identical),
  0.12,
  "zero spread must not divide by zero — it clamps to the floor",
);

const wide = Array.from({ length: 40 }, (_, i) => i / 4); // 0 .. 9.75
assert.ok(silvermanBandwidth(wide) <= 1.2, "a wide spread clamps to the ceiling");
assert.ok(silvermanBandwidth(wide) > 0.5, "a wide spread is genuinely smoothed");

// One far outlier must not blow up the bandwidth for the body: that's the IQR
// term doing its job.
const tight = Array.from({ length: 50 }, (_, i) => 6 + (i % 5) * 0.1);
const tightPlusOutlier = [...tight, 0.2].sort((a, b) => a - b);
assert.ok(
  silvermanBandwidth(tightPlusOutlier) < 2 * silvermanBandwidth(tight),
  "an outlier must not double the bandwidth",
);

// ---------------------------------------------------------------------------
// Percentile
// ---------------------------------------------------------------------------

assert.equal(percentileOf(5, [1, 2, 3, 4]), 1, "above everything");
assert.equal(percentileOf(0, [1, 2, 3, 4]), 0, "below everything");
assert.equal(percentileOf(3, [1, 2, 3, 4]), 0.5, "ties count as not-below");
assert.equal(percentileOf(3, []), 0, "empty population");

// ---------------------------------------------------------------------------
// Label rationing
// ---------------------------------------------------------------------------

// Four markers crowded into a hair's width of a 10-wide domain: row 0 takes one,
// row 1 takes one, the rest go unlabelled rather than overprinting.
const crowded = [
  { code: "AAA", score: 6.0 },
  { code: "BBB", score: 6.02 },
  { code: "CCC", score: 6.04 },
  { code: "DDD", score: 6.06 },
];
const crowdedRows = layoutMarkerLabels(crowded, { median: 6.03, domainSpan: 10 });
assert.equal(crowdedRows.size, 2, "crowded markers fill both rows and then stop");
assert.deepEqual(
  [...new Set(crowdedRows.values())].sort(),
  [0, 1],
  "the two labels land on different rows",
);

// Well-separated markers all get labels, up to the cap.
const spread = [4, 5, 6, 7, 8].map((score) => ({ code: `C${score}`, score }));
const spreadRows = layoutMarkerLabels(spread, { median: 6, domainSpan: 10 });
assert.equal(spreadRows.size, 5, "separated markers are all labelled");

// Widely separated markers stay on the near row; the second row is a spillover,
// not a default.
const veryWide = [1, 5, 9].map((score) => ({ code: `C${score}`, score }));
assert.ok(
  [...layoutMarkerLabels(veryWide, { median: 5, domainSpan: 10 }).values()].every((r) => r === 0),
  "far-apart markers stay on one row",
);

// REGRESSION. The first cut used a fixed gap in score units, so two long
// tickers a whole score point apart passed the collision test and then printed
// straight through each other. Collision must scale with the text.
const longNames = [
  { code: "MTARTECH", score: 7.5 },
  { code: "AIMTRON", score: 8.0 },
];
const longRows = layoutMarkerLabels(longNames, { median: 7.2, domainSpan: 3.5 });
assert.equal(longRows.size, 2, "both long tickers are still labelled");
assert.notEqual(
  longRows.get("MTARTECH"),
  longRows.get("AIMTRON"),
  "two wide labels 0.5 apart on a 3.5-wide domain must not share a row",
);

// Short codes at the same spacing DO fit side by side — the rule is width, not
// a blanket widening of the gap.
const shortNames = [
  { code: "SJS", score: 7.5 },
  { code: "IEX", score: 8.0 },
];
const shortRows = layoutMarkerLabels(shortNames, { median: 7.2, domainSpan: 3.5 });
assert.equal(
  shortRows.get("SJS"),
  shortRows.get("IEX"),
  "two narrow labels at the same spacing share a row",
);

// The cap is a cap.
const many = Array.from({ length: 20 }, (_, i) => ({ code: `C${i}`, score: i / 2 }));
assert.ok(layoutMarkerLabels(many, { median: 5, domainSpan: 10 }).size <= 6, "at most six labels");

// Extremes outrank the middle: with only one slot, the far marker wins.
const oneSlot = layoutMarkerLabels(
  [
    { code: "MID", score: 6.0 },
    { code: "FAR", score: 9.0 },
  ],
  { median: 6.0, domainSpan: 10, maxLabels: 1, rows: 1 },
);
assert.deepEqual([...oneSlot.keys()], ["FAR"], "the marker furthest from the median is labelled");

// ---------------------------------------------------------------------------
// The assembled model
// ---------------------------------------------------------------------------

assert.equal(
  buildReadDistribution([1, 2, 3, 4, 5], [{ code: "A", name: "A", score: 3 }]),
  null,
  "under twelve companies there is no distribution to draw",
);

// A roughly normal universe: 96 companies centred on 6.5.
const universe = Array.from({ length: 96 }, (_, i) => {
  const u = (i + 0.5) / 96;
  // Crude inverse-normal via the sum of three uniforms — deterministic, no RNG.
  return 6.5 + (u - 0.5) * 4 + Math.sin(i) * 0.15;
});

const dist = buildReadDistribution(universe, [
  { code: "HIGH", name: "High Co", score: 8.4, readLabel: "Aligned & cheap" },
  { code: "MIDCO", name: "Mid Co", score: 6.5, readLabel: "Balanced" },
  { code: "NOREAD", name: "No Read Co", score: null },
]);
assert.ok(dist, "a real universe produces a distribution");

assert.equal(dist.universeCount, 96);
assert.equal(dist.markers.length, 2, "only scored markers are plotted");
assert.equal(dist.unplottedCount, 1, "the unscored marker is counted, not dropped silently");
assert.deepEqual(
  dist.markers.map((m) => m.code),
  ["MIDCO", "HIGH"],
  "markers are ordered left to right",
);

assert.ok(dist.domain[0] >= 0 && dist.domain[1] <= 10, "domain stays inside the 0-10 scale");
assert.ok(dist.domain[0] < dist.domain[1], "domain is non-degenerate");
assert.ok(
  dist.curve.every((p) => p.density >= 0 && p.density <= 1),
  "density is normalised into 0..1",
);
assert.ok(
  Math.max(...dist.curve.map((p) => p.density)) > 0.999,
  "the mode is normalised to 1",
);
assert.equal(dist.curve[0].score, dist.domain[0], "the curve spans the domain");
assert.equal(dist.curve[dist.curve.length - 1].score, dist.domain[1]);

// A marker outside the reference population still plots — a watchlist may hold a
// large cap, which the coverage policy keeps out of the universe.
const outside = buildReadDistribution(universe, [
  { code: "OUT", name: "Outsider", score: 9.6 },
]);
assert.ok(outside, "an out-of-universe marker still yields a distribution");
assert.equal(outside.markers.length, 1);
assert.ok(outside.domain[1] >= 9.6, "the domain stretches to include it");
assert.equal(outside.markers[0].percentile, 1, "it reads above the field");

// The median marker sits mid-pack; the high one near the top.
const midMarker = dist.markers.find((m) => m.code === "MIDCO");
const highMarker = dist.markers.find((m) => m.code === "HIGH");
assert.ok(midMarker && highMarker);
assert.ok(
  Math.abs(midMarker.percentile - 0.5) < 0.12,
  `a marker at the centre should read near the 50th percentile, got ${midMarker.percentile}`,
);
assert.ok(highMarker.percentile > 0.9, "8.4 against this universe is top decile");
assert.ok(
  highMarker.density < midMarker.density,
  "the tail marker sits lower on the curve than the mid one",
);

// Ticks must actually fall inside the drawn domain, or the axis lies.
assert.ok(dist.ticks.length >= 3, "at least three ticks");
assert.ok(
  dist.ticks.every((t) => t >= dist.domain[0] - 1e-9 && t <= dist.domain[1] + 1e-9),
  "every tick is inside the domain",
);

console.log("read-distribution: all assertions passed");
