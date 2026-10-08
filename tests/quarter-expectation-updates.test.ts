import assert from "node:assert/strict";

import type { NormalizedGrowthCatalyst } from "../lib/growth-outlook/types";
import type { NormalizedGuidanceItem } from "../lib/guidance-tracking/types";
import type {
  NormalizedKeyVariableDeepTreatmentItem,
  NormalizedKeyVariableListItem,
} from "../lib/key-variables-snapshot/types";
import {
  buildExpectedUpdates,
  catalystFit,
  MAX_EXPECTED_UPDATES,
  parseTimingWindows,
  type BuildExpectedUpdatesInput,
} from "../lib/quarter-expectation/updates";

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
  appliesFrom: "FY28",
  appliesTo: "FY28",
  horizonLabel: "FY28",
  valuePercent: null,
  valueText: null,
  valueKind: null,
  numericValue: null,
  unit: null,
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

const quarterItem = (label: string, overrides: Partial<NormalizedGuidanceItem> = {}) =>
  item({ horizonType: "single_quarter", appliesFrom: label, appliesTo: label, horizonLabel: label, ...overrides });
const fyItem = (label: string, overrides: Partial<NormalizedGuidanceItem> = {}) =>
  item({ horizonType: "single_fy", appliesFrom: label, appliesTo: label, horizonLabel: label, ...overrides });

const catalyst = (overrides: Partial<NormalizedGrowthCatalyst> = {}): NormalizedGrowthCatalyst => ({
  type: null,
  timing: null,
  catalyst: "A catalyst",
  statusTag: null,
  expectedImpact: null,
  whyItMatters: null,
  whatIsChanging: null,
  pillConfidence: null,
  pillDependency: null,
  pillMarginImpact: null,
  pillRevenueImpact: null,
  quantified: null,
  timelineItems: [],
  evidenceLines: [],
  priority: null,
  investibilityChecks: null,
  ...overrides,
});

const variable = (overrides: Partial<NormalizedKeyVariableListItem> = {}): NormalizedKeyVariableListItem => ({
  variable: "Order book",
  whyFlagged: null,
  sourceBasis: "both" as NormalizedKeyVariableListItem["sourceBasis"],
  latest: null,
  watchFor: null,
  nextToPromote: false,
  ...overrides,
});

const deep = (overrides: Partial<NormalizedKeyVariableDeepTreatmentItem> = {}): NormalizedKeyVariableDeepTreatmentItem => ({
  variable: "Gross margin",
  kpiHistory: null,
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
  metricDirections: null,
  guide: null,
  ...overrides,
});

const build = (overrides: Partial<BuildExpectedUpdatesInput> = {}) =>
  buildExpectedUpdates({
    target: TARGET,
    guidanceItems: [],
    catalysts: [],
    variables: [],
    deepVariables: [],
    lastRationale: [],
    ...overrides,
  });

// Empty inputs → nothing (the card then falls back to its one-line form).
assert.deepEqual(build(), []);

// Rule 1 — due: dated the target quarter, still active → ungraded, due now.
{
  const out = build({ guidanceItems: [quarterItem("Q2 FY27", { metricLabel: "Revenue growth" })] });
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, "due");
  assert.equal(out[0].sectionId, "guidance-history");
  assert.match(out[0].detail ?? "", /due Q2 FY27/);
}

// Rule 1 — overdue: dated the quarter before, never graded.
{
  const out = build({ guidanceItems: [quarterItem("Q1 FY27")] });
  assert.equal(out[0].kind, "due");
  assert.match(out[0].detail ?? "", /overdue since Q1 FY27/);
}

// Rule 1 — an H1 FY27 horizon is the target's half → due now.
{
  const out = build({
    guidanceItems: [item({ horizonType: "multi_quarter", appliesFrom: "H1 FY27", appliesTo: "H1 FY27", horizonLabel: "H1 FY27" })],
  });
  assert.equal(out[0]?.kind, "due");
  assert.match(out[0].detail ?? "", /due H1 FY27/);
}

// Rule 1 — graded outcomes are NOT due: met, missed, delayed (graded at once),
// revised past its horizon; and anything older than one quarter back.
{
  const out = build({
    guidanceItems: [
      quarterItem("Q2 FY27", { statusKey: "met" }),
      quarterItem("Q2 FY27", { statusKey: "missed" }),
      quarterItem("Q2 FY27", { statusKey: "delayed" }),
      quarterItem("Q1 FY27", { statusKey: "revised" }),
      quarterItem("Q4 FY26"),
    ],
  });
  assert.equal(out.filter((u) => u.kind === "due").length, 0);
}

