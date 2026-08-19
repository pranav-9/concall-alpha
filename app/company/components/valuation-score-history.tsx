// The valuation score over the last several readings, as a focal sparkline panel.
//
// `valuation_check` holds only the current read; the series comes from the append-only
// `valuation_check_history` table (see lib/valuation-check/history.ts). "Higher is cheaper",
// so a FALLING line means the stock is getting richer — the caption spells that out because it
// is the opposite of the usual "up is good" instinct.
//
// Server-rendered SVG, no client JS — same convention as valuation-horizon-bar and
// multiple-boxplot. Colours come from lib/valuation-band so the end marker agrees with the
// spectrum bar and the leaderboard cell.

import type { ValuationScorePoint } from "@/lib/valuation-check/history";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";
import { cn } from "@/lib/utils";

const W = 320;
const H = 96;
const PAD_L = 10;
const PAD_R = 26;
const PAD_T = 14;
const PAD_B = 22;

// "2026-08-18" -> "Aug '26". Falls back to the raw string if it isn't a date.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function compactDate(period: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(period);
  if (!m) return period;
  const monthIdx = Number(m[2]) - 1;
  const month = MONTHS[monthIdx] ?? "";
  return month ? `${month} '${m[1].slice(2)}` : period;
}

export function ValuationScoreHistory({ points }: { points: ValuationScorePoint[] }) {
  const first = points[0];
  const last = points[points.length - 1];
  const firstBand = VALUATION_BANDS[bandForValuationScore(first.value / 10)];
  const lastBand = VALUATION_BANDS[bandForValuationScore(last.value / 10)];

  const values = points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(6, (hi - lo) * 0.25);
  const domainLo = Math.max(0, lo - pad);
  const domainHi = Math.min(100, hi + pad);
  const span = domainHi - domainLo || 1;

  const x = (i: number) =>
    PAD_L + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - (v - domainLo) / span) * (H - PAD_T - PAD_B);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");

  // Direction caption. Falling score = getting richer; state the band drift honestly.
  const drift =
    firstBand.key === lastBand.key
      ? `Held around ${lastBand.label.toLowerCase()} across ${points.length} readings.`
      : `Slid ${firstBand.label.toLowerCase()} → ${lastBand.label.toLowerCase()} across ${points.length} readings.`;

  const ariaLabel =
    `Valuation score across ${points.length} readings, from ${first.value} (${compactDate(first.period)}) ` +
    `to ${last.value} (${compactDate(last.period)}). Higher is cheaper.`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Faint reference band across the "fair" zone (40–60) for context. */}
        {domainLo < 60 && domainHi > 40 ? (
          <rect
            x={PAD_L}
            y={y(Math.min(domainHi, 60))}
            width={W - PAD_L - PAD_R}
            height={Math.max(0, y(Math.max(domainLo, 40)) - y(Math.min(domainHi, 60)))}
            className="fill-foreground/[0.04]"
          />
        ) : null}

        {/* The trace. */}
        <path d={linePath} fill="none" className="stroke-foreground/40" strokeWidth={1.5} />

        {/* Interior dots, quiet. */}
        {points.slice(0, -1).map((p, i) => (
          <circle
            key={`${p.period}-${i}`}
            cx={x(i)}
            cy={y(p.value)}
            r={2.25}
            className="fill-foreground/45"
          />
        ))}

        {/* End marker + value label, coloured by the landing band. */}
        <g className={lastBand.textClass}>
          <circle
            cx={x(points.length - 1)}
            cy={y(last.value)}
            r={3.5}
            className="fill-current stroke-background"
            strokeWidth={1.5}
          />
          <text
            x={x(points.length - 1) + 5}
            y={y(last.value) + 3}
            textAnchor="start"
            className="fill-current font-semibold tabular-nums"
            fontSize={11}
          >
            {last.value}
          </text>
        </g>

        {/* Endpoint date labels. */}
        <text
          x={PAD_L}
          y={H - 6}
          textAnchor="start"
          className="fill-muted-foreground tabular-nums"
          fontSize={9}
        >
          {compactDate(first.period)}
        </text>
        <text
          x={W - PAD_R}
          y={H - 6}
          textAnchor="end"
          className="fill-muted-foreground tabular-nums"
          fontSize={9}
        >
          {compactDate(last.period)}
        </text>
      </svg>

      <p className={cn("mt-1 text-[11px] leading-snug text-muted-foreground")}>
        {drift} A falling line means the price is getting richer.
      </p>
    </div>
  );
}
