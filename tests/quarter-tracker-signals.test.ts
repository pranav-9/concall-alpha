import assert from "node:assert/strict";

import {
  formatYoyChange,
  formatYoyValues,
  isLegibleMove,
  keyVariablesYoy,
  moveLabel,
  parseQuarterPeriod,
  quarterGuidanceMoves,
} from "../app/quarter-tracker/signals";
import type { ReportingQuarter } from "../lib/current-quarter";
import type { NormalizedGuidanceItem, NormalizedGuidanceTrailItem } from "../lib/guidance-tracking/types";
import type {
  NormalizedKeyVariableDeepTreatmentItem,
  NormalizedKeyVariablesSnapshot,
} from "../lib/key-variables-snapshot/types";

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

const Q2FY27: ReportingQuarter = { fy: 2027, qtr: 2, label: "Q2 FY27" };

// --- periods -----------------------------------------------------------------

test("quarter periods parse in every spelling the snapshots use", () => {
  for (const p of ["Q2 FY27", "Q2FY27", "Q2 FY'27", "FY27 Q2", "Q2 FY2027", "q2 fy27"]) {
    assert.deepEqual(parseQuarterPeriod(p), { fy: 2027, qtr: 2 }, p);
  }
  for (const p of ["FY26", "H1 FY27", "9M FY26", "FY27 Guidance", "", null]) {
    assert.equal(parseQuarterPeriod(p), null, String(p));
  }
});

// --- guidance moves ------------------------------------------------------------

let nextId = 1;
// A "17%" step carries its number as valuePercent; an amount is read off valueText.
const step = (quarter: string, value: string): NormalizedGuidanceTrailItem => {
  const pct = value.match(/^(\d+(?:\.\d+)?)%$/);
  return {
    ...baseStep(quarter),
    valuePercent: pct ? parseFloat(pct[1]) : null,
    valueText: pct ? value : `Revenue of ${value.replace(/cr$/, " cr")}`,
  };
};

const baseStep = (quarter: string): NormalizedGuidanceTrailItem => ({
  quarter,
  summary: null,
  excerpt: null,
  mentionType: "update",
  documentType: null,
  documentLabel: null,
  sourceReference: null,
  confidence: null,
  valuePercent: null,
  valueText: null,
  valueKind: null,
  numericValue: null,
  unit: null,
  horizonType: null,
  appliesFrom: null,
  appliesTo: null,
  horizonLabel: null,
});

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
  valuePercent: null,
  valueText: null,
  valueKind: null,
  numericValue: null,
  unit: null,
  firstMentionPeriod: "Q4 FY26",
  latestMentionPeriod: "Q2 FY27",
  mentionedPeriods: [],
  statusKey: "revised",
  statusLabel: "Revised",
  latestView: null,
  statusReason: null,
  confidence: null,
  generatedAtRaw: null,
  sourceMentions: [],
  trail: [],
  ...overrides,
});

test("a raise and a cut made on this quarter's call are both read", () => {
  const moves = quarterGuidanceMoves(
    [
      item({ trail: [step("Q4 FY26", "17%"), step("Q2 FY27", "23%")] }),
      item({
        metricLabel: "EBITDA margin",
        metricLabelMidSentence: "EBITDA margin",
        metricSubtype: "ebitda_margin",
        guidanceFamily: "margin",
        trail: [step("Q1 FY27", "27%"), step("Q2 FY27", "23%")],
      }),
    ],
    Q2FY27,
    Q2FY27,
  );
  assert.deepEqual(moves.raised, { direction: "raised", label: "FY27 revenue growth", from: "17%", to: "23%" });
  assert.deepEqual(moves.lowered, { direction: "lowered", label: "FY27 EBITDA margin", from: "27%", to: "23%" });
  assert.equal(moves.raisedCount, 1);
  assert.equal(moves.loweredCount, 1);
});

test("a move made on an earlier call is not this quarter's news", () => {
  const moves = quarterGuidanceMoves(
    [item({ trail: [step("Q4 FY26", "17%"), step("Q1 FY27", "23%"), step("Q2 FY27", "23%")] })],
    Q2FY27,
    Q2FY27,
  );
  assert.equal(moves.raised, null);
  assert.equal(moves.raisedCount, 0);
});

test("a move whose printed values don't read as one is left out", () => {
  const moves = quarterGuidanceMoves(
    [item({ trail: [step("Q1 FY27", "₹45cr"), step("Q2 FY27", "₹500cr")] })],
    Q2FY27,
    Q2FY27,
  );
  assert.equal(moves.raised, null, "an 11× 'raise' is two different quantities");
  assert.equal(isLegibleMove("20%", "24%", "raised"), true);
  assert.equal(isLegibleMove("20%", "24%", "lowered"), false, "direction must match");
  assert.equal(isLegibleMove("₹500cr", "20%", "lowered"), false, "units must match");
  assert.equal(isLegibleMove("27%", "23%", "lowered"), true);
  assert.equal(isLegibleMove("$2B", "$500M", "lowered"), false, "billions vs millions are different units");
});

