import assert from "node:assert/strict";

import { normalizeGrowthOutlook } from "../lib/growth-outlook/normalize";

// Phase 5 v8 (2026-09-17): the pipeline bridges each revenue scenario to
// earnings growth through the issuer's own margin target. The portal reads the
// per-scenario earnings fields off `scenarios` and the margin path / ladder
// summary off `details`. Shapes mirror the NAVINFLUOR sandbox payload.

const v8Scenarios = {
  base: {
    label: "Base Case",
    growth_pct: "18-22%",
    margin_at_horizon_pct: "32-33%",
    confidence_pct: 70,
    quick_takeaway: "Revenue growth driven by capacity expansions; EBITDA margin guided at 32-33%.",
    risk_watch: "Ramp delays.",
    drivers: ["CDMO ramp"],
    risks: ["Pricing"],
    earnings_growth_low: 14.4,
    earnings_growth_high: 19.9,
    earnings_growth_pct: "14-20%",
    earnings_basis: "guided_margin_ebitda",
  },
  upside: {
    label: "Upside Case",
    growth_pct: ">25%",
    margin_at_horizon_pct: "34-35%",
    confidence_pct: 50,
    quick_takeaway: "Faster ramp.",
    risk_watch: "",
    drivers: [],
    risks: [],
    earnings_growth_low: 24.6,
    earnings_growth_high: null,
    earnings_growth_pct: ">25%",
    earnings_basis: "guided_margin_ebitda",
  },
  downside: {
    label: "Downside Case",
    growth_pct: "<15%",
    margin_at_horizon_pct: null,
    confidence_pct: 30,
    quick_takeaway: "Slowdown.",
    risk_watch: "",
    drivers: [],
    risks: [],
    earnings_growth_low: null,
    earnings_growth_high: 15,
    earnings_growth_pct: "<15%",
    earnings_basis: "flat_margin",
  },
};

const v8Details = {
  schema_version: "phase5_growth_v8",
  run_timestamp: "2026-09-17T12:00:00",
  margin_path: {
    metric: "ebitda",
    current_pct: 34.2,
    current_period: "Q1 FY27",
    current_snippet: "Operating EBITDA margin stood at a solid 34.2%.",
    guided_pct: "32-33%",
    guided_low: 32,
    guided_high: 33,
    guided_period: "medium term",
    guided_snippet: "what we are talking about will be in the range of that 32%, 33%.",
    direction: "stable",
  },
  earnings_ladder: {
    basis: "guided_margin_ebitda",
    metric: "ebitda",
    current_margin_pct: 34.2,
    horizon_years_used: 2,
    note: "EBITDA growth used as the earnings proxy; below-EBITDA lines assumed to scale with it",
    scenarios: {},
  },
};

const bridged = normalizeGrowthOutlook({
  details: v8Details,
  growthScore: 6.6,
  runTimestamp: v8Details.run_timestamp,
  scenarios: v8Scenarios,
});
assert.ok(bridged, "v8 payload normalizes");

// per-scenario earnings fields ride along with the revenue read
assert.equal(bridged.scenarios?.base?.growth, "18-22%");
assert.equal(bridged.scenarios?.base?.earningsGrowth, "14-20%");
assert.equal(bridged.scenarios?.base?.earningsBasis, "guided_margin_ebitda");
assert.equal(bridged.scenarios?.base?.marginAtHorizon, "32-33%");
assert.equal(bridged.scenarios?.upside?.earningsGrowth, ">25%");
// a flat-margin scenario inside a bridged ladder keeps its basis so the card can say "margins held flat"
assert.equal(bridged.scenarios?.downside?.earningsBasis, "flat_margin");
assert.equal(bridged.scenarios?.downside?.marginAtHorizon, null);

// margin path and ladder summary come off details
assert.deepEqual(bridged.marginPath, {
  metric: "ebitda",
  currentPct: 34.2,
  currentPeriod: "Q1 FY27",
  currentSnippet: "Operating EBITDA margin stood at a solid 34.2%.",
  guidedPct: "32-33%",
  guidedPeriod: "medium term",
  guidedSnippet: "what we are talking about will be in the range of that 32%, 33%.",
  direction: "stable",
});
assert.deepEqual(bridged.earningsLadder, {
  basis: "guided_margin_ebitda",
  metric: "ebitda",
  currentMarginPct: 34.2,
  horizonYearsUsed: 2,
  note: "EBITDA growth used as the earnings proxy; below-EBITDA lines assumed to scale with it",
});

// JSON-string details (older rows store JSONB as text in places) still parse
const stringDetails = normalizeGrowthOutlook({
  details: JSON.stringify(v8Details),
  growthScore: null,
  runTimestamp: null,
  scenarios: JSON.stringify(v8Scenarios),
});
assert.equal(stringDetails?.marginPath?.metric, "ebitda");
assert.equal(stringDetails?.scenarios?.base?.earningsGrowth, "14-20%");

// direction-only guide: the pipeline stores the path with null guided_* and a flat ladder
const unguided = normalizeGrowthOutlook({
  growthScore: null,
  runTimestamp: null,
  details: {
    ...v8Details,
    margin_path: { ...v8Details.margin_path, guided_pct: null, guided_low: null, guided_high: null, guided_period: null, guided_snippet: null, direction: "expanding" },
    earnings_ladder: { basis: "flat_margin", metric: "ebitda", current_margin_pct: 31.8, horizon_years_used: 2, note: "issuer states no quantified ebitda margin target (direction: expanding); earnings growth = revenue growth", scenarios: {} },
  },
  scenarios: {
    ...v8Scenarios,
    base: { ...v8Scenarios.base, margin_at_horizon_pct: null, earnings_growth_pct: "18-22%", earnings_basis: "flat_margin" },
  },
});
assert.equal(unguided?.marginPath?.guidedPct, null);
assert.equal(unguided?.marginPath?.direction, "expanding");
assert.equal(unguided?.earningsLadder?.basis, "flat_margin");
assert.equal(unguided?.scenarios?.base?.earningsGrowth, "18-22%");

// an unknown direction string is not passed through as a label
const oddDirection = normalizeGrowthOutlook({
  growthScore: null,
  runTimestamp: null,
  details: { ...v8Details, margin_path: { ...v8Details.margin_path, direction: "sideways" } },
  scenarios: v8Scenarios,
});
assert.equal(oddDirection?.marginPath?.direction, null);

// pre-v8 rows: nothing new appears, nothing old changes
const v7 = normalizeGrowthOutlook({
  details: { schema_version: "phase5_growth_v7", run_timestamp: "2026-08-21T00:00:00" },
  growthScore: 6.1,
  runTimestamp: null,
  scenarios: {
    base: { growth_pct: "18-22%", confidence_pct: 70, quick_takeaway: "x", risk_watch: "y", drivers: [], risks: [] },
    upside: null,
    downside: null,
  },
});
assert.ok(v7);
assert.equal(v7.scenarios?.base?.growth, "18-22%");
assert.equal(v7.scenarios?.base?.earningsGrowth, null);
assert.equal(v7.scenarios?.base?.earningsBasis, null);
assert.equal(v7.scenarios?.base?.marginAtHorizon, null);
assert.equal(v7.marginPath, null);
assert.equal(v7.earningsLadder, null);

console.log("growth-earnings-ladder: all assertions passed");
