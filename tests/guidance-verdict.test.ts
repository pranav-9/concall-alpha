import assert from "node:assert/strict";

import type { ReportingQuarter } from "../lib/current-quarter";
import { extractFyQuarter, normalizeGuidanceTrackingRows } from "../lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow } from "../lib/guidance-tracking/types";
import {
  buildGuidanceVerdict,
  buildLiveRow,
  classifyGuidanceItem,
  commitmentShortLabel,
  heldSinceQuarter,
  horizonPhase,
  horizonQuarterIndex,
  readDelivered,
  readGuided,
  valueTrail,
} from "../lib/guidance-tracking/verdict";
import {
  formatDelta,
  formatUnitParts,
  readNumericValue,
  withGrowthSign,
} from "../lib/guidance-tracking/format";

// Fixture mirrors the Guidance tab mockup (2026-09-06): five resolved
// commitments (4 met, 1 missed) and four live ones (3 held, 1 revised down).
// CURRENT is pinned to Q2 FY27 so the split is deterministic.
const CURRENT: ReportingQuarter = { fy: 2027, qtr: 2, label: "Q2 FY27" };

type Step = {
  quarter: string;
  mention_type: string;
  value?: { value_text: string; magnitude_percent: number | null; value_kind?: string; numeric_value?: number; unit?: string } | null;
  horizon?: { applies_to: string } | null;
};

let id = 0;
const row = (
  o: Partial<GuidanceTrackingRow> & {
    text: string;
    family: string;
    subtype: string;
    from: string;
    to: string;
    htype?: string;
    value?: Record<string, unknown>;
    status: string;
    trail: Step[];
  },
): GuidanceTrackingRow => ({
  id: ++id,
  company_code: "MOCK",
  guidance_key: `k${id}`,
  guidance_text: o.text,
  guidance_family: o.family,
  metric_subtype: o.subtype,
  segment: o.segment ?? null,
  value: o.value ?? { magnitude_percent: null, value_text: "" },
  horizon: { horizon_type: o.htype ?? "single_fy", applies_from: o.from, applies_to: o.to, horizon_text: o.to },
  trail: o.trail.map((t) => ({
    quarter: t.quarter,
    document_type: "concall",
    document_label: `${t.quarter} Concall`,
    mention_type: t.mention_type,
    excerpt: "excerpt",
    summary: `${t.mention_type} at ${t.quarter}`,
    source_reference: null,
    confidence: 0.9,
    value: t.value ?? null,
    horizon: t.horizon ?? null,
  })),
  status: o.status,
  status_reason: o.status_reason ?? "reason",
  latest_view: o.latest_view ?? "latest view",
  confidence: 0.9,
});