// Rule 2 — progress: live commitments decided inside FY27, any horizon shape;
// FY28 and standing horizons are excluded; capped at two.
{
  const out = build({
    guidanceItems: [
      fyItem("FY27", { metricLabel: "Revenue growth" }),
      item({ horizonType: "multi_fy", appliesFrom: "FY25", appliesTo: "FY27", horizonLabel: "FY25–FY27", metricLabel: "EBITDA margin", guidanceFamily: "margin", metricSubtype: "ebitda_margin" }),
      quarterItem("Q4 FY27", { metricLabel: "PAT growth", metricSubtype: "pat" }),
      fyItem("FY28", { metricLabel: "FY28 thing" }),
      item({ horizonType: "rolling", appliesFrom: "ongoing", appliesTo: "ongoing", horizonLabel: null, metricLabel: "Standing margin" }),
    ],
  });
  const progress = out.filter((u) => u.kind === "progress");
  assert.equal(progress.length, 2);
  assert.ok(progress.every((u) => !/FY28|Standing/.test(u.heading)));
  assert.ok(progress.every((u) => /for /.test(u.detail ?? "")));
}

// Rule 1 before rule 2, and a due item never also appears as progress.
{
  const out = build({ guidanceItems: [fyItem("FY27"), quarterItem("Q2 FY27", { metricLabel: "Q2 revenue" })] });
  assert.equal(out[0].kind, "due");
  assert.equal(out[1].kind, "progress");
}

// Rule 3 — catalyst timing parse.
assert.deepEqual(parseTimingWindows("H2 FY27"), [{ fy: 2027, qtrFrom: 3, qtrTo: 4 }]);
assert.deepEqual(parseTimingWindows("2HFY27"), [{ fy: 2027, qtrFrom: 3, qtrTo: 4 }]);
assert.deepEqual(parseTimingWindows("by Q3 FY27"), [{ fy: 2027, qtrFrom: 3, qtrTo: 3 }]);
assert.deepEqual(parseTimingWindows("FY2027"), [{ fy: 2027, qtrFrom: 1, qtrTo: 4 }]);
assert.deepEqual(parseTimingWindows("FY27–FY28"), [
  { fy: 2027, qtrFrom: 1, qtrTo: 4 },
  { fy: 2028, qtrFrom: 1, qtrTo: 4 },
]);
assert.deepEqual(parseTimingWindows("next 12–18 months"), []);
assert.equal(catalystFit("H1 FY27", TARGET), 2);
assert.equal(catalystFit("Q2 FY27", TARGET), 2);
assert.equal(catalystFit("Q4 FY27", TARGET), 1);
assert.equal(catalystFit("FY27", TARGET), 1);
assert.equal(catalystFit("FY28", TARGET), 0);
assert.equal(catalystFit("next 12–18 months", TARGET), 0);

