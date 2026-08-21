import assert from "node:assert/strict";

import { edgePhrase } from "../lib/moat-analysis/plain-language";
import type { MoatRatingKey, MoatTier } from "../lib/moat-analysis/types";

const TIERS: (MoatTier | null)[] = ["strong", "mid", "weak", null];

// ---------------------------------------------------------------------------
// Tier-insensitive ratings
// ---------------------------------------------------------------------------

for (const tier of TIERS) {
  assert.equal(edgePhrase("no_moat", tier), "No real edge", `no_moat/${tier}`);
  assert.equal(edgePhrase("moat_at_risk", tier), "Edge under threat", `moat_at_risk/${tier}`);
  assert.equal(edgePhrase("unknown", tier), "Edge unclear", `unknown/${tier}`);
}

// Unrecognised rating value (stale row) hits the default branch.
assert.equal(
  edgePhrase("something_else" as MoatRatingKey, "strong"),
  "Edge unclear",
  "unrecognised rating → default phrase",
);

// ---------------------------------------------------------------------------
// wide_moat — strong is the only tier that earns the qualifier
// ---------------------------------------------------------------------------

assert.equal(edgePhrase("wide_moat", "strong"), "Wide, well-protected edge");
assert.equal(edgePhrase("wide_moat", "mid"), "Wide edge");
assert.equal(edgePhrase("wide_moat", "weak"), "Wide edge");
assert.equal(edgePhrase("wide_moat", null), "Wide edge");

// ---------------------------------------------------------------------------
// narrow_moat — all three tiers read differently; null tier reads as mid
// ---------------------------------------------------------------------------

assert.equal(edgePhrase("narrow_moat", "strong"), "Solid, defensible edge");
assert.equal(edgePhrase("narrow_moat", "mid"), "Moderate edge");
assert.equal(edgePhrase("narrow_moat", "weak"), "Slim edge");
assert.equal(edgePhrase("narrow_moat", null), "Moderate edge");

// ---------------------------------------------------------------------------
// Never leaks the raw enum, never claims a trajectory
// ---------------------------------------------------------------------------

const ratings: MoatRatingKey[] = ["wide_moat", "narrow_moat", "no_moat", "moat_at_risk", "unknown"];
for (const rating of ratings) {
  for (const tier of TIERS) {
    const phrase = edgePhrase(rating, tier);
    assert.ok(phrase.length > 0, `${rating}/${tier} non-empty`);
    assert.ok(!/_/.test(phrase), `${rating}/${tier} has no raw enum underscore`);
    assert.ok(!/widen|narrow(ing|ed)|was weaker/i.test(phrase), `${rating}/${tier} claims no trajectory`);
  }
}

console.log("moat-plain-language: all assertions passed");