const rows: GuidanceTrackingRow[] = [
  // --- resolved -------------------------------------------------------
  row({
    text: "Revenue to cross ₹850 cr", family: "growth", subtype: "revenue", from: "FY26", to: "FY26", status: "met",
    value: { magnitude_percent: null, value_text: "INR 850 crores", value_kind: "absolute", numeric_value: 850, unit: "INRcr" },
    trail: [
      { quarter: "Q4 FY25", mention_type: "first_mention", value: { value_text: "INR 850 crores", magnitude_percent: null } },
      { quarter: "Q4 FY26", mention_type: "met", value: { value_text: "INR 902 crores delivered", magnitude_percent: null } },
    ],
  }),
  row({
    text: "Defence revenue to grow ~35%", family: "growth", subtype: "revenue", segment: "Defence", from: "FY26", to: "FY26", status: "met",
    value: { magnitude_percent: 35, value_text: "around 35%", value_kind: "percent", numeric_value: 35, unit: "pct" },
    trail: [
      { quarter: "Q1 FY26", mention_type: "first_mention", value: { value_text: "around 35%", magnitude_percent: 35 } },
      { quarter: "Q4 FY26", mention_type: "met", value: { value_text: "+41% FY26", magnitude_percent: 41 } },
    ],
  }),
  row({
    text: "EBITDA to grow 20-25%", family: "growth", subtype: "ebitda", from: "FY26", to: "FY26", status: "met",
    value: { magnitude_percent: 22.5, value_text: "20% to 25%", value_kind: "percent", numeric_value: 22.5, unit: "pct" },
    trail: [
      { quarter: "Q1 FY26", mention_type: "first_mention", value: { value_text: "20% to 25%", magnitude_percent: 22.5 } },
      { quarter: "Q4 FY26", mention_type: "met", value: { value_text: "33% delivered", magnitude_percent: 33 } },
    ],
  }),
  row({
    text: "Revenue to cross ₹700 cr", family: "growth", subtype: "revenue", from: "FY25", to: "FY25", status: "met",
    value: { magnitude_percent: null, value_text: "INR 700 crores", value_kind: "absolute", numeric_value: 700, unit: "INRcr" },
    trail: [
      { quarter: "Q4 FY24", mention_type: "first_mention", value: { value_text: "INR 700 crores", magnitude_percent: null } },
      { quarter: "Q4 FY25", mention_type: "met" }, // no delivered value captured
    ],
  }),
  row({
    text: "PAT to grow 30%", family: "growth", subtype: "pat", from: "FY25", to: "FY25", status: "missed",
    value: { magnitude_percent: 30, value_text: "30%", value_kind: "percent", numeric_value: 30, unit: "pct" },
    trail: [
      { quarter: "Q4 FY24", mention_type: "first_mention", value: { value_text: "30%", magnitude_percent: 30 } },
      { quarter: "Q4 FY25", mention_type: "missed", value: { value_text: "19% delivered", magnitude_percent: 19 } },
    ],
  }),
  // --- live -----------------------------------------------------------
  row({
    text: "Consolidated revenue to grow 30%+", family: "growth", subtype: "revenue", from: "FY27", to: "FY27", status: "active",
    value: { magnitude_percent: 30, value_text: "30% plus", value_kind: "percent", numeric_value: 30, unit: "pct" },
    trail: [
      { quarter: "Q4 FY26", mention_type: "first_mention", value: { value_text: "30% plus", magnitude_percent: 30 } },
      { quarter: "Q1 FY27", mention_type: "repeat" },
    ],
  }),
  row({
    text: "EBITDA to grow ~35%", family: "growth", subtype: "ebitda", from: "FY27", to: "FY27", status: "active",
    value: { magnitude_percent: 35, value_text: "~35%", value_kind: "percent", numeric_value: 35, unit: "pct" },
    trail: [{ quarter: "Q4 FY26", mention_type: "first_mention", value: { value_text: "~35%", magnitude_percent: 35 } }],
  }),
  row({
    text: "Defence revenue to roughly double", family: "growth", subtype: "revenue", segment: "Defence", from: "FY28", to: "FY28", status: "active",
    value: { magnitude_percent: 100, value_text: "roughly double", value_kind: "percent", numeric_value: 100, unit: "pct" },
    trail: [{ quarter: "Q2 FY26", mention_type: "first_mention" }],
  }),
  row({
    text: "Medical electronics to reach ₹180 cr", family: "growth", subtype: "revenue", segment: "Medical", from: "FY27", to: "FY27", status: "revised",
    value: { magnitude_percent: null, value_text: "INR 170-180 crores", value_kind: "absolute", numeric_value: 175, unit: "INRcr" },
    trail: [
      { quarter: "Q1 FY26", mention_type: "first_mention", value: { value_text: "INR 200 crores", magnitude_percent: null } },
      { quarter: "Q3 FY26", mention_type: "repeat" },
      { quarter: "Q1 FY27", mention_type: "revision", value: { value_text: "INR 170-180 crores", magnitude_percent: null } },
    ],
  }),
];

const items = normalizeGuidanceTrackingRows(rows);
assert.equal(items.length, 9);

const byText = (t: string) => {
  const it = items.find((i) => i.guidanceText === t);
  assert.ok(it, `missing item ${t}`);
  return it;
};

// ---- classification ------------------------------------------------------
assert.deepEqual(classifyGuidanceItem(byText("Revenue to cross ₹850 cr"), CURRENT), { phase: "resolved", outcome: "met" });
assert.deepEqual(classifyGuidanceItem(byText("PAT to grow 30%"), CURRENT), { phase: "resolved", outcome: "missed" });
assert.deepEqual(classifyGuidanceItem(byText("Medical electronics to reach ₹180 cr"), CURRENT), { phase: "live", state: "revised" });
assert.deepEqual(classifyGuidanceItem(byText("Defence revenue to roughly double"), CURRENT), { phase: "live", state: "on_track" });
// A revision whose horizon has passed is resolved (graded, not met).
assert.deepEqual(
  classifyGuidanceItem({ ...byText("Medical electronics to reach ₹180 cr"), appliesTo: "FY26" }, CURRENT),
  { phase: "resolved", outcome: "revised" },
);
// A revision with an unreadable horizon falls back to the status-only rule.
assert.deepEqual(
  classifyGuidanceItem({ ...byText("Medical electronics to reach ₹180 cr"), appliesTo: null, horizonType: null }, CURRENT),
  { phase: "resolved", outcome: "revised" },
);
// An active thread past its horizon is resolved but ungradeable.
assert.deepEqual(
  classifyGuidanceItem({ ...byText("EBITDA to grow ~35%"), appliesTo: "FY25" }, CURRENT),
  { phase: "resolved", outcome: "unclear" },
);

