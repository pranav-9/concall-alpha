// Single source of truth for the platform-wide score -> sentiment band classification
// AND its colours. Consumed by: the score circle (ConcallScore via categoryFor), charts
// (chartColorFor), the Q4 FY26 tracker (bars), and the company-page verdict title (tone).
// One vocabulary + one colour system everywhere.
//
// FIXED absolute cuts anchored on 5.5 = typical (all-neutral leans); "Strongly Bullish"
// at >=8 (the realized ceiling is ~9). Deliberately NOT percentile-of-cohort — bands must
// be stable over time and comparable across companies. Recut 2026-05-25.
//
// 2026-05-25b: the old "Mildly Bullish" (6.5-7.9) caught most of a quality-tilted cohort,
// so it was split at a fixed 7.0 into "Bullish" (7.0-7.9) and "Mildly Bullish" (6.5-6.9).
// The cut is semantic (7+ = a clearly strong quarter), not cohort-balanced. This makes the
// scale intentionally asymmetric (3 bullish tiers, 2 bearish) — the universe is right-skewed
// and the bearish side is near-empty today; mirror it only when bearish names accumulate.

export type BandKey =
  | "strongly_bullish"
  | "bullish"
  | "mildly_bullish"
  | "neutral"
  | "mildly_bearish"
  | "strongly_bearish"
  | "upcoming"; // not a score band — the "not yet reported" state (Q4 tracker)

export type BandDef = {
  key: BandKey;
  label: string;
  description: string;
  tone: string; // text colour for the company-page verdict title
  barClass: string; // solid fill — bars (Q4 tracker) and the score circle
  textClass: string; // band-coloured text on a neutral surface (group headers)
  borderClass: string;
  textOnBarClass: string; // text colour ON the solid fill (circle / bar badge)
  ringClass: string; // ring for the score circle
  chartHex: string; // hex for chart points/lines
};

export const BANDS: Record<BandKey, BandDef> = {
  strongly_bullish: {
    key: "strongly_bullish",
    label: "Strongly Bullish",
    description: "≥ 8.0",
    tone: "text-emerald-400",
    barClass: "bg-emerald-600",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-300/60 dark:border-emerald-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-emerald-300/50 dark:ring-emerald-600/35",
    chartHex: "#059669",
  },
  bullish: {
    key: "bullish",
    label: "Bullish",
    description: "7.0 – 7.9",
    tone: "text-green-400",
    barClass: "bg-green-500",
    textClass: "text-green-700 dark:text-green-300",
    borderClass: "border-green-300/60 dark:border-green-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-green-300/50 dark:ring-green-600/35",
    chartHex: "#22c55e",
  },
  mildly_bullish: {
    key: "mildly_bullish",
    label: "Mildly Bullish",
    description: "6.5 – 6.9",
    tone: "text-lime-400",
    barClass: "bg-lime-500",
    textClass: "text-lime-700 dark:text-lime-300",
    borderClass: "border-lime-300/60 dark:border-lime-700/40",
    textOnBarClass: "text-zinc-900",
    ringClass: "ring-lime-300/50 dark:ring-lime-600/35",
    chartHex: "#84cc16",
  },
  neutral: {
    key: "neutral",
    label: "Neutral / Balanced",
    description: "4.5 – 6.4",
    tone: "text-amber-400",
    barClass: "bg-amber-400",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-300/60 dark:border-amber-700/40",
    textOnBarClass: "text-zinc-900",
    ringClass: "ring-amber-300/50 dark:ring-amber-600/35",
    chartHex: "#f59e0b",
  },
  mildly_bearish: {
    key: "mildly_bearish",
    label: "Mildly Bearish",
    description: "3.0 – 4.4",
    tone: "text-rose-400",
    barClass: "bg-orange-500",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-300/60 dark:border-orange-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-orange-300/50 dark:ring-orange-600/35",
    chartHex: "#f97316",
  },
  strongly_bearish: {
    key: "strongly_bearish",
    label: "Strongly Bearish",
    description: "< 3.0",
    tone: "text-rose-400",
    barClass: "bg-red-600",
    textClass: "text-red-700 dark:text-red-300",
    borderClass: "border-red-300/60 dark:border-red-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-red-300/50 dark:ring-red-600/35",
    chartHex: "#dc2626",
  },
  upcoming: {
    key: "upcoming",
    label: "Upcoming",
    description: "Not yet reported",
    tone: "text-muted-foreground",
    barClass: "bg-zinc-300 dark:bg-zinc-700",
    textClass: "text-zinc-700 dark:text-zinc-300",
    borderClass: "border-zinc-300/60 dark:border-zinc-700/40",
    textOnBarClass: "text-zinc-900 dark:text-zinc-100",
    ringClass: "ring-zinc-300/50 dark:ring-zinc-600/35",
    chartHex: "#a1a1aa",
  },
};

// Best -> worst, then the not-reported state. Used for grouping/legend ordering.
export const SCORE_BAND_ORDER: BandKey[] = [
  "strongly_bullish",
  "bullish",
  "mildly_bullish",
  "neutral",
  "mildly_bearish",
  "strongly_bearish",
  "upcoming",
];

// Score -> band. FIXED cuts (>=8 / 7 / 6.5 / 4.5 / 3). Never returns "upcoming".
export function bandForScore(score: number): Exclude<BandKey, "upcoming"> {
  if (score >= 8) return "strongly_bullish";
  if (score >= 7) return "bullish";
  if (score >= 6.5) return "mildly_bullish";
  if (score >= 4.5) return "neutral";
  if (score >= 3) return "mildly_bearish";
  return "strongly_bearish";
}
