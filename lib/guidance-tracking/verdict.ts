// Guidance verdict derivation. Pure transform over NormalizedGuidanceItem[]
// (the Phase 6 guidance_snapshot threads) into the shape the Guidance section
// renders: a tier + headline, the resolved track record (guided vs delivered),
// and the live in-flight book. No I/O, no LLM — every sentence is templated
// from counts and labels the payload actually carries.
//
// Split rule (2026-09-06, Guidance tab redesign): a commitment is RESOLVED
// when it has an outcome (met / missed / dropped) or its horizon has elapsed;
// otherwise it is LIVE. A revision or delay on a commitment whose horizon is
// still ahead stays live — it is graded only once the horizon passes. That
// keeps the header tier and the Overview's Walk-the-talk card on the same
// count (lib/walk-the-talk/normalize.ts reads the same classifier).

import { currentReportingQuarter, fyLabelFor, type ReportingQuarter } from "@/lib/current-quarter";
import { computeTier } from "@/lib/walk-the-talk/grade-utils";
import { TIER_LABELS, type WalkTheTalkTier } from "@/lib/walk-the-talk/types";

import {
  formatAbsoluteValue,
  formatDelta,
  formatGuidedValue,
  formatPercentValue,
  readNumericValue,
  withGrowthSign,
  type NumericValue,
  type ValueFields,
} from "./format";
import { extractFyQuarter, extractFyYear } from "./normalize";
import type {
  GuidanceFamily,
  GuidanceMetricSubtype,
  NormalizedGuidanceItem,
  NormalizedGuidanceStatusKey,
  NormalizedGuidanceTrailItem,
} from "./types";

export type { ReportingQuarter };
export { currentReportingQuarter };

// ---------------------------------------------------------------------------
// 5-bucket delivery language (kept from the previous section for the Overview
// and tests/guidance-status-bucket.test.ts).
// ---------------------------------------------------------------------------

export type DeliveryBucket = "delivered" | "on_track" | "revised" | "missed" | "too_early";

export const STATUS_TO_BUCKET: Record<NormalizedGuidanceStatusKey, DeliveryBucket> = {
  met: "delivered",
  active: "on_track",
  revised: "revised",
  delayed: "revised",
  missed: "missed",
  dropped: "missed",
  not_yet_clear: "too_early",
  unknown: "too_early",
};

export const bucketOf = (item: Pick<NormalizedGuidanceItem, "statusKey">): DeliveryBucket =>
  STATUS_TO_BUCKET[item.statusKey] ?? "too_early";

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export type ResolvedOutcome = "met" | "missed" | "dropped" | "revised" | "delayed" | "unclear";
export type LiveState = "on_track" | "revised" | "delayed" | "no_update";

export type GuidancePhase =
  | { phase: "resolved"; outcome: ResolvedOutcome }
  | { phase: "live"; state: LiveState };

// Unified horizon comparator (2026-09-06, /plan-eng-review Issue 2 —
// replaces the FY-only isHistoricalGuidanceItem / horizonIsAhead pair,
// which disagreed with each other on `rolling` horizons and, being FY-only,
// treated a Q1-FY27 target as "not yet due" for the entire FY27 year).
// Quarter-precise when `applies_to` parses as "Q<n> FY<yy>" (elapses once
// that quarter's own results are out, i.e. <= `current`); otherwise FY-precise,
// treating the deadline as Q4 of that FY. Standing/ongoing commitments never
// elapse. Unparseable horizons return "unknown" (caller decides the
// conservative default).
export type HorizonPhase = "ahead" | "elapsed" | "unknown";

export const horizonQuarterIndex = (item: NormalizedGuidanceItem): number | null => {
  const quarterToken = extractFyQuarter(item.appliesTo);
  const fy = quarterToken?.fy ?? extractFyYear(item.appliesTo);
  if (fy == null) return null;
  const qtr = quarterToken?.qtr ?? 4; // FY-only horizon: deadline is Q4.
  return fy * 4 + qtr;
};

// A standing commitment — "ongoing", or a rolling / unspecified horizon —
// has no deadline that can pass, so it never elapses and can never be
// graded. Every caller that reasons about WHEN a commitment comes due has
// to apply this first: `horizonQuarterIndex` reads `applies_to` alone, and a
// rolling thread whose producer wrote a real period there ("next 12 months",
// applies_to FY26) would otherwise read as a hard, already-near deadline.
// The convention that rolling rows carry applies_to "ongoing" is a producer
// habit, not a schema rule — guidance_tracker.py instructs it for
// `unspecified` only (ship coverage audit, 2026-09-08).
export const isStandingHorizon = (item: NormalizedGuidanceItem): boolean =>
  item.horizonType === "unspecified" ||
  item.horizonType === "rolling" ||
  (item.appliesTo != null && item.appliesTo.toLowerCase() === "ongoing");

export const horizonPhase = (
  item: NormalizedGuidanceItem,
  current: ReportingQuarter,
): HorizonPhase => {
  if (isStandingHorizon(item)) return "ahead";
  const itemIndex = horizonQuarterIndex(item);
  if (itemIndex == null) return "unknown";
  const currentIndex = current.fy * 4 + current.qtr;
  return itemIndex <= currentIndex ? "elapsed" : "ahead";
};