// ---- guided / delivered / delta -----------------------------------------
{
  const it = byText("Revenue to cross ₹850 cr");
  assert.equal(readGuided(it).label, "₹850cr");
  const d = readDelivered(it);
  assert.equal(d?.label, "₹902cr");
  assert.deepEqual(formatDelta(readGuided(it).numeric, d?.numeric ?? null), { label: "+6.1%", sign: 1 });
}
{
  const it = byText("Defence revenue to grow ~35%");
  assert.equal(readGuided(it).label, "+35%");
  assert.equal(readDelivered(it)?.label, "+41%");
  assert.deepEqual(formatDelta(readGuided(it).numeric, readDelivered(it)?.numeric ?? null), { label: "+6 pts", sign: 1 });
}
{
  const it = byText("EBITDA to grow 20-25%");
  assert.equal(readGuided(it).label, "+20-25%");
  assert.deepEqual(formatDelta(readGuided(it).numeric, readDelivered(it)?.numeric ?? null), { label: "beat", sign: 1 });
}
{
  const it = byText("PAT to grow 30%");
  assert.equal(readDelivered(it)?.label, "+19%");
  assert.deepEqual(formatDelta(readGuided(it).numeric, readDelivered(it)?.numeric ?? null), { label: "-11 pts", sign: -1 });
}
// No delivered value on the outcome step → no delivered label, no delta.
assert.equal(readDelivered(byText("Revenue to cross ₹700 cr")), null);
// Never compare a ₹ amount to a % — mismatched axes yield no delta.
assert.equal(
  formatDelta(readNumericValue({ valueKind: "absolute", numericValue: 460, unit: "INRcr", valueText: "INR460 cr", valuePercent: null }), {
    kind: "percent", lo: 58, hi: 58, unitKey: "pct",
  }),
  null,
);
// A margin LEVEL is not signed like a growth rate.
{
  const [lvl] = normalizeGuidanceTrackingRows([
    row({
      text: "FY26 EBITDA margin ~25%", family: "margin", subtype: "ebitda_margin", from: "FY26", to: "FY26", status: "met",
      value: { magnitude_percent: 25, value_text: "near 25%", value_kind: "percent_level", numeric_value: 25, unit: "pct" },
      trail: [{ quarter: "Q4 FY26", mention_type: "met", value: { value_text: "25.5% delivered", magnitude_percent: 25.5 } }],
    }),
  ]);
  assert.equal(lvl.metricLabel, "EBITDA margin");
  assert.equal(readGuided(lvl).label, "25%");
  assert.equal(readDelivered(lvl)?.label, "25.5%");
  assert.deepEqual(formatDelta(readGuided(lvl).numeric, readDelivered(lvl)?.numeric ?? null), { label: "+0.5 pts", sign: 1 });
}

// ---- held since / value trail ------------------------------------------
assert.equal(heldSinceQuarter(byText("Consolidated revenue to grow 30%+")), "Q4 FY26");
{
  const trail = valueTrail(byText("Medical electronics to reach ₹180 cr"));
  assert.deepEqual(trail.map((s) => [s.quarter, s.label, s.direction]), [
    ["Q1 FY26", "₹200cr", null],
    ["Q1 FY27", "₹170-180cr", "down"],
  ]);
}

