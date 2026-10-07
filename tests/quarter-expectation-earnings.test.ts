import assert from "node:assert/strict";

import type { NormalizedGuidanceItem } from "../lib/guidance-tracking/types";
import { readGuided } from "../lib/guidance-tracking/verdict";
import { buildExpectedEarnings } from "../lib/quarter-expectation/earnings";

const TARGET = { fy: 2027, qtr: 2, label: "Q2 FY27" };

let nextId = 1;
const item = (overrides: Partial<NormalizedGuidanceItem> = {}): NormalizedGuidanceItem => ({
  id: nextId++,
  companyCode: "MOCK",
  guidanceKey: `k${nextId}`,
  guidanceText: "default text",
  guidanceFamily: "growth",
  metricSubtype: "revenue",
  metricLabel: "Revenue growth",
  metricLabelMidSentence: "revenue growth",
  segment: null,
  segmentCanonical: null,
  horizonType: "single_fy",
  appliesFrom: "FY27",
  appliesTo: "FY27",
  horizonLabel: "FY27",
  valuePercent: 20,
  valueText: "20%",
  valueKind: "percent",
  numericValue: 20,
  unit: "%",
  firstMentionPeriod: "Q1 FY27",
  latestMentionPeriod: "Q1 FY27",
  mentionedPeriods: [],
  statusKey: "active",
  statusLabel: "Active",
  latestView: null,
  statusReason: null,
  confidence: null,
  generatedAtRaw: null,
  sourceMentions: [],
  trail: [],
  ...overrides,
});

const build = (items: NormalizedGuidanceItem[]) => buildExpectedEarnings({ target: TARGET, guidanceItems: items });

