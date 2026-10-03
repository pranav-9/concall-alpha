import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BusinessMixShift, buildMixShiftView } from "../app/company/components/business-mix-shift";
import type { NormalizedRevenueBreakdownItem, NormalizedRevenueMixHistoryBySegment } from "../lib/business-snapshot/types";

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

test("headline names the segment whose share moved most, in either direction", () => {
  const up = buildMixShiftView(segments, history(years, { Defence: [29, 35, 42, 45, 46], Industrial: [34, 32, 30, 27, 27], Auto: [37, 33, 28, 28, 27] }));
  assert.equal(up?.headline, "Defence has grown from 29% to 46% of revenue.");
  assert.deepEqual(up?.rows.map((row) => row.name), ["Defence", "Industrial", "Auto"], "largest latest share first");
  const down = buildMixShiftView(segments, history(["FY25", "FY26"], { Defence: [50, 52], Auto: [50, 30] }));
  assert.equal(down?.headline, "Auto has shrunk from 50% to 30% of revenue.");
  const flat = buildMixShiftView(segments, history(["FY25", "FY26"], { Defence: [50, 51], Auto: [50, 49] }));
  assert.equal(flat?.headline, "The revenue mix has barely moved since FY25.");
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
    segments, summary: null, history: history(years, { Defence: [29, 35, 42, 45, 46], Industrial: [34, 32, 30, 27, 27], Auto: [37, 33, 28, 28, 27] }),
  }, React.createElement("p", null, "HISTORY")));
  assert.equal(html.split("<polyline").length - 1, 3, "one line per segment");
  assert.ok(html.includes("FY26 share") && html.includes("Since FY22") && html.includes("+17 pts") && html.includes("−10 pts"));
  assert.ok(html.includes(">Margin<") && html.includes("High margin"));
  const disclosure = html.slice(html.indexOf("<details"));
  assert.ok(disclosure.includes("Segment revenue history") && disclosure.includes("HISTORY") && disclosure.includes("Builds defence electronics."));
});

test("card: no segments and no history renders only the history it was given", () => {
  const html = renderToStaticMarkup(React.createElement(BusinessMixShift, { segments: [], summary: null, history: null }, React.createElement("p", null, "HISTORY")));
  assert.equal(html, "<p>HISTORY</p>");
});

console.log("business mix shift: headline, chart years, fallback and card passed");
