import assert from "node:assert/strict";

import type { ReportingQuarter } from "../lib/current-quarter";
import { extractFyQuarter, normalizeGuidanceTrackingRows } from "../lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow } from "../lib/guidance-tracking/types";
import { buildGuidanceVerdict, classifyGuidanceItem, readDelivered, valueTrail } from "../lib/guidance-tracking/verdict";

// Ship-workflow adversarial review (Claude subagent + Codex, 2026-09-06) found
// five real defects in the horizon/delta layer, all fixed inline. These pin
// each fix so a future edit can't silently reintroduce it.

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

const CURRENT: ReportingQuarter = { fy: 2027, qtr: 2, label: "Q2 FY27" };

let nextId = 0;
const mkRow = (
  o: Partial<GuidanceTrackingRow> & {
    text: string;
    family?: string;
    subtype?: string;
    to: string;
    htype?: string;
    status: string;
    value?: Record<string, unknown>;
    trail?: unknown[];
  },
): GuidanceTrackingRow => {
  nextId += 1;
  const defaultTrail = [
    {
      quarter: "Q1 FY24",
      document_type: "concall",
      document_label: "d",
      mention_type: "first_mention",
      excerpt: "e",
      summary: "s",
      source_reference: null,
      confidence: 0.9,
      value: null,
      horizon: null,
    },
  ];
  return {
    id: nextId,
    company_code: "X",
    guidance_key: `k${nextId}`,
    guidance_text: o.text,
    guidance_family: o.family ?? "growth",
    metric_subtype: o.subtype ?? "revenue",
    segment: null,
    value: o.value ?? { magnitude_percent: null, value_text: "" },
    horizon: { horizon_type: o.htype ?? "multi_quarter", applies_from: o.to, applies_to: o.to, horizon_text: o.to },
    trail: o.trail ?? defaultTrail,
    status: o.status,
    status_reason: "r",
    latest_view: "lv",
    confidence: 0.9,
  };
};

// ---------------------------------------------------------------------------
// 1. extractFyQuarter / horizonPhase recognize H1/H2 half-year horizons
//    (Codex finding: a horizon literally stated as "H1 FY27" fell through to
//    the FY-only fallback — deadline Q4 — so it stayed "live" for two extra
//    quarters after H1 itself concluded).
// ---------------------------------------------------------------------------

test("extractFyQuarter: H1/H2 map to the quarter each half concludes at", () => {
  assert.deepEqual(extractFyQuarter("H1 FY27"), { fy: 2027, qtr: 2 });
  assert.deepEqual(extractFyQuarter("H2 FY27"), { fy: 2027, qtr: 4 });
  assert.deepEqual(extractFyQuarter("H1 FY'26"), { fy: 2026, qtr: 2 });
});

test("classifyGuidanceItem: an H1-due active commitment is elapsed once H1 itself has passed, not at FY-end", () => {
  const [h1] = normalizeGuidanceTrackingRows([mkRow({ text: "H1 target", to: "H1 FY27", status: "active" })]);
  assert.deepEqual(classifyGuidanceItem(h1, CURRENT), { phase: "resolved", outcome: "unclear" });
});

test("classifyGuidanceItem: an H2-due active commitment stays live at Q2 FY27 (H2 ends at Q4)", () => {
  const [h2] = normalizeGuidanceTrackingRows([mkRow({ text: "H2 target", to: "H2 FY27", status: "active" })]);
  assert.deepEqual(classifyGuidanceItem(h2, CURRENT), { phase: "live", state: "on_track" });
});

// ---------------------------------------------------------------------------
// 2. readDelivered's absolute branch now trusts a STRUCTURED delivered value
//    (numeric_value + unit) instead of forcing valueKind to null and falling
//    back to a value_text regex that only recognizes crore/million tokens
//    (Codex finding: silently dropped the delta on any other phrasing).
// ---------------------------------------------------------------------------

test("readDelivered: uses the outcome step's structured numeric_value+unit even when value_text has no recognizable unit token", () => {
  const [structuredAbs] = normalizeGuidanceTrackingRows([
    mkRow({
      text: "Absolute target",
      to: "FY25",
      status: "met",
      value: { magnitude_percent: null, value_text: "target reached", value_kind: "absolute", numeric_value: 500, unit: "INRcr" },
      trail: [
        {
          quarter: "Q1 FY24",
          document_type: "concall",
          document_label: "d",
          mention_type: "first_mention",
          excerpt: "e",
          summary: "s",
          source_reference: null,
          confidence: 0.9,
          value: { value_text: "target reached", magnitude_percent: null },
          horizon: null,
        },
        {
          quarter: "Q4 FY25",
          document_type: "concall",
          document_label: "d",
          mention_type: "met",
          excerpt: "e",
          summary: "s",
          source_reference: null,
          confidence: 0.9,
          value: { value_text: "delivered as guided", magnitude_percent: null, value_kind: "absolute", numeric_value: 520, unit: "INRcr" },
          horizon: null,
        },
      ],
    }),
  ]);
  const delivered = readDelivered(structuredAbs);
  assert.equal(delivered?.label, "₹520 cr");
  assert.deepEqual(delivered?.numeric, { kind: "absolute", lo: 520, hi: 520, unitKey: "cr" });
});

