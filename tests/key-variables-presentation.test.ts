import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTrendGeometry,
  compactPeriodLabel,
  formatTrendChange,
  formatValueWithUnit,
  trendSpanPhrase,
  classifyUnit,
  firstSentence,
  formatFirstToLatestChange,
  shortPeriodLabel,
  spanLabel,
  splitMetricName,
  splitUnitAffixes,
} from "../lib/key-variables-snapshot/presentation";
import { getThesisEffect } from "../app/company/components/thesis-effect";

test("getThesisEffect colours by effect on the case, not by sign", () => {
  // order book up → helps; NWC days up → hurts (the live bug this replaces)
  assert.equal(getThesisEffect(220, "higher_is_better"), "helps");
  assert.equal(getThesisEffect(28, "lower_is_better"), "hurts");
  assert.equal(getThesisEffect(-28, "lower_is_better"), "helps");
  assert.equal(getThesisEffect(-5, "higher_is_better"), "hurts");
  assert.equal(getThesisEffect(0, "lower_is_better"), "neutral");
  assert.equal(getThesisEffect(null), "neutral");
  assert.equal(getThesisEffect(Number.NaN), "neutral");
  // default direction is higher_is_better
  assert.equal(getThesisEffect(1), "helps");
});

test("splitMetricName pulls the unit out of the trailing parenthetical", () => {
  assert.deepEqual(splitMetricName("Order book (INR Cr)"), { name: "Order book", unit: "INR Cr" });
  assert.deepEqual(splitMetricName("Book-to-bill (x)"), { name: "Book-to-bill", unit: "x" });
  assert.deepEqual(splitMetricName("NWC"), { name: "NWC", unit: null });
  assert.deepEqual(splitMetricName("Utilisation ( )"), { name: "Utilisation", unit: null });
});

test("classifyUnit picks the change style per unit", () => {
  assert.equal(classifyUnit("₹ cr"), "amount");
  assert.equal(classifyUnit("INR Cr"), "amount");
  assert.equal(classifyUnit("MW"), "amount");
  assert.equal(classifyUnit(null), "amount");
  assert.equal(classifyUnit("days"), "days");
  assert.equal(classifyUnit("x"), "multiple");
  assert.equal(classifyUnit("times"), "multiple");
  assert.equal(classifyUnit("bps"), "bps");
  assert.equal(classifyUnit("%"), "percent");
});

test("splitUnitAffixes puts ₹ before and cr/days after", () => {
  assert.deepEqual(splitUnitAffixes("₹ cr"), { prefix: "₹", suffix: "cr" });
  assert.deepEqual(splitUnitAffixes("INR Cr"), { prefix: "₹", suffix: "cr" });
  assert.deepEqual(splitUnitAffixes("days"), { prefix: "", suffix: "days" });
  assert.deepEqual(splitUnitAffixes("$ mn"), { prefix: "$", suffix: "mn" });
  assert.deepEqual(splitUnitAffixes(null), { prefix: "", suffix: "" });
});

test("formatFirstToLatestChange: % for amounts, absolute for days / x / bps / %", () => {
  assert.deepEqual(formatFirstToLatestChange(640, 860, "amount"), { label: "+34%", delta: 220 });
  assert.deepEqual(formatFirstToLatestChange(118, 146, "days", "long"), { label: "+28 days", delta: 28 });
  assert.deepEqual(formatFirstToLatestChange(84, 103, "days"), { label: "+19 d", delta: 19 });
  assert.deepEqual(formatFirstToLatestChange(1.4, 1.7, "multiple"), { label: "+0.3x", delta: 0.30000000000000004 });
  assert.deepEqual(formatFirstToLatestChange(22, 50, "percent"), { label: "+28 pp", delta: 28 });
  assert.equal(formatFirstToLatestChange(150, 120, "days")?.label, "−30 d");
  // missing ends and a zero base are unformattable
  assert.equal(formatFirstToLatestChange(null, 10, "amount"), null);
  assert.equal(formatFirstToLatestChange(0, 10, "amount"), null);
  assert.equal(formatFirstToLatestChange(5, 5, "amount")?.label, "0%");
});

