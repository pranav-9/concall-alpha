// Display formatters for guidance values. Pure, no React — shared by the
// Guidance section, the verdict derivation (lib/guidance-tracking/verdict.ts)
// and tests. Everything here reads the v2 schema value shape
// (value_kind + numeric_value + unit, with value_text as the verbatim
// fallback) — see schemas/guidance_snapshot_v2.json.

import {
  extractPercentRange,
  formatAbsoluteAmount,
  isReasoningProse,
} from "./normalize";
import { qualitativeTargetChip } from "./target-chip";
import type { GuidanceValueKind } from "./types";

// Both NormalizedGuidanceItem and NormalizedGuidanceTrailItem carry the same
// value-shape fields, so formatters are written against this projection.
export type ValueFields = {
  valuePercent: number | null;
  valueText: string | null;
  valueKind: GuidanceValueKind;
  numericValue: number | null;
  unit: string | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmtNum = (n: number) => {
  const r = round1(n);
  return Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1);
};

// "INRcr" → ₹ … cr, "USDmn" → $ … M. Caller assembles symbol+number+suffix.
export const formatUnitParts = (unit: string | null): { symbol: string; suffix: string } => {
  if (!unit) return { symbol: "", suffix: "" };
  const u = unit.toLowerCase();
  if (u === "inrcr") return { symbol: "₹", suffix: " cr" };
  if (u === "inrlakh" || u === "inrlakhs") return { symbol: "₹", suffix: " L" };
  if (u === "inr") return { symbol: "₹", suffix: "" };
  if (u === "usdmn" || u === "usdm") return { symbol: "$", suffix: "M" };
  if (u === "usdbn" || u === "usdb") return { symbol: "$", suffix: "B" };
  if (u === "usd") return { symbol: "$", suffix: "" };
  if (u === "bps") return { symbol: "", suffix: " bps" };
  return { symbol: "", suffix: ` ${unit}` };
};

// A percent read of the value: the verbatim range when management quoted a
// band ("20-25%"), else the midpoint. Null when the value is absolute or
// qualitative-only.
// A quoted band is only trusted when the structured number sits inside it —
// "30%, plus/minus 1% to 2%" would otherwise read as "1-2%".
const rangeAgreesWithNumber = (range: string | null, n: number | null): boolean => {
  if (!range) return false;
  if (n == null) return true;
  const m = range.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)%$/);
  if (!m) return false;
  const lo = parseFloat(m[1]);
  const hi = parseFloat(m[2]);
  return n >= lo - 0.01 && n <= hi + 0.01;
};

export const formatPercentValue = (v: ValueFields): string | null => {
  if (v.valueKind === "absolute") return null;
  const n =
    v.valueKind === "percent" || v.valueKind === "percent_level"
      ? (v.numericValue ?? v.valuePercent)
      : v.valuePercent;
  const range = extractPercentRange(v.valueText);
  if (rangeAgreesWithNumber(range, n)) return range;
  if (typeof n === "number" && Number.isFinite(n)) return `${fmtNum(n)}%`;
  return null;
};

// An absolute read of the value ("₹850 cr", "$100M"). Null when the value is a
// percent or qualitative-only.
//
// The label and readNumericValue must describe the SAME figure — both come from
// resolveAbsolute below. The value trail prints the label and compares the
// number, so a label from one amount in the text over a number from another
// prints a fake move: RATNAVEER's "Rs 200 cr value-added within 1,500 cr"
// (stored 200) printed "₹1500cr", and SHREEREF's text-only "Turnover 1000Cr.,
// PAT 120 Cr." read as ₹120cr on a revenue thread — two fake "Raised" chips on
// 2026-10-06.
export const formatAbsoluteValue = (v: ValueFields): string | null => resolveAbsolute(v)?.label ?? null;

