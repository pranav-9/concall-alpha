// Growth-specific score → band classification + colours. Sibling to score-band.ts
// (Quarterly / sentiment bands). Kept separate because the Growth Score is a
// forward outlook, not a sentiment read — and the observed distribution lives in
// a much tighter window (~6.6–8.7 today) than Quarterly, so sentiment bands
// collapsed 97% of companies into 2 buckets.
//
// FIXED absolute cuts (not percentile-of-cohort) so labels stay stable over
// time and comparable across companies, matching score-band.ts's philosophy.
// Palette mirrors the teal ramp from score-band so growth and quarterly badges
// share a visual identity; "Weak" reuses the bearish red since a sub-6.5 growth
// score does signal real concern.

export type GrowthBandKey =
  | "exceptional"
  | "strong"
  | "solid"
  | "moderate"
  | "soft"
  | "weak";

export type GrowthBandDef = {
  key: GrowthBandKey;
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

export const GROWTH_BANDS: Record<GrowthBandKey, GrowthBandDef> = {
  exceptional: {
    key: "exceptional",
    label: "Exceptional",
    description: "≥ 8.5",
    tone: "text-teal-400",
    barClass: "bg-teal-700",
    textClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-300/60 dark:border-teal-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-teal-300/50 dark:ring-teal-600/35",
    chartHex: "#0f766e",
  },
  strong: {
    key: "strong",
    label: "Strong",
    description: "8.0 – 8.4",
    tone: "text-teal-400",
    barClass: "bg-teal-500",
    textClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-300/60 dark:border-teal-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-teal-300/50 dark:ring-teal-600/35",
    chartHex: "#14b8a6",
  },
  solid: {
    key: "solid",
    label: "Solid",
    description: "7.5 – 7.9",
    tone: "text-teal-400",
    barClass: "bg-teal-300",
    textClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-300/60 dark:border-teal-700/40",
    textOnBarClass: "text-zinc-900",
    ringClass: "ring-teal-300/50 dark:ring-teal-600/35",
    chartHex: "#5eead4",
  },
  moderate: {
    key: "moderate",
    label: "Moderate",
    description: "7.0 – 7.4",
    tone: "text-amber-400",
    barClass: "bg-amber-400",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-300/60 dark:border-amber-700/40",
    textOnBarClass: "text-zinc-900",
    ringClass: "ring-amber-300/50 dark:ring-amber-600/35",
    chartHex: "#f59e0b",
  },
  soft: {
    key: "soft",
    label: "Soft",
    description: "6.5 – 6.9",
    tone: "text-rose-400",
    barClass: "bg-orange-500",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-300/60 dark:border-orange-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-orange-300/50 dark:ring-orange-600/35",
    chartHex: "#f97316",
  },
  weak: {
    key: "weak",
    label: "Weak",
    description: "< 6.5",
    tone: "text-rose-400",
    barClass: "bg-red-600",
    textClass: "text-red-700 dark:text-red-300",
    borderClass: "border-red-300/60 dark:border-red-700/40",
    textOnBarClass: "text-white",
    ringClass: "ring-red-300/50 dark:ring-red-600/35",
    chartHex: "#dc2626",
  },
};

export const GROWTH_BAND_ORDER: GrowthBandKey[] = [
  "exceptional",
  "strong",
  "solid",
  "moderate",
  "soft",
  "weak",
];

export function bandForGrowthScore(score: number): GrowthBandKey {
  if (score >= 8.5) return "exceptional";
  if (score >= 8) return "strong";
  if (score >= 7.5) return "solid";
  if (score >= 7) return "moderate";
  if (score >= 6.5) return "soft";
  return "weak";
}
