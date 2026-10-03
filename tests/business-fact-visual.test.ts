import assert from "node:assert/strict";
import { buildFactVisual } from "../lib/business-snapshot/fact-visual";
import { milestoneLabel } from "../lib/business-snapshot/milestone-label";

// Which picture a business fact's freeform metrics draw, and the timeline's short headings.
// The metric shapes below are the ones live rows carry.

const test = (name: string, run: () => void) => { run(); console.log(`  ok  ${name}`); };
const m = (label: string, value: number, unit = "% of revenue") => ({ label, value, unit });

test("trend: one measure at several periods, oldest first, whichever way the label is written", () => {
  const visual = buildFactVisual([m("Exports, FY24", 37), m("Exports, Q1 FY27", 33.7), m("Exports, FY26", 35.5)], "geography");
  assert.deepEqual(visual, { kind: "trend", measure: "Exports", unit: "% of revenue", points: [{ period: "FY24", value: 37 }, { period: "FY26", value: 35.5 }, { period: "Q1 FY27", value: 33.7 }] });
  const leading = buildFactVisual([m("Q1 FY27 exports", 81), m("FY26 exports", 82)], "geography");
  assert.equal(leading?.kind === "trend" && leading.points.map((point) => point.period).join(), "FY26,Q1 FY27");
});

test("donut: shares of one whole at the latest period, with the undisclosed rest as Others", () => {
  assert.deepEqual(buildFactVisual([m("India", 65.2), m("Europe", 18.8), m("USA", 9.3), m("Other foreign", 6.7)], "geography"),
    { kind: "donut", slices: [{ label: "India", value: 65.2 }, { label: "Europe", value: 18.8 }, { label: "USA", value: 9.3 }, { label: "Other foreign", value: 6.7 }], rest: 0 });
  const partial = buildFactVisual([m("India share", 74.3), m("USA share", 11.1)], "geography");
  assert.ok(partial?.kind === "donut" && Math.abs(partial.rest - 14.6) < 1e-9);
  const banded = buildFactVisual([m("Top 5", 62, "%"), m("6-10", 12, "%"), m("Others", 26, "%")], "customers");
  assert.ok(banded?.kind === "donut" && banded.slices.length === 3 && banded.rest === 0);
});

test("donut: a top-N figure never shares the ring with a named customer inside it", () => {
  const visual = buildFactVisual([m("Top 10 customers", 50, "% of sales"), m("Vestas, FY25", 23, "% of sales")], "customers");
  assert.deepEqual(visual, { kind: "donut", slices: [{ label: "Top 10 customers", value: 50 }], rest: 50 });
});

test("customers lead with the donut, geography with the trend; another period or unit is never a slice", () => {
  const top10 = [m("Top-10 customer share, FY23", 58.99), m("Top-10 customer share, FY26", 51.15), m("Repeat revenue, FY26", 97, "%")];
  const customers = buildFactVisual(top10, "customers");
  assert.ok(customers?.kind === "donut" && customers.slices.length === 1 && customers.slices[0].value === 51.15);
  const india = [m("India, FY26", 71.4), m("Outside India, FY26", 28.6), m("India, FY25", 63.1)];
  assert.equal(buildFactVisual(india, "geography")?.kind, "trend");
  assert.equal(buildFactVisual(india, "customers")?.kind, "donut");
});

test("hero and stats: a lone share is a hero number; counts and currency stay headline numbers", () => {
  assert.deepEqual(buildFactVisual([m("Export share, FY26", 93), m("Countries served", 12, "countries")], "geography"), { kind: "hero", label: "Export share", value: 93, unit: "% of revenue" });
  assert.equal(buildFactVisual([m("Customers", 105, "count"), m("Countries", 27, "count")], "customers")?.kind, "stats");
  assert.equal(buildFactVisual([m("A", 70), m("B", 60)], "geography")?.kind, "stats", "shares over 100 are not parts of one whole");
  assert.equal(buildFactVisual([], "customers"), null);
});

test("milestone headings: first matching rule wins; an unrecognised title gets none", () => {
  const cases: [string, string | null][] = [
    ["Founded in Mysuru", "Founded"], ["Lists on NSE and BSE after its IPO", "IPO"], ["Migrates to the NSE main board", "Main board"],
    ["Acquires Hyd-Air Engineering", "Acquisition"], ["Expands skid capacity to 9,000 units", "Capacity"], ["Received a Rs. 504 crore Kaiga 5 & 6 order", "Order win"],
    ["Earns AS9100 / defence qualification", "Approval"], ["R&D centre opened in Bangalore", "R&D"], ["Kurlon merger completed with the Registrar of Companies", "Merger"],
    ["Starts making fasteners", "New line"], ["Credit rating raised from A+ to AA-", "Rating"], ["Something nobody anticipated", null],
    // "began" alone is not a founding (KRN 2026-10-03; live titles from the fleet)
    ["Began exporting", "Overseas"], ["Plant II at subsidiary KRN HVAC Products began operating on 31 May 2025", "Capacity"],
    ["Second plant at Kuthrel began operating in FY2025, adding GP coils", "Capacity"], ["Began making generators in Istanbul, Turkey", "New line"],
    ["Begins supplying crankshafts for SUVs, entering passenger vehicles", "New line"], ["Begins manufacturing for Indian defence companies", "New line"],
    ["Began operations in Chhattisgarh as Sambhv Sponge Power, making sponge iron", "Founded"], ["Exchange began operations", "Founded"],
    ["Operations began with the first SMT line", "Founded"], ["Begins with telecom electronics", "Founded"], ["Began its precision-engineering journey", "Founded"],
  ];
  for (const [title, label] of cases) assert.equal(milestoneLabel(title), label, title);
});

console.log("business fact visual: trend, donut, hero, stats and milestone headings passed");
