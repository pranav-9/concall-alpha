// Valuation score → band classification + colours. Third sibling to
// score-band.ts (quarterly sentiment) and growth-band.ts (forward outlook), so
// the leaderboard's three score columns share one grammar: a number, and the
// band that number falls in, on one teal↔red ramp.
//
// SCALE. valuation_check stores an integer 0-100 (schemas/valuation_check_v1.json:
// "Higher = more attractively valued. Integer only; v14 calls half-points
// spurious precision."). The board divides by 10 so the column sits on the same
// 0-10 scale as ConcallScore and Growth — three cells in identical format, one of them
// silently on a 100-point scale, reads as a bug. Dividing by 10 adds no
// precision the stored integer didn't have: 64 -> 6.4.
//
// CUTS. The schema says the verdict "is read off the score, so 'the score must
// sit within the band assigned to the verdict' holds by construction" — but it
// doesn't publish the cuts. Derived empirically 2026-07-30 over all 109
// published+rateable rows, which partition cleanly and without overlap:
//
//     RICHLY PRICED  2-19   EXPENSIVE 25-38   FAIRLY VALUED 40-58
//     UNDERVALUED   60-79   DEEPLY UNDERVALUED  (none observed yet)
//
// i.e. fixed cuts at 20 / 40 / 60 / 80, or 2 / 4 / 6 / 8 rescaled. Verified
// against every live row: bandForValuationScore never disagrees with the stored
// verdict. That's what makes it safe to derive the label from the number here
// rather than render the stored string — the column behaves exactly like its two
// siblings, and cannot contradict the pipeline.
//
// Like score-band and growth-band, these are FIXED ABSOLUTE cuts, never
// percentiles of the cohort, so a "Fair" today means what it meant last quarter.

export type ValuationBandKey =
  | "deep_value"
  | "undervalued"
  | "fair"
  | "expensive"
  | "richly_priced";

export type ValuationBandDef = {
  key: ValuationBandKey;
  label: string;
  description: string;
  tone: string;
  barClass: string;
  textClass: string;
  borderClass: string;
  textOnBarClass: string;
  ringClass: string;
  chartHex: string;
};

// Palette deliberately mirrors score-band.ts position for position (teal-700 /
// teal-500 / amber-400 / orange-500 / red-600) so "cheap" reads the same green
// as "strong" and "richly priced" the same red as "bearish". The previous
// leaderboard cell used an emerald/amber/rose set that matched neither sibling.
export const VALUATION_BANDS: Record<ValuationBandKey, ValuationBandDef> = {
  deep_value: {
    key: "deep_value",
    label: "Deep value",
    description: "≥ 8.0",
    tone: "text-teal-400",
    barClass: "bg-teal-700",
    textClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-300/60 dark:border-teal-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-teal-300/50 dark:ring-teal-600/35",
    chartHex: "#0f766e",
  },
  undervalued: {
    key: "undervalued",
    label: "Undervalued",
    description: "6.0 – 7.9",
    tone: "text-teal-400",
    barClass: "bg-teal-500",
    textClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-300/60 dark:border-teal-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-teal-300/50 dark:ring-teal-600/35",
    chartHex: "#14b8a6",
  },
  fair: {
    key: "fair",
    label: "Fair",
    description: "4.0 – 5.9",
    tone: "text-amber-400",
    barClass: "bg-amber-400",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-300/60 dark:border-amber-700/40",
    textOnBarClass: "text-zinc-900",
    ringClass: "ring-amber-300/50 dark:ring-amber-600/35",
    chartHex: "#f59e0b",
  },
  expensive: {
    key: "expensive",
    label: "Expensive",
    description: "2.0 – 3.9",
    tone: "text-rose-400",
    barClass: "bg-orange-500",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-300/60 dark:border-orange-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-orange-300/50 dark:ring-orange-600/35",
    chartHex: "#f97316",
  },
  richly_priced: {
    key: "richly_priced",
    label: "Richly priced",
    description: "< 2.0",
    tone: "text-rose-400",
    barClass: "bg-red-600",
    textClass: "text-red-700 dark:text-red-300",
    borderClass: "border-red-300/60 dark:border-red-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-red-300/50 dark:ring-red-600/35",
    chartHex: "#dc2626",
  },
};

// Best (cheapest) -> worst. Legend / grouping order, matching its siblings.
export const VALUATION_BAND_ORDER: ValuationBandKey[] = [
  "deep_value",
  "undervalued",
  "fair",
  "expensive",
  "richly_priced",
];

/** Stored 0-100 integer -> the board's 0-10 scale. Null-safe. */
export function toValuationScale(
  storedScore: number | null | undefined,
): number | null {
  if (typeof storedScore !== "number" || !Number.isFinite(storedScore)) return null;
  return storedScore / 10;
}

/** Band for an ALREADY-RESCALED 0-10 score. Cuts at 8 / 6 / 4 / 2. */
export function bandForValuationScore(score: number): ValuationBandKey {
  if (score >= 8) return "deep_value";
  if (score >= 6) return "undervalued";
  if (score >= 4) return "fair";
  if (score >= 2) return "expensive";
  return "richly_priced";
}
