// Shared classes for the Announcements tab (server cards + the client tape).
// A plain module on purpose: a "use client" file's non-component exports are
// not readable from a server component.

import type { ExchangeImpact } from "@/lib/exchange-desk/types";
import type { TierKey } from "@/lib/announcement-tape";

export const displayClass = "[font-family:var(--font-display)] font-bold tracking-[-0.02em]";
export const monoClass = "[font-family:var(--font-data)] tabular-nums";
export const kickerClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
export const cardClass = "rounded-[14px] border border-border/60 bg-card";
export const accentTextClass = "text-sky-700 dark:text-sky-300";

const pillBase =
  "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] leading-none";

/** Impact badge: the extremes are filled, the middle tiers an outlined word. */
const IMPACT_PILL: Record<ExchangeImpact, string> = {
  transformative:
    "border-transparent bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-300",
  positive:
    "border-emerald-600/35 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300",
  neutral: "border-border text-muted-foreground",
  negative: "border-rose-500/40 text-rose-600 dark:border-rose-400/35 dark:text-rose-300",
  severe: "border-transparent bg-rose-500/15 font-semibold text-rose-600 dark:text-rose-300",
};

export const impactPillClass = (impact: ExchangeImpact) =>
  `${monoClass} ${pillBase} ${IMPACT_PILL[impact]}`;

/**
 * History-chart tiles. Status colours, not a categorical palette: one green
 * split by lightness for the two good tiers, a neutral grey for routine, rose
 * for adverse — the same reading as the badges beside every tape row, and the
 * legend names each one.
 */
export const TIER_TILE: Record<TierKey, string> = {
  transformative: "bg-emerald-500 dark:bg-emerald-400",
  positive: "bg-emerald-700 dark:bg-emerald-700",
  routine: "bg-zinc-400 dark:bg-zinc-500",
  negative: "bg-rose-600 dark:bg-rose-500",
};
