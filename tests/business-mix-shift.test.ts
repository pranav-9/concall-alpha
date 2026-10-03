import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BusinessMixShift, buildMixShiftView, shareInWords } from "../app/company/components/business-mix-shift";
import type { NormalizedRevenueBreakdownItem, NormalizedRevenueHistoryBySegment, NormalizedRevenueMixHistoryBySegment } from "../lib/business-snapshot/types";

// The Business tab's Mix shift card: the headline, the chart years and the
// share / change / margin rows are all derived from the stored segment data.

// The component's JSX uses the classic transform and needs a React binding in scope.
(globalThis as { React?: typeof React }).React = React;

const test = (name: string, run: () => void) => { run(); console.log(`  ok  ${name}`); };
const segment = (name: string, share: number | null, extra: Partial<NormalizedRevenueBreakdownItem> = {}): NormalizedRevenueBreakdownItem => ({
  name, description: null, revenueSharePercent: share, revenueShareBasis: null, marginProfile: null, marginProfileNote: null, rolePill: null, growthDirectionPill: null, ...extra,
});
const history = (years: string[], rows: Record<string, (number | null)[]>, comparability = "reported"): NormalizedRevenueMixHistoryBySegment => ({
  years, insights: [], latestPeriod: null,
  rows: Object.entries(rows).map(([name, values]) => ({
    segment: name, isTotal: false, directionLabel: null, latestMixPercent: null, comparabilityLabel: comparability,
    mixPercentByYear: Object.fromEntries(years.map((year, index) => [year, values[index]])),
  })),
});
const years = ["FY22", "FY23", "FY24", "FY25", "FY26"];
const segments = [segment("Defence", 46, { marginProfile: "high_margin", description: "Builds defence electronics." }), segment("Industrial", 27), segment("Auto", 27)];

const revenueOf = (rows: Record<string, (number | null)[]>): NormalizedRevenueHistoryBySegment => ({
  years, insights: [], latestPeriod: null,
  rows: Object.entries(rows).map(([name, values]) => ({
    segment: name, isTotal: name === "Total", comparabilityLabel: "reported", growthMetricPeriod: null, growthMetricPercent: null, latestPeriodRevenue: null,
    revenueByYear: Object.fromEntries(years.map((year, index) => [year, values[index]])),
  })),
});
const mix = history(years, { Defence: [29, 35, 42, 45, 46], Industrial: [34, 32, 30, 27, 27], Auto: [37, 33, 28, 28, 27] });

test("shares read as everyday fractions; too small or too large to name is null", () => {
  assert.equal(shareInWords(29), "over a quarter");
  assert.equal(shareInWords(31), "under a third");
  assert.equal(shareInWords(46, true), "nearly half");
  assert.equal(shareInWords(46), "under half");
  assert.equal(shareInWords(50.8), "about half");
  assert.equal(shareInWords(34), "about a third");
  assert.equal(shareInWords(4), null);
  assert.equal(shareInWords(97), null);
});

test("headline is a read of the biggest mover, in words; the stat carries the points", () => {
  const up = buildMixShiftView(segments, mix);
  assert.equal(up?.headline, "Defence has gone from over a quarter of revenue to nearly half.");
  assert.deepEqual(up?.stat, { points: 17, label: "Defence share", from: "FY22", to: "FY26" });
  assert.deepEqual(up?.rows.map((row) => row.name), ["Defence", "Industrial", "Auto"], "largest latest share first");
  const down = buildMixShiftView(segments, history(["FY25", "FY26"], { Defence: [50, 52], Auto: [50, 30] }));
  assert.equal(down?.headline, "Auto has gone from about half of revenue to under a third.");
  assert.equal(down?.stat?.points, -20);
  const tiny = buildMixShiftView(segments, history(["FY25", "FY26"], { Defence: [97, 80], Auto: [3, 20] }));
  assert.equal(tiny?.headline, "Auto has grown from 3% to 20% of revenue.", "a share with no everyday word keeps the percentages");
  const small = buildMixShiftView(segments, history(["FY25", "FY26"], { Defence: [69, 65], Auto: [31, 35] }));
  assert.equal(small?.headline, "Auto has grown from 31% to 35% of revenue.", "a small move keeps the percentages, and a gainer leads a tie");
  const gain = buildMixShiftView(segments, history(["FY25", "FY26"], { Pipes: [70, 45], Coils: [8, 26], Other: [22, 29] }));
  assert.equal(gain?.headline, "Coils has gone from under a tenth of revenue to about a quarter.", "a large gainer leads over a larger decline");
  assert.ok(gain?.summary?.endsWith("while Pipes fell from 70% to 45%."));
  const flat = buildMixShiftView(segments, history(["FY25", "FY26"], { Defence: [50, 51], Auto: [50, 49] }));
  assert.equal(flat?.headline, "The revenue mix has barely moved since FY25.");
  assert.equal(flat?.stat, null);
  assert.equal(flat?.summary, null);
});

