import assert from "node:assert/strict";

import type { ReportingQuarter } from "../lib/current-quarter";
import {
  LIVE_WATCH_COUNT,
  buildGuidanceVerdict,
  buildLiveRow,
  classifyGuidanceItem,
  commitmentCoreLabel,
  commitmentShortLabel,
  heldSinceQuarter,
  isStandingHorizon,
  liveStateKey,
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


// ---------------------------------------------------------------------------
// 4. Live materiality ranking (2026-09-08 "what to watch" redesign). The
//    live book is ranked, not bucketed, so these pin the comparator's rules
//    and the heading's shared-year claim.
// ---------------------------------------------------------------------------

const live = (o: Partial<NormalizedGuidanceItem>) =>
  item({ statusKey: "active", trail: [], ...o });

test("live ranking: soonest horizon wins over consolidated scope", () => {
  const v = buildGuidanceVerdict(
    [
      live({ guidanceKey: "far-consolidated", guidanceText: "Consolidated FY30", appliesFrom: "FY30", appliesTo: "FY30", horizonLabel: "FY30" }),
      live({ guidanceKey: "near-segment", guidanceText: "Segment FY27", segment: "Defence", appliesFrom: "FY27", appliesTo: "FY27", horizonLabel: "FY27" }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["Segment FY27", "Consolidated FY30"]);
});

test("live ranking: within one horizon, consolidated before segment and revenue before margin", () => {
  const base = { appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" } as const;
  const v = buildGuidanceVerdict(
    [
      live({ ...base, guidanceKey: "seg", guidanceText: "Segment revenue", segment: "Defence" }),
      live({ ...base, guidanceKey: "margin", guidanceText: "Consolidated margin", guidanceFamily: "margin", metricSubtype: "ebitda_margin" }),
      live({ ...base, guidanceKey: "rev", guidanceText: "Consolidated revenue" }),
    ],
    CURRENT,
  );
  assert.deepEqual(
    v.live.map((r) => r.item.guidanceText),
    ["Consolidated revenue", "Consolidated margin", "Segment revenue"],
  );
});

test("live ranking: a standing horizon never comes due, so it sorts last", () => {
  // The standing item wins every OTHER rule (consolidated, revenue, deeper
  // trail, earlier key) so only rule 1 can put it second. Comparing the
  // proximity keys instead of subtracting them is what makes that work:
  // Infinity - n is not finite, and a finiteness guard would drop the
  // comparison entirely (the E2E "Ongoing margin outranks a dated Q2 FY27
  // target" bug, 2026-09-08).
  const v = buildGuidanceVerdict(
    [
      live({
        guidanceKey: "aaa-standing", guidanceText: "Ongoing", horizonType: "unspecified",
        appliesFrom: "ongoing", appliesTo: "ongoing", horizonLabel: "Ongoing",
        trail: [trailStep({ quarter: "Q1 FY27", mentionType: "repeat" })],
      }),
      live({
        guidanceKey: "zzz-dated", guidanceText: "Segment margin FY30", segment: "Defence",
        guidanceFamily: "margin", metricSubtype: "ebitda_margin",
        appliesFrom: "FY30", appliesTo: "FY30", horizonLabel: "FY30",
      }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["Segment margin FY30", "Ongoing"]);
});

test("live ranking: equal on every rule, the guidanceKey keeps the order stable", () => {
  const twin = { appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28", segment: "Defence" } as const;
  const v = buildGuidanceVerdict(
    [
      live({ ...twin, guidanceKey: "zzz", guidanceText: "Z" }),
      live({ ...twin, guidanceKey: "aaa", guidanceText: "A" }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["A", "Z"]);
});

test("watch split: only the first three are carded, the rest collapse", () => {
  const many = ["FY28", "FY29", "FY30", "FY31", "FY32"].map((fy, i) =>
    live({ guidanceKey: `k${i}`, guidanceText: `Item ${i}`, appliesFrom: fy, appliesTo: fy, horizonLabel: fy }),
  );
  const v = buildGuidanceVerdict(many, CURRENT);
  assert.equal(v.watch.length, 3);
  assert.equal(v.watchRest.length, 2);
  assert.deepEqual([...v.watch, ...v.watchRest], v.live);
});

test("watchHorizonLabel: a quarter-precise and an FY-only target in the same year still share a heading", () => {
  const v = buildGuidanceVerdict(
    [
      live({ guidanceKey: "fy", guidanceText: "FY28 target", appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" }),
      live({ guidanceKey: "q", guidanceText: "Q3 FY28 target", horizonType: "single_quarter", appliesFrom: "Q3 FY28", appliesTo: "Q3 FY28", horizonLabel: "Q3 FY28" }),
    ],
    CURRENT,
  );
  assert.equal(v.watchHorizonLabel, "FY28");
});

test("watchHorizonLabel: cards straddling two years get no year claim", () => {
  const v = buildGuidanceVerdict(
    [
      live({ guidanceKey: "a", guidanceText: "FY28", appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" }),
      live({ guidanceKey: "b", guidanceText: "FY30", appliesFrom: "FY30", appliesTo: "FY30", horizonLabel: "FY30" }),
    ],
    CURRENT,
  );
  assert.equal(v.watchHorizonLabel, null);
});

test("watchHorizonLabel: an undateable horizon on a card blocks the year claim", () => {
  const v = buildGuidanceVerdict(
    [
      live({ guidanceKey: "a", guidanceText: "FY28", appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" }),
      live({ guidanceKey: "b", guidanceText: "Ongoing", horizonType: "unspecified", appliesFrom: null, appliesTo: null, horizonLabel: "Ongoing" }),
    ],
    CURRENT,
  );
  assert.equal(v.watchHorizonLabel, null);
});


// ---------------------------------------------------------------------------
// 5. Coverage-audit follow-up (2026-09-08 ship-workflow audit of the "what to
//    watch" redesign). Section 4 above pins the comparator's headline rules;
//    these close the branches it left untraced — the templated headings,
//    commitmentCoreLabel as a standalone export (the WatchCard title calls it
//    directly, not through commitmentShortLabel), buildLiveRow.guidedLabel's
//    null path, every metricRank fallback, the two tiebreaks below metric,
//    horizonDeadlineFy's Q1..Q4 arithmetic across a whole FY, and the
//    watch/watchRest slice at 0 / 1 / exactly-LIVE_WATCH_COUNT.
// ---------------------------------------------------------------------------

// The headings are built in the verdict layer, so their number words and
// verb agreement are testable rather than assembled in the component.
const liveFY = (n: number, fy: string) =>
  Array.from({ length: n }, (_, i) =>
    live({ guidanceKey: `k${i}`, guidanceText: `Item ${i}`, appliesFrom: fy, appliesTo: fy, horizonLabel: fy }),
  );

test("watchHeading: spells the count and agrees the verb with it", () => {
  assert.equal(buildGuidanceVerdict(liveFY(3, "FY28"), CURRENT).watchHeading, "The three that decide FY28.");
  assert.equal(buildGuidanceVerdict(liveFY(1, "FY28"), CURRENT).watchHeading, "The one that decides FY28.");
  assert.equal(buildGuidanceVerdict(liveFY(2, "FY28"), CURRENT).watchHeading, "The two that decide FY28.");
});

test("watchHeading: drops the year claim when the cards straddle years", () => {
  const v = buildGuidanceVerdict(
    [
      live({ guidanceKey: "a", guidanceText: "A", appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" }),
      live({ guidanceKey: "b", guidanceText: "B", appliesFrom: "FY30", appliesTo: "FY30", horizonLabel: "FY30" }),
    ],
    CURRENT,
  );
  assert.equal(v.watchHeading, "The two that matter most.");
});

test("watchRestLabel / watchRestToggleLabel: singular, plural, and none", () => {
  const four = buildGuidanceVerdict(liveFY(4, "FY28"), CURRENT);
  assert.equal(four.watchRestLabel, "The other live commitment");
  assert.equal(four.watchRestToggleLabel, "Show the other commitment");

  const nine = buildGuidanceVerdict(liveFY(9, "FY28"), CURRENT);
  assert.equal(nine.watchRestLabel, "The other six live commitments");
  assert.equal(nine.watchRestToggleLabel, "Show the other six commitments");

  // Nothing collapsed — the section renders no toggle at all.
  const three = buildGuidanceVerdict(liveFY(3, "FY28"), CURRENT);
  assert.equal(three.watchRestLabel, null);
  assert.equal(three.watchRestToggleLabel, null);
});

test("liveStateKey: a revision reads which WAY it went, not just that it moved", () => {
  const revised = (from: number, to: number) =>
    buildLiveRow(
      item({
        statusKey: "revised",
        valueKind: "percent",
        valuePercent: to,
        numericValue: to,
        valueText: `${to}%`,
        latestMentionPeriod: "Q1 FY27",
        trail: [
          trailStep({ quarter: "Q1 FY26", mentionType: "first_mention", valuePercent: from, valueText: `${from}%` }),
          trailStep({ quarter: "Q1 FY27", mentionType: "revision", valuePercent: to, valueText: `${to}%` }),
        ],
      }),
      "revised",
    );
  // A green "Raised" chip on a guidance CUT is the worst thing this section
  // can print, so the direction branch is pinned here rather than left in the
  // component.
  assert.equal(liveStateKey(revised(20, 30)), "raised");
  assert.equal(liveStateKey(revised(30, 20)), "lowered");
  // A revision with no readable value ladder stays on the neutral label.
  assert.equal(liveStateKey(buildLiveRow(item({ statusKey: "revised" }), "revised")), "revised");
  assert.equal(liveStateKey(buildLiveRow(item({ statusKey: "active" }), "on_track")), "held");
  assert.equal(liveStateKey(buildLiveRow(item({ statusKey: "delayed" }), "delayed")), "pushed_out");
  assert.equal(liveStateKey(buildLiveRow(item({ statusKey: "unknown" }), "no_update")), "no_update");
});

test("commitmentCoreLabel: is exactly commitmentShortLabel without the horizon suffix", () => {
  const it = item({ segment: "HPP", horizonLabel: "FY25" });
  assert.equal(commitmentCoreLabel(it), "HPP revenue growth");
  assert.equal(commitmentShortLabel(it), `${commitmentCoreLabel(it)} (FY25)`);
  const noHorizon = item({ segment: "HPP", horizonLabel: null });
  assert.equal(commitmentShortLabel(noHorizon), commitmentCoreLabel(noHorizon));
});

test("commitmentCoreLabel: a segment with no mid-sentence form falls back to metricLabel", () => {
  const it = item({ segment: "Defence", metricLabel: "EBITDA growth", metricLabelMidSentence: null });
  assert.equal(commitmentCoreLabel(it), "Defence EBITDA growth");
});

test("commitmentCoreLabel: the long-guidanceText truncation happens on the core, not after the horizon", () => {
  const longText =
    "Management expects the newly commissioned facility to reach full utilisation over the next two years";
  const it = item({ guidanceFamily: null, metricSubtype: null, metricLabel: null, guidanceText: longText, horizonLabel: "FY29" });
  const core = commitmentCoreLabel(it);
  assert.equal(core.length, 59); // 58 sliced chars + the ellipsis
  assert.equal(core.endsWith("…"), true);
  // The horizon is appended AFTER the ellipsis, never truncated away.
  assert.equal(commitmentShortLabel(it), `${core} (FY29)`);
});

test("buildLiveRow: guidedLabel is null when the commitment is qualitative", () => {
  // The card falls back to "Stated qualitatively — no number on the record."
  // on this branch, so a wrong non-null here would print an empty number.
  const it = item({ statusKey: "active", valueKind: null, valuePercent: null, valueText: null, numericValue: null });
  assert.equal(buildLiveRow(it, "on_track").guidedLabel, null);
});

test("buildLiveRow: guidedLabel carries a margin LEVEL without a growth sign", () => {
  // percent_level is not a growth rate, so withGrowthSign must not prefix it.
  const it = item({
    statusKey: "active",
    guidanceFamily: "margin",
    metricSubtype: "ebitda_margin",
    metricLabel: "EBITDA margin",
    metricLabelMidSentence: "EBITDA margin",
    valueKind: "percent_level",
    valuePercent: 22,
    numericValue: 22,
    valueText: "22%",
  });
  const label = buildLiveRow(it, "on_track").guidedLabel;
  assert.equal(label != null, true);
  assert.equal(label!.startsWith("+"), false, "a level is not a growth rate");
});

test("live ranking: metric rank runs growth → margin → yield across families", () => {
  const base = { appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" } as const;
  const v = buildGuidanceVerdict(
    [
      live({ ...base, guidanceKey: "a-nim", guidanceText: "NIM", guidanceFamily: "yield", metricSubtype: "nim" }),
      live({ ...base, guidanceKey: "b-yield", guidanceText: "Revenue yield", guidanceFamily: "yield", metricSubtype: "revenue_yield" }),
      live({ ...base, guidanceKey: "c-pat", guidanceText: "PAT growth", metricSubtype: "pat" }),
      live({ ...base, guidanceKey: "d-gm", guidanceText: "Gross margin", guidanceFamily: "margin", metricSubtype: "gross_margin" }),
      live({ ...base, guidanceKey: "e-ebitda", guidanceText: "EBITDA growth", metricSubtype: "ebitda" }),
    ],
    CURRENT,
  );
  // Keys are deliberately alphabetical in the OPPOSITE order, so only the
  // metric rank can produce this sequence.
  assert.deepEqual(
    v.live.map((r) => r.item.guidanceText),
    ["EBITDA growth", "PAT growth", "Gross margin", "NIM", "Revenue yield"],
  );
});

test("live ranking: a family with no subtype sorts to the head of its own band", () => {
  // Defensive branch. NOTE for a future reader: normalizeGuidanceTrackingRows
  // cannot currently emit this shape — subtypeBelongsToFamily() requires BOTH
  // family and subtype to be non-null and nulls BOTH when the pair fails, so
  // guidanceFamily is never set without metricSubtype. Pinned anyway because
  // metricRank's FAMILY_RANK fallback is what the comparator's doc comment
  // promises, and a normalizer change could make it live.
  const base = { appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" } as const;
  const v = buildGuidanceVerdict(
    [
      live({ ...base, guidanceKey: "a-rev", guidanceText: "Revenue growth", metricSubtype: "revenue" }),
      live({ ...base, guidanceKey: "b-family", guidanceText: "Growth, unspecified metric", metricSubtype: null }),
    ],
    CURRENT,
  );
  assert.deepEqual(
    v.live.map((r) => r.item.guidanceText),
    ["Growth, unspecified metric", "Revenue growth"],
  );
});

test("live ranking: neither family nor subtype sinks below every ranked metric", () => {
  const base = { appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" } as const;
  const v = buildGuidanceVerdict(
    [
      live({ ...base, guidanceKey: "a-none", guidanceText: "Unclassified", guidanceFamily: null, metricSubtype: null, metricLabel: null }),
      live({ ...base, guidanceKey: "z-yield", guidanceText: "Revenue yield", guidanceFamily: "yield", metricSubtype: "revenue_yield" }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["Revenue yield", "Unclassified"]);
});

test("live ranking: trail depth breaks a tie the metric rank cannot", () => {
  // Same horizon, same scope, same metric — only how many quarters management
  // kept restating it separates them. Keys are ordered so the LAST rule would
  // produce the opposite sequence.
  const base = { appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" } as const;
  const repeat = (q: string) => trailStep({ quarter: q, mentionType: "repeat" });
  const v = buildGuidanceVerdict(
    [
      live({ ...base, guidanceKey: "aaa-shallow", guidanceText: "Mentioned once", trail: [repeat("Q1 FY27")] }),
      live({
        ...base,
        guidanceKey: "zzz-deep",
        guidanceText: "Restated four times",
        trail: [repeat("Q2 FY26"), repeat("Q3 FY26"), repeat("Q4 FY26"), repeat("Q1 FY27")],
      }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["Restated four times", "Mentioned once"]);
});

test("live ranking: two standing horizons tie on rule 1 and fall through to scope", () => {
  // Infinity !== Infinity is false, so rule 1 must NOT short-circuit here —
  // the pair has to reach the consolidated-before-segment rule.
  const standing = { horizonType: "unspecified", appliesFrom: "ongoing", appliesTo: "ongoing", horizonLabel: "Ongoing" } as const;
  const v = buildGuidanceVerdict(
    [
      live({ ...standing, guidanceKey: "aaa-seg", guidanceText: "Segment standing", segment: "Defence" }),
      live({ ...standing, guidanceKey: "zzz-cons", guidanceText: "Consolidated standing" }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["Consolidated standing", "Segment standing"]);
});

test("watchHorizonLabel: Q1 and Q4 of the same FY share the heading", () => {
  // horizonDeadlineFy is Math.floor((fy * 4 + qtr - 1) / 4). The -1 is what
  // keeps Q4 (index fy*4+4) inside its own FY instead of rolling into the
  // next one, and Q1 (index fy*4+1) out of the previous one.
  const v = buildGuidanceVerdict(
    [
      live({ guidanceKey: "q1", guidanceText: "Q1 FY28", horizonType: "single_quarter", appliesFrom: "Q1 FY28", appliesTo: "Q1 FY28", horizonLabel: "Q1 FY28" }),
      live({ guidanceKey: "q4", guidanceText: "Q4 FY28", horizonType: "single_quarter", appliesFrom: "Q4 FY28", appliesTo: "Q4 FY28", horizonLabel: "Q4 FY28" }),
      live({ guidanceKey: "fy", guidanceText: "FY28", appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" }),
    ],
    CURRENT,
  );
  assert.equal(v.watch.length, 3);
  assert.equal(v.watchHorizonLabel, "FY28");
});

test("watchHorizonLabel: Q4 FY27 and Q1 FY28 are adjacent quarters but different years", () => {
  const v = buildGuidanceVerdict(
    [
      live({ guidanceKey: "q4-27", guidanceText: "Q4 FY27", horizonType: "single_quarter", appliesFrom: "Q4 FY27", appliesTo: "Q4 FY27", horizonLabel: "Q4 FY27" }),
      live({ guidanceKey: "q1-28", guidanceText: "Q1 FY28", horizonType: "single_quarter", appliesFrom: "Q1 FY28", appliesTo: "Q1 FY28", horizonLabel: "Q1 FY28" }),
    ],
    CURRENT,
  );
  assert.equal(v.watchHorizonLabel, null);
});

test("watchHorizonLabel: an H2 horizon lands in the same FY as a plain FY one", () => {
  const v = buildGuidanceVerdict(
    [
      live({ guidanceKey: "h2", guidanceText: "H2 FY28", horizonType: "multi_quarter", appliesFrom: "H2 FY28", appliesTo: "H2 FY28", horizonLabel: "H2 FY28" }),
      live({ guidanceKey: "fy", guidanceText: "FY28", appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" }),
    ],
    CURRENT,
  );
  assert.equal(v.watchHorizonLabel, "FY28");
});

test("watchHorizonLabel: an all-standing watch list takes the first-row-null early return", () => {
  // Standing horizons sort last, so watch[0] can only be undateable when
  // EVERY card is — the `first == null` guard, distinct from the `every`
  // mismatch guard the section-4 tests cover.
  const standing = { horizonType: "unspecified", appliesFrom: "ongoing", appliesTo: "ongoing", horizonLabel: "Ongoing" } as const;
  const v = buildGuidanceVerdict(
    [
      live({ ...standing, guidanceKey: "a", guidanceText: "Standing A" }),
      live({ ...standing, guidanceKey: "b", guidanceText: "Standing B", segment: "Defence" }),
    ],
    CURRENT,
  );
  assert.equal(v.watch.length, 2);
  assert.equal(v.watchHorizonLabel, null);
});

test("watch split: no live commitments at all leaves both slices empty and no year claim", () => {
  // The section returns null on this shape; an accidental non-empty watchRest
  // here would render a "Show the other …" toggle over nothing.
  const v = buildGuidanceVerdict([item({ statusKey: "met", appliesTo: "FY26", appliesFrom: "FY26", horizonLabel: "FY26" })], CURRENT);
  assert.equal(v.live.length, 0);
  assert.deepEqual(v.watch, []);
  assert.deepEqual(v.watchRest, []);
  assert.equal(v.watchHorizonLabel, null);
});

test("watch split: a single live commitment cards it and collapses nothing", () => {
  const v = buildGuidanceVerdict([live({ guidanceKey: "only", guidanceText: "Only one" })], CURRENT);
  assert.equal(v.watch.length, 1);
  assert.deepEqual(v.watchRest, []);
  // Drives the heading's singular verb.
  assert.equal(v.watchHeading, "The one that decides FY28.");
  assert.equal(v.watchHorizonLabel, "FY28");
});

test("watch split: exactly LIVE_WATCH_COUNT live rows leaves the tail empty", () => {
  const rows = ["FY28", "FY29", "FY30"].map((fy, i) =>
    live({ guidanceKey: `k${i}`, guidanceText: `Item ${i}`, appliesFrom: fy, appliesTo: fy, horizonLabel: fy }),
  );
  const v = buildGuidanceVerdict(rows, CURRENT);
  assert.equal(v.watch.length, LIVE_WATCH_COUNT);
  assert.deepEqual(v.watchRest, [], "the boundary must not spill one row into the collapsed ledger");
  // Three different years, so the heading cannot name one.
  assert.equal(v.watchHorizonLabel, null);
});

test("watch split: two live rows sit entirely in the cards", () => {
  const v = buildGuidanceVerdict(
    [
      live({ guidanceKey: "a", guidanceText: "A" }),
      live({ guidanceKey: "b", guidanceText: "B", segment: "Defence" }),
    ],
    CURRENT,
  );
  assert.equal(v.watch.length, 2);
  assert.deepEqual(v.watchRest, []);
  assert.deepEqual([...v.watch, ...v.watchRest], v.live);
});

// ---------------------------------------------------------------------------
// 6. Regression — a standing horizon must never be dated (ship coverage
//    audit, 2026-09-08). `horizonQuarterIndex` reads `applies_to` alone, so a
//    rolling thread whose producer wrote a real period there read as a hard,
//    already-near deadline: it took the #1 watch card ahead of a genuine FY27
//    target and made the heading claim a financial year that was already over.
//    The two ranking helpers now share `isStandingHorizon` with horizonPhase.
// ---------------------------------------------------------------------------

// A rolling commitment stated in FY25 as "over the next 12 months" whose
// producer wrote real period bounds instead of "ongoing". guidance_tracker.py
// instructs the "ongoing" convention for `unspecified` only, so this shape is
// schema-legal and one extraction away.
const ROLLING_WITH_DATES = {
  guidanceKey: "aaa-rolling",
  guidanceText: "Rolling",
  horizonType: "rolling",
  appliesFrom: "FY25",
  appliesTo: "FY26",
  horizonLabel: "over the next 12 months",
} as const;

test("isStandingHorizon: rolling, unspecified and 'ongoing' are standing; a dated FY is not", () => {
  assert.equal(isStandingHorizon(item({ horizonType: "rolling", appliesTo: "FY26" })), true);
  assert.equal(isStandingHorizon(item({ horizonType: "unspecified", appliesTo: "FY26" })), true);
  assert.equal(isStandingHorizon(item({ horizonType: "single_fy", appliesTo: "ongoing" })), true);
  assert.equal(isStandingHorizon(item({ horizonType: "single_fy", appliesTo: "OnGoing" })), true, "case-insensitive");
  assert.equal(isStandingHorizon(item({ horizonType: "single_fy", appliesTo: "FY28" })), false);
  assert.equal(isStandingHorizon(item({ horizonType: "single_fy", appliesTo: null })), false);
});

test("regression: a rolling horizon with real dates does not steal the top watch card", () => {
  const v = buildGuidanceVerdict(
    [
      live(ROLLING_WITH_DATES),
      live({ guidanceKey: "zzz-real", guidanceText: "FY28 target", appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" }),
    ],
    CURRENT,
  );
  // Before the fix the rolling row indexed at FY26 — the smallest key in the
  // book — and sorted first. The guidanceKey tiebreak would ALSO put it first,
  // so this only passes because rule 1 now sinks it.
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["FY28 target", "Rolling"]);
  assert.equal(v.watch[0].item.guidanceText, "FY28 target");
});

test("regression: a rolling horizon with real dates contributes no year to the heading", () => {
  const v = buildGuidanceVerdict([live(ROLLING_WITH_DATES)], CURRENT);
  // Before the fix this read "FY26" — a year already over at Q2 FY27 — and
  // rendered as "the one that decides FY26".
  assert.equal(v.watchHorizonLabel, null);
  // It is still live: a rolling commitment never elapses, so it stays in the
  // book rather than being graded.
  assert.equal(v.live.length, 1);
  assert.equal(v.resolved.length, 0);
});

test("regression: a rolling horizon still sorts below a dated one it beats on every other rule", () => {
  const v = buildGuidanceVerdict(
    [
      // Consolidated revenue, deepest trail, earliest key — wins rules 2-5.
      live({
        ...ROLLING_WITH_DATES,
        trail: [
          trailStep({ quarter: "Q4 FY26", mentionType: "repeat" }),
          trailStep({ quarter: "Q1 FY27", mentionType: "repeat" }),
        ],
      }),
      // Segment margin, no trail, latest key — loses rules 2-5, wins rule 1.
      live({
        guidanceKey: "zzz-dated", guidanceText: "Segment margin FY30", segment: "Defence",
        guidanceFamily: "margin", metricSubtype: "ebitda_margin",
        appliesFrom: "FY30", appliesTo: "FY30", horizonLabel: "FY30",
      }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["Segment margin FY30", "Rolling"]);
});

// ---------------------------------------------------------------------------
// 7. Regressions from the red-team pass (2026-09-08). Both are cases where a
//    ranking defect only became reader-visible once this change started
//    HIDING rows — truncation turns a cosmetic mis-sort into a false claim.
// ---------------------------------------------------------------------------

test("regression: an undated resolved commitment does not outrank a dated one", () => {
  // The resolved sort had the same Infinity defect as the live sort:
  // -Infinity - 8100 is not finite, the guard discarded the comparison, and
  // the pair fell through to RESOLVED_ORDER — which put `met` first. Undated
  // WINS sorted above recent MISSES, and only the first five rows now render,
  // under a "Most recent first" caption. The undated row here was last
  // mentioned two years earlier, so recency alone must sink it.
  const v = buildGuidanceVerdict(
    [
      item({ guidanceKey: "a-undated-met", guidanceText: "Undated win", statusKey: "met", horizonType: null, appliesFrom: null, appliesTo: null, horizonLabel: null, latestMentionPeriod: "Q1 FY25" }),
      item({ guidanceKey: "z-dated-miss", guidanceText: "Recent miss", statusKey: "missed", appliesFrom: "FY26", appliesTo: "FY26", horizonLabel: "FY26", latestMentionPeriod: "Q1 FY27" }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.resolved.map((r) => r.item.guidanceText), ["Recent miss", "Undated win"]);
});

test("regression: a fresh cut is not collapsed out of sight behind held guides", () => {
  // Three consolidated FY28 revenue-family guides management restated
  // unchanged, plus a consolidated FY28 margin guide they just cut. Metric
  // rank alone put all three revenue lines first and pushed the cut into the
  // collapsed tail — three "Held" chips under a heading claiming those three
  // decide FY28, with the cut rendered nowhere (restOpen defaults to false).
  const fy28 = { appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" } as const;
  const held = (key: string, subtype: "revenue" | "ebitda" | "pat") =>
    live({ ...fy28, guidanceKey: key, guidanceText: `Held ${subtype}`, metricSubtype: subtype });
  const cut = item({
    ...fy28,
    guidanceKey: "zzz-margin-cut",
    guidanceText: "Margin cut",
    statusKey: "revised",
    guidanceFamily: "margin",
    metricSubtype: "ebitda_margin",
    valueKind: "percent_level",
    valuePercent: 12,
    numericValue: 12,
    valueText: "12%",
    latestMentionPeriod: "Q1 FY27",
    trail: [
      trailStep({ quarter: "Q1 FY26", mentionType: "first_mention", valuePercent: 18, valueText: "18%" }),
      trailStep({ quarter: "Q1 FY27", mentionType: "revision", valuePercent: 12, valueText: "12%" }),
    ],
  });
  const v = buildGuidanceVerdict([held("a", "revenue"), held("b", "ebitda"), held("c", "pat"), cut], CURRENT);
  assert.equal(
    v.watch.some((r) => r.item.guidanceText === "Margin cut"),
    true,
    "a commitment management just cut must not be collapsed behind three unchanged ones",
  );
  // It leads: same horizon, same scope, and it is the only one that moved.
  assert.equal(v.watch[0].item.guidanceText, "Margin cut");
  assert.equal(liveStateKey(v.watch[0]), "lowered");
});

test("news rank sits BELOW scope — a segment revision can't outrank the consolidated guide", () => {
  const fy28 = { appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" } as const;
  const v = buildGuidanceVerdict(
    [
      live({ ...fy28, guidanceKey: "zzz-segment", guidanceText: "Segment revised", segment: "Defence", statusKey: "revised" }),
      live({ ...fy28, guidanceKey: "aaa-consolidated", guidanceText: "Consolidated held" }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["Consolidated held", "Segment revised"]);
});

// ---------------------------------------------------------------------------
// 8. Adversarial-pass regressions (2026-09-08, Claude + Codex). Every one is
//    a case where the section either contradicted itself on screen or quietly
//    withheld the unflattering half of the record.
// ---------------------------------------------------------------------------

// The documented HFCL shape: the producer left status on "active" after the
// number moved 20% -> 40%, so only the derived trail knows it was revised.
const unflaggedRevision = (from: number, to: number) =>
  buildLiveRow(
    item({
      statusKey: "active",
      guidanceText: "Consolidated revenue growth",
      valueKind: "percent",
      valuePercent: from, // producer left the top-level value STALE
      numericValue: from,
      valueText: `${from}%`,
      latestMentionPeriod: "Q1 FY27",
      trail: [
        trailStep({ quarter: "Q1 FY26", mentionType: "first_mention", valuePercent: from, valueText: `${from}%` }),
        trailStep({ quarter: "Q1 FY27", mentionType: "update", valuePercent: to, valueText: `${to}%` }),
      ],
    }),
    "on_track",
  );

test("regression: an unflagged revision is not labelled 'Held'", () => {
  // liveStateKey read row.state alone, so a thread whose own value ladder
  // renders "20% -> 40% ▲" two lines below carried a "Held" chip whose token
  // comment claims "the number is unchanged".
  assert.equal(liveStateKey(unflaggedRevision(20, 40)), "raised");
  assert.equal(liveStateKey(unflaggedRevision(40, 20)), "lowered");
});

test("regression: an unflagged revision counts as news for the ranking", () => {
  // Same horizon and scope; the unflagged revision must not be collapsed
  // behind a genuinely unchanged guide just because its status says "active".
  const held = live({
    guidanceKey: "aaa-held",
    guidanceText: "Held guide",
    appliesFrom: "FY28",
    appliesTo: "FY28",
    horizonLabel: "FY28",
  });
  const moved = {
    ...unflaggedRevision(20, 40).item,
    guidanceKey: "zzz-moved",
    appliesFrom: "FY28",
    appliesTo: "FY28",
    horizonLabel: "FY28",
  };
  const v = buildGuidanceVerdict([held, moved], CURRENT);
  assert.equal(v.live[0].item.guidanceKey, "zzz-moved", "the number that moved leads");
});

test("regression: the card's headline number comes from the trail, not a stale top-level value", () => {
  // readGuided reads item.value, which producers leave stale after a
  // revision — so the card printed "Guided +20%" directly above a trail
  // reading "20% -> 40% ▲".
  assert.equal(unflaggedRevision(20, 40).guidedLabel, "+40%");
  // The growth sign survives the source swap.
  assert.equal(unflaggedRevision(40, 20).guidedLabel, "+20%");
});

test("regression: a standing resolved commitment is not pinned below the cut forever", () => {
  // "ongoing" has no horizon quarter, so it keyed on -Infinity and sorted
  // last in every resolved table — permanently hidden once the table
  // truncates, even when missed.
  const v = buildGuidanceVerdict(
    [
      item({ guidanceKey: "standing-miss", guidanceText: "Standing miss", statusKey: "missed", horizonType: "unspecified", appliesFrom: "ongoing", appliesTo: "ongoing", horizonLabel: "Ongoing", latestMentionPeriod: "Q1 FY27" }),
      item({ guidanceKey: "old-win", guidanceText: "Old win", statusKey: "met", appliesFrom: "FY24", appliesTo: "FY24", horizonLabel: "FY24", latestMentionPeriod: "Q1 FY24" }),
    ],
    CURRENT,
  );
  assert.equal(v.resolved[0].item.guidanceText, "Standing miss");
});

test("regression: rows with no horizon at all still order by when they were last discussed", () => {
  // The legacy guidance_tracking path selects no `horizon` column, so EVERY
  // row was -Infinity, the whole table fell through to outcome order, and a
  // met-first tiebreak put five wins on screen with every miss collapsed.
  const legacy = (key: string, text: string, status: "met" | "missed", mention: string) =>
    item({ guidanceKey: key, guidanceText: text, statusKey: status, horizonType: null, appliesFrom: null, appliesTo: null, horizonLabel: null, latestMentionPeriod: mention });
  const v = buildGuidanceVerdict(
    [
      legacy("a", "Old win", "met", "Q1 FY25"),
      legacy("b", "Recent miss", "missed", "Q1 FY27"),
      legacy("c", "Middle win", "met", "Q1 FY26"),
    ],
    CURRENT,
  );
  assert.deepEqual(v.resolved.map((r) => r.item.guidanceText), ["Recent miss", "Middle win", "Old win"]);
});

test("regression: a same-year miss is not collapsed behind same-year wins", () => {
  // Six commitments that all resolved in the same quarter: five met, one
  // missed. Met-first put all five wins in the visible five and hid the miss.
  const same = (key: string, status: "met" | "missed") =>
    item({ guidanceKey: key, guidanceText: `${status} ${key}`, statusKey: status, appliesFrom: "FY26", appliesTo: "FY26", horizonLabel: "FY26", latestMentionPeriod: "Q4 FY26" });
  const v = buildGuidanceVerdict(
    [same("a", "met"), same("b", "met"), same("c", "met"), same("d", "met"), same("e", "met"), same("f", "missed")],
    CURRENT,
  );
  assert.equal(v.resolved[0].outcome, "missed", "the miss leads its own period");
});

test("regression: the heading drops the 'decide' claim when same-year commitments are collapsed", () => {
  const fy28 = (key: string) =>
    live({ guidanceKey: key, guidanceText: key, appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" });
  // Exactly three FY28 commitments — nothing hidden, so the claim holds.
  assert.equal(
    buildGuidanceVerdict([fy28("a"), fy28("b"), fy28("c")], CURRENT).watchHeading,
    "The three that decide FY28.",
  );
  // A fourth FY28 commitment behind the toggle makes "decide FY28" false.
  const four = buildGuidanceVerdict([fy28("a"), fy28("b"), fy28("c"), fy28("d")], CURRENT);
  assert.equal(four.watchHeading, "The three FY28 commitments that matter most.");
  assert.equal(four.watchHorizonLabel, "FY28", "the year is still named — only the exhaustiveness claim drops");
});

test("regression: a segment field that just says 'Consolidated' is not demoted to segment scope", () => {
  const fy28 = { appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" } as const;
  const v = buildGuidanceVerdict(
    [
      live({ ...fy28, guidanceKey: "zzz-word", guidanceText: "Word-scoped", segment: "Consolidated" }),
      live({ ...fy28, guidanceKey: "aaa-real-segment", guidanceText: "Real segment", segment: "Defence" }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["Word-scoped", "Real segment"]);
});

test("rule 1 buckets by YEAR, so quarter precision can't outrank materiality inside it", () => {
  // horizonQuarterIndex defaults an FY-only horizon to Q4, so ranking on the
  // raw quarter let any quarter-dated segment guide outrank the consolidated
  // FY guide for the same year — the top card decided by how precisely the
  // producer wrote applies_to.
  const v = buildGuidanceVerdict(
    [
      live({ guidanceKey: "zzz-segment-q1", guidanceText: "Segment Q1 FY28", segment: "Defence", horizonType: "single_quarter", appliesFrom: "Q1 FY28", appliesTo: "Q1 FY28", horizonLabel: "Q1 FY28" }),
      live({ guidanceKey: "aaa-consolidated-fy", guidanceText: "Consolidated FY28", appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" }),
    ],
    CURRENT,
  );
  assert.deepEqual(v.live.map((r) => r.item.guidanceText), ["Consolidated FY28", "Segment Q1 FY28"]);
  // Inside one scope, the nearer quarter still wins — the rule is demoted,
  // not deleted.
  const sameScope = buildGuidanceVerdict(
    [
      live({ guidanceKey: "zzz-fy", guidanceText: "Full year", appliesFrom: "FY28", appliesTo: "FY28", horizonLabel: "FY28" }),
      live({ guidanceKey: "aaa-q1", guidanceText: "Q1", horizonType: "single_quarter", appliesFrom: "Q1 FY28", appliesTo: "Q1 FY28", horizonLabel: "Q1 FY28" }),
    ],
    CURRENT,
  );
  assert.deepEqual(sameScope.live.map((r) => r.item.guidanceText), ["Q1", "Full year"]);
});

console.log("guidance-verdict-coverage-gaps: all assertions passed");