// The one-line "what they guided" label. Prefers the structured number; falls
// back to the verbatim qualitative phrasing ("mid-teens", "double-digit").
// Long phrases drop the chip rather than truncate into a meaningless
// fragment — see lib/guidance-tracking/target-chip.ts (landed independently
// on main while this module was in review; adopted here instead of keeping
// a second, slightly different cutoff).
export const formatGuidedValue = (v: ValueFields): string | null => {
  const structured = formatAbsoluteValue(v) ?? formatPercentValue(v);
  if (structured) return structured;
  if (!v.valueText || isReasoningProse(v.valueText)) return null;
  return qualitativeTargetChip(v.valueText);
};

// A numeric reading of the value for comparison. `kind` says which axis it
// sits on so we never compare a % to a ₹ amount. Ranges carry lo/hi.
export type NumericValue =
  | { kind: "percent"; lo: number; hi: number; unitKey: "pct" }
  | { kind: "absolute"; lo: number; hi: number; unitKey: string };

const ABS_PATTERN =
  /(\d+(?:,\d+)*(?:\.\d+)?)(?:\s*(?:to|-|–)\s*(\d+(?:,\d+)*(?:\.\d+)?))?(?:[^\d\n]{0,15}?)(crore|cr\b|bn\b|billion|mn\b|million)/gi;

const unitKeyFromToken = (token: string) => {
  const t = token.toLowerCase();
  if (t.startsWith("cr")) return "cr";
  if (/bn|billion/.test(t)) return "B";
  return "M";
};

// Producers spell the same unit several ways ("INRcr", "INR_cr", "INR crore",
// "Rs cr"); all of them have to land on the text tokens' keys or no amount in
// the text can ever be matched to the stored number.
// Millions and billions carry their currency in the key ("₹M" vs "$M"), so a
// rupee figure is never compared with a dollar one (AIMTRON "₹25-30M → $30M"
// read as a raise). Crore is always rupees: plain "cr".
const unitKeyFromSchemaUnit = (unit: string | null): string | null => {
  const u = unit?.toLowerCase().replace(/[\s_.]/g, "");
  if (!u) return null;
  const currency = /^(?:inr|rs|₹)/.test(u) ? "₹" : "$";
  const body = u.replace(/^(?:inr|rs|usd|\$|₹)/, "");
  if (/^(?:cr|crores?)$/.test(body)) return "cr";
  if (/^(?:mn|m|million)$/.test(body)) return `${currency}M`;
  if (/^(?:bn|b|billion)$/.test(body)) return `${currency}B`;
  return u;
};

// Converting a text amount into the stored unit: ₹19 billion = ₹1,900 cr.
const UNIT_FACTOR: Record<string, number> = {
  "₹B>cr": 100,
  "₹M>cr": 0.1,
  "cr>₹B": 0.01,
  "cr>₹M": 10,
  "₹B>₹M": 1000,
  "₹M>₹B": 0.001,
  "$B>$M": 1000,
  "$M>$B": 0.001,
};
const unitFactor = (from: string, to: string): number | null => (from === to ? 1 : (UNIT_FACTOR[`${from}>${to}`] ?? null));

// `index` = position among ABS_PATTERN's matches (formatAbsoluteAmount uses the same pattern).
type AmountMatch = { lo: number; hi: number; unitKey: string; index: number };

// The currency a text's amounts are in — formatAbsoluteAmount's own symbol rule,
// so the key always agrees with the symbol the label prints.
const textCurrency = (text: string, token: string): "₹" | "$" =>
  /(INR|Rs\.?|₹)/i.test(text) ? "₹" : /\$|USD|dollar/i.test(text) ? "$" : token.toLowerCase().startsWith("cr") ? "₹" : "$";

const amountMatches = (text: string | null): AmountMatch[] =>
  text
    ? [...text.matchAll(ABS_PATTERN)]
        .map((m, index) => {
          const lo = parseFloat(m[1].replace(/,/g, ""));
          const hi = m[2] ? parseFloat(m[2].replace(/,/g, "")) : lo;
          const scale = unitKeyFromToken(m[3]);
          const unitKey = scale === "cr" ? "cr" : `${textCurrency(text, m[3])}${scale}`;
          return { lo: Math.min(lo, hi), hi: Math.max(lo, hi), unitKey, index };
        })
        .filter((m) => Number.isFinite(m.lo) && Number.isFinite(m.hi))
    : [];

