import assert from "node:assert/strict";

import { normalizeWalkTheTalk } from "../lib/walk-the-talk/normalize";
import type { NormalizedGuidanceSnapshot } from "../lib/guidance-snapshot/types";
import type {
  NormalizedGuidanceItem,
  NormalizedGuidanceTrailItem,
} from "../lib/guidance-tracking/types";

// Coverage-audit follow-up (2026-09-06 ship-workflow audit of the Guidance
// tab verdict redesign). lib/walk-the-talk/normalize.ts's `liveCount` /
// `liveRevisedUpCount` / `liveRevisedDownCount` fields are brand-new in this
// diff (feed the Overview card's "N more commitments live ... revised down"
// note at app/company/components/overview-signal-board.tsx:1096-1103) but
// tests/walk-the-talk-normalize.test.ts — otherwise an exhaustive spec for
// this file — never asserts on any of the three. This closes that gap.

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

let nextItemId = 1;

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
  id: nextItemId++,
  companyCode: "TESTCO",
  guidanceKey: `K${nextItemId}`,
  guidanceText: "default text",
  guidanceFamily: "growth",
  metricSubtype: "revenue",
  metricLabel: null,
  metricLabelMidSentence: null,
  segment: null,
  segmentCanonical: null,
  horizonType: "single_fy",
  appliesFrom: "FY30",
  appliesTo: "FY30", // far ahead of any wall-clock CURRENT — stays live
  horizonLabel: "FY30",
  valuePercent: null,
  valueText: null,
  valueKind: null,
  numericValue: null,
  unit: null,
  firstMentionPeriod: "Q1 FY26",
  latestMentionPeriod: "Q1 FY26",
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

const snapshot = (items: NormalizedGuidanceItem[]): NormalizedGuidanceSnapshot => ({
  companyCode: "TESTCO",
  generatedAtRaw: "2026-05-14T00:00:00Z",
  updatedAtRaw: "2026-05-14T00:00:00Z",
  analysisWindowQuarters: 4,
  guidanceItems: items,
  sourceFiles: [],
  details: null,
});

test("liveCount / revised counts: 0 for a schema-missing snapshot", () => {
  const r = normalizeWalkTheTalk(null);
  assert.equal(r.liveCount, 0);
  assert.equal(r.liveRevisedUpCount, 0);
  assert.equal(r.liveRevisedDownCount, 0);
});

test("liveCount: an on_track (active, horizon ahead) item counts as live but not revised either way", () => {
  const r = normalizeWalkTheTalk(snapshot([item({ statusKey: "active" })]));
  assert.equal(r.liveCount, 1);
  assert.equal(r.liveRevisedUpCount, 0);
  assert.equal(r.liveRevisedDownCount, 0);
});

test("liveCount: a resolved (met) item does NOT count as live", () => {
  const r = normalizeWalkTheTalk(
    snapshot([item({ statusKey: "met", horizonType: "single_fy", appliesFrom: "FY20", appliesTo: "FY20" })]),
  );
  assert.equal(r.liveCount, 0);
});

test("liveRevisedDownCount: a revised item whose trail trends down counts as revised-down, not up", () => {
  const revisedDown = item({
    statusKey: "revised",
    guidanceText: "Segment target trimmed",
    trail: [
      trailStep({ quarter: "Q1 FY26", mentionType: "first_mention", valueText: "INR 200 crores" }),
      trailStep({ quarter: "Q3 FY26", mentionType: "revision", valueText: "INR 170-180 crores" }),
    ],
  });
  const r = normalizeWalkTheTalk(snapshot([revisedDown]));
  assert.equal(r.liveCount, 1);
  assert.equal(r.liveRevisedDownCount, 1);
  assert.equal(r.liveRevisedUpCount, 0);
});

test("liveRevisedUpCount: a revised item whose trail trends up counts as revised-up, not down", () => {
  const revisedUp = item({
    statusKey: "revised",
    guidanceText: "Segment target raised",
    trail: [
      trailStep({ quarter: "Q1 FY26", mentionType: "first_mention", valueText: "20% plus", valuePercent: 20 }),
      trailStep({ quarter: "Q3 FY26", mentionType: "revision", valueText: "40% plus", valuePercent: 40 }),
    ],
  });
  const r = normalizeWalkTheTalk(snapshot([revisedUp]));
  assert.equal(r.liveCount, 1);
  assert.equal(r.liveRevisedUpCount, 1);
  assert.equal(r.liveRevisedDownCount, 0);
});

test("liveCount: mixed book counts on_track + up + down independently, and never double-counts", () => {
  const held = item({ statusKey: "active", guidanceText: "Held" });
  const revisedDown = item({
    statusKey: "revised",
    guidanceText: "Trimmed",
    trail: [
      trailStep({ quarter: "Q1 FY26", mentionType: "first_mention", valueText: "INR 200 crores" }),
      trailStep({ quarter: "Q3 FY26", mentionType: "revision", valueText: "INR 170 crores" }),
    ],
  });
  const r = normalizeWalkTheTalk(snapshot([held, revisedDown]));
  assert.equal(r.liveCount, 2);
  assert.equal(r.liveRevisedDownCount, 1);
  assert.equal(r.liveRevisedUpCount, 0);
});

console.log("\nAll walk-the-talk live-count tests passed.");
