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
export const formatAbsoluteValue = (v: ValueFields): string | null => {
  if (v.valueKind === "percent" || v.valueKind === "percent_level") return null;
  if (v.valueKind === "absolute" && typeof v.numericValue === "number" && Number.isFinite(v.numericValue)) {
    const fromText = formatAbsoluteAmount(v.valueText);
    if (fromText) return fromText;
    const { symbol, suffix } = formatUnitParts(v.unit);
    return `${symbol}${fmtNum(v.numericValue)}${suffix}`;
  }
  if (!v.valueText || isReasoningProse(v.valueText)) return null;
  return formatAbsoluteAmount(v.valueText);
};

// The one-line "what they guided" label. Prefers the structured number; falls
// back to the verbatim phrasing ("mid-teens", "double-digit") trimmed.
export const formatGuidedValue = (v: ValueFields): string | null => {
  const structured = formatAbsoluteValue(v) ?? formatPercentValue(v);
  if (structured) return structured;
  // Short qualitative phrasing only ("mid-teens", "double-digit"); a long
  // sentence would just truncate into noise, so the cell shows "—" instead.
  if (!v.valueText || isReasoningProse(v.valueText)) return null;
  const t = v.valueText.trim();
  return t.length <= 16 ? t : null;
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

const unitKeyFromSchemaUnit = (unit: string | null): string | null => {
  const u = unit?.toLowerCase();
  if (!u) return null;
  if (u === "inrcr") return "cr";
  if (u === "usdmn" || u === "usdm") return "M";
  if (u === "usdbn" || u === "usdb") return "B";
  return u;
};

export const readNumericValue = (v: ValueFields): NumericValue | null => {
  // Percent axis — structured kind, or a legacy row with a % on it.
  if (v.valueKind === "percent" || v.valueKind === "percent_level" || (v.valueKind == null && v.valuePercent != null)) {
    const n = v.numericValue ?? v.valuePercent;
    const range = v.valueText?.match(/(\d+(?:\.\d+)?)\s*(?:%\s*)?(?:to|-|–|—)\s*(\d+(?:\.\d+)?)\s*%/i);
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
  // Absolute axis — structured number + unit first, then the verbatim text.
  if (v.valueKind === "absolute" && typeof v.numericValue === "number" && Number.isFinite(v.numericValue)) {
    const unitKey = unitKeyFromSchemaUnit(v.unit);
    if (!unitKey) return null;
    const matches = v.valueText ? [...v.valueText.matchAll(ABS_PATTERN)] : [];
    const m = matches[matches.length - 1];
    if (m && m[2]) {
      const lo = parseFloat(m[1].replace(/,/g, ""));
      const hi = parseFloat(m[2].replace(/,/g, ""));
      if (Number.isFinite(lo) && Number.isFinite(hi) && hi > lo && unitKeyFromToken(m[3]) === unitKey) {
        return { kind: "absolute", lo, hi, unitKey };
      }
    }
    return { kind: "absolute", lo: v.numericValue, hi: v.numericValue, unitKey };
  }
  if (v.valueText && !isReasoningProse(v.valueText)) {
    const matches = [...v.valueText.matchAll(ABS_PATTERN)];
    const m = matches[matches.length - 1];
    if (m) {
      const lo = parseFloat(m[1].replace(/,/g, ""));
      const hi = m[2] ? parseFloat(m[2].replace(/,/g, "")) : lo;
      if (Number.isFinite(lo) && Number.isFinite(hi)) {
        return { kind: "absolute", lo: Math.min(lo, hi), hi: Math.max(lo, hi), unitKey: unitKeyFromToken(m[3]) };
      }
    }
  }
  return null;
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
    const gap = guided.kind === "percent" ? `${fmtNum(d - guided.lo)} pts` : `${fmtNum(((d - guided.lo) / guided.lo) * 100)}%`;
    return { label: gap, sign: -1 };
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
