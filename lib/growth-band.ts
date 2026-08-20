// Growth-specific score → band classification + colours. Sibling to score-band.ts
// (Quarterly / sentiment bands). Kept separate because the Growth Score is a
// forward outlook, not a sentiment read.
//
// Cuts retuned 2026-08-20 for the growth-score v5 recalibration (scenario-led,
// frozen spread stretch): the fleet now spans ~2.9–8.3 (median 6.5, sd 0.79),
// where the pre-v5 leg was crushed into ~6.6–8.7 (sd 0.40) and left "Exceptional"
// permanently empty and half the fleet mislabelled "Weak". The teal/amber break
// sits at the median (≥6.5 = teal-positive; below = amber→red caution), so the
// bands split the live distribution ~5/15/32/30/16/1%.
//
// FIXED absolute cuts (not percentile-of-cohort) so labels stay stable over
// time and comparable across companies, matching score-band.ts's philosophy —
// which means these cuts must be re-measured if the v5 composite is reweighted.
// Palette mirrors the teal ramp from score-band so growth and quarterly badges
// share a visual identity; "Weak" reuses the bearish red since a sub-5.0 growth
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
    description: "≥ 7.8",
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
    description: "7.2 – 7.7",
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
    description: "6.5 – 7.1",
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
    description: "5.8 – 6.4",
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
    description: "5.0 – 5.7",
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
    description: "< 5.0",
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
  if (score >= 7.8) return "exceptional";
  if (score >= 7.2) return "strong";
  if (score >= 6.5) return "solid";
  if (score >= 5.8) return "moderate";
  if (score >= 5.0) return "soft";
  return "weak";
}
