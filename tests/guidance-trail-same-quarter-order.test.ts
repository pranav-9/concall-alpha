import assert from "node:assert/strict";

import { quarterGuidanceMoves } from "../app/quarter-tracker/signals";
import type { ReportingQuarter } from "../lib/current-quarter";
import { normalizeGuidanceTrackingRows } from "../lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow } from "../lib/guidance-tracking/types";
import { buildGuidanceVerdict, liveStateKey, valueTrail } from "../lib/guidance-tracking/verdict";

// Same-quarter trail steps keep the producer's order (2026-11-06). The value
// trail reads a revision's direction off the LAST value-bearing step, so the
// order of two steps in one quarter decides "Raised" vs "Lowered". The old
// comparator broke the quarter tie alphabetically on summary text.

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

const CURRENT: ReportingQuarter = { fy: 2027, qtr: 2, label: "Q2 FY27" };

const pct = (value_text: string, n: number) => ({
  unit: "pct",
  value_kind: "percent",
  value_text,
  numeric_value: n,
  magnitude_percent: n,
});

type Step = { quarter: string; document_type: string; mention_type: string; summary: string; value?: ReturnType<typeof pct> | null };

const step = (s: Step) => ({
  quarter: s.quarter,
  document_type: s.document_type,
  document_label: `${s.quarter} ${s.document_type}`,
  mention_type: s.mention_type,
  excerpt: "excerpt",
  summary: s.summary,
  source_reference: null,
  confidence: 0.9,
  value: s.value ?? null,
  horizon: null,
});

// VOEPL's live multi-year revenue CAGR thread, as promoted on 2026-11-06: the
// Q2 FY27 deck (filed that morning) reprinted 35-40%; the call that afternoon
// cut it to 30-35%. The producer wrote deck -> call. Alphabetically "MD: …"
// sorts before "Nov 2026 deck …", which used to put the deck last.
const VOEPL_TRAIL = [
  step({ quarter: "Q4 FY26", document_type: "concall", mention_type: "extension",
    summary: "CFO: a 35-40% CAGR over the next three to five years, 'we continue to stand with that'.",
    value: pct("35%, 40% kind of a CAGR", 37.5) }),
  step({ quarter: "Q2 FY27", document_type: "presentation", mention_type: "repeat",
    summary: "Nov 2026 deck moves the base to ₹838 Cr in FY26 (standalone) and keeps 'targeting sustained 35-40% CAGR'.",
    value: pct("targeting sustained 35-40% CAGR", 37.5) }),
  step({ quarter: "Q2 FY27", document_type: "concall", mention_type: "revision",
    summary: "MD: 30-35% over this five-year block, said as a repeat of earlier guidance.",
    value: pct("30-35% over this 5-year block", 32.5) }),
  step({ quarter: "Q2 FY27", document_type: "concall", mention_type: "repeat",
    summary: "MD: 30-35% is a long-term number." }),
];

const voeplCagr: GuidanceTrackingRow = {
  id: 1,
  company_code: "VOEPL",
  guidance_key: "7ab99cd2e4f9520d",
  guidance_text: "Revenue CAGR of 35-40% over the next three to five years; 30-35% over this 5-year block",
  guidance_family: "growth",
  metric_subtype: "revenue",
  segment: null,
  value: pct("30-35% over this 5-year block", 32.5),
  horizon: { horizon_type: "multi_fy", applies_from: "FY27", applies_to: "FY31", horizon_text: "this 5-year block" },
  trail: VOEPL_TRAIL,
  status: "revised",
  status_reason: "Cut on the Q2 FY27 call; the same-day deck still prints 35-40%.",
  latest_view: "30-35%",
  confidence: 0.9,
};

test("same-quarter steps keep the producer's order, not alphabetical summary order", () => {
  const [item] = normalizeGuidanceTrackingRows([voeplCagr]);
  const q2 = item.trail.filter((s) => s.quarter === "Q2 FY27").map((s) => s.summary ?? "");
  assert.equal(q2.length, 3);
  assert.ok(q2[0].startsWith("Nov 2026 deck"), `deck step should stay first, got: ${q2[0]}`);
  assert.ok(q2[1].startsWith("MD: 30-35% over"), `call revision should follow, got: ${q2[1]}`);
});

test("a same-day cut after a reprinted deck slide reads as a cut", () => {
  const [item] = normalizeGuidanceTrackingRows([voeplCagr]);
  const trail = valueTrail(item);
  const last = trail[trail.length - 1];
  assert.equal(last.direction, "down");
  assert.match(last.label, /30-35%/);

  const verdict = buildGuidanceVerdict([item], CURRENT);
  assert.equal(verdict.live.length, 1);
  assert.equal(liveStateKey(verdict.live[0]), "lowered");
});

test("the quarter tracker prints it as Lowered 35-40% -> 30-35%", () => {
  const items = normalizeGuidanceTrackingRows([voeplCagr]);
  const moves = quarterGuidanceMoves(items, CURRENT, CURRENT);
  assert.equal(moves.raised, null);
  assert.ok(moves.lowered, "expected a lowered move");
  assert.equal(moves.loweredCount, 1);
  assert.match(moves.lowered!.from ?? "", /35-40%/);
  assert.match(moves.lowered!.to ?? "", /30-35%/);
});

test("quarters still sort ascending when the producer wrote them out of order", () => {
  const shuffled: GuidanceTrackingRow = { ...voeplCagr, id: 2, trail: [VOEPL_TRAIL[2], VOEPL_TRAIL[0], VOEPL_TRAIL[1]] };
  const [item] = normalizeGuidanceTrackingRows([shuffled]);
  assert.deepEqual(item.trail.map((s) => s.quarter), ["Q4 FY26", "Q2 FY27", "Q2 FY27"]);
  // Inside Q2 FY27 the producer's relative order (call revision, then deck) is kept.
  const q2 = item.trail.filter((s) => s.quarter === "Q2 FY27").map((s) => s.summary ?? "");
  assert.ok(q2[0].startsWith("MD: 30-35% over"));
  assert.ok(q2[1].startsWith("Nov 2026 deck"));
});
