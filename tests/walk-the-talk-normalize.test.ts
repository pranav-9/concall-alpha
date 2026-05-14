import assert from "node:assert/strict";

import { normalizeWalkTheTalk } from "../lib/walk-the-talk/normalize";
import type { NormalizedGuidanceSnapshot } from "../lib/guidance-snapshot/types";
import type {
  NormalizedGuidanceItem,
  NormalizedGuidanceStatusKey,
} from "../lib/guidance-tracking/types";

// ---------------------------------------------------------------------------
// Inline fixture helpers. Phase 6's normalized item shape is camelCase TS,
// so building literals here is cleaner than a JSON fixture file.
// ---------------------------------------------------------------------------

let nextItemId = 1;

const item = (
  overrides: Partial<NormalizedGuidanceItem> = {},
): NormalizedGuidanceItem => ({
  id: nextItemId++,
  companyCode: "TESTCO",
  guidanceKey: `K${nextItemId}`,
  guidanceText: "default text",
  guidanceType: "other",
  guidanceTypeLabel: null,
  firstMentionPeriod: "Q1 FY26",
  latestMentionPeriod: "Q1 FY26",
  targetPeriod: null,
  mentionedPeriods: [],
  statusKey: "unknown",
  statusLabel: "Unknown",
  latestView: null,
  statusReason: null,
  confidence: null,
  generatedAtRaw: null,
  sourceMentions: [],
  trail: [],
  ...overrides,
});

const snapshot = (
  items: NormalizedGuidanceItem[],
  overrides: Partial<NormalizedGuidanceSnapshot> = {},
): NormalizedGuidanceSnapshot => ({
  companyCode: "TESTCO",
  generatedAtRaw: "2026-05-14T00:00:00Z",
  updatedAtRaw: "2026-05-14T00:00:00Z",
  analysisWindowQuarters: 4,
  guidanceStyleClassification: null,
  bigPictureGrowthGuidance: null,
  currentYearRevenueGuidance: null,
  priorTwoYearAccuracy: [],
  credibilityVerdict: null,
  guidanceItems: items,
  sourceFiles: [],
  details: null,
  ...overrides,
});

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

const mk = (
  type: string | null,
  status: NormalizedGuidanceStatusKey,
  extras: Partial<NormalizedGuidanceItem> = {},
) =>
  item({
    guidanceType: type,
    statusKey: status,
    statusLabel: status,
    ...extras,
  });

// ===========================================================================
// schemaStatus paths
// ===========================================================================

test("null snapshot → schemaStatus 'missing'", () => {
  const r = normalizeWalkTheTalk(null);
  assert.equal(r.schemaStatus, "missing");
  assert.equal(r.commitments.length, 0);
  assert.equal(r.byCategory.length, 0);
  assert.equal(r.overall.tier, "not_enough_data");
});

test("undefined snapshot → schemaStatus 'missing' with fallback ticker", () => {
  const r = normalizeWalkTheTalk(undefined, "ACUTAAS");
  assert.equal(r.schemaStatus, "missing");
  assert.equal(r.ticker, "ACUTAAS");
});

test("empty guidanceItems → schemaStatus 'missing'", () => {
  const r = normalizeWalkTheTalk(snapshot([]));
  assert.equal(r.schemaStatus, "missing");
  assert.equal(r.ticker, "TESTCO");
  assert.equal(r.analysisWindowQuarters, 4);
});

test("non-empty guidanceItems → schemaStatus 'present'", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("capex", "met")]));
  assert.equal(r.schemaStatus, "present");
});

// ===========================================================================
// Category mapping (mapGuidanceTypeToCategory)
// ===========================================================================

test("category mapping: capex + commissioning → 'capex'", () => {
  const r = normalizeWalkTheTalk(
    snapshot([mk("capex", "met"), mk("commissioning", "met")]),
  );
  const categories = r.commitments.map((c) => c.category).sort();
  assert.deepEqual(categories, ["capex", "capex"]);
});

test("category mapping: utilization → 'capacity'", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("utilization", "met")]));
  assert.equal(r.commitments[0].category, "capacity");
});

test("category mapping: revenue + demand → 'revenue'", () => {
  const r = normalizeWalkTheTalk(
    snapshot([mk("revenue", "met"), mk("demand", "met")]),
  );
  const categories = r.commitments.map((c) => c.category).sort();
  assert.deepEqual(categories, ["revenue", "revenue"]);
});