test("summary: the move in numbers, margin, growth against the company, and who gave up share", () => {
  assert.equal(
    buildMixShiftView(segments, mix)?.summary,
    "Defence rose from 29% of revenue in FY22 to 46% in FY26, a high-margin segment, while Auto fell from 37% to 27%.",
  );
  // 100 -> 400 over four years is ~41% a year; the total row gives the company 300 -> 600, ~19%.
  const withRevenue = buildMixShiftView(segments, mix, revenueOf({ Defence: [100, 150, 220, 300, 400], Total: [300, 350, 420, 500, 600] }));
  assert.equal(
    withRevenue?.summary,
    "Defence rose from 29% of revenue in FY22 to 46% in FY26, a high-margin segment. Its revenue grew about 41% a year against the company's 19%, while Auto fell from 37% to 27%.",
  );
  // no total row and a segment undisclosed in the first year: no company rate, so no growth sentence
  const partial = buildMixShiftView(segments, mix, revenueOf({ Defence: [100, 150, 220, 300, 400], Auto: [null, 90, 80, 70, 60] }));
  assert.ok(!partial?.summary?.includes("Its revenue"));
});

test("years with no comparable split are left off the chart", () => {
  const view = buildMixShiftView(segments, history(years, { Defence: [null, null, null, 44, 46], Auto: [null, null, null, 56, 54] }));
  assert.deepEqual(view?.years, ["FY25", "FY26"]);
  assert.deepEqual(view?.rows[0].points, [56, 54]);
});

test("without two comparable years there is no chart: the card falls back to the current split", () => {
  for (const mix of [null, history(years, { Defence: [null, null, null, null, 46], Auto: [null, null, null, null, 54] }), history(years, { Defence: [29, 35, 42, 45, 46], Auto: [71, 65, 58, 55, 54] }, "not_comparable")]) {
    const view = buildMixShiftView(segments, mix);
    assert.deepEqual(view?.years, []);
    assert.equal(view?.headline, "Defence is 46% of revenue.");
  }
  assert.equal(buildMixShiftView([], null), null);
});

test("card: chart, share table with change and margin columns, history behind one disclosure", () => {
  const html = renderToStaticMarkup(React.createElement(BusinessMixShift, {
    segments, summary: null, history: mix,
  }, React.createElement("p", null, "HISTORY")));
  assert.equal(html.split("<polyline").length - 1, 3, "one line per segment");
  assert.ok(html.includes("FY26 share") && html.includes(">+17</span>") && html.includes("Defence share") && !html.includes("Since FY22"));
  assert.ok(html.includes(">Margin<") && html.includes("High margin"));
  const disclosure = html.slice(html.indexOf("<details"));
  assert.ok(disclosure.includes("Segment revenue history") && disclosure.includes("HISTORY") && disclosure.includes("Builds defence electronics."));
});

test("card: a stored mix-shift sentence replaces the templated one", () => {
  const html = renderToStaticMarkup(React.createElement(BusinessMixShift, { segments, summary: "Programme wins compounded.", history: mix }));
  assert.ok(html.includes("Programme wins compounded.") && !html.includes("Defence rose from"));
});

test("card: no segments and no history renders only the history it was given", () => {
  const html = renderToStaticMarkup(React.createElement(BusinessMixShift, { segments: [], summary: null, history: null }, React.createElement("p", null, "HISTORY")));
  assert.equal(html, "<p>HISTORY</p>");
});

console.log("business mix shift: headline, chart years, fallback and card passed");
