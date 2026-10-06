import assert from "node:assert/strict";

import { formatAbsoluteValue, formatGuidedValue, readNumericValue, type ValueFields } from "../lib/guidance-tracking/format";
import { normalizeGuidanceTrackingRows } from "../lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow } from "../lib/guidance-tracking/types";
import { revisionDirection, valueTrail } from "../lib/guidance-tracking/verdict";

// A trail step's label and its number must describe the SAME figure: the value
// trail prints one and compares the other. Cases are the live rows behind the
// fake "Raised" chips on 2026-10-06.

const v = (o: Partial<ValueFields>): ValueFields => ({
  valuePercent: null,
  valueText: null,
  valueKind: null,
  numericValue: null,
  unit: null,
  ...o,
});

// RATNAVEER: stored 200, the text also carries 1,500 — the label must be the stored figure.
const ratnaveer = v({ valueText: "Rs 200 cr value-added within 1,500 cr", valueKind: "absolute", numericValue: 200, unit: "INRcr" });
assert.equal(formatAbsoluteValue(ratnaveer), "₹200cr", "label = the amount that IS the stored number, not the last one");
assert.deepEqual(readNumericValue(ratnaveer), { kind: "absolute", lo: 200, hi: 200, unitKey: "cr" });

// A stored number no amount in the text supports: the text is the source of truth (schema), so it wins —
// label AND number (MARKSANS stored 400000 on "INR 4,000 crores" and printed a fake raise).
const marksans = v({ valueText: "INR 4,000 crores", valueKind: "absolute", numericValue: 400000, unit: "INRcr" });
assert.equal(formatAbsoluteValue(marksans), "₹4000cr");
assert.deepEqual(readNumericValue(marksans), { kind: "absolute", lo: 4000, hi: 4000, unitKey: "cr" });

// …and a text with no amount at all falls back to the stored number.
assert.equal(formatAbsoluteValue(v({ valueText: "a meaningful step-up", valueKind: "absolute", numericValue: 200, unit: "INRcr" })), "₹200 cr");

// Producers spell crore several ways; all of them match the text.
const spelled = v({ valueText: "₹350-400 crore", valueKind: "absolute", numericValue: 375, unit: "INR_cr" });
assert.equal(formatAbsoluteValue(spelled), "₹350-400cr");
assert.deepEqual(readNumericValue(spelled), { kind: "absolute", lo: 350, hi: 400, unitKey: "cr" });

// Billions in the text, crore in the store: one figure, compared in the stored unit.
const billions = v({ valueText: "towards the INR 19 billion to INR 20 billion mark", valueKind: "absolute", numericValue: 1950, unit: "INRcr" });
assert.equal(readNumericValue(billions)?.unitKey, "cr");
assert.equal(readNumericValue(billions)?.lo, 2000, "matched amount (₹20B) converted to ₹2,000 cr");

// A band around the stored number keeps its verbatim phrasing — label and number agree on the band.
const band = v({ valueText: "INR 60-70 crores per year", valueKind: "absolute", numericValue: 65, unit: "INRcr" });
assert.equal(formatAbsoluteValue(band), "₹60-70cr");
assert.deepEqual(readNumericValue(band), { kind: "absolute", lo: 60, hi: 70, unitKey: "cr" });

// …but a band elsewhere in the text is not the stored number's band.
const otherBand = v({ valueText: "₹500 cr this year, ₹700-800 cr by FY28", valueKind: "absolute", numericValue: 500, unit: "INRcr" });
assert.equal(formatAbsoluteValue(otherBand), "₹500cr");
assert.deepEqual(readNumericValue(otherBand), { kind: "absolute", lo: 500, hi: 500, unitKey: "cr" });

// SHREEREF: text only, two different P&L lines — no guess.
const shreeref = v({ valueText: "Turnover 1000Cr., PAT 120 Cr." });
assert.equal(formatAbsoluteValue(shreeref), null, "two lines named, no stored number → no label");
assert.equal(readNumericValue(shreeref), null, "…and no number to compare");

