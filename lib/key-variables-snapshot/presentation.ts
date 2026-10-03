/**
 * Pure helpers behind the Key Variables deep card: how a metric name splits
 * into name + unit, how a first→latest change is worded per unit, and how
 * period labels shorten. Kept free of React and of "@/" value imports so the
 * node test runner can exercise them directly.
 */

export type UnitKind = "amount" | "days" | "multiple" | "bps" | "percent";

const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const integerFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const formatMetricNumber = (value: number) => numberFormatter.format(value);

export const asNumericValue = (value: string | number | null | undefined): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** "Order book (INR Cr)" → { name: "Order book", unit: "INR Cr" }. No parenthetical → unit null. */
export const splitMetricName = (metric: string): { name: string; unit: string | null } => {
  const match = metric.trim().match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!match) return { name: metric.trim(), unit: null };
  const name = match[1].trim() || metric.trim();
  const unit = match[2].trim();
  return { name, unit: unit || null };
};

export const classifyUnit = (unit: string | null | undefined): UnitKind => {
  const u = (unit ?? "").trim().toLowerCase();
  if (!u) return "amount";
  if (/\bday/.test(u)) return "days";
  if (/\bbps\b|basis point/.test(u)) return "bps";
  if (u === "x" || /\btimes\b|\bmultiple\b|^x\b|\bx$/.test(u)) return "multiple";
  if (u.includes("%") || /\bpercent|\bpct\b/.test(u)) return "percent";
  return "amount";
};

/** "₹ cr" → { prefix: "₹", suffix: "cr" }; "days" → { prefix: "", suffix: "days" }. */
export const splitUnitAffixes = (unit: string | null | undefined): { prefix: string; suffix: string } => {
  const raw = (unit ?? "").trim();
  if (!raw) return { prefix: "", suffix: "" };
  const currency = raw.match(/^(₹|\$|INR|Rs\.?)\s*/i);
  if (currency) {
    const symbol = /^(inr|rs)/i.test(currency[1]) ? "₹" : currency[1];
    const rest = raw.slice(currency[0].length).trim();
    const suffix = rest.toLowerCase() === "cr" || rest.toLowerCase() === "crore" ? "cr" : rest;
    return { prefix: symbol, suffix };
  }
  return { prefix: "", suffix: raw };
};

const signChar = (delta: number) => (delta > 0 ? "+" : delta < 0 ? "−" : "");

export type ChangeLabelStyle = "long" | "short";

/**
 * First-shown → latest change, worded per unit. Amounts move in %, days / x /
 * bps / % move in absolute terms. Returns null when either end is missing or a
 * % change would divide by zero. `delta` is always latest − first so the caller
 * can hand it to getThesisEffect.
 */
export const formatFirstToLatestChange = (
  first: number | null,
  latest: number | null,
  kind: UnitKind,
  style: ChangeLabelStyle = "short",
): { label: string; delta: number } | null => {
  if (first == null || latest == null) return null;
  const delta = latest - first;
  const sign = signChar(delta);
  const abs = Math.abs(delta);
  switch (kind) {
    case "amount": {
      if (first === 0) return null;
      const percent = (delta / Math.abs(first)) * 100;
      const magnitude = Math.abs(percent);
      const label = magnitude > 999 ? `${sign}999%+` : `${sign}${integerFormatter.format(magnitude)}%`;
      return { label, delta };
    }
    case "days":
      return { label: `${sign}${numberFormatter.format(abs)} ${style === "long" ? "days" : "d"}`, delta };
    case "multiple":
      return { label: `${sign}${numberFormatter.format(abs)}x`, delta };
    case "bps":
      return { label: `${sign}${numberFormatter.format(abs)} bps`, delta };
    case "percent":
      return { label: `${sign}${numberFormatter.format(abs)} pp`, delta };
  }
};

export const isQuarterPeriod = (period: string) => /^(Q[1-4]|H[12]|9M)\b/i.test(period.trim());
export const isYearPeriod = (period: string) => /^(FY|CY)\s?\d{2,4}$/i.test(period.trim());

/** "Q3 FY26" → "Q3"; "FY24" → "FY24". */
export const shortPeriodLabel = (period: string) => {
  const trimmed = period.trim();
  if (isQuarterPeriod(trimmed)) return trimmed.split(/\s+/)[0];
  return trimmed;
};

/** What the shown periods are, in words: "quarters" | "years" | "periods". */
export const periodNoun = (periods: string[], count: number): string => {
  if (periods.length > 0 && periods.every(isQuarterPeriod)) return count === 1 ? "qtr" : "qtrs";
  if (periods.length > 0 && periods.every(isYearPeriod)) return count === 1 ? "yr" : "yrs";
  return count === 1 ? "period" : "periods";
};

export const periodNounLong = (periods: string[]): string => {
  if (periods.length > 0 && periods.every(isQuarterPeriod)) return "quarters";
  if (periods.length > 0 && periods.every(isYearPeriod)) return "years";
  return "periods";
};

/** "Q3 FY26" → 26*4+2; null when the label is not a plain quarter. FY rolls over Q4 → Q1 of the next year. */
const quarterOrdinal = (period: string): number | null => {
  const m = period.trim().match(/^Q([1-4])\s*FY\s?(\d{2,4})$/i);
  return m ? (Number(m[2]) % 100) * 4 + Number(m[1]) - 1 : null;
};

