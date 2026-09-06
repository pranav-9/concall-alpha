import assert from "node:assert/strict";

import type { ReportingQuarter } from "../lib/current-quarter";
import {
  buildGuidanceVerdict,
  classifyGuidanceItem,
  commitmentShortLabel,
  heldSinceQuarter,
} from "../lib/guidance-tracking/verdict";
import {
  formatMetricLabel,
  formatMetricLabelMidSentence,
} from "../lib/guidance-tracking/normalize";
import type {
  NormalizedGuidanceItem,
  NormalizedGuidanceStatusKey,
  NormalizedGuidanceTrailItem,
} from "../lib/guidance-tracking/types";

// Coverage-audit follow-up (2026-09-06 ship-workflow audit of the Guidance
// tab verdict redesign). tests/guidance-verdict.test.ts already covers the
// bulk of lib/guidance-tracking/verdict.ts branch-by-branch; these three
// close gaps found while tracing every branch against that file:
//   1. classifyGuidanceItem's not_yet_clear/unknown default branch (the
//      "no_update" LiveState) was never exercised, and buildGuidanceVerdict's
//      liveNote silently omits ANY qualifier for it (unlike on_track/revised/
//      delayed, which all get one) — worth pinning so a future reader isn't
//      surprised the note reads as a bare "N commitments are live.".
//   2. buildGuidanceVerdict on a fully empty items[] (the very first company
//      page load before any guidance has been tracked) was untested.
//   3. heldSinceQuarter's core "the stated value differs from current, so
//      stop walking" branch — the ONLY tested case up to now happened to
//      stop instead on a first_mention/revision mention_type before ever
//      hitting a value mismatch. A quietly-changed value on an untagged
//      "update"/"repeat" step (the exact HFCL-shaped drift this module's
//      other comments call out) is the realistic case that exercises it.

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

// ---------------------------------------------------------------------------
// 1. classifyGuidanceItem: not_yet_clear / unknown status, horizon ahead
//    → { phase: "live", state: "no_update" } — and its downstream effect on
//    buildGuidanceVerdict's liveNote.
// ---------------------------------------------------------------------------

test("classifyGuidanceItem: not_yet_clear + horizon ahead → live/no_update", () => {
  const it = item({ statusKey: "not_yet_clear" });
  assert.deepEqual(classifyGuidanceItem(it, CURRENT), { phase: "live", state: "no_update" });
});

test("classifyGuidanceItem: unknown + horizon ahead → live/no_update", () => {
  const it = item({ statusKey: "unknown" });
  assert.deepEqual(classifyGuidanceItem(it, CURRENT), { phase: "live", state: "no_update" });
});

test("buildGuidanceVerdict: a lone no_update live item gets a bare liveNote (no qualifier)", () => {
  const it = item({ statusKey: "not_yet_clear", guidanceText: "Margin trajectory" });
  const v = buildGuidanceVerdict([it], CURRENT);
  assert.equal(v.live.length, 1);
  assert.equal(v.live[0].state, "no_update");
  // countedCount is 0 here, so the lead clause omits "more".
  assert.equal(v.liveNote, "One commitment is live.");
  assert.equal(v.summary, "No commitment has reached its horizon yet — one is live.");
});

test("buildGuidanceVerdict: no_update items sit alongside on_track ones without corrupting their qualifiers", () => {
  const heldItem = item({ statusKey: "active", guidanceText: "Held target" });
  const noUpdateItem = item({ statusKey: "unknown", guidanceText: "No read yet" });
  const v = buildGuidanceVerdict([heldItem, noUpdateItem], CURRENT);
  assert.equal(v.live.length, 2);
  // "held" counts only the on_track one; the no_update one contributes to
  // live.length but not to any of the note's qualifier buckets.
  assert.equal(v.liveNote, "Two commitments are live — one held.");
});

// ---------------------------------------------------------------------------
// 2. buildGuidanceVerdict on a fully empty items[] — first-load state before
//    any guidance has been tracked for a company at all.
// ---------------------------------------------------------------------------

test("buildGuidanceVerdict: empty items[] reads as 'nothing resolved yet', not '0 live'", () => {
  const v = buildGuidanceVerdict([], CURRENT);
  assert.equal(v.countedCount, 0);
  assert.equal(v.resolved.length, 0);
  assert.equal(v.live.length, 0);
  assert.equal(v.summary, "No tracked commitment has resolved yet.");
  assert.equal(v.liveNote, null);
  assert.equal(v.tier, "not_enough_data");
  assert.equal(v.headline, "Too early to call.");
});