// A revision sequence still reads its LAST amount (the current target) — unchanged behaviour.
const revision = v({ valueText: "INR 1,500 crores, later revised to INR 1,800 crores" });
assert.equal(formatAbsoluteValue(revision), "₹1500cr".replace("1500", "1800"));
assert.deepEqual(readNumericValue(revision), { kind: "absolute", lo: 1800, hi: 1800, unitKey: "cr" });

// RISHABH: a legacy number in valuePercent is a percent reading — the label must not be an amount from the text.
const rishabh = v({ valueText: "target of INR45 crores", valuePercent: 50 });
assert.equal(formatAbsoluteValue(rishabh), null);
assert.equal(formatGuidedValue(rishabh), "50%", "label on the same axis readNumericValue uses");
assert.equal(readNumericValue(rishabh)?.kind, "percent");

// ── The trail end to end: SHREEREF's revenue thread no longer "rises" ₹120cr → ₹1000cr. ──

const step = (quarter: string, value: Record<string, unknown>) => ({
  quarter,
  document_type: "concall",
  document_label: `${quarter} Concall`,
  mention_type: "reiteration",
  excerpt: "excerpt",
  summary: "s",
  source_reference: null,
  confidence: 0.9,
  value,
  horizon: null,
});
const thread = (trail: ReturnType<typeof step>[], value: Record<string, unknown>): GuidanceTrackingRow => ({
  id: 1,
  company_code: "MOCK",
  guidance_key: "k1",
  guidance_text: "Revenue target",
  guidance_family: "growth",
  metric_subtype: "revenue",
  segment: null,
  value,
  horizon: { horizon_type: "multi_fy", applies_from: "FY26", applies_to: "FY31", horizon_text: "FY26–FY31" },
  trail,
  status: "active",
  status_reason: "r",
  latest_view: "l",
  confidence: 0.9,
});

const [shrItem] = normalizeGuidanceTrackingRows([
  thread(
    [
      step("Q2 FY26", { value_text: "Turnover 1000Cr., PAT 120 Cr.", magnitude_percent: null }),
      step("Q4 FY26", { value_text: "INR1,000 crore", magnitude_percent: null }),
    ],
    { value_text: "Turnover 1000Cr., PAT 120 Cr.", magnitude_percent: null, value_kind: "absolute", numeric_value: 1000, unit: "INRcr" },
  ),
]);
assert.deepEqual(valueTrail(shrItem).map((s) => s.label), ["₹1000cr"], "the ambiguous step drops out; nothing moved");
assert.equal(revisionDirection(shrItem), null, "no fake raise");

const [ratItem] = normalizeGuidanceTrackingRows([
  thread(
    [
      step("Q2 FY26", { value_text: "Rs 200 cr value-added within 1,500 cr", magnitude_percent: null, value_kind: "absolute", numeric_value: 200, unit: "INRcr" }),
      step("Q1 FY27", { value_text: "Rs 250 cr value-added", magnitude_percent: null, value_kind: "absolute", numeric_value: 250, unit: "INRcr" }),
    ],
    { value_text: "Rs 250 cr value-added", magnitude_percent: null, value_kind: "absolute", numeric_value: 250, unit: "INRcr" },
  ),
]);
assert.deepEqual(valueTrail(ratItem).map((s) => s.label), ["₹200cr", "₹250cr"], "labels follow the stored numbers");
assert.equal(revisionDirection(ratItem), "up", "a real 200 → 250 raise still reads as one");

// Rupee and dollar millions never compare (AIMTRON "₹25-30M → $30M").
assert.equal(readNumericValue(v({ valueText: "INR 25-30 million" }))?.unitKey, "₹M");
assert.equal(readNumericValue(v({ valueText: "$30 million" }))?.unitKey, "$M");
assert.equal(readNumericValue(v({ valueText: "USD 100 mn", valueKind: "absolute", numericValue: 100, unit: "USDmn" }))?.unitKey, "$M");

console.log("All guidance value label tests passed.");