const yearOrdinal = (period: string): number | null => {
  const m = period.trim().match(/^(?:FY|CY)\s?(\d{2,4})$/i);
  return m ? Number(m[1]) % 100 : null;
};

const isConsecutive = (ordinals: Array<number | null>) =>
  ordinals.every((o): o is number => o != null) && ordinals.slice(1).every((o, i) => o - ordinals[i] === 1);

/**
 * "▲ +34% · 2 qtrs" span suffix. Counts steps only when the shown periods are
 * consecutive quarters or consecutive fiscal years; otherwise it names the start
 * ("since Q3 FY24"), because call answers given years apart are not "2 qtrs".
 */
export const spanLabel = (shownPeriods: string[]) => {
  const steps = Math.max(shownPeriods.length - 1, 0);
  if (steps === 0) return null;
  if (isConsecutive(shownPeriods.map(quarterOrdinal))) return `${steps} ${steps === 1 ? "qtr" : "qtrs"}`;
  if (isConsecutive(shownPeriods.map(yearOrdinal))) return `${steps} ${steps === 1 ? "yr" : "yrs"}`;
  return `since ${shownPeriods[0].trim()}`;
};

export const firstSentence = (text: string): string => {
  const match = text.trim().match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
};

export const normalizeVariableName = (name: string) => name.trim().toLowerCase();

/* ------------------------------------------------------------------------ */
/* Hero trend (the deep card's area line)                                     */
/* ------------------------------------------------------------------------ */

/** "Q2 FY25" → "Q2'25"; "H1 FY26" → "H1'26"; "FY24" and anything else pass through. */
export const compactPeriodLabel = (period: string) => {
  const trimmed = period.trim();
  const match = trimmed.match(/^(\S+)\s+(?:FY|CY)\s?(?:\d{2})?(\d{2})$/i);
  return match ? `${match[1]}'${match[2]}` : trimmed;
};

/**
 * The hero's first → latest change. Same wording as formatFirstToLatestChange
 * ("long"), except an amount that has at least doubled reads as a multiple
 * ("2.1×") — "+110%" undersells a doubling and "+999%+" says nothing.
 */
export const formatTrendChange = (
  first: number | null,
  latest: number | null,
  kind: UnitKind,
): { label: string; delta: number } | null => {
  if (kind === "amount" && first != null && latest != null && first > 0 && latest / first >= 2) {
    const ratio = latest / first;
    const label = ratio >= 10 ? `${integerFormatter.format(ratio)}×` : `${ratio.toFixed(1)}×`;
    return { label, delta: latest - first };
  }
  return formatFirstToLatestChange(first, latest, kind, "long");
};

/** A point label on the trend: "₹860 cr" | "146 d" | "24.5%" | "1.7×". A long unit is dropped. */
export const formatValueWithUnit = (value: number, prefix: string, suffix: string) => {
  const number = `${prefix}${numberFormatter.format(value)}`;
  const unit = suffix.trim();
  const lower = unit.toLowerCase();
  if (!unit) return number;
  if (unit === "%") return `${number}%`;
  if (lower === "x" || lower === "times") return `${number}×`;
  if (lower === "days" || lower === "day") return `${number} d`;
  return unit.length > 6 ? number : `${number} ${unit}`;
};

export type TrendPoint = { index: number; period: string; value: number; x: number; y: number };

export type TrendGeometry = {
  /** Non-null points, x and y in 0–100 (y measured from the top). */
  points: TrendPoint[];
  /** x for every period, so the axis labels line up with the points. */
  periodX: number[];
  guideY: number | null;
  /** Where the guide label sits clear of the line: the point furthest on the other side. */
  guideLabel: { x: number; side: "above" | "below" } | null;
};

/**
 * Geometry for the hero trend. The y-domain is padded below the lowest value
 * (the line is a shape-of-change read, not a zero-based bar) and above the
 * highest, so the end labels have room. Null when fewer than two values plot.
 */
export const buildTrendGeometry = (
  periods: string[],
  values: Array<number | null>,
  guideValue: number | null = null,
): TrendGeometry | null => {
  const plotted = values
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value != null);
  if (plotted.length < 2 || periods.length < 2) return null;

  const all = plotted.map((entry) => entry.value).concat(guideValue != null ? [guideValue] : []);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const range = hi - lo || Math.abs(hi) || 1;
  const domainLo = lo - range * 0.3;
  const domainHi = hi + range * 0.3;
  const xFor = (index: number) => (index / (periods.length - 1)) * 100;
  const yFor = (value: number) => (1 - (value - domainLo) / (domainHi - domainLo)) * 100;

  const points = plotted.map(({ value, index }) => ({
    index,
    period: periods[index],
    value,
    x: xFor(index),
    y: yFor(value),
  }));

  let guideLabel: TrendGeometry["guideLabel"] = null;
  if (guideValue != null) {
    const inner = points.length > 2 ? points.slice(1, -1) : points;
    const below = inner.reduce((best, point) => (point.value < best.value ? point : best), inner[0]);
    const above = inner.reduce((best, point) => (point.value > best.value ? point : best), inner[0]);
    guideLabel =
      below.value < guideValue || above.value <= guideValue
        ? { x: below.x, side: "above" }
        : { x: above.x, side: "below" };
  }

  return {
    points,
    periodX: periods.map((_, index) => xFor(index)),
    guideY: guideValue != null ? yFor(guideValue) : null,
    guideLabel,
  };
};