export const classifyGuidanceItem = (
  item: NormalizedGuidanceItem,
  current: ReportingQuarter,
): GuidancePhase => {
  const phase = horizonPhase(item, current);
  switch (item.statusKey) {
    case "met":
      return { phase: "resolved", outcome: "met" };
    case "missed":
      return { phase: "resolved", outcome: "missed" };
    case "dropped":
      return { phase: "resolved", outcome: "dropped" };
    case "delayed":
      // A pushed-out horizon is itself the broken promise, so grade it
      // immediately regardless of the NEW date — otherwise a company could
      // escape the tier indefinitely by repeatedly moving its own goalpost
      // (Codex outside-voice finding, 2026-09-06 eng review).
      return { phase: "resolved", outcome: "delayed" };
    case "revised":
      // A raise/lower before the horizon is genuine forward news, not a
      // verdict — stays live until the (possibly new) horizon elapses.
      // Falls to resolved when the horizon can't be read at all, matching
      // the old status-only rule.
      return phase === "ahead" ? { phase: "live", state: "revised" } : { phase: "resolved", outcome: "revised" };
    case "active":
      return phase === "elapsed" ? { phase: "resolved", outcome: "unclear" } : { phase: "live", state: "on_track" };
    case "not_yet_clear":
    case "unknown":
    default:
      return phase === "elapsed" ? { phase: "resolved", outcome: "unclear" } : { phase: "live", state: "no_update" };
  }
};

// Outcomes that enter the met/counted ratio. "unclear" is excluded — we can't
// grade what we can't see. Revised/delayed past their horizon count as
// not-met (conservative; same as the locked walk-the-talk methodology).
export const GRADED_OUTCOMES: ReadonlySet<ResolvedOutcome> = new Set([
  "met",
  "missed",
  "dropped",
  "revised",
  "delayed",
]);

export const isGradedForTier = (item: NormalizedGuidanceItem, current: ReportingQuarter): boolean => {
  const c = classifyGuidanceItem(item, current);
  return c.phase === "resolved" && GRADED_OUTCOMES.has(c.outcome);
};

// ---------------------------------------------------------------------------
// Per-item derivations
// ---------------------------------------------------------------------------

const isGrowthRate = (item: NormalizedGuidanceItem) =>
  item.guidanceFamily === "growth" && item.valueKind !== "percent_level" && item.valueKind !== "absolute";

const mentionKey = (t: NormalizedGuidanceTrailItem) =>
  (t.mentionType ?? "").toLowerCase().replace(/\s+/g, "_");

const valueLabel = (v: ValueFields): string | null => formatAbsoluteValue(v) ?? formatPercentValue(v);

// Quarter index for an arbitrary period label ("Q1 FY27" or FY-only "FY26"),
// on the same fy*4+qtr scale as horizonQuarterIndex — lets valueTrail
// compare a trail step's own quarter against the thread's latestMentionPeriod.
const periodQuarterIndex = (period: string | null): number | null => {
  if (!period) return null;
  const q = extractFyQuarter(period);
  if (q) return q.fy * 4 + q.qtr;
  const fy = extractFyYear(period);
  return fy == null ? null : fy * 4 + 4;
};

// The outcome step (last `met` / `missed` trail entry) carries what was
// actually delivered when the synthesizer captured it. Only that step is
// trusted — we never parse a number out of status_reason prose.
export const outcomeTrailStep = (item: NormalizedGuidanceItem): NormalizedGuidanceTrailItem | null => {
  for (let i = item.trail.length - 1; i >= 0; i -= 1) {
    const k = mentionKey(item.trail[i]);
    if (k === "met" || k === "missed") return item.trail[i];
  }
  return null;
};

export type DeliveredRead = {
  label: string;
  numeric: NumericValue | null;
};

// Delivered value, read on the SAME axis as the guided value so the two
// columns never compare a % to a ₹ amount. Qualitative guidance shows
// whatever the outcome step carried.
export const readDelivered = (item: NormalizedGuidanceItem): DeliveredRead | null => {
  const step = outcomeTrailStep(item);
  if (!step) return null;
  const guided = readNumericValue(item);
  if (guided?.kind === "absolute") {
    const label = formatAbsoluteValue(step);
    if (!label) return null;
    // Force the step onto the SAME axis as the guided value (mirrors the
    // percent branch below) — forcing to null instead of "absolute" here
    // meant readNumericValue never took the structured numeric_value+unit
    // path for the delivered read, silently dropping the delta whenever
    // the step's own value_text didn't happen to restate a crore/million-
    // style unit token (Codex adversarial finding, ship-workflow review,
    // 2026-09-06).
    const numeric = readNumericValue({ ...step, valueKind: "absolute" });
    return { label, numeric: numeric?.kind === "absolute" ? numeric : null };
  }
  if (guided?.kind === "percent") {
    const label = formatPercentValue(step);
    if (!label) return null;
    const numeric = readNumericValue({ ...step, valueKind: item.valueKind === "percent_level" ? "percent_level" : "percent" });
    return { label: withGrowthSign(label, isGrowthRate(item)) ?? label, numeric: numeric?.kind === "percent" ? numeric : null };
  }
  const label = formatPercentValue(step) ?? formatAbsoluteValue(step);
  if (!label) return null;
  return { label: withGrowthSign(label, item.guidanceFamily === "growth") ?? label, numeric: null };
};