// ---------------------------------------------------------------------------
// 3. heldSinceQuarter: a value quietly changes on an UNTAGGED step (mention
//    type other than first_mention/revision) — the walk must stop on the
//    value mismatch itself, not rely on the mention_type ever flipping.
// ---------------------------------------------------------------------------

test("heldSinceQuarter: stops at the value-mismatch step even when mention_type never says 'revision'", () => {
  const it = item({
    guidanceText: "Quiet revenue re-guide",
    valueKind: "percent",
    valuePercent: 30,
    numericValue: 30,
    valueText: "30% plus",
    trail: [
      trailStep({ quarter: "Q1 FY26", mentionType: "first_mention", valueText: "20% plus", valuePercent: 20 }),
      trailStep({ quarter: "Q2 FY26", mentionType: "update", valueText: "20% plus", valuePercent: 20 }),
      // Value quietly moves to 30% here, tagged only "update" (not "revision").
      trailStep({ quarter: "Q3 FY26", mentionType: "update", valueText: "30% plus", valuePercent: 30 }),
      trailStep({ quarter: "Q4 FY26", mentionType: "repeat", valueText: "30% plus", valuePercent: 30 }),
    ],
  });
  // Held since the quarter the NEW value first appears (Q3 FY26) — walking
  // back from Q4 FY26 (matches current, no break) through Q3 FY26 (matches
  // current, no break, since=Q3 FY26) then hitting Q2 FY26 whose stated
  // value (20%) differs from current (30%) and breaking there.
  assert.equal(heldSinceQuarter(it), "Q3 FY26");
});

// ---------------------------------------------------------------------------
// 4. formatMetricLabel / formatMetricLabelMidSentence: the v2-schema
//    subtypes added alongside this diff (margin family's gross_margin/
//    pat_margin, and the yield family's revenue_yield/nim) had zero direct
//    coverage — only ebitda_margin was exercised anywhere in the suite.
// ---------------------------------------------------------------------------

test("formatMetricLabel: margin family subtypes", () => {
  assert.equal(formatMetricLabel("margin", "gross_margin"), "Gross margin");
  assert.equal(formatMetricLabel("margin", "pat_margin"), "PAT margin");
});

test("formatMetricLabel: yield family subtypes", () => {
  assert.equal(formatMetricLabel("yield", "revenue_yield"), "Revenue yield");
  assert.equal(formatMetricLabel("yield", "nim"), "NIM");
});

test("formatMetricLabelMidSentence: acronym subtypes stay capitalized, plain ones lowercase", () => {
  assert.equal(formatMetricLabelMidSentence("margin", "pat_margin"), "PAT margin");
  assert.equal(formatMetricLabelMidSentence("margin", "gross_margin"), "gross margin");
  assert.equal(formatMetricLabelMidSentence("yield", "nim"), "NIM");
  assert.equal(formatMetricLabelMidSentence("yield", "revenue_yield"), "revenue yield");
});

// ---------------------------------------------------------------------------
// 5. commitmentShortLabel: the no-metricLabel long-text truncation fallback
//    (guidanceText > 60 chars, no family/subtype to derive a metric label
//    from) was untested — only the metricLabel-present paths were covered.
// ---------------------------------------------------------------------------

test("commitmentShortLabel: falls back to a truncated guidanceText when there's no metricLabel", () => {
  const longText =
    "Management expects the newly commissioned facility to reach full utilisation over the next two years";
  const it = item({ guidanceFamily: null, metricSubtype: null, metricLabel: null, guidanceText: longText, horizonLabel: null });
  const label = commitmentShortLabel(it);
  assert.equal(label.endsWith("…"), true);
  assert.equal(label.length, 59); // 58 sliced chars + the ellipsis
  assert.equal(label, `${longText.slice(0, 58)}…`);
});

test("commitmentShortLabel: short guidanceText with no metricLabel renders verbatim, sentence-cased", () => {
  const it = item({ guidanceFamily: null, metricSubtype: null, metricLabel: null, guidanceText: "margin holds steady", horizonLabel: "FY26" });
  assert.equal(commitmentShortLabel(it), "Margin holds steady (FY26)");
});

console.log("guidance-verdict-coverage-gaps: all assertions passed");