// Rule 3 — the quarter-specific catalyst beats a higher-priority FY-level one;
// an undatable catalyst is skipped.
{
  const out = build({
    catalysts: [
      catalyst({ catalyst: "Big FY plan", timing: "FY27", priority: { impactScore: null, timeRelevance: null, certaintyScore: null, progressionDepth: null, weightedPriority: 9 } }),
      catalyst({ catalyst: "Plant commissioning", timing: "H1 FY27", statusTag: "in_progress", priority: { impactScore: null, timeRelevance: null, certaintyScore: null, progressionDepth: null, weightedPriority: 3 } }),
      catalyst({ catalyst: "Someday", timing: "next 12–18 months" }),
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, "catalyst");
  assert.equal(out[0].heading, "Plant commissioning");
  assert.equal(out[0].detail, "Timing H1 FY27 · in progress");
  assert.equal(out[0].sectionId, "future-growth");
}

// Rule 4 — watch_for wins; deep headline is the fallback; nothing → omitted.
{
  const a = build({ variables: [variable({ watchFor: "Order book below ₹500 cr" })], deepVariables: [deep({ headline: "Margins are peaking" })] });
  assert.equal(a[0].kind, "variable");
  assert.equal(a[0].heading, "Order book");
  assert.equal(a[0].detail, "Order book below ₹500 cr");
  assert.equal(a[0].sectionId, "key-variables");
  const b = build({ variables: [variable()], deepVariables: [deep({ headline: "Margins are peaking" })] });
  assert.equal(b[0].heading, "Gross margin");
  assert.equal(b[0].detail, "Margins are peaking");
  const c = build({ variables: [variable()], deepVariables: [deep()] });
  assert.deepEqual(c, []);
}

// Rule 5 — the last call's negative read; legacy flat strings (no direction)
// and positive-only rationale yield nothing.
{
  const a = build({
    lastRationale: [
      { direction: "positive", heading: "Margins", detail: "up 200 bps" },
      { direction: "negative", heading: "Working capital", detail: "debtor days stretched to 120" },
    ],
  });
  assert.equal(a[0].kind, "fix");
  assert.equal(a[0].heading, "Working capital");
  assert.equal(a[0].detail, "debtor days stretched to 120");
  assert.equal(a[0].sectionId, "sentiment-score");
  assert.equal(a[0].tone, "caution");
  assert.deepEqual(build({ lastRationale: [{ direction: null, heading: "", detail: "legacy string" }] }), []);
  assert.deepEqual(build({ lastRationale: [{ direction: "positive", heading: "Good", detail: "x" }] }), []);
}

// Order of precedence and the overall cap: two due, two progress, then one
// of the rest until five.
{
  const out = build({
    guidanceItems: [
      quarterItem("Q2 FY27", { metricLabel: "Due A" }),
      quarterItem("Q2 FY27", { metricLabel: "Due B" }),
      quarterItem("Q1 FY27", { metricLabel: "Due C" }),
      fyItem("FY27", { metricLabel: "Live A" }),
      fyItem("FY27", { metricLabel: "Live B" }),
      fyItem("FY27", { metricLabel: "Live C" }),
    ],
    catalysts: [catalyst({ timing: "FY27" })],
    variables: [variable({ watchFor: "x" })],
    lastRationale: [{ direction: "negative", heading: "Fix me", detail: "" }],
  });
  assert.equal(out.length, MAX_EXPECTED_UPDATES);
  assert.deepEqual(
    out.map((u) => u.kind),
    ["due", "due", "progress", "progress", "catalyst"],
  );
}

// Duplicate headings collapse.
{
  const out = build({ guidanceItems: [quarterItem("Q2 FY27", { metricLabel: "Revenue growth" }), quarterItem("Q2 FY27", { metricLabel: "Revenue growth" })] });
  assert.equal(out.length, 1);
}

console.log("quarter-expectation-updates: ok");

// ---------------------------------------------------------------------------
// Lean, dates and the filing kind
// ---------------------------------------------------------------------------
import { pickFiling } from "../lib/quarter-expectation/updates";
import type { ExpectationFiling } from "../lib/quarter-expectation/types";

const filing = (overrides: Partial<ExpectationFiling> = {}): ExpectationFiling => ({
  id: `a${nextId++}`,
  filedAt: "2026-09-18T10:30:00+05:30",
  summary: "Order book crosses ₹900 cr on a ₹120 cr transmission order",
  category: "order_win",
  impact: "positive",
  ...overrides,
});

// Every kind carries a lean: due-now is open, overdue is downside, a raised
// live guide is upside, a catalyst is upside, a watch trigger is open, last
// call's negative is downside. Nothing but a filing is dated.
{
  const out = build({
    guidanceItems: [quarterItem("Q2 FY27", { metricLabel: "Due now" }), quarterItem("Q1 FY27", { metricLabel: "Overdue" })],
    catalysts: [catalyst({ timing: "FY27" })],
    variables: [variable({ watchFor: "x" })],
    lastRationale: [{ direction: "negative", heading: "Fix me", detail: "" }],
  });
  assert.deepEqual(
    out.map((u) => [u.kind, u.lean]),
    [["due", "open"], ["due", "downside"], ["catalyst", "upside"], ["variable", "open"], ["fix", "downside"]],
  );
  assert.ok(out.every((u) => u.dated === null));
}

// A filing lands second, after due items, with its IST date, its lean from
// the impact tier and the category label the caller supplies.
{
  const out = build({
    guidanceItems: [quarterItem("Q2 FY27", { metricLabel: "Due now" })],
    filings: [filing()],
    filingCategoryLabel: (c) => (c === "order_win" ? "Order win" : c),
    catalysts: [catalyst({ timing: "FY27" })],
  });
  assert.deepEqual(out.map((u) => u.kind), ["due", "filing", "catalyst"]);
  const f = out[1];
  assert.equal(f.lean, "upside");
  assert.equal(f.dated, "2026-09-18");
  assert.equal(f.detail, "Order win");
  assert.equal(f.sectionId, "company-announcements");
  assert.equal(f.heading, "Order book crosses ₹900 cr on a ₹120 cr transmission order");
  // A filing stamped 23:30 UTC is the next day in IST.
  const late = build({ filings: [filing({ filedAt: "2026-09-18T23:30:00Z" })] });
  assert.equal(late[0].dated, "2026-09-19");
  // Adverse filings lean downside and take the caution tone.
  const bad = build({ filings: [filing({ impact: "severe" })] });
  assert.equal(bad[0].lean, "downside");
  assert.equal(bad[0].tone, "caution");
  // A long summary is clipped to a heading.
  const long = build({ filings: [filing({ summary: "y".repeat(200) })] });
  assert.equal(long[0].heading.length, 90);
  assert.ok(long[0].heading.endsWith("…"));
}

// One filing at most: strongest impact wins, newest on a tie; neutral and
// empty summaries never qualify.
{
  assert.equal(pickFiling([]), null);
  assert.equal(pickFiling([filing({ impact: "neutral" }), filing({ summary: "  " })]), null);
  const older = filing({ id: "old", filedAt: "2026-08-01T09:00:00+05:30" });
  const newer = filing({ id: "new", filedAt: "2026-09-01T09:00:00+05:30" });
  const big = filing({ id: "big", filedAt: "2026-07-01T09:00:00+05:30", impact: "transformative" });
  assert.equal(pickFiling([older, newer])!.id, "new");
  assert.equal(pickFiling([newer, big, older])!.id, "big");
  assert.equal(build({ filings: [older, newer, big] }).filter((u) => u.kind === "filing").length, 1);
}

console.log("quarter-expectation-updates (lean + filing): ok");