export const readGuided = (item: NormalizedGuidanceItem): { label: string | null; numeric: NumericValue | null } => {
  const label = formatGuidedValue(item);
  return {
    label: withGrowthSign(label, isGrowthRate(item)),
    numeric: readNumericValue(item),
  };
};

// The quarter from which the CURRENT guided value has been held. Walks the
// trail backwards until the stated value changes or a first-mention /
// revision step is hit.
export const heldSinceQuarter = (item: NormalizedGuidanceItem): string | null => {
  if (item.trail.length === 0) return null;
  const current = valueLabel(item);
  let since: string | null = null;
  for (let i = item.trail.length - 1; i >= 0; i -= 1) {
    const step = item.trail[i];
    const label = valueLabel(step);
    if (label && current && label !== current) break;
    if (step.quarter) since = step.quarter;
    const k = mentionKey(step);
    if (k === "first_mention" || k === "revision") break;
  }
  return since;
};

export type ValueTrailStep = {
  quarter: string | null;
  label: string;
  direction: "up" | "down" | null; // vs the previous distinct step
};

// The distinct stated values along the trail, oldest → newest, with the
// direction of each change. Only meaningful for revised/delayed threads.
export const valueTrail = (item: NormalizedGuidanceItem): ValueTrailStep[] => {
  const steps: Array<ValueTrailStep & { numeric: NumericValue | null }> = [];
  for (const step of item.trail) {
    const label = valueLabel(step);
    if (!label) continue;
    const prev = steps[steps.length - 1];
    if (prev && prev.label === label) continue;
    const numeric = readNumericValue(step);
    let direction: "up" | "down" | null = null;
    if (prev?.numeric && numeric && prev.numeric.kind === numeric.kind && prev.numeric.unitKey === numeric.unitKey) {
      const a = (prev.numeric.lo + prev.numeric.hi) / 2;
      const b = (numeric.lo + numeric.hi) / 2;
      direction = b > a ? "up" : b < a ? "down" : null;
    }
    steps.push({ quarter: step.quarter, label, direction, numeric });
  }
  // Include the thread's canonical current value if the trail's last step
  // doesn't already state it (some synthesizers only carry values on
  // first_mention, leaving later repeat/update steps with no restated
  // value). Guarded to fire ONLY when the trail's last real step is
  // strictly OLDER than the thread's own latest mention — otherwise a
  // producer that leaves the top-level value/guidanceText stale after
  // recording a real trail revision (HFCL: trail correctly shows Q1 FY27
  // revised to 40%+, but guidance_text/value still say "20%") would render
  // a THIRD, most-recent-looking step recreating the stale number, making
  // an up-then-flat revision look like an oscillation
  // (/plan-eng-review Issue 8/T12 follow-up, discovered browser-verifying
  // the fix live on HFCL, 2026-09-06).
  const current = valueLabel(item);
  const last = steps[steps.length - 1];
  const lastIdx = last ? periodQuarterIndex(last.quarter) : null;
  const latestIdx = periodQuarterIndex(item.latestMentionPeriod);
  // Fails CLOSED (suppresses the append) when either quarter is
  // unparseable — we can't prove the trail's last step actually precedes
  // the item's latest mention, and a wrong synthetic step is worse than a
  // missing one (Claude adversarial finding, ship-workflow review,
  // 2026-09-06: the original `!= null && != null` form failed OPEN on an
  // unparseable quarter, reintroducing the exact stale-value bug this
  // guard exists to close).
  const trailAlreadyCurrent = lastIdx == null || latestIdx == null || lastIdx >= latestIdx;
  if (current && last && last.label !== current && !trailAlreadyCurrent) {
    const numeric = readNumericValue(item);
    let direction: "up" | "down" | null = null;
    if (last.numeric && numeric && last.numeric.kind === numeric.kind && last.numeric.unitKey === numeric.unitKey) {
      const a = (last.numeric.lo + last.numeric.hi) / 2;
      const b = (numeric.lo + numeric.hi) / 2;
      direction = b > a ? "up" : b < a ? "down" : null;
    }
    steps.push({ quarter: item.latestMentionPeriod, label: current, direction, numeric });
  }
  return steps.map(({ quarter, label, direction }) => ({ quarter, label, direction }));
};

// Net direction of the latest revision on a live thread.
export const revisionDirection = (item: NormalizedGuidanceItem): "up" | "down" | null => {
  const steps = valueTrail(item);
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    if (steps[i].direction) return steps[i].direction;
  }
  return null;
};

