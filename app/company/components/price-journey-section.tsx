// L1 SectionCard shell is provided externally by PriceJourneyPanel in
// app/company/[code]/company-detail-sections.tsx; this renders the body only.
//
// The Price journey block: the price history split into up / down / sideways phases,
// each move split exactly as EPS × P/E (EPS = that week's price ÷ its P/E). Every
// number and word is templated from the price_phases row in lib/price-phases/normalize.ts
// — pivots are automatic, nothing is hand-written. Descriptive only.

import type { NormalizedPricePhase, NormalizedPricePhases } from "@/lib/price-phases/normalize";
import { monthLabel } from "@/lib/price-phases/normalize";
import { PHASE_HEX } from "@/lib/price-phases/palette";
import { cn } from "@/lib/utils";

import { PriceJourneyChart } from "./price-journey-chart";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";

const KIND_TEXT: Record<NormalizedPricePhase["kind"], string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  side: "text-muted-foreground",
};

const KIND_CHIP: Record<NormalizedPricePhase["kind"], string> = {
  up: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  down: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  side: "border-border/50 bg-muted/40 text-muted-foreground",
};

function PhaseCard({ phase, n }: { phase: NormalizedPricePhase; n: number }) {
  return (
    <li className={cn(nestedDetailClass, "flex flex-col gap-2 p-3", phase.isCurrent && "ring-1 ring-violet-500/35")}>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="tabular-nums text-muted-foreground">{n}</span>
        <span className={cn("rounded-full border px-2 py-0.5 font-medium", KIND_CHIP[phase.kind])}>{phase.kindLabel}</span>
        {phase.isCurrent ? (
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-medium text-violet-700 dark:text-violet-300">
            Now
          </span>
        ) : null}
        <span className="ml-auto tabular-nums text-muted-foreground">{phase.dateRange}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-2xl font-semibold tabular-nums tracking-tight", KIND_TEXT[phase.kind])}>
          {phase.moveLabel}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{phase.rate}</span>
      </div>
      {phase.split ? (
        <p className="text-sm leading-snug">
          <span className="font-medium">{phase.split.lead}:</span>{" "}
          <span className="tabular-nums">{phase.split.primary}</span>
          <span className="text-muted-foreground"> · {phase.split.secondary}</span>
        </p>
      ) : (
        <p className="text-xs leading-snug text-muted-foreground">{phase.missingReason}</p>
      )}
      {phase.whatChanged ? (
        <p className="text-xs leading-snug text-muted-foreground">
          <span className="font-medium text-foreground/70">Annual figures</span> {phase.whatChanged}
        </p>
      ) : null}
    </li>
  );
}

export function PriceJourneySection({ data, companyLabel }: { data: NormalizedPricePhases; companyLabel: string }) {
  const numbered = data.phases.map((phase, i) => ({ phase, n: i + 1 }));
  const kindsShown = new Set(data.phases.map((p) => p.kind));
  return (
    <div className="space-y-4">
      <div className={cn(elevatedBlockClass, "space-y-3 p-4 sm:p-5")}>
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Where the price is now
          </p>
          <p className="text-base font-semibold leading-snug sm:text-lg">{data.headline}</p>
          {data.windowLine ? <p className="text-sm tabular-nums text-muted-foreground">{data.windowLine}</p> : null}
        </div>
        <PriceJourneyChart
          series={data.series}
          bands={data.phases.map((p, i) => ({ startMs: p.startMs, endMs: p.endMs, kind: p.kind, n: i + 1 }))}
          pivots={data.pivots}
          ariaLabel={`${companyLabel} share price since ${monthLabel(data.series.length ? data.phases[0].start : data.asOf)}, split into ${data.phases.length} phases. ${data.headline}`}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {(["up", "down", "side"] as const)
            .filter((k) => kindsShown.has(k))
            .map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: PHASE_HEX[k], opacity: 0.45 }} />
                {k === "up" ? "Up" : k === "down" ? "Down" : "Sideways"}
              </span>
            ))}
          <span className="sm:ml-auto">Closing prices, log scale, adjusted for splits and bonus issues</span>
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Phases, latest first">
        {numbered
          .slice()
          .reverse()
          .map(({ phase, n }) => (
            <PhaseCard key={phase.start} phase={phase} n={n} />
          ))}
      </ol>

      <details className={cn(nestedDetailClass, "group px-3 py-2 text-sm")}>
        <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
          How this is worked out
        </summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-muted-foreground">
          <li>
            Price = earnings per share × P/E, so every move splits exactly: the price change equals the EPS change times
            the P/E change. EPS here is that week&apos;s price divided by its trailing P/E.
          </li>
          <li>
            Each phase names the factor that moved more: &ldquo;Mostly the P/E&rdquo; means the market paid a different
            multiple for the earnings; &ldquo;Mostly earnings&rdquo; means the earnings themselves moved.
          </li>
          <li>
            Turning points are picked automatically from Screener&apos;s weekly closes ({data.basis} figures); nothing in
            this block is written by hand. Where one end of a phase has no P/E — a loss-making stretch, before
            Screener&apos;s P/E history starts, earnings so close to zero that the P/E runs past 1000x, or an EPS
            figure Screener had not updated — the move is shown without the split.
          </li>
          <li>
            &ldquo;Annual figures&rdquo; are the biggest changes between the fiscal years published at a phase&apos;s
            start and end, for phases of a year or more. They lag the trailing EPS the split uses.
          </li>
          <li>Prices to {monthLabel(data.asOf)} ({data.asOf}).</li>
        </ul>
      </details>
    </div>
  );
}
