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
  guidanceFamily: null,
  metricSubtype: null,
  metricLabel: null,
  segment: null,
  segmentCanonical: null,
  horizonType: null,
  appliesFrom: null,
  appliesTo: null,
  horizonLabel: null,
  valuePercent: null,
  valueText: null,
  valueKind: null,
  numericValue: null,
  unit: null,
  firstMentionPeriod: "Q1 FY26",
  latestMentionPeriod: "Q1 FY26",
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

// Test fixture helper. The first arg is a "logical category" string used by
// older tests; it maps to a (family, subtype) pair on the new shape. Anything
// not in the map is left as a null family — which exercises the "other"
// bucket in mapGuidanceFamilyToCategory.
// Phase 6 narrowed scope: GROWTH only. Margin / gross are out of scope and
// no longer mapped here. Strings not in the map produce a null family,
// which exercises the "other" bucket in mapGuidanceFamilyToCategory.
const FAMILY_MAP: Record<
  string,
  { family: NormalizedGuidanceItem["guidanceFamily"]; subtype: NormalizedGuidanceItem["metricSubtype"] }
> = {
  growth: { family: "growth", subtype: "revenue" },
  revenue: { family: "growth", subtype: "revenue" },
  ebitda_growth: { family: "growth", subtype: "ebitda" },
  pat_growth: { family: "growth", subtype: "pat" },
};

const mk = (
  type: string | null,
  status: NormalizedGuidanceStatusKey,
  extras: Partial<NormalizedGuidanceItem> = {},
) => {
  const mapping = type ? FAMILY_MAP[type] ?? null : null;
  return item({
    guidanceFamily: mapping?.family ?? null,
    metricSubtype: mapping?.subtype ?? null,
    statusKey: status,
    statusLabel: status,
    ...extras,
  });
};

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
  const r = normalizeWalkTheTalk(snapshot([mk("growth", "met")]));
  assert.equal(r.schemaStatus, "present");
});

// ===========================================================================
// Category mapping (mapGuidanceFamilyToCategory)
// Phase 6 v2 narrowed scope: GROWTH only. Margin / capex / capacity buckets
// are no longer populated by the producer. mapGuidanceFamilyToCategory still
// has the legacy "margin → 'margin'" branch for forward-compatibility, but
// the producer never emits margin now so we don't test that branch here.
// ===========================================================================

test("category mapping: growth family → 'revenue'", () => {
  const r = normalizeWalkTheTalk(
    snapshot([mk("growth", "met"), mk("ebitda_growth", "met"), mk("pat_growth", "met")]),
  );
  const categories = r.commitments.map((c) => c.category).sort();
  assert.deepEqual(categories, ["revenue", "revenue", "revenue"]);
});

test("category mapping: null/unknown family → 'other'", () => {
  const r = normalizeWalkTheTalk(
    snapshot([mk(null, "met"), mk("unrecognized", "met")]),
  );
  const allOther = r.commitments.every((c) => c.category === "other");
  assert.equal(allOther, true);
});

// ===========================================================================
// Status flags on commitment rows
// ===========================================================================

test("status: met → counts=true, on_time=true", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("growth", "met")]));
  const c = r.commitments[0];
  assert.equal(c.counts_for_grade, true);
  assert.equal(c.on_time, true);
});

test("status: delayed → counts=true, on_time=false", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("growth", "delayed")]));
  const c = r.commitments[0];
  assert.equal(c.counts_for_grade, true);
  assert.equal(c.on_time, false);
});

test("status: dropped → counts=true, on_time=false", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("growth", "dropped")]));
  const c = r.commitments[0];
  assert.equal(c.counts_for_grade, true);
  assert.equal(c.on_time, false);
});

test("status: revised → counts=true, on_time=false", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("growth", "revised")]));
  const c = r.commitments[0];
  assert.equal(c.counts_for_grade, true);
  assert.equal(c.on_time, false);
});

test("status: active → counts=false (in matrix, not graded)", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("growth", "active")]));
  const c = r.commitments[0];
  assert.equal(c.counts_for_grade, false);
});

test("status: not_yet_clear → counts=false", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("growth", "not_yet_clear")]));
  assert.equal(r.commitments[0].counts_for_grade, false);
});

test("status: unknown → counts=false", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("growth", "unknown")]));
  assert.equal(r.commitments[0].counts_for_grade, false);
});

// ===========================================================================
// Per-category bucket aggregation
// ===========================================================================

test("per-category: 3 revenue, 3 met → 'reliable' (100%)", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("growth", "met"),
      mk("growth", "met"),
      mk("growth", "met"),
    ]),
  );
  const bucket = r.byCategory.find((b) => b.category === "revenue");
  assert.ok(bucket);
  assert.equal(bucket.total_count, 3);
  assert.equal(bucket.on_time_count, 3);
  assert.equal(bucket.tier, "reliable");
});

