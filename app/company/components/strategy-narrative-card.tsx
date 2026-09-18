// The single strategic bet the live guides collectively express, plus the one
// derived lever it depends on (details.strategy_narrative, schema
// guidance_strength_v1, written by /guidance-deep-track). It answers "how does
// this company grow?", so it renders on the Growth tab as the "Growth engine"
// (moved from the Guidance tab 2026-09-18). No hooks — usable from a server
// component.

import { cn } from "@/lib/utils";
import type { StrategyNarrative } from "@/lib/guidance-snapshot/types";
import { elevatedMutedBlockClass } from "./surface-tokens";

const eyebrowClass = "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

export function StrategyNarrativeCard({
  strategy,
  eyebrow = "Growth engine",
  asOf,
  className,
}: {
  strategy: StrategyNarrative;
  eyebrow?: string;
  // growth_outlook and guidance_snapshot are refreshed independently, so the
  // card says when the narrative was written rather than borrowing the Growth
  // section's own date.
  asOf?: string | null;
  className?: string;
}) {
  const lever = strategy.impliedLever;
  const leverValue =
    lever && (lever.from || lever.to) ? [lever.from, lever.to].filter(Boolean).join(" → ") : null;
  return (
    <div className={cn(elevatedMutedBlockClass, "p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className={eyebrowClass}>{eyebrow}</p>
        {asOf ? (
          <p className="text-[10px] leading-snug text-muted-foreground">From the guidance read · {asOf}</p>
        ) : null}
      </div>
      <p className="mt-2 text-base font-semibold leading-snug text-foreground sm:text-lg">
        {strategy.headline}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-foreground/80">{strategy.body}</p>
      {lever ? (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={eyebrowClass}>{lever.label}</span>
          {leverValue ? (
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{leverValue}</span>
          ) : null}
          {lever.basis ? <span className="text-[11px] text-muted-foreground">{lever.basis}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
