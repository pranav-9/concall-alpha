// One multiple's own-history distribution as a compact boxplot: whiskers to min/max, a box across
// p25→p75, the median line, and a "now" marker for the current multiple. Replaces the text
// "own 5-yr 21.7–39.1x (median 24.2x) · now 20.3x" with the same numbers, placed.
//
// Server-rendered SVG, no client JS. Falls back gracefully when min/max are absent (the schema
// marks them optional) by whiskering to p25/p75. The parent only renders this when a band exists;
// the no-band level path stays text.

import type { ValuationBand } from "@/lib/valuation-check/types";

const W = 320;
const PAD_X = 22;
const PLOT_LEFT = PAD_X;
const PLOT_RIGHT = W - PAD_X;
const AXIS_Y = 24;
const BOX_TOP = 15;
const BOX_BOTTOM = 33;
const WHISKER_CAP_TOP = 19;
const WHISKER_CAP_BOTTOM = 29;
const NOW_LABEL_Y = 50;
const END_LABEL_Y = 50;
const MED_LABEL_Y = 9;
const H = 56;

const fmt = (n: number) => `${n.toFixed(1)}x`;

export function MultipleBoxplot({
  band,
  current,
}: {
  band: ValuationBand;
  current: number | null;
}) {
  const whiskerLo = band.min ?? band.p25;
  const whiskerHi = band.max ?? band.p75;
  // Domain must contain the whiskers and the current marker, with a little breathing room.
  const points = [whiskerLo, whiskerHi, ...(current !== null ? [current] : [])];
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const range = hi - lo || 1;
  const pad = range * 0.08;
  const domainLo = lo - pad;
  const domainHi = hi + pad;
  const span = domainHi - domainLo || 1;
  const x = (v: number) => PLOT_LEFT + ((v - domainLo) / span) * (PLOT_RIGHT - PLOT_LEFT);

  const nowAnchor =
    current === null
      ? "middle"
      : x(current) < PLOT_LEFT + 26
        ? "start"
        : x(current) > PLOT_RIGHT - 26
          ? "end"
          : "middle";

  // The "now" label and a range-end label share the same baseline row, so when the current marker
  // sits in the outer third of the track (common: a multiple resting near the low end of its range)
  // the two texts collide. Suppress that end's label — the "now" value already reads that end.
  const nowFrac =
    current === null ? 0.5 : (x(current) - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT);
  const hideLoLabel = current !== null && nowFrac < 0.34;
  const hideHiLabel = current !== null && nowFrac > 0.66;

  const ariaLabel =
    (current !== null ? `Now ${fmt(current)}. ` : "") +
    `${band.years}-year range ${fmt(whiskerLo)} to ${fmt(whiskerHi)}, ` +
    `middle half ${fmt(band.p25)} to ${fmt(band.p75)}, median ${fmt(band.median)}.`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Whiskers + end caps. */}
      <line x1={x(whiskerLo)} x2={x(band.p25)} y1={AXIS_Y} y2={AXIS_Y} className="stroke-foreground/40" strokeWidth={1.25} />
      <line x1={x(band.p75)} x2={x(whiskerHi)} y1={AXIS_Y} y2={AXIS_Y} className="stroke-foreground/40" strokeWidth={1.25} />
      <line x1={x(whiskerLo)} x2={x(whiskerLo)} y1={WHISKER_CAP_TOP} y2={WHISKER_CAP_BOTTOM} className="stroke-foreground/40" strokeWidth={1.25} />
      <line x1={x(whiskerHi)} x2={x(whiskerHi)} y1={WHISKER_CAP_TOP} y2={WHISKER_CAP_BOTTOM} className="stroke-foreground/40" strokeWidth={1.25} />

      {/* Interquartile box. */}
      <rect
        x={x(band.p25)}
        y={BOX_TOP}
        width={Math.max(1, x(band.p75) - x(band.p25))}
        height={BOX_BOTTOM - BOX_TOP}
        rx={2}
        className="fill-foreground/[0.08] stroke-foreground/30"
        strokeWidth={1.25}
      />

      {/* Median. */}
      <line x1={x(band.median)} x2={x(band.median)} y1={BOX_TOP} y2={BOX_BOTTOM} className="stroke-foreground/60" strokeWidth={1.5} />
      <text x={x(band.median)} y={MED_LABEL_Y} textAnchor="middle" className="fill-muted-foreground" fontSize={8}>
        med
      </text>

      {/* Range end labels — the one nearest the "now" marker is suppressed to avoid a collision. */}
      {hideLoLabel ? null : (
        <text x={x(whiskerLo)} y={END_LABEL_Y} textAnchor="start" className="fill-muted-foreground tabular-nums" fontSize={8}>
          {fmt(whiskerLo)}
        </text>
      )}
      {hideHiLabel ? null : (
        <text x={x(whiskerHi)} y={END_LABEL_Y} textAnchor="end" className="fill-muted-foreground tabular-nums" fontSize={8}>
          {fmt(whiskerHi)}
        </text>
      )}

      {/* "Now" marker. */}
      {current !== null ? (
        <g>
          <title>{`Now ${fmt(current)}`}</title>
          <circle cx={x(current)} cy={AXIS_Y} r={5} className="fill-foreground stroke-background" strokeWidth={2} />
          <text x={x(current)} y={NOW_LABEL_Y} textAnchor={nowAnchor} className="fill-foreground font-semibold tabular-nums" fontSize={9}>
            now {fmt(current)}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
