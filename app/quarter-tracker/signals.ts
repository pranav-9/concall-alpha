// What a company's quarter changed, for the tracker board's two reading
// columns — PURE: no Supabase, no React, so tests/quarter-tracker-signals.test.ts
// can pin it.
//
//   Guidance  — a live commitment management RAISED or LOWERED on this
//               quarter's call. The same "Raised" / "Lowered" call the Guidance
//               tab prints (buildGuidanceVerdict → liveStateKey), narrowed to
//               moves dated to the quarter in season and to from → to values
//               that read as that move on their own (the scanner's legibility
//               rule: same unit, under 3×), because at the top of a season
//               board a mislabelled number is the headline.
//   Key variables · YoY — the deep-tracked key variables' lead metric, this
//               quarter against the same quarter a year ago, coloured by its
//               effect on the case (getThesisEffect), never by sign. Only when
//               the snapshot carries BOTH quarters — a stale snapshot shows
//               nothing rather than last quarter's number under this one.
//
// Nothing here is written by hand per company; every word restates a row.

import { getThesisEffect } from "@/app/company/components/thesis-effect";
import type { NormalizedGuidanceItem } from "@/lib/guidance-tracking/types";
import {
  buildGuidanceVerdict,
  commitmentCoreLabel,
  liveStateKey,
  type LiveRow,
} from "@/lib/guidance-tracking/verdict";
import { buildLeadMetric } from "@/lib/key-variables-snapshot/lead-metric";
import {
  asNumericValue,
  classifyUnit,
  formatMetricNumber,
  splitMetricName,
} from "@/lib/key-variables-snapshot/presentation";
import type { NormalizedKeyVariablesSnapshot, ThesisEffect } from "@/lib/key-variables-snapshot/types";
import { MAX_RAISE_MULTIPLE, parseValueLabel } from "@/lib/scanners/guidance-upgrades";

export type QuarterRef = { fy: number; qtr: number };

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

/**
 * "Q2 FY27" | "Q2FY27" | "Q2 FY'27" | "FY27 Q2" | "Q2 FY2027" → {fy: 2027, qtr: 2}.
 * Anything else (FY26, H1 FY27, 9M FY26, prose) → null.
 */