/** `m` re-expressed in `unitKey` (lo/hi converted), or null when the units can't be converted. */
const inUnit = (m: AmountMatch, unitKey: string): AmountMatch | null => {
  const f = unitFactor(m.unitKey, unitKey);
  return f == null ? null : { ...m, lo: m.lo * f, hi: m.hi * f, unitKey };
};

/** The amount in the text that IS the stored number (in the stored unit; equal, or a band containing it). */
const amountMatchingNumber = (text: string | null, n: number, unitKey: string): AmountMatch | null => {
  const tol = (x: number) => Math.max(0.011, Math.abs(x) * 0.005);
  const hits = amountMatches(text)
    .map((m) => inUnit(m, unitKey))
    .filter((m): m is AmountMatch => m != null && n >= m.lo - tol(m.lo) && n <= m.hi + tol(m.hi));
  return hits[hits.length - 1] ?? null;
};

// Two different lines of the P&L (or a P&L line and capacity) named in one
// text: "Turnover 1000Cr., PAT 120 Cr.". With no stored number to say which
// amount the value is, guessing the last one reads the wrong line.
const LINE_WORDS: [string, RegExp][] = [
  ["revenue", /\b(?:turnover|revenues?|sales|top[- ]?line)\b/i],
  ["profit", /\b(?:pat|pbt|net profit|profit after tax)\b/i],
  ["ebitda", /\b(?:ebitda|operating profit)\b/i],
  ["capacity", /\b(?:capacity|capex|investment|order ?book)\b/i],
];
const namesSeveralLines = (text: string): boolean => {
  const distinct = new Set(amountMatches(text).map((m) => `${m.lo}-${m.hi}-${m.unitKey}`));
  return distinct.size >= 2 && LINE_WORDS.filter(([, re]) => re.test(text)).length >= 2;
};

/**
 * The absolute-axis reading of a value — its label AND its number, decided
 * together so the value trail never prints one figure over another. Null when
 * the value is not on the absolute axis (a percent kind, or a legacy number in
 * valuePercent). `value_text` is the schema's source of truth, so:
 *   1. an amount in the text that IS the stored number (after cr/B/M
 *      conversion) is the reading — its own phrasing, its band;
 *   2. otherwise, if the text states amounts, the text wins over the stored
 *      number (a stored figure no sentence supports is a producer slip) — the
 *      last amount, as revision sequences end on the current target — unless
 *      the text names two different lines, where any pick is a guess: nothing;
 *   3. only a text with no amounts at all falls back to the stored number.
 */
const resolveAbsolute = (v: ValueFields): { label: string | null; numeric: NumericValue | null } | null => {
  if (v.valueKind === "percent" || v.valueKind === "percent_level") return null;
  if (v.valueKind == null && v.valuePercent != null) return null;
  const text = v.valueText && !isReasoningProse(v.valueText) ? v.valueText : null;
  const typed = v.valueKind === "absolute" && typeof v.numericValue === "number" && Number.isFinite(v.numericValue);
  const unitKey = typed ? unitKeyFromSchemaUnit(v.unit) : null;

  if (typed && unitKey) {
    const match = amountMatchingNumber(text, v.numericValue as number, unitKey);
    if (match) {
      return {
        label: formatAbsoluteAmount(text, match.index),
        numeric: { kind: "absolute", lo: match.lo, hi: match.hi, unitKey },
      };
    }
  }
  const amounts = amountMatches(text);
  if (text && amounts.length > 0) {
    if (namesSeveralLines(text)) return { label: null, numeric: null };
    const last = amounts[amounts.length - 1];
    const asStored = unitKey ? inUnit(last, unitKey) : null;
    const m = asStored ?? last;
    return { label: formatAbsoluteAmount(text), numeric: { kind: "absolute", lo: m.lo, hi: m.hi, unitKey: m.unitKey } };
  }
  if (typed) {
    const { symbol, suffix } = formatUnitParts(v.unit);
    const n = v.numericValue as number;
    return {
      label: `${symbol}${fmtNum(n)}${suffix}`,
      numeric: unitKey ? { kind: "absolute", lo: n, hi: n, unitKey } : null,
    };
  }
  return { label: null, numeric: null };
};