test("category mapping: margin → 'margin'", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("margin", "met")]));
  assert.equal(r.commitments[0].category, "margin");
});

test("category mapping: launch / segment / export / debt / other → 'other'", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("launch", "met"),
      mk("segment", "met"),
      mk("export", "met"),
      mk("debt", "met"),
      mk("other", "met"),
    ]),
  );
  const allOther = r.commitments.every((c) => c.category === "other");
  assert.equal(allOther, true);
});

test("category mapping: null/empty guidanceType → 'other'", () => {
  const r = normalizeWalkTheTalk(
    snapshot([mk(null, "met"), mk("", "met")]),
  );
  const allOther = r.commitments.every((c) => c.category === "other");
  assert.equal(allOther, true);
});

// ===========================================================================
// Status flags on commitment rows
// ===========================================================================

test("status: met → counts=true, on_time=true", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("capex", "met")]));
  const c = r.commitments[0];
  assert.equal(c.counts_for_grade, true);
  assert.equal(c.on_time, true);
});

test("status: delayed → counts=true, on_time=false", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("capex", "delayed")]));
  const c = r.commitments[0];
  assert.equal(c.counts_for_grade, true);
  assert.equal(c.on_time, false);
});

test("status: dropped → counts=true, on_time=false", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("capex", "dropped")]));
  const c = r.commitments[0];
  assert.equal(c.counts_for_grade, true);
  assert.equal(c.on_time, false);
});

test("status: revised → counts=true, on_time=false", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("capex", "revised")]));
  const c = r.commitments[0];
  assert.equal(c.counts_for_grade, true);
  assert.equal(c.on_time, false);
});

test("status: active → counts=false (in matrix, not graded)", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("capex", "active")]));
  const c = r.commitments[0];
  assert.equal(c.counts_for_grade, false);
});

test("status: not_yet_clear → counts=false", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("capex", "not_yet_clear")]));
  assert.equal(r.commitments[0].counts_for_grade, false);
});

test("status: unknown → counts=false", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("capex", "unknown")]));
  assert.equal(r.commitments[0].counts_for_grade, false);
});

// ===========================================================================
// Per-category bucket aggregation
// ===========================================================================

test("per-category: 3 capex, 3 met → 'reliable' (100%)", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("capex", "met"),
      mk("capex", "met"),
      mk("capex", "met"),
    ]),
  );
  const capex = r.byCategory.find((b) => b.category === "capex");
  assert.ok(capex);
  assert.equal(capex.total_count, 3);
  assert.equal(capex.on_time_count, 3);
  assert.equal(capex.tier, "reliable");
});

test("per-category: 4 capex, 2 met → 'erratic' (50%)", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("capex", "met"),
      mk("capex", "met"),
      mk("capex", "delayed"),
      mk("capex", "dropped"),
    ]),
  );
  const capex = r.byCategory.find((b) => b.category === "capex");
  assert.ok(capex);
  assert.equal(capex.tier, "erratic");
});

test("per-category: only 2 in category → 'not_enough_data'", () => {
  const r = normalizeWalkTheTalk(
    snapshot([mk("margin", "met"), mk("margin", "met")]),
  );
  const margin = r.byCategory.find((b) => b.category === "margin");
  assert.ok(margin);
  assert.equal(margin.total_count, 2);
  assert.equal(margin.tier, "not_enough_data");
});

test("empty per-category buckets are suppressed (only those with ≥1 counted item appear)", () => {
  // 1 margin counted, 1 capex active (not counted), 1 revenue unknown (not counted).
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("margin", "met"),
      mk("capex", "active"),
      mk("revenue", "unknown"),
    ]),
  );
  const cats = r.byCategory.map((b) => b.category);
  assert.deepEqual(cats, ["margin"]);
});

test("per-category bucket order: capex, capacity, revenue, margin, other", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("other", "met"),
      mk("margin", "met"),
      mk("revenue", "met"),
      mk("capex", "met"),
      mk("utilization", "met"),
    ]),
  );
  // All 5 categories present, each n=1 → all not_enough_data, but ordered.
  const order = r.byCategory.map((b) => b.category);
  assert.deepEqual(order, ["capex", "capacity", "revenue", "margin", "other"]);
});

// ===========================================================================
// Overall tier
// ===========================================================================

