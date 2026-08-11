import assert from "node:assert/strict";

import type { CompanyTrail } from "../lib/home-trails";
import {
  pickFeaturedRead,
  type FeaturedCandidate,
} from "../lib/home-featured-read-core";

// The picker only reads .code/.name/.sector/.trail through to its output; the
// trail's internals don't matter to selection, so a minimal stub is enough.
const stubTrail = (code: string): CompanyTrail =>
  ({ code, name: code, points: [], latest: 0 } as unknown as CompanyTrail);

const cand = (over: Partial<FeaturedCandidate>): FeaturedCandidate => ({
  code: "X",
  name: "X",
  sector: null,
  concallScore: 8,
  growthScore: 8,
  valuationScore: 7,
  trail: stubTrail(over.code ?? "X"),
  ...over,
});

// 1. Highest composite among positive verdicts wins.
{
  const strong = cand({ code: "AAA", concallScore: 8.6, growthScore: 8.6, valuationScore: 7 });
  const weaker = cand({ code: "BBB", concallScore: 8.0, growthScore: 8.0, valuationScore: 6 });
  const got = pickFeaturedRead([weaker, strong]);
  assert.ok(got, "should pick a company");
  assert.equal(got.code, "AAA", "picks the highest composite");
}

// 2. A negative verdict is NEVER featured (soft print + soft outlook = cheap_weak).
{
  const negative = cand({ code: "WEAK", concallScore: 2.5, growthScore: 2.5, valuationScore: 8 });
  assert.equal(pickFeaturedRead([negative]), null, "negative verdict must not surface");
}

// 3. All three legs are required — a missing valuation drops the candidate.
{
  const noVal = cand({ code: "NOVAL", valuationScore: null });
  assert.equal(pickFeaturedRead([noVal]), null, "missing valuation leg must not surface");
}
{
  const noGrowth = cand({ code: "NOGROW", growthScore: null });
  assert.equal(pickFeaturedRead([noGrowth]), null, "missing growth leg must not surface");
}

// 4. Empty pool -> null (the hero falls back to the trail plate).
assert.equal(pickFeaturedRead([]), null, "empty pool returns null");

// 5. The returned verdict is always one of the positive families.
{
  const good = cand({ code: "GOOD", concallScore: 8.6, growthScore: 8.6, valuationScore: 7 });
  const got = pickFeaturedRead([good]);
  assert.ok(got, "should pick a company");
  assert.ok(
    ["aligned_cheap", "priced_for_it", "outlook_led"].includes(got.readKey),
    `expected a positive read, got ${got.readKey}`,
  );
  assert.equal(got.readLabel.length > 0, true, "carries a human label");
}

// 6. Selection is deterministic on ties (code order).
{
  const a = cand({ code: "ZZZ", concallScore: 8.5, growthScore: 8.5, valuationScore: 7 });
  const b = cand({ code: "AAA", concallScore: 8.5, growthScore: 8.5, valuationScore: 7 });
  const got = pickFeaturedRead([a, b]);
  assert.equal(got?.code, "AAA", "ties break on code so the choice is stable");
}

console.log("home-featured-read: all assertions passed");