test("per-category: 4 revenue, 2 met → 'erratic' (50%)", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("growth", "met"),
      mk("growth", "met"),
      mk("growth", "delayed"),
      mk("growth", "dropped"),
    ]),
  );
  const bucket = r.byCategory.find((b) => b.category === "revenue");
  assert.ok(bucket);
  assert.equal(bucket.tier, "erratic");
});

test("per-category: only 2 in category → 'not_enough_data'", () => {
  // Two unrecognized-family items → both map to "other" bucket.
  const r = normalizeWalkTheTalk(
    snapshot([mk("unrecognized", "met"), mk("unrecognized", "met")]),
  );
  const bucket = r.byCategory.find((b) => b.category === "other");
  assert.ok(bucket);
  assert.equal(bucket.total_count, 2);
  assert.equal(bucket.tier, "not_enough_data");
});

test("empty per-category buckets are suppressed (only those with ≥1 counted item appear)", () => {
  // 1 revenue counted (growth/met), 1 growth active (not counted), 1 revenue
  // unknown (not counted). Only the counted-revenue should produce a bucket.
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("growth", "met"),
      mk("growth", "active"),
      mk("revenue", "unknown"),
    ]),
  );
  const cats = r.byCategory.map((b) => b.category);
  assert.deepEqual(cats, ["revenue"]);
});

test("per-category bucket order: revenue, other (margin/capex/capacity unpopulated in v2)", () => {
  // Phase 6 v2 narrowed to growth-only — only revenue and other buckets
  // can ever appear. Order follows the WT_T constant (capex, capacity,
  // revenue, margin, other) with absent buckets dropped.
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("other", "met"),
      mk("revenue", "met"),
    ]),
  );
  const order = r.byCategory.map((b) => b.category);
  assert.deepEqual(order, ["revenue", "other"]);
});

// ===========================================================================
// Overall tier
// ===========================================================================

test("overall: aggregates all counted commitments across categories", () => {
  // All counted items: 3 met (on-time), 1 delayed, 1 dropped (not on-time).
  // 1 active not counted. Total 5 counted, 3 on-time = 60% → erratic.
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("growth", "met"),
      mk("growth", "met"),
      mk("growth", "delayed"),
      mk("ebitda_growth", "met"),
      mk("revenue", "dropped"),
      mk("revenue", "active"), // not counted
    ]),
  );
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
      mk("growth", "met"),
      mk("growth", "active"),
      mk("growth", "not_yet_clear"),
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
      mk("growth", "delayed", {
        trail: [
          { quarter: "Q1 FY26", summary: null, excerpt: null, mentionType: "first_mention", documentType: null, documentLabel: null, sourceReference: null, confidence: null, valuePercent: null, valueText: null, valueKind: null, numericValue: null, unit: null, horizonType: null, appliesFrom: null, appliesTo: null, horizonLabel: null },
          { quarter: "Q2 FY26", summary: null, excerpt: null, mentionType: "delay", documentType: null, documentLabel: null, sourceReference: null, confidence: null, valuePercent: null, valueText: null, valueKind: null, numericValue: null, unit: null, horizonType: null, appliesFrom: null, appliesTo: null, horizonLabel: null },
          { quarter: "Q3 FY26", summary: null, excerpt: null, mentionType: "delay", documentType: null, documentLabel: null, sourceReference: null, confidence: null, valuePercent: null, valueText: null, valueKind: null, numericValue: null, unit: null, horizonType: null, appliesFrom: null, appliesTo: null, horizonLabel: null },
        ],
      }),
    ]),
  );
  assert.equal(r.commitments[0].delay_mention_count, 2);
});

test("asOfQuarter picks the latest mention period across all commitments", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("growth", "met", { latestMentionPeriod: "Q1 FY25" }),
      mk("growth", "met", { latestMentionPeriod: "Q3 FY26" }),
      mk("growth", "met", { latestMentionPeriod: "Q2 FY26" }),
    ]),
  );
  assert.equal(r.asOfQuarter, "Q3 FY26");
});

test("dataSpan: earliest firstMentionPeriod → latest latestMentionPeriod", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("growth", "met", {
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
      mk("growth", "met", {
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
      mk("growth", "met", {
        firstMentionPeriod: "Q4 FY26",
        latestMentionPeriod: "Q4 FY26",
      }),
    ]),
  );
  assert.equal(r.dataSpanStart, "Q4 FY26");
  assert.equal(r.dataSpanEnd, "Q4 FY26");
});

test("analysisWindowQuarters passes through from snapshot", () => {
  const r = normalizeWalkTheTalk(snapshot([mk("growth", "met")]));
  assert.equal(r.analysisWindowQuarters, 4);
});

test("commitment fields preserved: label, source_quarter, target_period, status_label", () => {
  const r = normalizeWalkTheTalk(
    snapshot([
      mk("growth", "met", {
        guidanceText: "Commission AHF plant at Dahej",
        firstMentionPeriod: "Q1 FY25",
        horizonLabel: "Q4 FY26",
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
