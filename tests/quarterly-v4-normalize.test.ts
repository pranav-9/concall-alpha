import assert from "node:assert/strict";

import { normalizeQuarterlyV4Categories } from "../lib/quarterly-v4/normalize";

// v4 now lives as concall_analysis.details.v4_categories — a bare 7-cat object.
// normalizeQuarterlyV4Categories(rawCategories, quarterLabel, scoreBreakdown?)
// validates + shapes it; the optional 3rd arg is details.score_breakdown (per-cat
// leans -2..+2) mapped onto each addressed category's `lean`.

function addressed(...points: string[]) {
  return { state: "addressed", key_points: points };
}

function validCategories(): Record<string, unknown> {
  return {
    cat_1_quantitative_decomposition: addressed("Rev +34% YoY", "EBITDA margin 34.2%", "FY26 +41%"),
    cat_2_forward_guidance: addressed("FY27 margin 30% reiterated"),
    cat_3_strategy_capital_allocation: addressed("New peptide block"),
    cat_4_industry_context: addressed("GLP-1 demand"),
    cat_5_concentration_dependencies: {
      state: "absent_in_concall",
      absence_justification: "Searched for concentration; not raised this call.",
    },
    cat_6_management_quality: { state: "deferred_v2", deferred_reason: "Cross-quarter, v2." },
    cat_7_qa_signals: addressed("Pressed on milestone"),
  };
}

// 1. Valid → normalized, 7 cats ordered, ranked points, label passed through.
{
  const n = normalizeQuarterlyV4Categories(validCategories(), "Q4 FY26");
  assert.ok(n, "valid categories should normalize");
  assert.equal(n!.quarterLabel, "Q4 FY26");
  assert.equal(n!.categories.length, 7);
  assert.deepEqual(n!.categories.map((c) => c.number), [1, 2, 3, 4, 5, 6, 7]);

  const cat1 = n!.categories[0];
  assert.equal(cat1.state, "addressed");
  assert.deepEqual(cat1.keyPoints, ["Rev +34% YoY", "EBITDA margin 34.2%", "FY26 +41%"]);

  const cat5 = n!.categories[4];
  assert.equal(cat5.state, "absent_in_concall");
  assert.ok(cat5.absenceJustification);
  assert.equal(cat5.keyPoints.length, 0);

  const cat6 = n!.categories[5];
  assert.equal(cat6.state, "deferred_v2");
  assert.ok(cat6.deferredReason);
}

// 2. null / non-object → null.
assert.equal(normalizeQuarterlyV4Categories(null, "Q4 FY26"), null);
assert.equal(normalizeQuarterlyV4Categories(undefined, "Q4 FY26"), null);

// 3. Addressed with zero key_points → null (fail closed).
{
  const c = validCategories();
  c.cat_1_quantitative_decomposition = { state: "addressed", key_points: [] };
  assert.equal(normalizeQuarterlyV4Categories(c, "Q4 FY26"), null);
}

// 4. Addressed with >3 key_points → null.
{
  const c = validCategories();
  c.cat_1_quantitative_decomposition = { state: "addressed", key_points: ["a", "b", "c", "d"] };
  assert.equal(normalizeQuarterlyV4Categories(c, "Q4 FY26"), null);
}

// 5. Absent without justification → null.
{
  const c = validCategories();
  c.cat_5_concentration_dependencies = { state: "absent_in_concall" };
  assert.equal(normalizeQuarterlyV4Categories(c, "Q4 FY26"), null);
}

// 6. cat 6 not deferred → null.
{
  const c = validCategories();
  c.cat_6_management_quality = { state: "addressed", key_points: ["x"] };
  assert.equal(normalizeQuarterlyV4Categories(c, "Q4 FY26"), null);
}

// 7. Missing a category → null.
{
  const c = validCategories();
  delete c.cat_7_qa_signals;
  assert.equal(normalizeQuarterlyV4Categories(c, "Q4 FY26"), null);
}

// 8. score_breakdown leans mapped onto addressed cats; absent/deferred stay null.
{
  const breakdown = {
    cat_1_quantitative_decomposition: 2,
    cat_2_forward_guidance: 1,
    cat_3_strategy_capital_allocation: 0,
    cat_4_industry_context: -1,
    cat_5_concentration_dependencies: -2, // absent cat — lean must be ignored
    cat_7_qa_signals: 1,
  };
  const n = normalizeQuarterlyV4Categories(validCategories(), "Q4 FY26", breakdown);
  assert.ok(n);
  const byKey = Object.fromEntries(n!.categories.map((c) => [c.key, c]));
  assert.equal(byKey.cat_1_quantitative_decomposition.lean, 2);
  assert.equal(byKey.cat_2_forward_guidance.lean, 1);
  assert.equal(byKey.cat_3_strategy_capital_allocation.lean, 0);
  assert.equal(byKey.cat_4_industry_context.lean, -1);
  assert.equal(byKey.cat_7_qa_signals.lean, 1);
  // absent cat_5 and deferred cat_6 never carry a lean, even if breakdown has one.
  assert.equal(byKey.cat_5_concentration_dependencies.lean, null);
  assert.equal(byKey.cat_6_management_quality.lean, null);
}

// 9. Missing key / non-integer / out-of-range lean → null (no fabricated 0).
{
  const breakdown = {
    cat_1_quantitative_decomposition: 1.5, // non-integer
    cat_2_forward_guidance: 3, // out of [-2, 2]
    cat_4_industry_context: "0", // wrong type
    // cat_3, cat_7 missing entirely
  };
  const n = normalizeQuarterlyV4Categories(validCategories(), "Q4 FY26", breakdown);
  assert.ok(n);
  const byKey = Object.fromEntries(n!.categories.map((c) => [c.key, c]));
  assert.equal(byKey.cat_1_quantitative_decomposition.lean, null);
  assert.equal(byKey.cat_2_forward_guidance.lean, null);
  assert.equal(byKey.cat_4_industry_context.lean, null);
  assert.equal(byKey.cat_3_strategy_capital_allocation.lean, null);
  assert.equal(byKey.cat_7_qa_signals.lean, null);
}

// 10. No score_breakdown arg → addressed leans default to null (legacy call).
{
  const n = normalizeQuarterlyV4Categories(validCategories(), "Q4 FY26");
  assert.ok(n);
  assert.equal(n!.categories[0].lean, null);
}

console.log("quarterly-v4-normalize.test.ts: all assertions passed");