// ---- verdict -------------------------------------------------------------
const v = buildGuidanceVerdict(items, CURRENT);
assert.equal(v.tier, "mixed"); // 4/5 = 80% → mixed band (75–89%)
assert.equal(v.metCount, 4);
assert.equal(v.countedCount, 5);
assert.equal(v.unclearCount, 0);
assert.equal(v.beatCount, 3);
assert.equal(v.headline, "Mixed — more hits than misses.");
assert.equal(
  v.summary,
  "Four of five resolved commitments were met, three of them with room to spare. The one miss: PAT growth (FY25).",
);
assert.equal(v.liveNote, "Four more commitments are live — three held and one revised downward.");
assert.deepEqual(v.bars, ["met", "met", "met", "met", "missed"]);
assert.equal(v.resolved.length, 5);
assert.equal(v.live.length, 4);
// Live ordering (materiality, 2026-09-08): soonest horizon first, then
// consolidated before segment-level, then revenue before EBITDA. The FY28
// Defence guide sorts BELOW the FY27 Medical one even though Defence is the
// bigger line — it isn't what decides FY27.
assert.deepEqual(
  v.live.map((r) => r.item.guidanceText),
  ["Consolidated revenue to grow 30%+", "EBITDA to grow ~35%", "Medical electronics to reach ₹180 cr", "Defence revenue to roughly double"],
);
assert.equal(v.live[2].trail.length, 2);
assert.equal(v.live[2].direction, "down");
// The watch split: top three carded, the rest collapsed. All three FY27, so
// the heading can name the year.
assert.deepEqual(
  v.watch.map((r) => r.item.guidanceText),
  ["Consolidated revenue to grow 30%+", "EBITDA to grow ~35%", "Medical electronics to reach ₹180 cr"],
);
assert.deepEqual(
  v.watchRest.map((r) => r.item.guidanceText),
  ["Defence revenue to roughly double"],
);
assert.equal(v.watchHorizonLabel, "FY27");
// The guided number rides the live row, so the card doesn't re-read it.
assert.equal(v.live[0].guidedLabel, "+30%");
// Resolved: most recently mentioned first, and on a tie a miss outranks a
// win (2026-09-08 — met-first quietly collapsed misses once the table started
// showing only its first five rows).
assert.deepEqual(
  v.resolved.map((r) => r.outcome),
  ["met", "met", "met", "missed", "met"],
);
const missRow = v.resolved.find((r) => r.outcome === "missed")!;
assert.equal(missRow.item.guidanceText, "PAT to grow 30%");
assert.equal(missRow.delta?.label, "-11 pts");
// The FY25 pair ties on recency (both last mentioned Q4 FY25), and the miss
// takes the higher slot.
assert.equal(v.resolved[3].item.guidanceText, "PAT to grow 30%");
assert.equal(v.resolved[4].item.guidanceText, "Revenue to cross ₹700 cr");

// Reliable band with a single slip reads as "with one slip".
{
  const nine = buildGuidanceVerdict(
    normalizeGuidanceTrackingRows([
      ...rows.slice(0, 4),
      ...rows.slice(0, 4).map((r, i) => ({ ...r, id: 100 + i, guidance_key: `dup${i}` })),
      ...rows.slice(0, 2).map((r, i) => ({ ...r, id: 200 + i, guidance_key: `dup2${i}` })),
      rows[4],
    ]),
    CURRENT,
  );
  assert.equal(nine.countedCount, 11);
  assert.equal(nine.tier, "reliable");
  assert.equal(nine.headline, "Reliable — they deliver, with one slip.");
}

// Too-early state: nothing resolved.
{
  const early = buildGuidanceVerdict(normalizeGuidanceTrackingRows(rows.slice(5)), CURRENT);
  assert.equal(early.tier, "not_enough_data");
  assert.equal(early.headline, "Too early to call.");
  assert.equal(early.summary, "No commitment has reached its horizon yet — four are live.");
  assert.equal(early.liveNote, "Four commitments are live — three held and one revised downward.");
}

// ---------------------------------------------------------------------------
// Unified horizon comparator (/plan-eng-review Issue 2, 2026-09-06) — direct
// coverage of extractFyQuarter, horizonQuarterIndex and horizonPhase.
// ---------------------------------------------------------------------------

assert.deepEqual(extractFyQuarter("Q3 FY26"), { fy: 2026, qtr: 3 });
assert.deepEqual(extractFyQuarter("Q1 FY'27"), { fy: 2027, qtr: 1 });
assert.equal(extractFyQuarter("FY26"), null, "FY-only string has no quarter token");
assert.equal(extractFyQuarter(null), null);
assert.equal(extractFyQuarter("Q5 FY26"), null, "quarter must be 1-4");

