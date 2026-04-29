import type { MoatRatingKey, MoatTier } from "./types";

export function moatTierClass(rating: MoatRatingKey | null): string {
  switch (rating) {
    case "wide_moat":
      return "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-600/50 dark:bg-emerald-900/35 dark:text-emerald-200";
    case "narrow_moat":
      return "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-600/50 dark:bg-sky-900/35 dark:text-sky-200";
    case "moat_at_risk":
      return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600/50 dark:bg-amber-900/35 dark:text-amber-200";
    case "no_moat":
      return "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-600/50 dark:bg-rose-900/40 dark:text-white";
    default:
      return "border-border/60 bg-muted/60 text-foreground";
  }
}

export const MOAT_TIER_GRADE_CHIP_CLASS =
  "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-200";

export function moatTierGradeClass(): string {
  return MOAT_TIER_GRADE_CHIP_CLASS;
}

export function moatTierGradeIconClass(tier: MoatTier | null): string {
  switch (tier) {
    case "strong":
      return "text-emerald-600 dark:text-emerald-400";
    case "mid":
      return "text-slate-500 dark:text-slate-400";
    case "weak":
      return "text-rose-600 dark:text-rose-400";
    default:
      return "text-muted-foreground";
  }
}

export function moatTierGradeLabel(tier: MoatTier | null): string | null {
  switch (tier) {
    case "strong":
      return "Strong";
    case "mid":
      return "Mid";
    case "weak":
      return "Weak";
    default:
      return null;
  }
}