// ---------------------------------------------------------------------------
// 3. guidance_family / metric_subtype are cross-validated — a malformed pair
//    (e.g. family="margin" with subtype="revenue") nulls BOTH instead of
//    rendering a coherent-looking but wrong label (Codex finding).
// ---------------------------------------------------------------------------

test("normalizeGuidanceTrackingRows: a mismatched family/subtype pair nulls both rather than mislabeling", () => {
  const [mismatch] = normalizeGuidanceTrackingRows([
    mkRow({ text: "Weird pairing", family: "margin", subtype: "revenue", to: "FY25", status: "met" }),
  ]);
  assert.equal(mismatch.guidanceFamily, null);
  assert.equal(mismatch.metricSubtype, null);
  assert.equal(mismatch.metricLabel, null);
});

test("normalizeGuidanceTrackingRows: a valid family/subtype pair is unaffected by the cross-check", () => {
  const [valid] = normalizeGuidanceTrackingRows([
    mkRow({ text: "Valid pairing", family: "margin", subtype: "gross_margin", to: "FY25", status: "met" }),
  ]);
  assert.equal(valid.guidanceFamily, "margin");
  assert.equal(valid.metricSubtype, "gross_margin");
  assert.equal(valid.metricLabel, "Gross margin");
});

// ---------------------------------------------------------------------------
// 4. The resolved sort's recency comparator no longer returns NaN when BOTH
//    rows have unparseable horizons (-Infinity - -Infinity = NaN, whose
//    comparator-return behavior is unspecified across JS engines) — it now
//    deterministically falls through to the outcome tiebreak (Codex finding).
// ---------------------------------------------------------------------------

test("buildGuidanceVerdict: two resolved rows with unparseable horizons sort deterministically by outcome, not NaN", () => {
  const items = normalizeGuidanceTrackingRows([
    mkRow({ text: "Unparseable met", to: "not a real period", htype: "unspecified", status: "met" }),
    mkRow({ text: "Unparseable missed", to: "not a real period", htype: "unspecified", status: "missed" }),
  ]);
  const v = buildGuidanceVerdict(items, CURRENT);
  assert.equal(v.resolved.length, 2);
  // Outcome tiebreak: met (0) before missed (1) — proves the comparator
  // didn't short-circuit on a NaN recency delta.
  assert.equal(v.resolved[0].outcome, "met");
  assert.equal(v.resolved[1].outcome, "missed");
});

// ---------------------------------------------------------------------------
// 5. valueTrail's anti-duplicate guard fails CLOSED (suppresses the append)
//    when the trail's last real step has an unparseable quarter, instead of
//    failing open and reintroducing the stale-canonical-value bug it exists
//    to close (Claude adversarial subagent finding).
// ---------------------------------------------------------------------------

test("valueTrail: a trail whose last real step has an unparseable quarter does not re-append a stale canonical value", () => {
  const [item] = normalizeGuidanceTrackingRows([
    mkRow({
      text: "Unparseable-quarter trail",
      to: "FY27",
      status: "active",
      value: { magnitude_percent: 20, value_text: "20% growth", value_kind: "percent", numeric_value: 20, unit: "pct" },
      trail: [
        {
          quarter: "not a real quarter",
          document_type: "concall",
          document_label: "d",
          mention_type: "first_mention",
          excerpt: "e",
          summary: "s",
          source_reference: null,
          confidence: 0.9,
          value: { value_text: "15% growth", magnitude_percent: 15 },
          horizon: null,
        },
      ],
    }),
  ]);
  const trail = valueTrail(item);
  // Only the one real trail step — the canonical "20%" (which differs from
  // the trail's "15%") must NOT be re-appended as a fake newer step, because
  // we can't establish it's actually newer than an unparseable-quarter step.
  assert.deepEqual(trail.map((s) => s.label), ["15%"]);
});

console.log("guidance-verdict-adversarial-fixes: all assertions passed");