// Nothing to say → null (the column is omitted, never an empty box).
assert.equal(build([]), null);
assert.equal(build([item({ appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" })]), null);
assert.equal(build([item({ horizonType: "rolling", appliesFrom: "ongoing", appliesTo: "ongoing", horizonLabel: null })]), null);

// One line per family, growth first, with the guided value and horizon.
{
  const growth = item();
  const margin = item({ guidanceFamily: "margin", metricSubtype: "ebitda_margin", metricLabel: "EBITDA margin", valueKind: "percent_level", valuePercent: 24, numericValue: 24, valueText: "24%" });
  const out = build([margin, growth]);
  assert.ok(out);
  assert.equal(out!.lines.length, 2);
  assert.equal(out!.lines[0].metricLabel, "Revenue growth");
  assert.equal(out!.lines[0].valueLabel, readGuided(growth).label);
  assert.equal(out!.lines[0].horizonLabel, "FY27");
  assert.equal(out!.lines[0].segment, null);
  assert.equal(out!.lines[0].sectionId, "guidance-history");
  assert.equal(out!.lines[1].metricLabel, "EBITDA margin");
}

// Whole-company guide outranks a segment guide; a lone segment guide is kept
// and named.
{
  const seg = item({ segment: "Defence", metricLabel: "Revenue growth" });
  const whole = item({ guidanceKey: "whole" });
  const a = build([seg, whole]);
  assert.equal(a!.lines[0].segment, null);
  const b = build([seg]);
  assert.equal(b!.lines[0].segment, "Defence");
  // "Consolidated" written into the segment slot is still whole-company.
  const c = build([item({ segment: "Consolidated" })]);
  assert.equal(c!.lines[0].segment, null);
}

// A guide dated the target quarter itself (ungraded) outranks the FY guide.
{
  const q2 = item({ horizonType: "single_quarter", appliesFrom: "Q2 FY27", appliesTo: "Q2 FY27", horizonLabel: "Q2 FY27", valuePercent: 5, numericValue: 5, valueText: "5%" });
  const out = build([item(), q2]);
  assert.equal(out!.lines[0].horizonLabel, "Q2 FY27");
}

// An unquantified guide (COFORGE's "exceptional growth") shows the producer's
// text, never an invented number.
{
  const out = build([item({ valuePercent: null, numericValue: null, valueKind: null, unit: null, valueText: "exceptional growth year; industry-leading growth" })]);
  assert.equal(out!.lines[0].valueLabel, "exceptional growth year; industry-leading growth");
}

// No value text at all → the guidance text, clipped.
{
  const long = "x".repeat(120);
  const out = build([item({ valuePercent: null, numericValue: null, valueKind: null, unit: null, valueText: null, guidanceText: long })]);
  assert.equal(out!.lines[0].valueLabel.length, 80);
  assert.ok(out!.lines[0].valueLabel.endsWith("…"));
}

console.log("quarter-expectation-earnings: ok");

// ---------------------------------------------------------------------------
// Rupee figures from quarterly_financials
// ---------------------------------------------------------------------------
import { buildImpliedQuarter, buildRunRate } from "../lib/quarter-expectation/earnings";
import type { QuarterlyFinancialsRow } from "../lib/quarter-expectation/types";

const fin = (fy: number, qtr: number, revenue: number | null, opm: number | null = 20): QuarterlyFinancialsRow => ({
  company_code: "MOCK",
  fy,
  qtr,
  period_end: "2026-06-30",
  basis: "consolidated",
  revenue_cr: revenue,
  opm_pct: opm,
  net_profit_cr: null,
});

// Two years of quarters, FY26 = 100/110/120/130, FY27 Q1 = 125 (+25% YoY).
const ROWS: QuarterlyFinancialsRow[] = [
  fin(2025, 1, 80), fin(2025, 2, 88), fin(2025, 3, 96), fin(2025, 4, 104),
  fin(2026, 1, 100), fin(2026, 2, 110), fin(2026, 3, 120), fin(2026, 4, 130, 22),
  fin(2027, 1, 125, 24),
];

// Run-rate: the four quarters before Q2 FY27 (Q2 FY26…Q1 FY27) vs their year-ago rows.
{
  const rr = buildRunRate(ROWS, TARGET);
  assert.ok(rr);
  assert.equal(rr!.yoyPairs, 4);
  assert.equal(rr!.revenueYoyPct, 25); // all four pairs are +25%
  assert.equal(rr!.opmPct, 21.5); // (20+20+22+24)/4
  assert.equal(rr!.latestLabel, "Q1 FY27");
  // Fewer than two YoY pairs → null; the target's own row never counts.
  assert.equal(buildRunRate([fin(2026, 1, 100), fin(2027, 1, 125)], TARGET), null);
  assert.equal(buildRunRate([fin(2027, 2, 999)], TARGET), null);
}

// Implied: the FY27 revenue guide × the year-ago quarter (Q2 FY26 = 110).
{
  const growth = item();
  const margin = item({ guidanceFamily: "margin", metricSubtype: "ebitda_margin", metricLabel: "EBITDA margin", valueKind: "percent_level", valuePercent: 24, numericValue: 24, valueText: "24-25%" });
  const imp = buildImpliedQuarter(ROWS, TARGET, growth, margin);
  assert.ok(imp);
  assert.equal(imp!.yearAgoLabel, "Q2 FY26");
  assert.equal(imp!.yearAgoRevenueCr, 110);
  assert.equal(imp!.revenueLoCr, 132);
  assert.equal(imp!.revenueHiCr, 132);
  assert.equal(imp!.opmLo, 24);
  assert.equal(imp!.opmHi, 25);
  // A range guide gives a range; a segment or unquantified guide gives nothing.
  const range = buildImpliedQuarter(ROWS, TARGET, item({ valueText: "20-25%", numericValue: null, valuePercent: null }), null);
  assert.equal(range!.revenueLoCr, 132);
  assert.equal(range!.revenueHiCr, 138);
  assert.equal(buildImpliedQuarter(ROWS, TARGET, item({ segment: "Defence" }), null), null);
  assert.equal(buildImpliedQuarter(ROWS, TARGET, item({ valuePercent: null, numericValue: null, valueKind: null, valueText: "exceptional" }), null), null);
  assert.equal(buildImpliedQuarter([], TARGET, growth, null), null);
}

// buildExpectedEarnings threads both through, and run-rate alone is enough for a column.
{
  const out = buildExpectedEarnings({ target: TARGET, guidanceItems: [item()], financials: ROWS });
  assert.equal(out!.basis, "consolidated");
  assert.equal(out!.implied!.revenueLoCr, 132);
  assert.equal(out!.runRate!.revenueYoyPct, 25);
  const noGuide = buildExpectedEarnings({ target: TARGET, guidanceItems: [], financials: ROWS });
  assert.equal(noGuide!.lines.length, 0);
  assert.equal(noGuide!.runRate!.yoyPairs, 4);
  assert.equal(buildExpectedEarnings({ target: TARGET, guidanceItems: [], financials: [] }), null);
}

console.log("quarter-expectation-earnings (financials): ok");
