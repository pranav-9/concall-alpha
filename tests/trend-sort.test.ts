import assert from "node:assert/strict";

import { compareTrend, trajectorySortRank, type TrajectoryKey } from "../lib/score-trajectory";

const row = (trajectoryKey: TrajectoryKey | undefined, trendChange: number | null = 0) => ({
  trajectoryKey,
  trendChange,
});

// trajectorySortRank: ranked keys -> their rank; no_read / missing -> null so
// callers can pin "no signal" last in BOTH sort directions.
assert.equal(trajectorySortRank("climbing"), 0, "climbing is the best rank");
assert.equal(trajectorySortRank("no_read"), null, "no_read has no rank");
assert.equal(trajectorySortRank(undefined), null, "missing key has no rank");

// desc (default): best trajectory first.
assert.ok(compareTrend(row("climbing"), row("cracking")) < 0, "climbing before cracking (desc)");
assert.ok(compareTrend(row("cracking"), row("climbing")) > 0, "cracking after climbing (desc)");

// asc reverses the ranked order.
assert.ok(compareTrend(row("climbing"), row("cracking"), "asc") > 0, "asc flips ranked order");

// no_read / missing always sort last, regardless of direction.
assert.ok(compareTrend(row("cracking"), row("no_read")) < 0, "no_read last, desc");
assert.ok(compareTrend(row("cracking"), row("no_read"), "asc") < 0, "no_read still last, asc");
assert.ok(compareTrend(row(undefined), row("cracking")) > 0, "missing key sorts last");
assert.equal(compareTrend(row("no_read"), row(undefined)), 0, "two no-signals tie");

// within the same label, the bigger move breaks the tie.
assert.ok(compareTrend(row("climbing", 1.5), row("climbing", 0.4)) < 0, "bigger climb first (desc)");
assert.ok(compareTrend(row("climbing", 0.4), row("climbing", 1.5), "asc") < 0, "smaller climb first (asc)");

console.log("trend-sort.test.ts ok");
