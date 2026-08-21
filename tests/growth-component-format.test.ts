import assert from "node:assert/strict";

import { formatGrowthScoreComponent } from "../lib/growth-outlook/component-format";

// 0-10 sub-scores render as X/10.
assert.deepEqual(formatGrowthScoreComponent("scenario_strength", 6.5), {
  value: "6.5",
  suffix: "/10",
});
assert.deepEqual(formatGrowthScoreComponent("scenario_adjusted", 6.5), {
  value: "6.5",
  suffix: "/10",
});
assert.deepEqual(formatGrowthScoreComponent("sentiment_score", 6.7), {
  value: "6.7",
  suffix: "/10",
});

// The credibility multiplier renders as ×X, never "/10" — a 1.0 multiplier
// shown as "1.0/10" reads as a terrible sub-score.
assert.deepEqual(formatGrowthScoreComponent("credibility_multiplier", 1), {
  value: "×1",
  suffix: null,
});
assert.deepEqual(formatGrowthScoreComponent("credibility_multiplier", 0.85), {
  value: "×0.85",
  suffix: null,
});

// Counts render bare (fixes the pre-existing count-as-/10 bug).
assert.deepEqual(formatGrowthScoreComponent("quantified_forward_facts", 3), {
  value: "3",
  suffix: null,
});

// Delivered CAGR blend is a raw percent, not a score.
assert.deepEqual(formatGrowthScoreComponent("delivered_cagr_blend", 19.8), {
  value: "19.8",
  suffix: "%",
});

// v7 keys: best-window backing and issuer confidence are percents; the
// pre-stretch raw composite is a 0-10 score. Old v6 rows keep rendering above.
assert.deepEqual(formatGrowthScoreComponent("delivered_backing", 27), {
  value: "27",
  suffix: "%",
});
assert.deepEqual(formatGrowthScoreComponent("base_confidence_pct", 85), {
  value: "85",
  suffix: "%",
});
assert.deepEqual(formatGrowthScoreComponent("raw_composite", 6.3412), {
  value: "6.3",
  suffix: "/10",
});

// Unknown keys only claim the /10 scale when the magnitude is plausible.
assert.equal(formatGrowthScoreComponent("mystery_metric", 42), null);
assert.equal(formatGrowthScoreComponent("mystery_metric", -1), null);
assert.deepEqual(formatGrowthScoreComponent("mystery_metric", 7), {
  value: "7",
  suffix: "/10",
});

// Non-finite values are hidden.
assert.equal(formatGrowthScoreComponent("scenario_strength", Number.NaN), null);

console.log("growth-component-format: all assertions passed");
