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
