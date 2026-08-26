// The valuation score as a radial dial — the focal number of THE READ hero.
//
// Colour comes from lib/valuation-band (chartHex for the arc, textClass for the number) so the
// dial can never disagree with the spectrum bar, the score-history end marker, or the leaderboard
// cell. "Higher is cheaper", so a fuller ring means a cheaper stock.
//
// Server-rendered SVG, no client JS. The arc is a single stroked circle rotated to start at 12
// o'clock; strokeDasharray splits it into the filled fraction and the remainder.

import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";
import { cn } from "@/lib/utils";

export function ValuationScoreDial({
  score,
  size = 92,
}: {
  score: number;
  /** Outer diameter in px. */
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const band = VALUATION_BANDS[bandForValuationScore(clamped / 10)];

  const stroke = Math.round(size * 0.1);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (clamped / 100) * c;
  const center = size / 2;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Valuation score ${Math.round(clamped)} of 100 — ${band.label}. Higher is cheaper.`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Track. */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-foreground/10"
        />
        {/* Value arc, starting at 12 o'clock and sweeping clockwise. */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={band.chartHex}
          strokeDasharray={`${filled} ${Math.max(0, c - filled)}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-bold leading-none tabular-nums", band.textClass)}>
          {Math.round(clamped)}
        </span>
        <span className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  );
}
