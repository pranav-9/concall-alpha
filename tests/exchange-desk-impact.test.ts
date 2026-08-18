import assert from "node:assert/strict";

import {
  coerceImpact,
  isRiskFlagged,
  IMPACT_META,
  type ExchangeImpact,
} from "../lib/exchange-desk/types";

// The desk flags only the risk tail (severe/negative). This is an ALLOWLIST, not
// a denylist: neutral, positive, transformative — and, via coerceImpact, null /
// unknown / future values — must all render NOTHING. The likely regression is
// someone rewriting the gate as "show unless neutral", which would flag rows whose
// impact is null (coerced to neutral). Pin the whole contract.

const FLAGGED: ExchangeImpact[] = ["negative", "severe"];
const UNMARKED: ExchangeImpact[] = ["transformative", "positive", "neutral"];

for (const impact of FLAGGED) {
  assert.equal(isRiskFlagged(impact), true, `${impact} should flag`);
  const meta = IMPACT_META[impact];
  assert.ok(meta && meta.label && meta.className, `${impact} needs badge meta`);
}
for (const impact of UNMARKED) {
  assert.equal(isRiskFlagged(impact), false, `${impact} should NOT flag`);
}

// coerceImpact maps null/unknown/empty -> "neutral", so the flag path can never be
// reached by a missing or garbage DB value.
for (const raw of [null, undefined, "", "garbage", "Positive", "SEVERE"]) {
  assert.equal(coerceImpact(raw), "neutral", `raw ${String(raw)} -> neutral`);
  assert.equal(isRiskFlagged(coerceImpact(raw)), false, `raw ${String(raw)} must not flag`);
}

// Known values round-trip through coerceImpact unchanged.
for (const known of ["transformative", "positive", "neutral", "negative", "severe"]) {
  assert.equal(coerceImpact(known), known);
}

console.log("exchange-desk-impact: all assertions passed");
