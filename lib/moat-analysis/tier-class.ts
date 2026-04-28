import type { MoatRatingKey } from "./types";

export function moatTierClass(rating: MoatRatingKey | null): string {
  switch (rating) {
    case "wide_moat":
      return "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-600/50 dark:bg-emerald-900/35 dark:text-emerald-200";
    case "narrow_moat":
      return "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-600/50 dark:bg-sky-900/35 dark:text-sky-200";
    case "moat_at_risk":
      return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600/50 dark:bg-amber-900/35 dark:text-amber-200";
    case "no_moat":
      return "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-600/50 dark:bg-rose-900/35 dark:text-rose-200";
    default:
      return "border-border/60 bg-muted/60 text-foreground";
  }
}