export function parseQuarterPeriod(period: string | null | undefined): QuarterRef | null {
  if (!period) return null;
  const s = period.trim();
  const qFirst = s.match(/^Q\s*([1-4])\s*[-\s]?\s*FY\s*'?\s*(\d{2}|\d{4})$/i);
  const fyFirst = s.match(/^FY\s*'?\s*(\d{2}|\d{4})\s*[-\s]?\s*Q\s*([1-4])$/i);
  const qtr = qFirst ? qFirst[1] : fyFirst ? fyFirst[2] : null;
  const digits = qFirst ? qFirst[2] : fyFirst ? fyFirst[1] : null;
  if (!qtr || !digits) return null;
  const n = parseInt(digits, 10);
  return { fy: digits.length === 2 ? 2000 + n : n, qtr: parseInt(qtr, 10) };
}

const sameQuarter = (a: QuarterRef | null, b: QuarterRef) => a != null && a.fy === b.fy && a.qtr === b.qtr;

// ---------------------------------------------------------------------------
// Guidance moves
// ---------------------------------------------------------------------------

export type GuidanceMove = {
  direction: "raised" | "lowered";
  /** "FY27 EBITDA margin" — horizon first, the way a desk says it. */
  label: string;
  from: string;
  to: string;
};

export type QuarterGuidance = {
  /** The most material legible raise made on this quarter's call. */
  raised: GuidanceMove | null;
  lowered: GuidanceMove | null;
  raisedCount: number;
  loweredCount: number;
};

/** A horizon that names a period ("FY27", "Q4 FY27", "FY28–FY31"), not prose ("Ongoing", "standing band, no date"). */
const PERIOD_HORIZON = /^(?:[QH][1-4]\s*)?(?:FY|CY)\s?'?\d{2}(?:\s*[–-]\s*(?:FY|CY)?\s?'?\d{2})?$/i;

/**
 * Horizon first, metric in its mid-sentence form: "FY27 revenue growth",
 * "FY28 Defence EBITDA margin". A prose horizon is left off rather than
 * glued onto the metric; the bare core label then leads with a capital.
 */
export function moveLabel(item: NormalizedGuidanceItem): string {
  const horizon = item.horizonLabel?.trim();
  if (!horizon || !PERIOD_HORIZON.test(horizon)) return commitmentCoreLabel(item);
  const mid = item.metricLabelMidSentence ?? item.metricLabel;
  const core = mid ? (item.segment ? `${item.segment} ${mid}` : mid) : commitmentCoreLabel(item);
  return `${horizon} ${core}`;
}

/** The printed from → to values, on their own, show a believable move in `direction`. */
export function isLegibleMove(from: string | null, to: string, direction: "raised" | "lowered"): boolean {
  const a = parseValueLabel(from);
  const b = parseValueLabel(to);
  if (!a || !b || a.unit !== b.unit || a.mid <= 0 || b.mid <= 0) return false;
  return direction === "raised"
    ? b.mid > a.mid && b.mid / a.mid <= MAX_RAISE_MULTIPLE
    : b.mid < a.mid && a.mid / b.mid <= MAX_RAISE_MULTIPLE;
}

/** The last step that moved, when it moved in `direction` on the target quarter's call. */
function moveOf(row: LiveRow, direction: "raised" | "lowered", target: QuarterRef): GuidanceMove | null {
  let i = row.trail.length - 1;
  while (i >= 0 && !row.trail[i].direction) i -= 1;
  if (i < 1) return null;
  const step = row.trail[i];
  if (step.direction !== (direction === "raised" ? "up" : "down")) return null;
  if (!sameQuarter(parseQuarterPeriod(step.quarter), target)) return null;
  const from = row.trail[i - 1].label;
  if (!isLegibleMove(from, step.label, direction)) return null;
  return { direction, label: moveLabel(row.item), from, to: step.label };
}

/**
 * Raises and cuts made on the `target` quarter's call. `current` anchors the
 * live/resolved split exactly as the Guidance tab does (the reporting quarter
 * in season). Live rows arrive materiality-ranked, so the first legible move
 * each way is the one shown.
 */
export function quarterGuidanceMoves(
  items: NormalizedGuidanceItem[],
  current: QuarterRef & { label: string },
  target: QuarterRef,
): QuarterGuidance {
  const out: QuarterGuidance = { raised: null, lowered: null, raisedCount: 0, loweredCount: 0 };
  if (items.length === 0) return out;
  const verdict = buildGuidanceVerdict(items, current);
  for (const row of verdict.live) {
    const key = liveStateKey(row);
    if (key !== "raised" && key !== "lowered") continue;
    const move = moveOf(row, key, target);
    if (!move) continue;
    if (key === "raised") {
      out.raisedCount += 1;
      out.raised ??= move;
    } else {
      out.loweredCount += 1;
      out.lowered ??= move;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Key variables, year on year
// ---------------------------------------------------------------------------

export const MAX_KV_YOY = 3;

export type KeyVariableYoy = {
  /** The lead metric's name: "Marketing spend", "Working-capital days". */
  name: string;
  /** The deep card's variable, for the tooltip. */
  variable: string;
  /** "19.9%" | "₹758" | "75" */
  from: string;
  /** "21.8%" | "₹849 cr" | "66 days" */
  to: string;
  /** "+190 bps" | "+12%" | "−0.3x"; null when a % change would divide by zero. */
  change: string | null;
  effect: ThesisEffect;
};

const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");

/** A percentage moves in bps under 5 points, in points from there; amounts and days move in %. */
export function formatYoyChange(from: number, to: number, unit: string | null): string | null {
  const delta = to - from;
  const kind = classifyUnit(unit);
  if (kind === "percent") {
    const pp = Math.abs(delta);
    return pp < 5 ? `${sign(delta)}${Math.round(pp * 100)} bps` : `${sign(delta)}${formatMetricNumber(Math.round(pp * 10) / 10)} pp`;
  }
  if (kind === "bps") return `${sign(delta)}${formatMetricNumber(Math.abs(delta))} bps`;
  if (kind === "multiple") return `${sign(delta)}${formatMetricNumber(Math.abs(delta))}x`;
  if (from <= 0) return null;
  const pct = (delta / from) * 100;
  if (Math.abs(pct) >= 1000) return `${sign(delta)}${formatMetricNumber(Math.round(to / from))}×`;
  return `${sign(delta)}${Math.round(Math.abs(pct))}%`;
}

/** The two ends of a YoY reading. The unit rides the latest value only, except % and a currency sign. */
export function formatYoyValues(
  from: number,
  to: number,
  prefix: string,
  suffix: string,
): { from: string; to: string } {
  const unit = suffix.trim();
  const lower = unit.toLowerCase();
  const n = (v: number) => `${prefix}${formatMetricNumber(v)}`;
  if (unit === "%") return { from: `${n(from)}%`, to: `${n(to)}%` };
  if (lower === "x" || lower === "times") return { from: `${n(from)}×`, to: `${n(to)}×` };
  // A long unit ("lakh hours a year") is dropped: the metric's name already says it.
  const tail = unit && unit.length <= 8 ? ` ${lower === "cr" || lower === "crore" ? "Cr" : unit}` : "";
  return { from: n(from), to: `${n(to)}${tail}` };
}

/** The value a row holds for `q`, matching any spelling of the period. */
function valueAt(valuesByPeriod: Record<string, string | number | null>, q: QuarterRef): number | null {
  for (const [period, value] of Object.entries(valuesByPeriod)) {
    if (sameQuarter(parseQuarterPeriod(period), q)) return asNumericValue(value);
  }
  return null;
}

/**
 * Up to `max` deep-tracked key variables whose lead metric holds both `target`
 * and the same quarter a year earlier, in the snapshot's own ranked order.
 */
export function keyVariablesYoy(
  snapshot: NormalizedKeyVariablesSnapshot | null | undefined,
  target: QuarterRef,
  max = MAX_KV_YOY,
): KeyVariableYoy[] {
  if (!snapshot) return [];
  const yearAgo = { fy: target.fy - 1, qtr: target.qtr };
  const out: KeyVariableYoy[] = [];
  for (const item of snapshot.deepTreatment) {
    if (out.length >= max) break;
    const lead = buildLeadMetric(item);
    if (!lead) continue;
    const to = valueAt(lead.row.valuesByPeriod, target);
    const from = valueAt(lead.row.valuesByPeriod, yearAgo);
    if (to == null || from == null) continue;
    const unit = item.leadUnit ?? splitMetricName(lead.row.metric).unit;
    const values = formatYoyValues(from, to, lead.unitPrefix, lead.unitSuffix);
    const direction = item.metricDirections?.[lead.row.metric] ?? "higher_is_better";
    out.push({
      name: lead.name,
      variable: item.variable,
      from: values.from,
      to: values.to,
      change: formatYoyChange(from, to, unit),
      effect: getThesisEffect(to - from, direction),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per company
// ---------------------------------------------------------------------------

export type QuarterSignals = {
  guidance: QuarterGuidance | null;
  keyVariables: KeyVariableYoy[];
};

export const EMPTY_SIGNALS: QuarterSignals = { guidance: null, keyVariables: [] };
