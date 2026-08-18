// The valuation score on its 5-band ramp, with a pointer. "Higher is cheaper", so the ramp runs
// worst→best left→right (richly priced → deep value) — the REVERSE of VALUATION_BAND_ORDER, which
// is best-first for legends. Colours and cuts come from lib/valuation-band so this bar can never
// disagree with the leaderboard cell or the stored verdict.
//
// Server-rendered: pure CSS/flex, no client JS. The top-right slot is intentionally reserved for a
// future score-history sparkline (deferred until a valuation history table exists).

import type { ReactNode } from "react";

import { VALUATION_BANDS, bandForValuationScore, type ValuationBandKey } from "@/lib/valuation-band";
import { cn } from "@/lib/utils";

// Worst → best, matching the mockup's left→right reading.
const RAMP: ValuationBandKey[] = [
  "richly_priced",
  "expensive",
  "fair",
  "undervalued",
  "deep_value",
];

export function ValuationSpectrumBar({
  score,
  trend,
}: {
  score: number;
  /** Optional score-history sparkline, rendered in the reserved top-right slot. */
  trend?: ReactNode;
}) {
  // Stored 0–100. Clamp so an out-of-range value can't push the pointer off the track.
  const clamped = Math.max(0, Math.min(100, score));
  const activeKey = bandForValuationScore(clamped / 10);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Score · higher is cheaper
        </p>
        {trend ? <div className="shrink-0">{trend}</div> : null}
      </div>

      <div
        role="img"
        aria-label={`Valuation score ${Math.round(clamped)} of 100 — ${VALUATION_BANDS[activeKey].label}. Higher is cheaper.`}
      >
        {/* Pointer bubble + stem, positioned along the track. */}
        <div className="relative h-6">
          <div
            className="absolute -translate-x-1/2"
            style={{ left: `${clamped}%` }}
          >
            <span
              className={cn(
                "inline-flex min-w-[28px] items-center justify-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                VALUATION_BANDS[activeKey].borderClass,
                VALUATION_BANDS[activeKey].textClass,
                "bg-background/90",
              )}
            >
              {Math.round(clamped)}
            </span>
          </div>
        </div>

        {/* The ramp. */}
        <div className="flex h-2.5 overflow-hidden rounded-full">
          {RAMP.map((key) => (
            <div key={key} className={cn("flex-1", VALUATION_BANDS[key].barClass)} />
          ))}
        </div>
        <div
          className="relative -mt-[7px] h-0"
          aria-hidden="true"
        >
          {/* A thin tick on the track under the pointer, so the bubble reads as pinned. */}
          <span
            className="absolute top-0 h-3 w-px -translate-x-1/2 bg-foreground/70"
            style={{ left: `${clamped}%` }}
          />
        </div>

        {/* Band labels, one under each segment. The active band is emphasised. */}
        <div className="mt-2 flex">
          {RAMP.map((key) => (
            <div key={key} className="flex-1 text-center">
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  key === activeKey
                    ? cn("font-semibold", VALUATION_BANDS[key].textClass)
                    : "text-muted-foreground",
                )}
              >
                {VALUATION_BANDS[key].label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