{
  const quarterPrecise = { ...byText("Defence revenue to roughly double"), appliesTo: "Q1 FY27" };
  assert.equal(horizonQuarterIndex(quarterPrecise), 2027 * 4 + 1);
  const fyOnly = { ...byText("Defence revenue to roughly double"), appliesTo: "FY26" };
  assert.equal(horizonQuarterIndex(fyOnly), 2026 * 4 + 4, "FY-only deadline is Q4 of that FY");
  const unparseable = { ...byText("Defence revenue to roughly double"), appliesTo: null };
  assert.equal(horizonQuarterIndex(unparseable), null);
}

assert.equal(
  horizonPhase({ ...byText("Defence revenue to roughly double"), horizonType: "unspecified", appliesTo: null }, CURRENT),
  "ahead",
  "a standing commitment never elapses",
);
assert.equal(
  horizonPhase({ ...byText("Defence revenue to roughly double"), horizonType: "rolling", appliesTo: "FY20" }, CURRENT),
  "ahead",
  "rolling never elapses, even against a long-past FY token",
);
assert.equal(
  horizonPhase({ ...byText("Defence revenue to roughly double"), horizonType: null, appliesTo: "Ongoing" }, CURRENT),
  "ahead",
  "'ongoing' is case-insensitive",
);
assert.equal(
  horizonPhase({ ...byText("Defence revenue to roughly double"), horizonType: null, appliesTo: null }, CURRENT),
  "unknown",
);
// Quarter-precise: elapses at its OWN quarter boundary, not at the FY
// boundary — the bug the old FY-only comparators had (Codex outside-voice
// finding, 2026-09-06: a Q1 FY27 item stayed "ahead" for the whole of FY27).
assert.equal(
  horizonPhase({ ...byText("Defence revenue to roughly double"), horizonType: "single_quarter", appliesTo: "Q1 FY27" }, CURRENT),
  "elapsed",
);
assert.equal(
  horizonPhase({ ...byText("Defence revenue to roughly double"), horizonType: "single_quarter", appliesTo: "Q2 FY27" }, CURRENT),
  "elapsed",
  "the CURRENT quarter's own results are already known",
);
assert.equal(
  horizonPhase({ ...byText("Defence revenue to roughly double"), horizonType: "single_quarter", appliesTo: "Q3 FY27" }, CURRENT),
  "ahead",
);

// End-to-end: an `active` item with a quarter-precise horizon in the SAME
// FY as CURRENT now splits correctly by quarter instead of both reading as
// "ahead" until the whole FY passes.
{
  const quarterItems = normalizeGuidanceTrackingRows([
    row({
      text: "Q1 active elapsed", family: "growth", subtype: "revenue", from: "Q1 FY27", to: "Q1 FY27", htype: "single_quarter", status: "active",
      trail: [{ quarter: "Q4 FY26", mention_type: "first_mention" }],
    }),
    row({
      text: "Q3 active ahead", family: "growth", subtype: "revenue", from: "Q3 FY27", to: "Q3 FY27", htype: "single_quarter", status: "active",
      trail: [{ quarter: "Q4 FY26", mention_type: "first_mention" }],
    }),
  ]);
  const [q1, q3] = quarterItems.sort((a, b) => a.guidanceText.localeCompare(b.guidanceText));
  assert.deepEqual(classifyGuidanceItem(q1, CURRENT), { phase: "resolved", outcome: "unclear" });
  assert.deepEqual(classifyGuidanceItem(q3, CURRENT), { phase: "live", state: "on_track" });
}

// ---------------------------------------------------------------------------
// "delayed" is always graded, regardless of its NEW horizon (/plan-eng-review
// Issue 3 / Codex "goalpost-moving" finding, 2026-09-06) — a pushed-out
// deadline is itself the broken promise, so a company can't escape the tier
// by repeatedly moving its own goalpost.
// ---------------------------------------------------------------------------
{
  const [delayedAhead] = normalizeGuidanceTrackingRows([
    row({
      text: "Delayed but horizon still ahead", family: "growth", subtype: "revenue", from: "FY30", to: "FY30", status: "delayed",
      trail: [{ quarter: "Q1 FY26", mention_type: "first_mention" }, { quarter: "Q1 FY27", mention_type: "delay" }],
    }),
  ]);
  assert.deepEqual(classifyGuidanceItem(delayedAhead, CURRENT), { phase: "resolved", outcome: "delayed" });
}