// What the commitment is about, with no horizon attached: "HPP revenue
// growth", "EBITDA margin". Used bare as a card title (the horizon rides
// its own chip there) and as the stem of commitmentShortLabel.
export const commitmentCoreLabel = (item: NormalizedGuidanceItem): string => {
  // Data-driven casing (no lowercase-then-recapitalize transform): the
  // sentence-start form ("EBITDA growth") is used bare; the mid-sentence
  // form ("EBITDA growth", acronyms still capitalized) is used after a
  // segment name. Fixes "Defence eBITDA growth" (/plan-eng-review Issue 4).
  let core: string;
  if (item.metricLabel) {
    core = item.segment
      ? `${item.segment} ${item.metricLabelMidSentence ?? item.metricLabel}`
      : item.metricLabel;
  } else {
    core = item.guidanceText.length > 60 ? `${item.guidanceText.slice(0, 58).trimEnd()}…` : item.guidanceText;
  }
  return core.charAt(0).toUpperCase() + core.slice(1);
};

// Short label for prose: "HPP revenue growth (FY25)", "EBITDA margin (FY24)".
export const commitmentShortLabel = (item: NormalizedGuidanceItem): string => {
  const core = commitmentCoreLabel(item);
  return item.horizonLabel ? `${core} (${item.horizonLabel})` : core;
};

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export type ResolvedRow = {
  item: NormalizedGuidanceItem;
  outcome: ResolvedOutcome;
  guidedLabel: string | null;
  deliveredLabel: string | null;
  delta: { label: string; sign: -1 | 0 | 1 } | null;
  note: string | null; // latest_view ?? status_reason
};

export type LiveRow = {
  item: NormalizedGuidanceItem;
  state: LiveState;
  guidedLabel: string | null; // the number they are on the hook for
  heldSince: string | null;
  trail: ValueTrailStep[]; // only populated for revised / delayed
  direction: "up" | "down" | null;
  note: string | null;
};

const rowNote = (item: NormalizedGuidanceItem) => item.latestView ?? item.statusReason;

export const buildResolvedRow = (item: NormalizedGuidanceItem, outcome: ResolvedOutcome): ResolvedRow => {
  const guided = readGuided(item);
  const delivered = readDelivered(item);
  return {
    item,
    outcome,
    guidedLabel: guided.label,
    deliveredLabel: delivered?.label ?? null,
    delta: formatDelta(guided.numeric, delivered?.numeric ?? null),
    note: rowNote(item),
  };
};

export const buildLiveRow = (item: NormalizedGuidanceItem, state: LiveState): LiveRow => {
  // The value trail renders whenever 2+ distinct values exist, regardless of
  // live state — a status still "active" with an unflagged revision buried
  // in its own trail (the producer didn't flip status to "revised") still
  // deserves the ladder, not a stale headline number (/plan-eng-review
  // Issue 8/T12; e.g. HFCL's Q1 FY27 revision to 40%+ from 20%, status
  // still "active").
  const trail = valueTrail(item);
  const hasTrail = trail.length >= 2;
  // `trail` on the row below is blanked when there is nothing to ladder; the
  // headline number still wants the latest stated value even from one step.
  const latestTrailLabel = trail.at(-1)?.label ?? null;
  return {
    item,
    state,
    // The trail's latest step wins over the thread's top-level value. Phase 6
    // leaves `value`/`guidance_text` stale after a revision (the documented
    // HFCL case: top-level still 20% while the trail correctly reaches 40%+),
    // and the watch card prints this as its single headline number — so
    // reading `value` first put "Guided 20%" directly above a trail reading
    // "20% -> 40% ▲". valueTrail was already hardened against this; the
    // headline number was not (adversarial review, 2026-09-08).
    // Signed the same way readGuided signs its own output, so swapping the
    // source doesn't quietly drop the "+" that marks a growth RATE.
    guidedLabel: latestTrailLabel
      ? (withGrowthSign(latestTrailLabel, isGrowthRate(item)) ?? latestTrailLabel)
      : readGuided(item).label,
    heldSince: heldSinceQuarter(item),
    trail: hasTrail ? trail : [],
    direction: hasTrail ? revisionDirection(item) : null,
    note: rowNote(item),
  };
};

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