test("period labels shorten and the span reads in the right noun", () => {
  assert.equal(shortPeriodLabel("Q3 FY26"), "Q3");
  assert.equal(shortPeriodLabel("H1 FY26"), "H1");
  assert.equal(shortPeriodLabel("FY24"), "FY24");
  assert.equal(spanLabel(["Q3 FY26", "Q4 FY26", "Q1 FY27"]), "2 qtrs");
  assert.equal(spanLabel(["Q4 FY26", "Q1 FY27"]), "1 qtr"); // Q4 → Q1 rolls the fiscal year
  assert.equal(spanLabel(["FY24", "FY25", "FY26"]), "2 yrs");
  // call answers years apart are not "2 qtrs": name the start instead
  assert.equal(spanLabel(["Q3 FY24", "Q1 FY25", "Q4 FY26"]), "since Q3 FY24");
  assert.equal(spanLabel(["FY24", "FY26"]), "since FY24");
  assert.equal(spanLabel(["FY25", "Q1 FY27"]), "since FY25");
  assert.equal(spanLabel(["Q1 FY27"]), null);
});

test("firstSentence stops at the first terminal punctuation", () => {
  assert.equal(firstSentence("Defence WIP rose three quarters running. Every 10 days is ₹25 cr."), "Defence WIP rose three quarters running.");
  assert.equal(firstSentence("No terminal punctuation here"), "No terminal punctuation here");
  assert.equal(firstSentence("Up ~1.5x vs FY25. Next?"), "Up ~1.5x vs FY25.");
});

test("compactPeriodLabel shortens quarter labels and leaves years alone", () => {
  assert.equal(compactPeriodLabel("Q2 FY25"), "Q2'25");
  assert.equal(compactPeriodLabel("H1 FY2026"), "H1'26");
  assert.equal(compactPeriodLabel("FY24"), "FY24");
  assert.equal(compactPeriodLabel("Sep 2025"), "Sep 2025");
});

test("formatTrendChange reads a doubling as a multiple, everything else as before", () => {
  assert.deepEqual(formatTrendChange(410, 860, "amount"), { label: "2.1×", delta: 450 });
  assert.deepEqual(formatTrendChange(590, 860, "amount"), { label: "+46%", delta: 270 });
  assert.deepEqual(formatTrendChange(104, 146, "days"), { label: "+42 days", delta: 42 });
  assert.equal(formatTrendChange(null, 146, "days"), null);
  // a negative base never becomes a multiple
  assert.equal(formatTrendChange(-10, 30, "amount")?.label, "+400%");
});

test("formatValueWithUnit words the point labels", () => {
  assert.equal(formatValueWithUnit(860, "₹", "cr"), "₹860 cr");
  assert.equal(formatValueWithUnit(146, "", "days"), "146 d");
  assert.equal(formatValueWithUnit(24.5, "", "%"), "24.5%");
  assert.equal(formatValueWithUnit(1.7, "", "x"), "1.7×");
  assert.equal(formatValueWithUnit(40, "", "of revenue"), "40");
});

test("buildTrendGeometry places points, skips gaps and keeps the guide label off the line", () => {
  const periods = ["Q3 FY26", "Q4 FY26", "Q1 FY27", "Q2 FY27"];
  const geometry = buildTrendGeometry(periods, [104, null, 118, 146], 120);
  assert.ok(geometry);
  assert.deepEqual(geometry.points.map((p) => p.index), [0, 2, 3]);
  assert.equal(geometry.points[0].x, 0);
  assert.equal(geometry.points[2].x, 100);
  // higher value sits higher (smaller y), everything inside the box
  assert.ok(geometry.points[2].y < geometry.points[0].y);
  assert.ok(geometry.points.every((p) => p.y > 0 && p.y < 100));
  assert.ok(geometry.guideY != null && geometry.guideY > geometry.points[2].y);
  // the inner point (118) is under the guide, so the label rides above the line there
  assert.deepEqual(geometry.guideLabel, { x: geometry.points[1].x, side: "above" });
  // every inner point over the guide → label goes below
  assert.equal(buildTrendGeometry(periods, [130, 140, 150, 160], 120)?.guideLabel?.side, "below");
  // flat series and single values
  assert.ok(buildTrendGeometry(["FY24", "FY25"], [35, 35]));
  assert.equal(buildTrendGeometry(["FY24", "FY25"], [35, null]), null);
});

test("trendSpanPhrase names the window behind the hero change", () => {
  const q = ["Q2 FY25", "Q3 FY25", "Q4 FY25", "Q1 FY26", "Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27"];
  assert.equal(trendSpanPhrase(q), "in 2 years");
  assert.equal(trendSpanPhrase(q.slice(-4)), "in 1 year");
  assert.equal(trendSpanPhrase(q.slice(-3)), "in 2 qtrs");
  assert.equal(trendSpanPhrase(["FY24", "FY25", "FY26"]), "in 2 years");
  assert.equal(trendSpanPhrase(["Q3 FY24", "Q1 FY27"]), "since Q3 FY24");
  assert.equal(trendSpanPhrase(["FY26"]), null);
});
