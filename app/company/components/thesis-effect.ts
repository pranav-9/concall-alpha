import type { MetricDirection, ThesisEffect } from "@/lib/key-variables-snapshot/types";

/**
 * Colour a KPI change by its effect on the investment case, not by its sign.
 *
 *   effect = sign(delta) × (direction === "lower_is_better" ? -1 : 1)
 *
 * Positive → helps, negative → hurts, zero/unknown → neutral. Rising working
 * capital days (lower_is_better) must read red; rising order book must read
 * green. Do NOT use `getDeltaToneClass` for these cells — it colours by sign,
 * which is exactly the bug this helper exists to avoid.
 */
export const getThesisEffect = (
  delta: number | null | undefined,
  direction: MetricDirection = "higher_is_better",
): ThesisEffect => {
  if (delta == null || !Number.isFinite(delta) || delta === 0) return "neutral";
  const signed = Math.sign(delta) * (direction === "lower_is_better" ? -1 : 1);
  return signed > 0 ? "helps" : "hurts";
};

/** Text colour for a delta label, an eyebrow, a status word. */
export const thesisEffectTextClass: Record<ThesisEffect, string> = {
  helps: "text-emerald-700 dark:text-emerald-300",
  hurts: "text-rose-700 dark:text-rose-300",
  caution: "text-amber-700 dark:text-amber-300",
  neutral: "text-muted-foreground",
};

/** Tinted pill ("Helps the thesis" / "Hurts the thesis"). */
export const thesisEffectTintClass: Record<ThesisEffect, string> = {
  helps:
    "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
  hurts:
    "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
  caution:
    "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
  neutral: "border-border/60 bg-muted/60 text-muted-foreground",
};

/** Fill for the latest bar in the hero band. */
export const thesisEffectBarClass: Record<ThesisEffect, string> = {
  helps: "bg-emerald-500",
  hurts: "bg-rose-500",
  caution: "bg-amber-500",
  neutral: "bg-muted-foreground/60",
};

export const thesisEffectPillLabel: Record<ThesisEffect, string | null> = {
  helps: "Helps the thesis",
  hurts: "Hurts the thesis",
  caution: "Watch closely",
  neutral: null,
};