test("a prose horizon is not glued onto the metric", () => {
  assert.equal(moveLabel(item({ horizonLabel: "Ongoing" })), "Revenue growth");
  assert.equal(moveLabel(item({ horizonLabel: "standing band, no date" })), "Revenue growth");
  assert.equal(moveLabel(item({ horizonLabel: "FY28–FY31" })), "FY28–FY31 revenue growth");
  assert.equal(
    moveLabel(item({ horizonLabel: "Q4 FY27", segment: "Defence", metricLabelMidSentence: "EBITDA margin" })),
    "Q4 FY27 Defence EBITDA margin",
  );
});

// --- key variables YoY ------------------------------------------------------------

const deep = (
  variable: string,
  metric: string,
  values: Record<string, number | null>,
  over: Partial<NormalizedKeyVariableDeepTreatmentItem> = {},
): NormalizedKeyVariableDeepTreatmentItem => ({
  variable,
  kpiHistory: { periods: Object.keys(values), rows: [{ metric, valuesByPeriod: values }] },
  currentRead: null,
  whatItTracks: null,
  whyItMattersNow: null,
  trendInterpretation: null,
  transition: null,
  transitionReason: null,
  thesisRole: null,
  headline: null,
  leadMetricIndex: 0,
  leadUnit: null,
  metricDirections: { [metric]: "higher_is_better" },
  guide: null,
  ...over,
});

const snapshot = (items: NormalizedKeyVariableDeepTreatmentItem[]) =>
  ({ deepTreatment: items }) as unknown as NormalizedKeyVariablesSnapshot;

test("YoY reads this quarter against the same quarter a year ago, coloured by effect", () => {
  const readings = keyVariablesYoy(
    snapshot([
      deep("Brand spend", "Marketing spend (%)", { "Q2 FY26": 19.9, "Q1 FY27": 21, "Q2 FY27": 21.8 }),
      deep(
        "Cash cycle",
        "Working-capital days (days)",
        { Q2FY26: 75, Q2FY27: 66 },
        { metricDirections: { "Working-capital days (days)": "lower_is_better" } },
      ),
      deep("Orders", "Order inflow (₹ cr)", { "FY27 Q2": 849, "FY26 Q2": 758 }),
      deep("Fourth", "Ignored (x)", { "Q2 FY26": 1, "Q2 FY27": 2 }),
    ]),
    Q2FY27,
  );
  assert.equal(readings.length, 3, "capped at three");
  assert.deepEqual(
    readings.map((r) => [r.name, r.from, r.to, r.change, r.effect]),
    [
      ["Marketing spend", "19.9%", "21.8%", "+190 bps", "helps"],
      ["Working-capital days", "75", "66 days", "−12%", "helps"],
      ["Order inflow", "₹758", "₹849 Cr", "+12%", "helps"],
    ],
  );
});

test("a snapshot without this quarter, or without last year's, shows nothing", () => {
  assert.deepEqual(keyVariablesYoy(snapshot([deep("Stale", "Utilisation (%)", { "Q1 FY27": 70, "Q1 FY26": 68 })]), Q2FY27), []);
  assert.deepEqual(keyVariablesYoy(snapshot([deep("New", "Utilisation (%)", { "Q2 FY27": 70 })]), Q2FY27), []);
  assert.deepEqual(keyVariablesYoy(snapshot([deep("Annual", "Order book (₹ cr)", { FY26: 3033, FY25: 283 })]), Q2FY27), []);
  assert.deepEqual(keyVariablesYoy(null, Q2FY27), []);
});

test("YoY change wording per unit", () => {
  assert.equal(formatYoyChange(14, 12.1, "%"), "−190 bps");
  assert.equal(formatYoyChange(13, 16, "%"), "+300 bps");
  assert.equal(formatYoyChange(1, 10, "%"), "+9 pp", "five points or more read in points");
  assert.equal(formatYoyChange(84.4, 101.6, "%"), "+17.2 pp");
  assert.equal(formatYoyChange(1.2, 1.5, "x"), "+0.3x");
  assert.equal(formatYoyChange(250, 760, "₹ cr"), "+204%");
  assert.equal(formatYoyChange(26, 140, "₹ cr"), "+438%");
  assert.equal(formatYoyChange(2, 40, "₹ cr"), "+20×", "past 1,000% the multiple says more");
  assert.equal(formatYoyChange(0, 5, "₹ cr"), null, "no % change off zero");
  assert.equal(formatYoyChange(-10, 5, "₹ cr"), null, "no % change off a negative base");
  assert.equal(formatYoyChange(3, 3, "count"), "0%");
});

test("YoY values carry the unit once, on the latest", () => {
  assert.deepEqual(formatYoyValues(19.9, 21.8, "", "%"), { from: "19.9%", to: "21.8%" });
  assert.deepEqual(formatYoyValues(758, 849, "₹", "cr"), { from: "₹758", to: "₹849 Cr" });
  assert.deepEqual(formatYoyValues(4.36, 4.47, "₹", "lakh"), { from: "₹4.36", to: "₹4.47 lakh" });
  assert.deepEqual(formatYoyValues(30, 60, "", "lakh hours a year"), { from: "30", to: "60" }, "a long unit is dropped");
  assert.deepEqual(formatYoyValues(1.2, 1.5, "", "x"), { from: "1.2×", to: "1.5×" });
});

console.log("\nAll quarter-tracker signals tests passed.");
