import assert from "node:assert/strict";

import type { ReportingQuarter } from "../lib/current-quarter";
import { buildGuidanceVerdict } from "../lib/guidance-tracking/verdict";
import {
  buildEvidenceByKey,
  evidenceCountLine,
  parseEvidenceClass,
  splitLiveByHorizon,
} from "../lib/guidance-tracking/horizon-split";
import type {
  NormalizedGuidanceItem,
  NormalizedGuidanceTrailItem,
} from "../lib/guidance-tracking/types";

// This year / Long-term split of the live guidance book
// (lib/guidance-tracking/horizon-split.ts). Every branch of the bucket rule,
// plus the evidence join, is pinned here because the section renders these
// buckets directly — a commitment in the wrong card, or in two cards, is the
// defect this split exists to prevent.

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

const CURRENT: ReportingQuarter = { fy: 2027, qtr: 2, label: "Q2 FY27" };

let nextId = 1;
const trailStep = (
  overrides: Partial<NormalizedGuidanceTrailItem> & { quarter: string; mentionType: string },
): NormalizedGuidanceTrailItem => ({
  quarter: overrides.quarter,
  summary: null,
  excerpt: null,
  mentionType: overrides.mentionType,
  documentType: null,
  documentLabel: null,
  sourceReference: null,
  confidence: null,
  valuePercent: overrides.valuePercent ?? null,
  valueText: overrides.valueText ?? null,
  valueKind: overrides.valueKind ?? null,
  numericValue: overrides.numericValue ?? null,
  unit: overrides.unit ?? null,
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
  appliesFrom: "FY28",
  appliesTo: "FY28", // ahead of CURRENT (Q2 FY27) unless overridden
  horizonLabel: "FY28",
  valuePercent: null,
  valueText: null,
  valueKind: null,
  numericValue: null,
  unit: null,
  firstMentionPeriod: "Q1 FY27",
  latestMentionPeriod: "Q1 FY27",
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


const liveOf = (items: NormalizedGuidanceItem[]) => buildGuidanceVerdict(items, CURRENT).live;
const keys = (rows: { item: NormalizedGuidanceItem }[]) => rows.map((r) => r.item.guidanceKey).sort();

test("due inside the current FY → thisYear; later → longTerm", () => {
  const a = item({ guidanceKey: "fy27", statusKey: "active", appliesTo: "FY27", horizonLabel: "FY27" });
  const b = item({ guidanceKey: "q3fy27", statusKey: "active", appliesTo: "Q3 FY27", horizonLabel: "Q3 FY27" });
  const c = item({ guidanceKey: "fy30", statusKey: "active", appliesTo: "FY30", horizonLabel: "FY30" });
  const s = splitLiveByHorizon(liveOf([a, b, c]), CURRENT);
  assert.deepEqual(keys(s.thisYear.rows), ["fy27", "q3fy27"]);
  assert.deepEqual(keys(s.longTerm.rows), ["fy30"]);
  assert.deepEqual(s.ongoing.rows, []);
  assert.equal(s.thisYearLabel, "FY27");
  assert.equal(s.longTermLabel, "FY28+");
});

test("Q4 of the current FY is the boundary: Q4 FY27 is this year, Q1 FY28 is long-term", () => {
  const q4 = item({ guidanceKey: "q4", statusKey: "active", appliesTo: "Q4 FY27" });
  const q1 = item({ guidanceKey: "q1next", statusKey: "active", appliesTo: "Q1 FY28" });
  const s = splitLiveByHorizon(liveOf([q4, q1]), CURRENT);
  assert.deepEqual(keys(s.thisYear.rows), ["q4"]);
  assert.deepEqual(keys(s.longTerm.rows), ["q1next"]);
});

test("standing, rolling and 'ongoing' horizons → ongoing, even with a near applies_to", () => {
  const rolling = item({ guidanceKey: "rolling", statusKey: "active", horizonType: "rolling", appliesTo: "FY27" });
  const unspecified = item({ guidanceKey: "unspec", statusKey: "active", horizonType: "unspecified", appliesTo: null });
  const ongoing = item({ guidanceKey: "ongoing", statusKey: "active", horizonType: null, appliesTo: "Ongoing" });
  const s = splitLiveByHorizon(liveOf([rolling, unspecified, ongoing]), CURRENT);
  assert.deepEqual(keys(s.ongoing.rows), ["ongoing", "rolling", "unspec"]);
  assert.deepEqual(s.thisYear.rows, []);
  assert.deepEqual(s.longTerm.rows, []);
});

test("an unreadable, non-standing horizon never lands in thisYear", () => {
  const vague = item({ guidanceKey: "vague", statusKey: "active", horizonType: "single_fy", appliesTo: "medium term" });
  const s = splitLiveByHorizon(liveOf([vague]), CURRENT);
  assert.deepEqual(keys(s.ongoing.rows), ["vague"]);
  assert.deepEqual(s.thisYear.rows, []);
});

test("delayed and elapsed threads are resolved by the portal, so they are in no bucket", () => {
  const delayed = item({ guidanceKey: "delayed", statusKey: "delayed", appliesTo: "FY28" });
  const elapsed = item({ guidanceKey: "elapsed", statusKey: "active", appliesTo: "FY26" });
  const live = item({ guidanceKey: "live", statusKey: "active", appliesTo: "FY27" });
  const s = splitLiveByHorizon(liveOf([delayed, elapsed, live]), CURRENT);
  const all = [...s.thisYear.rows, ...s.longTerm.rows, ...s.ongoing.rows];
  assert.deepEqual(keys(all), ["live"]);
});

test("every live row lands in exactly one bucket, in the verdict's ranked order", () => {
  const items = [
    item({ guidanceKey: "a", statusKey: "active", appliesTo: "FY29" }),
    item({ guidanceKey: "b", statusKey: "revised", appliesTo: "FY27" }),
    item({ guidanceKey: "c", statusKey: "active", appliesTo: "Ongoing" }),
    item({ guidanceKey: "d", statusKey: "active", appliesTo: "FY27", segment: "Exports" }),
    item({ guidanceKey: "e", statusKey: "not_yet_clear", appliesTo: "FY28" }),
  ];
  const live = liveOf(items);
  const s = splitLiveByHorizon(live, CURRENT);
  const all = [...s.thisYear.rows, ...s.longTerm.rows, ...s.ongoing.rows];
  assert.equal(all.length, live.length);
  assert.equal(new Set(all.map((r) => r.item.guidanceKey)).size, live.length);
  const rankedThisYear = live.filter((r) => ["b", "d"].includes(r.item.guidanceKey)).map((r) => r.item.guidanceKey);
  assert.deepEqual(s.thisYear.rows.map((r) => r.item.guidanceKey), rankedThisYear);
});

test("no live rows → three empty buckets, labels still set", () => {
  const s = splitLiveByHorizon([], CURRENT);
  assert.deepEqual([s.thisYear.rows.length, s.longTerm.rows.length, s.ongoing.rows.length], [0, 0, 0]);
  assert.equal(s.thisYear.evidence.classed, 0);
  assert.equal(s.thisYearLabel, "FY27");
});

test("evidence counts cover only the rows in the bucket; unclassed rows are skipped", () => {
  const items = [
    item({ guidanceKey: "t1", statusKey: "active", appliesTo: "FY27" }),
    item({ guidanceKey: "t2", statusKey: "active", appliesTo: "FY27" }),
    item({ guidanceKey: "t3", statusKey: "active", appliesTo: "FY27" }),
    item({ guidanceKey: "l1", statusKey: "active", appliesTo: "FY30" }),
  ];
  const evidence = buildEvidenceByKey([
    { guidance_key: "t1", evidence_class: "order_backed" },
    { guidance_key: "t2", evidence_class: "asserted" },
    { guidance_key: "l1", evidence_class: "aspiration" },
    { guidance_key: "not-on-screen", evidence_class: "order_backed" },
  ]);
  const s = splitLiveByHorizon(liveOf(items), CURRENT, evidence);
  assert.deepEqual(s.thisYear.evidence, { orderBacked: 1, asserted: 1, aspiration: 0, classed: 2 });
  assert.deepEqual(s.longTerm.evidence, { orderBacked: 0, asserted: 0, aspiration: 1, classed: 1 });
});

test("buildEvidenceByKey drops junk classes, missing keys and null input", () => {
  assert.deepEqual(buildEvidenceByKey(null), {});
  assert.deepEqual(
    buildEvidenceByKey([
      { guidance_key: "ok", evidence_class: "asserted" },
      { guidance_key: "junk", evidence_class: "rock_solid" },
      { guidance_key: "none", evidence_class: null },
      { guidance_key: 7, evidence_class: "asserted" },
      {},
    ]),
    { ok: "asserted" },
  );
  assert.equal(parseEvidenceClass("order_backed"), "order_backed");
  assert.equal(parseEvidenceClass("ORDER_BACKED"), null);
  assert.equal(parseEvidenceClass(undefined), null);
});

test("evidenceCountLine: zero classes omitted, singular aspiration, null when nothing classed", () => {
  assert.equal(evidenceCountLine({ orderBacked: 3, asserted: 1, aspiration: 0, classed: 4 }), "3 order-backed · 1 asserted");
  assert.equal(evidenceCountLine({ orderBacked: 0, asserted: 0, aspiration: 1, classed: 1 }), "1 aspiration");
  assert.equal(evidenceCountLine({ orderBacked: 0, asserted: 2, aspiration: 2, classed: 4 }), "2 asserted · 2 aspirations");
  assert.equal(evidenceCountLine({ orderBacked: 0, asserted: 0, aspiration: 0, classed: 0 }), null);
});

console.log("guidance-horizon-split: all passed");