// ---------------------------------------------------------------------------
// Value trail renders on ANY live state with 2+ distinct values, not just
// revised/delayed (/plan-eng-review Issue 8/T12, 2026-09-06) — a producer
// that leaves status "active" after quietly revising the number (HFCL: 20%
// -> 40%+) still shows the ladder instead of a stale headline.
// ---------------------------------------------------------------------------
{
  const [hfclLike] = normalizeGuidanceTrackingRows([
    row({
      text: "Aspire ~20% revenue growth", family: "growth", subtype: "revenue", from: "FY27", to: "FY27", status: "active",
      trail: [
        { quarter: "Q4 FY26", mention_type: "first_mention", value: { value_text: "20% revenue growth", magnitude_percent: 20 } },
        { quarter: "Q1 FY27", mention_type: "update", value: { value_text: "40% and above revenue growth", magnitude_percent: 40 } },
      ],
    }),
  ]);
  assert.deepEqual(classifyGuidanceItem(hfclLike, CURRENT), { phase: "live", state: "on_track" });
  const liveRow = buildLiveRow(hfclLike, "on_track");
  assert.equal(liveRow.trail.length, 2);
  assert.equal(liveRow.direction, "up");
  assert.deepEqual(liveRow.trail.map((t) => t.label), ["20%", "40%"]);
}

// REGRESSION — found browser-verifying the T12 fix live on HFCL
// (2026-09-06): the producer left the item's top-level guidance_text/value
// stale at "20%" even though its OWN trail correctly records a Q1 FY27
// revision to 40%+. valueTrail()'s "append the canonical current value"
// fallback (for synthesizers that only carry values on first_mention) must
// NOT fire when the trail's last real step is already at the thread's
// latest mention — otherwise the stale top-level value re-appears as a
// THIRD, most-recent-looking step, rendering 20% -> 40% -> 20% (down) and
// implying an oscillation that never happened.
{
  const [staleHeadline] = normalizeGuidanceTrackingRows([
    row({
      text: "Aspire to deliver around 20% revenue growth in FY27", family: "growth", subtype: "revenue", from: "FY27", to: "FY27", status: "active",
      value: { magnitude_percent: 20, value_text: "around 20% revenue growth", value_kind: "percent", numeric_value: 20, unit: "pct" },
      trail: [
        { quarter: "Q4 FY26", mention_type: "first_mention", value: { value_text: "20% revenue growth", magnitude_percent: 20 } },
        { quarter: "Q1 FY27", mention_type: "revision", value: { value_text: "40% and above revenue growth", magnitude_percent: 40 } },
      ],
    }),
  ]);
  const trail = valueTrail(staleHeadline);
  assert.deepEqual(trail.map((s) => s.label), ["20%", "40%"]);
}

// ---------------------------------------------------------------------------
// Resolved sort: most-recent-horizon-first, not outcome-first
// (/plan-eng-review Issue 8/T13, Codex finding) — an old "met" no longer
// buries a recent "missed".
// ---------------------------------------------------------------------------
{
  const sortItems = normalizeGuidanceTrackingRows([
    row({
      text: "Old met", family: "growth", subtype: "revenue", from: "FY24", to: "FY24", status: "met",
      trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }, { quarter: "Q4 FY24", mention_type: "met" }],
    }),
    row({
      text: "Recent miss", family: "growth", subtype: "revenue", from: "FY26", to: "FY26", status: "missed",
      trail: [{ quarter: "Q1 FY26", mention_type: "first_mention" }, { quarter: "Q4 FY26", mention_type: "missed" }],
    }),
  ]);
  const sortV = buildGuidanceVerdict(sortItems, CURRENT);
  assert.deepEqual(sortV.resolved.map((r) => r.item.guidanceText), ["Recent miss", "Old met"]);
}

// ---------------------------------------------------------------------------
// commitmentShortLabel: data-driven casing, no lowercase-then-recapitalize
// (/plan-eng-review Issue 4/T7) — acronym subtypes stay capitalized after a
// segment name.
// ---------------------------------------------------------------------------
{
  const [seg] = normalizeGuidanceTrackingRows([
    row({
      text: "Defence EBITDA to grow", family: "growth", subtype: "ebitda", segment: "Defence", from: "FY25", to: "FY25", status: "missed",
      trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }],
    }),
  ]);
  assert.equal(commitmentShortLabel(seg), "Defence EBITDA growth (FY25)");

  const [noSeg] = normalizeGuidanceTrackingRows([
    row({
      text: "EBITDA to grow", family: "growth", subtype: "ebitda", from: "FY24", to: "FY24", status: "missed",
      trail: [{ quarter: "Q1 FY23", mention_type: "first_mention" }],
    }),
  ]);
  assert.equal(commitmentShortLabel(noSeg), "EBITDA growth (FY24)", "sentence-start form is unaffected");

  const [hpp] = normalizeGuidanceTrackingRows([
    row({
      text: "HPP revenue", family: "growth", subtype: "revenue", segment: "HPP", from: "FY25", to: "FY25", status: "missed",
      trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }],
    }),
  ]);
  assert.equal(commitmentShortLabel(hpp), "HPP revenue growth (FY25)");
}