export const readNumericValue = (v: ValueFields): NumericValue | null => {
  // Percent axis — structured kind, or a legacy row with a % on it.
  if (v.valueKind === "percent" || v.valueKind === "percent_level" || (v.valueKind == null && v.valuePercent != null)) {
    const n = v.numericValue ?? v.valuePercent;
    // Reuses extractPercentRange's own pattern rather than a second copy of
    // it (ship-workflow specialist review, 2026-09-06).
    const rangeText = extractPercentRange(v.valueText);
    const range = rangeText?.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)%$/);
    if (range) {
      const lo = parseFloat(range[1]);
      const hi = parseFloat(range[2]);
      const agrees = n == null || (n >= lo - 0.01 && n <= hi + 0.01);
      if (Number.isFinite(lo) && Number.isFinite(hi) && hi > lo && agrees) {
        return { kind: "percent", lo, hi, unitKey: "pct" };
      }
    }
    if (typeof n === "number" && Number.isFinite(n)) return { kind: "percent", lo: n, hi: n, unitKey: "pct" };
    return null;
  }
  // Absolute axis — the same reading formatAbsoluteValue labels.
  return resolveAbsolute(v)?.numeric ?? null;
};

// Delivered-vs-guided, only when both sit on the same axis. Percent axes
// report a point gap ("+3 pts"); absolute axes report a relative gap ("+6%").
// A guided RANGE reports "beat" / "in range" / the shortfall to the floor.
export const formatDelta = (
  guided: NumericValue | null,
  delivered: NumericValue | null,
): { label: string; sign: -1 | 0 | 1 } | null => {
  if (!guided || !delivered) return null;
  if (guided.kind !== delivered.kind || guided.unitKey !== delivered.unitKey) return null;
  const d = delivered.lo === delivered.hi ? delivered.lo : (delivered.lo + delivered.hi) / 2;
  const isRange = guided.hi > guided.lo;
  if (isRange) {
    if (d > guided.hi) return { label: "beat", sign: 1 };
    if (d >= guided.lo) return { label: "in range", sign: 0 };
    if (guided.kind === "percent") return { label: `${fmtNum(d - guided.lo)} pts`, sign: -1 };
    // Absolute range with a zero floor (e.g. "0 to 50 crore") can't drive a
    // percentage-of-floor gap — same defensive guard as the point-value
    // branch below (ship-workflow specialist review, 2026-09-06).
    if (guided.lo === 0) return null;
    return { label: `${fmtNum(((d - guided.lo) / guided.lo) * 100)}%`, sign: -1 };
  }
  const g = guided.lo;
  if (guided.kind === "percent") {
    const pts = round1(d - g);
    if (pts === 0) return { label: "on the number", sign: 0 };
    return { label: `${pts > 0 ? "+" : ""}${fmtNum(pts)} pts`, sign: pts > 0 ? 1 : -1 };
  }
  if (g === 0) return null;
  const pct = round1(((d - g) / g) * 100);
  if (pct === 0) return { label: "on the number", sign: 0 };
  return { label: `${pct > 0 ? "+" : ""}${fmtNum(pct)}%`, sign: pct > 0 ? 1 : -1 };
};

// Growth-rate percents read with a sign ("+30%"); levels and absolutes don't.
export const withGrowthSign = (label: string | null, isGrowthRate: boolean): string | null => {
  if (!label) return null;
  if (!isGrowthSign(label) || !isGrowthRate) return label;
  return /^\d/.test(label) ? `+${label}` : label;
};
const isGrowthSign = (label: string) => /%$/.test(label);
