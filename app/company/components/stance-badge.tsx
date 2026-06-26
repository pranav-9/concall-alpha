// Shared "Read" cell: the watchlist's per-row synthesis. One configuration label
// standing in for the whole row (level + trajectory + forward + moat), so the
// reader gets the integrated read at a glance instead of combining five columns
// by eye. Vocabulary + colours from lib/portfolio-stance; the full reasoning
// (which signals fired) rides in the tooltip.

import { Minus, Shield, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { STANCES, type StanceKey } from "@/lib/portfolio-stance";

const STANCE_ICONS: Record<StanceKey, LucideIcon> = {
  compounding: TrendingUp,
  outlook_led: Sparkles, // soft now, strong-ahead read — the opportunity divergence
  improving: TrendingUp,
  near_peak: Minus, // flattened momentum; the amber colour carries the caution
  thin_underwrite: Shield, // the missing durability leg
  steady: Minus,
  soft_stuck: TrendingDown,
  cracking: TrendingDown,
  no_read: Minus,
};

export function StanceBadge({
  stanceKey,
  description,
}: {
  stanceKey?: StanceKey | null;
  /** Articulated reasoning from classifyStance — the inputs that fired. */
  description?: string | null;
}) {
  if (!stanceKey || stanceKey === "no_read") {
    return (
      <span className="text-muted-foreground" title={STANCES.no_read.gloss}>
        —
      </span>
    );
  }

  const def = STANCES[stanceKey];
  const Icon = STANCE_ICONS[stanceKey];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${def.textClass}`}
      title={`${def.label} — ${description ?? def.gloss}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{def.label}</span>
    </span>
  );
}