export type GuidanceVerdict = {
  tier: WalkTheTalkTier;
  tierLabel: string;
  metCount: number;
  countedCount: number; // graded resolved commitments
  unclearCount: number; // resolved but ungradeable
  beatCount: number; // met with a positive delta
  headline: string;
  summary: string;
  liveNote: string | null;
  bars: ResolvedOutcome[]; // one per graded commitment, met first
  resolved: ResolvedRow[];
  live: LiveRow[]; // materiality-ranked; the first `watch.length` are the cards
  watch: LiveRow[]; // top LIVE_WATCH_COUNT of `live`
  watchRest: LiveRow[]; // the remainder, collapsed behind a toggle
  // The horizon the watch cards share ("FY27"), or null when they straddle
  // more than one — the heading only names a year it can actually claim.
  watchHorizonLabel: string | null;
  // Finished sentences, not fragments. The section assembles no prose of its
  // own: number words and singular/plural agreement are derivation, and
  // splitting them across two layers meant a copy change needed edits in both
  // and the pluralisation could not be unit-tested (ship review, 2026-09-08).
  watchHeading: string; // "The three that decide FY27."
  watchRestLabel: string | null; // "The other six live commitments"
  watchRestToggleLabel: string | null; // "Show the other six commitments"
};

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const words = (n: number) => (n >= 0 && n <= 10 ? NUMBER_WORDS[n] : String(n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const joinList = (parts: string[]) => {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
};

const headlineFor = (tier: WalkTheTalkTier, misses: number): string => {
  switch (tier) {
    case "reliable":
      return misses === 0
        ? "Reliable — they deliver what they guide."
        : misses === 1
          ? "Reliable — they deliver, with one slip."
          : `Reliable — they deliver, with ${words(misses)} slips.`;
    case "mixed":
      return "Mixed — more hits than misses.";
    case "erratic":
      return "Erratic — delivery is hit-and-miss.";
    case "weak":
      return "Weak — guidance rarely lands.";
    case "not_enough_data":
    default:
      return "Too early to call.";
  }
};

// Tiebreak for resolved rows of equal recency. Not-met outcomes come FIRST.
// This inverts the original met-first order, which was harmless while the
// whole table rendered but became a flattering bias the moment the table
// started showing only its first RESOLVED_PREVIEW_COUNT rows: six same-year
// commitments, five met and one missed, put all five wins on screen and
// collapsed the miss — on the one section whose question is "do they keep
// their word?" (Codex adversarial review, 2026-09-08).
const RESOLVED_ORDER: Record<ResolvedOutcome, number> = {
  missed: 0,
  dropped: 1,
  delayed: 2,
  revised: 3,
  met: 4,
  unclear: 5,
};
// ---------------------------------------------------------------------------
// Live materiality — which live commitments are the ones to watch
// ---------------------------------------------------------------------------
//
// The live book is ranked, not bucketed (redesign 2026-09-08): the top
// LIVE_WATCH_COUNT get full cards, the rest collapse to a one-line ledger.
// The rank is lexicographic and derived only from fields the payload already
// carries — no per-company curation, no producer-supplied weighting:
//
//   1. Which YEAR it comes due. Nearest financial year first. A standing /
//      rolling / unparseable horizon never comes due, so it can't be the
//      thing that decides a year — those sort last. Bucketing by year, not
//      by quarter, is deliberate: `horizonQuarterIndex` defaults an FY-only
//      horizon to Q4, so ranking on the raw quarter let any quarter-dated
//      segment guide outrank the consolidated FY guide for the same year —
//      the top card decided by how precisely the producer wrote `applies_to`
//      rather than by materiality (adversarial review, 2026-09-08).
//   2. How much of the company it covers. Consolidated before a segment.
//   3. Whether it just MOVED. A commitment whose number changed is the live
//      news; one restated unchanged is context. Without this term a fresh
//      guidance CUT could be ranked out of the cards and collapsed out of
//      sight — three "Held" chips under a heading claiming those three decide
//      the year, while a fourth commitment for the same year had just been
//      cut (red-team review, 2026-09-08). Read off the derived trail
//      direction, NOT the producer's status flag: Phase 6 routinely leaves a
//      revised thread on status "active", and keying off status alone ranked
//      those as non-news. It sits BELOW scope so a minor segment revision
//      still can't outrank the flagship consolidated guide.
//   4. Which line. Growth before margin before yield; inside growth,
//      revenue before EBITDA before PAT.
//   5. How soon inside that year — a quarter-dated target before a full-year
//      one, once materiality has had its say.
//   6. How central management treats it — the longer the trail (the more
//      quarters they kept restating it), the higher.
//   7. guidanceKey, so the order is stable across renders and re-extractions
//      rather than flickering on ties.
//
// Rule 1 sits above rule 2 deliberately: a near-term segment guide is the
// live news; a consolidated frame three years out is context. Ordering the
// other way buried MTARTECH's FY27 A&D doubling under an FY28 growth frame
// that management had already let go qualitative.

export const LIVE_WATCH_COUNT = 3;

// Producers sometimes write the whole-company scope into `segment` as a word
// ("Consolidated", "Overall", "Total") instead of leaving it null. Ranking
// those as segment-level demotes the company's own headline guide with no
// on-screen tell — the chip renders "Consolidated" either way (adversarial
// review, 2026-09-08).
const WHOLE_COMPANY_SEGMENTS = new Set(["consolidated", "overall", "total", "company", "group", "standalone"]);

export const isSegmentScoped = (item: NormalizedGuidanceItem): boolean =>
  item.segment != null && !WHOLE_COMPANY_SEGMENTS.has(item.segment.trim().toLowerCase());

// Lower = more material. Subtypes are ordered inside their family. The
// family-only band below is a defensive floor, NOT an expected state: the
// normalizer gates family and subtype together (`subtypeBelongsToFamily`)
// and nulls BOTH on a mismatch, so today every unclassified item lands on
// 99 and rule 3 stops discriminating between them — they fall through to
// trail depth. Kept so the comparator still orders sanely if that gate is
// ever relaxed (ship coverage audit, 2026-09-08).
const METRIC_RANK: Record<GuidanceMetricSubtype, number> = {
  revenue: 1,
  ebitda: 2,
  pat: 3,
  ebitda_margin: 11,
  gross_margin: 12,
  pat_margin: 13,
  nim: 21,
  revenue_yield: 22,
};
const FAMILY_RANK: Record<GuidanceFamily, number> = { growth: 0, margin: 10, yield: 20 };

const metricRank = (item: NormalizedGuidanceItem): number => {
  if (item.metricSubtype && METRIC_RANK[item.metricSubtype] != null) return METRIC_RANK[item.metricSubtype];
  if (item.guidanceFamily && FAMILY_RANK[item.guidanceFamily] != null) return FAMILY_RANK[item.guidanceFamily];
  return 99;
};

// Nearest-horizon key. Standing and unparseable horizons sort last; two of
// them tie and fall through to the next rule. `isStandingHorizon` has to be
// checked BEFORE the index: a rolling thread can carry a real (and already
// near) `applies_to` while never actually coming due, which would otherwise
// hand it the top card.
const horizonProximityIndex = (item: NormalizedGuidanceItem): number =>
  (isStandingHorizon(item) ? null : horizonQuarterIndex(item)) ?? Number.POSITIVE_INFINITY;

// The five sort keys, read once per row rather than once per comparison —
// `horizonProximityIndex` runs regex parsing and a toLowerCase allocation,
// which a comparator would repeat O(n log n) times (ship review, 2026-09-08).
type MaterialityKey = {
  fy: number;
  scope: number;
  news: number;
  metric: number;
  soonest: number;
  depth: number;
  key: string;
};

// A number that MOVED outranks one that didn't. `row.direction` is derived
// from the value trail, so it catches a revision the producer never flagged
// (status still "active") as well as a flagged one. `delayed` is included for
// completeness, though classifyGuidanceItem grades a delay immediately, so no
// live row currently carries that state.
const hasMoved = (row: LiveRow): boolean =>
  row.direction != null || row.state === "revised" || row.state === "delayed";

export const materialityKey = (row: LiveRow): MaterialityKey => ({
  fy: horizonDeadlineFy(row.item) ?? Number.POSITIVE_INFINITY,
  scope: isSegmentScoped(row.item) ? 1 : 0,
  news: hasMoved(row) ? 0 : 1,
  metric: metricRank(row.item),
  soonest: horizonProximityIndex(row.item),
  depth: row.item.trail.length,
  key: row.item.guidanceKey,
});

export const compareMaterialityKeys = (a: MaterialityKey, b: MaterialityKey): number => {
  // Compared, not subtracted: a dated horizon against a standing one is
  // Infinity - n = Infinity, which a `Number.isFinite` guard would throw
  // away — and that silently demoted rule 1 to rule 2 for exactly the pair
  // it exists to separate (caught on E2E, whose two "Ongoing" margin
  // targets outranked a dated Q2 FY27 one). Two standing horizons tie and
  // fall through.
  if (a.fy !== b.fy) return a.fy < b.fy ? -1 : 1;
  if (a.scope !== b.scope) return a.scope - b.scope;
  if (a.news !== b.news) return a.news - b.news;
  if (a.metric !== b.metric) return a.metric - b.metric;
  if (a.soonest !== b.soonest) return a.soonest < b.soonest ? -1 : 1;
  if (a.depth !== b.depth) return b.depth - a.depth;
  return a.key.localeCompare(b.key);
};

export const compareLiveMateriality = (a: LiveRow, b: LiveRow): number =>
  compareMaterialityKeys(materialityKey(a), materialityKey(b));

// "the three that decide FY27" — claimable when every card on screen comes
// due in the SAME financial year. Keyed on the deadline year rather than the
// horizon label so a "Q3 FY27" target and a plain "FY27" one still group
// (both decide FY27), while an "FY26–FY28" frame does not (it decides FY28).
// Mixed years get the plain heading.
const horizonDeadlineFy = (item: NormalizedGuidanceItem): number | null => {
  // Same standing-horizon guard as the proximity key — a commitment with no
  // deadline decides no particular year, so it can't contribute one to the
  // heading.
  if (isStandingHorizon(item)) return null;
  const index = horizonQuarterIndex(item);
  if (index == null) return null;
  return Math.floor((index - 1) / 4);
};

const sharedHorizonLabel = (rows: LiveRow[]): string | null => {
  if (rows.length === 0) return null;
  const first = horizonDeadlineFy(rows[0].item);
  if (first == null) return null;
  if (!rows.every((r) => horizonDeadlineFy(r.item) === first)) return null;
  return fyLabelFor(first);
};

// "The three that decide FY27" is an exhaustiveness claim, and it is only
// true when nothing else for FY27 is sitting behind the toggle. When the
// collapsed tail holds same-year commitments the heading still names the
// year — that is useful — but drops the claim to "matter most" (adversarial
// review, 2026-09-08).
const buildWatchHeading = (watch: LiveRow[], rest: LiveRow[]): string => {
  const count = words(watch.length);
  const label = sharedHorizonLabel(watch);
  if (!label) return `The ${count} that matter most.`;
  const sharedFy = horizonDeadlineFy(watch[0].item);
  const restSharesYear = rest.some((r) => horizonDeadlineFy(r.item) === sharedFy);
  if (!restSharesYear) {
    return `The ${count} that ${plural(watch.length, "decides", "decide")} ${label}.`;
  }
  return `The ${count} ${label} ${plural(watch.length, "commitment", "commitments")} that ${plural(watch.length, "matters", "matter")} most.`;
};

// What the chip on a live commitment should say. A semantic key, not a
// label: the direction of a revision is the whole point (a raise and a cut
// are opposite news), so the branch that decides it belongs in the tested
// derivation layer rather than in an untestable ternary inside the section.
// The component owns the key -> label/tone/glyph lookup, which has no logic
// left to get wrong (ship review, 2026-09-08).
export type LiveStateKey = "held" | "raised" | "lowered" | "revised" | "pushed_out" | "no_update";

export const liveStateKey = (row: LiveRow): LiveStateKey => {
  // Direction first, state second. A thread the producer left on status
  // "active" after quietly revising its number still moved, and calling that
  // "Held" contradicted the value ladder rendered directly beneath it
  // (adversarial review, 2026-09-08).
  if (row.direction === "up") return "raised";
  if (row.direction === "down") return "lowered";
  switch (row.state) {
    case "on_track":
      return "held";
    case "delayed":
      return "pushed_out";
    case "no_update":
      return "no_update";
    case "revised":
      return "revised";
  }
};

// Recency key for the resolved sort (descending = most recent first): the
// quarter management last spoke about the commitment, falling back to its
// horizon, then -Infinity.
//
// Mention-first, not horizon-first, for two reasons. It is the more honest
// reading of "most recent" in a TRACK RECORD — a reader wants what resolved
// most recently, not what was due most recently. And it keeps one consistent
// scale: horizon-first mixed horizon quarters with mention quarters for
// exactly the rows that lack a horizon, so those systematically outranked
// dated rows from the same period.
//
// This matters now that the table truncates. Two populations have no readable
// horizon at all: companies served by the legacy `guidance_tracking` path (its
// SELECT carries no `horizon` column, so EVERY row was -Infinity and the whole
// table fell through to outcome order — five wins on top, every miss hidden),
// and standing "ongoing" commitments, which sorted permanently last and so
// were permanently below the cut even when missed. Both still carry trail
// quarters (adversarial review, 2026-09-08).
const horizonRecencyIndex = (item: NormalizedGuidanceItem): number =>
  periodQuarterIndex(item.latestMentionPeriod) ??
  (isStandingHorizon(item) ? null : horizonQuarterIndex(item)) ??
  Number.NEGATIVE_INFINITY;

export const buildGuidanceVerdict = (
  items: NormalizedGuidanceItem[],
  current: ReportingQuarter,
): GuidanceVerdict => {
  const resolved: ResolvedRow[] = [];
  let live: LiveRow[] = [];
  for (const item of items) {
    const c = classifyGuidanceItem(item, current);
    if (c.phase === "resolved") resolved.push(buildResolvedRow(item, c.outcome));
    else live.push(buildLiveRow(item, c.state));
  }

  // Resolved: most recent horizon first (the reader wants the freshest
  // outcome, not an old win burying a recent miss — /plan-eng-review Issue
  // 8/T13); ties (including unparseable horizons, which all fall to
  // -Infinity) break on outcome, met before misses. Two unparseable
  // horizons both being -Infinity makes the subtraction -Infinity - -Infinity
  // = NaN, whose comparator-return behavior is unspecified across JS
  // engines — checked explicitly instead so it deterministically falls
  // through to the outcome tiebreak (Codex adversarial finding,
  // ship-workflow review, 2026-09-06).
  resolved.sort((a, b) => {
    // Compared, not subtracted — the same defect the live sort had. An
    // undated horizon is -Infinity, so `-Infinity - 8100` is not finite, the
    // finiteness guard discarded the comparison, and the pair fell through to
    // RESOLVED_ORDER, which puts `met` first: undated WINS sorted to the top,
    // the exact opposite of this comment's promise. Cosmetic while the whole
    // table rendered; load-bearing now that only the first
    // RESOLVED_PREVIEW_COUNT rows show under a "Most recent first" caption
    // (red-team review, 2026-09-08).
    const ra = horizonRecencyIndex(a.item);
    const rb = horizonRecencyIndex(b.item);
    if (ra !== rb) return rb > ra ? 1 : -1;
    return RESOLVED_ORDER[a.outcome] - RESOLVED_ORDER[b.outcome];
  });
  // Live: ranked by materiality (see compareMaterialityKeys) so the section
  // can card the top few and collapse the tail. Keys are built once per row,
  // not once per comparison — horizonProximityIndex parses with regexes.
  const decorated = live.map((row) => ({ row, key: materialityKey(row) }));
  decorated.sort((a, b) => compareMaterialityKeys(a.key, b.key));
  live = decorated.map((d) => d.row);

  const graded = resolved.filter((r) => GRADED_OUTCOMES.has(r.outcome));
  const metRows = graded.filter((r) => r.outcome === "met");
  const metCount = metRows.length;
  const countedCount = graded.length;
  const missCount = countedCount - metCount;
  const unclearCount = resolved.length - countedCount;
  const beatCount = metRows.filter((r) => r.delta?.sign === 1).length;
  const tier = computeTier(metCount, countedCount);

  // Summary — templated only from counts and labels the payload carries.
  // The unclear count is NOT prose here — it lives on the `unclearCount`
  // field so the track-record card can put it next to the ratio instead of
  // burying it in a trailing sentence (/plan-eng-review Issue 3 tension).
  const sentences: string[] = [];
  if (countedCount === 0) {
    sentences.push(
      live.length > 0
        ? `No commitment has reached its horizon yet — ${words(live.length)} ${plural(live.length, "is", "are")} live.`
        : "No tracked commitment has resolved yet.",
    );
  } else if (countedCount === 1) {
    // A ratio of one reads better as a plain verdict than "One of one
    // resolved commitment was met." (/plan-eng-review Issue 3).
    const only = graded[0];
    if (only.outcome === "met") {
      sentences.push("The only resolved commitment was met.");
    } else {
      const label = commitmentShortLabel(only.item);
      const suffixed = only.outcome === "missed" ? label : `${label}, ${only.outcome}`;
      sentences.push(`The only resolved commitment was not met: ${suffixed}.`);
    }
  } else {
    // Noun plurality follows the denominator (how many commitments total);
    // the verb agrees with the numerator (how many were actually met) — the
    // two were conflated before, producing "One of six ... were met."
    // (/plan-eng-review Issue 3).
    const nounPlural = plural(countedCount, "commitment", "commitments");
    const verb = plural(metCount, "was", "were");
    const beatClause = beatCount >= 2 ? `, ${words(beatCount)} of them with room to spare` : "";
    sentences.push(
      `${cap(words(metCount))} of ${words(countedCount)} resolved ${nounPlural} ${verb} met${beatClause}.`,
    );
    if (missCount > 0) {
      const missRows = graded.filter((r) => r.outcome !== "met");
      const shown = missRows.slice(0, 3).map((r) => {
        const base = commitmentShortLabel(r.item);
        return r.outcome === "missed" ? base : `${base}, ${r.outcome}`;
      });
      const overflow = missRows.length - shown.length;
      // Fold the overflow into the SAME list joinList renders, instead of
      // appending a second "and X more" after joinList's own "and C" —
      // the old code produced "..., and C and two more." (/plan-eng-review
      // Issue 3).
      const parts = overflow > 0 ? [...shown, `${words(overflow)} more`] : shown;
      sentences.push(missCount === 1 ? `The one miss: ${shown[0]}.` : `The misses: ${joinList(parts)}.`);
    } else {
      sentences.push("No misses on record.");
    }
  }
  if (countedCount > 0 && tier === "not_enough_data") {
    sentences.push(`We grade from three resolved commitments; ${words(countedCount)} so far.`);
  }

  // Live note — for the track-record footnote.
  let liveNote: string | null = null;
  if (live.length > 0) {
    const raised = live.filter((r) => r.state === "revised" && r.direction === "up").length;
    const lowered = live.filter((r) => r.state === "revised" && r.direction === "down").length;
    const revisedFlat = live.filter((r) => r.state === "revised").length - raised - lowered;
    const delayed = live.filter((r) => r.state === "delayed").length;
    const held = live.filter((r) => r.state === "on_track").length;
    const parts: string[] = [];
    if (held > 0) parts.push(`${words(held)} held`);
    if (raised > 0) parts.push(`${words(raised)} raised`);
    if (lowered > 0) parts.push(`${words(lowered)} revised downward`);
    if (revisedFlat > 0) parts.push(`${words(revisedFlat)} revised`);
    if (delayed > 0) parts.push(`${words(delayed)} pushed out`);
    const lead =
      countedCount > 0
        ? `${cap(words(live.length))} more ${plural(live.length, "commitment is", "commitments are")} live`
        : `${cap(words(live.length))} ${plural(live.length, "commitment is", "commitments are")} live`;
    liveNote = parts.length > 0 ? `${lead} — ${joinList(parts)}.` : `${lead}.`;
  }

  const bars: ResolvedOutcome[] = [
    ...metRows.map(() => "met" as const),
    ...graded.filter((r) => r.outcome !== "met").map((r) => r.outcome),
  ];

  const watch = live.slice(0, LIVE_WATCH_COUNT);
  const watchRest = live.slice(LIVE_WATCH_COUNT);
  const watchHorizonLabel = sharedHorizonLabel(watch);
  const watchHeading = buildWatchHeading(watch, watchRest);
  const watchRestLabel =
    watchRest.length === 0
      ? null
      : watchRest.length === 1
        ? "The other live commitment"
        : `The other ${words(watchRest.length)} live commitments`;
  const watchRestToggleLabel =
    watchRest.length === 0
      ? null
      : watchRest.length === 1
        ? "Show the other commitment"
        : `Show the other ${words(watchRest.length)} commitments`;

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    metCount,
    countedCount,
    unclearCount,
    beatCount,
    headline: headlineFor(tier, missCount),
    summary: sentences.join(" "),
    liveNote,
    bars,
    resolved,
    live,
    watch,
    watchRest,
    watchHorizonLabel,
    watchHeading,
    watchRestLabel,
    watchRestToggleLabel,
  };
};