// ---------------------------------------------------------------------------
// Summary grammar (/plan-eng-review Issue 3/T6, 2026-09-06):
//   - verb agrees with metCount, noun-plural agrees with countedCount
//     ("One of six ... was met.", not "...were met.")
//   - a single miss-list overflow gets exactly one "and" ("A, B, and N more.")
//   - a countedCount of 1 reads as a plain verdict, not "One of one ..."
//   - the unclear count moved OUT of the summary into the `unclearCount`
//     field, so the track-record card can place it next to the ratio
// ---------------------------------------------------------------------------
{
  const items = normalizeGuidanceTrackingRows([
    row({ text: "Miss one", family: "", subtype: "", from: "FY25", to: "FY25", status: "missed", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
    row({ text: "Miss two", family: "", subtype: "", from: "FY25", to: "FY25", status: "missed", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
    row({ text: "Miss three", family: "", subtype: "", from: "FY25", to: "FY25", status: "missed", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
    row({ text: "Dropped one", family: "", subtype: "", from: "FY25", to: "FY25", status: "dropped", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
    row({ text: "Delayed one", family: "", subtype: "", from: "FY30", to: "FY30", status: "delayed", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
    row({ text: "The met one", family: "", subtype: "", from: "FY25", to: "FY25", status: "met", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
  ]);
  const grammarV = buildGuidanceVerdict(items, CURRENT);
  assert.equal(grammarV.metCount, 1);
  assert.equal(grammarV.countedCount, 6);
  // Miss-list order follows the resolved order. Every row here was last
  // mentioned in the same quarter, so they tie on recency and fall to the
  // outcome tiebreak (missed -> dropped -> delayed -> met as of 2026-09-08),
  // then to insertion order within each outcome.
  assert.equal(
    grammarV.summary,
    "One of six resolved commitments was met. The misses: Miss three (FY25), Miss two (FY25), Miss one (FY25), and two more.",
  );
}
{
  const items = normalizeGuidanceTrackingRows([
    row({ text: "Zero one", family: "", subtype: "", from: "FY25", to: "FY25", status: "missed", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
    row({ text: "Zero two", family: "", subtype: "", from: "FY25", to: "FY25", status: "missed", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
    row({ text: "Zero three", family: "", subtype: "", from: "FY25", to: "FY25", status: "dropped", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
  ]);
  const zeroV = buildGuidanceVerdict(items, CURRENT);
  assert.equal(zeroV.metCount, 0);
  assert.equal(
    zeroV.summary,
    "Zero of three resolved commitments were met. The misses: Zero two (FY25), Zero one (FY25), and Zero three (FY25), dropped.",
  );
}
{
  const [soloMet] = normalizeGuidanceTrackingRows([
    row({ text: "Solo met", family: "", subtype: "", from: "FY25", to: "FY25", status: "met", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
  ]);
  const soloMetV = buildGuidanceVerdict([soloMet], CURRENT);
  assert.equal(soloMetV.summary, "The only resolved commitment was met. We grade from three resolved commitments; one so far.");

  const [soloMiss] = normalizeGuidanceTrackingRows([
    row({ text: "Solo miss", family: "", subtype: "", from: "FY25", to: "FY25", status: "missed", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
  ]);
  const soloMissV = buildGuidanceVerdict([soloMiss], CURRENT);
  assert.equal(
    soloMissV.summary,
    "The only resolved commitment was not met: Solo miss (FY25). We grade from three resolved commitments; one so far.",
  );
}
{
  // 3 met + 1 elapsed-active (unclear) — the unclear count must show up on
  // the field, NOT inside the summary prose.
  const items = normalizeGuidanceTrackingRows([
    row({ text: "Met A", family: "", subtype: "", from: "FY25", to: "FY25", status: "met", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
    row({ text: "Met B", family: "", subtype: "", from: "FY25", to: "FY25", status: "met", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
    row({ text: "Met C", family: "", subtype: "", from: "FY25", to: "FY25", status: "met", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
    row({ text: "Unclear old active", family: "", subtype: "", from: "FY25", to: "FY25", status: "active", trail: [{ quarter: "Q1 FY24", mention_type: "first_mention" }] }),
  ]);
  const unclearV = buildGuidanceVerdict(items, CURRENT);
  assert.equal(unclearV.unclearCount, 1);
  assert.equal(unclearV.countedCount, 3);
  assert.equal(unclearV.resolved.length, 4);
  assert.equal(unclearV.summary, "Three of three resolved commitments were met. No misses on record.");
  assert.equal(unclearV.summary.includes("unclear"), false, "unclear no longer lives in the summary prose");
  assert.equal(unclearV.summary.includes("no clear outcome"), false);
}

// ---------------------------------------------------------------------------
// format.ts — full branch coverage (/plan-eng-review Issue 6/T9, 2026-09-06).
// ---------------------------------------------------------------------------
assert.deepEqual(formatUnitParts("INRcr"), { symbol: "₹", suffix: " cr" });
assert.deepEqual(formatUnitParts("InrLakh"), { symbol: "₹", suffix: " L" });
assert.deepEqual(formatUnitParts("INRLAKHS"), { symbol: "₹", suffix: " L" });
assert.deepEqual(formatUnitParts("INR"), { symbol: "₹", suffix: "" });
assert.deepEqual(formatUnitParts("USDmn"), { symbol: "$", suffix: "M" });
assert.deepEqual(formatUnitParts("USDM"), { symbol: "$", suffix: "M" });
assert.deepEqual(formatUnitParts("USDbn"), { symbol: "$", suffix: "B" });
assert.deepEqual(formatUnitParts("USDB"), { symbol: "$", suffix: "B" });
assert.deepEqual(formatUnitParts("USD"), { symbol: "$", suffix: "" });
assert.deepEqual(formatUnitParts("bps"), { symbol: "", suffix: " bps" });
assert.deepEqual(formatUnitParts(null), { symbol: "", suffix: "" });
assert.deepEqual(formatUnitParts("xyz"), { symbol: "", suffix: " xyz" }, "unknown unit falls back to its own literal text");

assert.equal(withGrowthSign(null, true), null);
assert.equal(withGrowthSign("25%", true), "+25%");
assert.equal(withGrowthSign("-25%", true), "-25%", "already-signed values are not double-signed");
assert.equal(withGrowthSign("25%", false), "25%", "a margin LEVEL is never signed, even though it's shaped like a percent");
assert.equal(withGrowthSign("₹850cr", true), "₹850cr", "absolute values are never signed");

assert.deepEqual(
  readNumericValue({ valueKind: "absolute", numericValue: 30, unit: "bps", valueText: "30 bps", valuePercent: null }),
  { kind: "absolute", lo: 30, hi: 30, unitKey: "bps" },
);

assert.deepEqual(
  formatDelta({ kind: "percent", lo: 20, hi: 25, unitKey: "pct" }, { kind: "percent", lo: 22, hi: 22, unitKey: "pct" }),
  { label: "in range", sign: 0 },
);
assert.deepEqual(
  formatDelta({ kind: "percent", lo: 20, hi: 25, unitKey: "pct" }, { kind: "percent", lo: 10, hi: 10, unitKey: "pct" }),
  { label: "-10 pts", sign: -1 },
  "below a guided RANGE reports the point gap to the floor",
);
assert.deepEqual(
  formatDelta({ kind: "percent", lo: 30, hi: 30, unitKey: "pct" }, { kind: "percent", lo: 30, hi: 30, unitKey: "pct" }),
  { label: "on the number", sign: 0 },
);
assert.equal(
  formatDelta({ kind: "absolute", lo: 0, hi: 0, unitKey: "cr" }, { kind: "absolute", lo: 100, hi: 100, unitKey: "cr" }),
  null,
  "a guided value of zero can't drive a percentage-of-guided delta — defensive divide-by-zero guard",
);
assert.deepEqual(
  formatDelta({ kind: "absolute", lo: 500, hi: 500, unitKey: "cr" }, { kind: "absolute", lo: 500, hi: 500, unitKey: "cr" }),
  { label: "on the number", sign: 0 },
);

console.log("guidance-verdict: all assertions passed");