test("overall: aggregates all counted commitments across categories", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("capex", "met"),
      mk("capex", "met"),
      mk("capex", "delayed"),
      mk("margin", "met"),
      mk("revenue", "dropped"),
      mk("revenue", "active"), // not counted
    ]),
  );
  // counted: 5 (4 capex/margin/revenue with met/delayed/dropped). on-time: 3.
  assert.equal(r.overall.totalCount, 5);
  assert.equal(r.overall.onTimeCount, 3);
  assert.equal(r.overall.tier, "erratic"); // 60%
});

// ===========================================================================
// Matrix preservation: ALL items appear in commitments[], counted or not
// ===========================================================================

test("commitments[] preserves not-counted items for the matrix drawer", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("capex", "met"),
      mk("capex", "active"),
      mk("capex", "not_yet_clear"),
    ]),
  );
  // All 3 in commitments[]; only 1 counts for grade.
  assert.equal(r.commitments.length, 3);
  assert.equal(r.commitments.filter((c) => c.counts_for_grade).length, 1);
});

// ===========================================================================
// Misc fields
// ===========================================================================

test("delay_mention_count counts trail entries with mentionType='delay'", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("capex", "delayed", {
        trail: [
          { quarter: "Q1 FY26", summary: null, excerpt: null, mentionType: "first_mention", documentType: null, documentLabel: null, sourceReference: null, confidence: null, positionInStory: 0 },
          { quarter: "Q2 FY26", summary: null, excerpt: null, mentionType: "delay", documentType: null, documentLabel: null, sourceReference: null, confidence: null, positionInStory: 1 },
          { quarter: "Q3 FY26", summary: null, excerpt: null, mentionType: "delay", documentType: null, documentLabel: null, sourceReference: null, confidence: null, positionInStory: 2 },
        ],
      }),
    ]),
  );
  assert.equal(r.commitments[0].delay_mention_count, 2);
});

test("asOfQuarter picks the latest mention period across all commitments", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("capex", "met", { latestMentionPeriod: "Q1 FY25" }),
      mk("capex", "met", { latestMentionPeriod: "Q3 FY26" }),
      mk("capex", "met", { latestMentionPeriod: "Q2 FY26" }),
    ]),
  );
  assert.equal(r.asOfQuarter, "Q3 FY26");
});

test("dataSpan: earliest firstMentionPeriod → latest latestMentionPeriod", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("capex", "met", {
        firstMentionPeriod: "Q2 FY25",
        latestMentionPeriod: "Q4 FY26",
      }),
      mk("revenue", "active", {
        firstMentionPeriod: "Q1 FY25",
        latestMentionPeriod: "Q3 FY26",
      }),
      mk("margin", "delayed", {
        firstMentionPeriod: "Q3 FY26",
        latestMentionPeriod: "Q3 FY26",
      }),
    ]),
  );
  assert.equal(r.dataSpanStart, "Q1 FY25");
  assert.equal(r.dataSpanEnd, "Q4 FY26");
});

test("dataSpan: null start/end when no commitment quarters are parseable", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("capex", "met", {
        firstMentionPeriod: null,
        latestMentionPeriod: null,
      }),
    ]),
  );
  assert.equal(r.dataSpanStart, null);
  assert.equal(r.dataSpanEnd, null);
});

test("dataSpan: same start and end when all commitments share one quarter", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("capex", "met", {
        firstMentionPeriod: "Q4 FY26",
        latestMentionPeriod: "Q4 FY26",
      }),
    ]),
  );
  assert.equal(r.dataSpanStart, "Q4 FY26");
  assert.equal(r.dataSpanEnd, "Q4 FY26");
});

test("analysisWindowQuarters passes through from snapshot", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("capex", "met")]));
  assert.equal(r.analysisWindowQuarters, 4);
});

test("commitment fields preserved: label, source_quarter, target_period, status_label", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("capex", "met", {
        guidanceText: "Commission AHF plant at Dahej",
        firstMentionPeriod: "Q1 FY25",
        targetPeriod: "Q4 FY26",
        statusLabel: "Met",
      }),
    ]),
  );
  const c = r.commitments[0];
  assert.equal(c.label, "Commission AHF plant at Dahej");
  assert.equal(c.source_quarter, "Q1 FY25");
  assert.equal(c.target_period, "Q4 FY26");
  assert.equal(c.status_label, "Met");
});

console.log("\nAll walk-the-talk normalize tests passed.");
