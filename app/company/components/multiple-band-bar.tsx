// One multiple placed on its own 5-year history: a cheap→rich gradient rail (low multiple left,
// high multiple right — for a multiple, lower is cheaper), the interquartile box and median from
// that history, a "now" marker toned by the lens pill, and — only when a peer median genuinely
// exists (P/E) — a sky "peers" dot. Replaces the monochrome boxplot in the redesigned ratio cards.
//
// Server-rendered SVG, no client JS. The gradient is decorative-but-directional: it says "cheaper
// to the left" within THIS stock's own range; the markers carry the real numbers. Range-end and
// marker labels de-collide by suppressing whichever end label the "now" marker sits nearest, the
// same rule the boxplot used.

import type { ValuationBand } from "@/lib/valuation-check/types";

const W = 320;
const PAD_X = 22;
const PLOT_LEFT = PAD_X;
const PLOT_RIGHT = W - PAD_X;
const AXIS_Y = 26;
const RAIL_H = 6;
const BOX_TOP = 18;
const BOX_BOTTOM = 34;
const MED_LABEL_Y = 11;
const NOW_LABEL_Y = 50;
const END_LABEL_Y = 50;
const PEER_LABEL_Y = 62;
const H = 66;

const fmt = (n: number) => `${n.toFixed(1)}x`;

export function MultipleBandBar({
  band,
  current,
  peer,
  nowFillClass,
  gradientId,
}: {
  band: ValuationBand;
  current: number | null;
  /** Peer / industry median, shown as a sky dot below the axis. Only pass when it truly exists. */
  peer?: { value: number; label: string } | null;
  /** Tailwind fill class for the "now" marker, derived from the lens pill tone. */
  nowFillClass: string;
  /** Stable, unique id for this instance's <linearGradient> (two bars share a card). */
  gradientId: string;
}) {
  const whiskerLo = band.min ?? band.p25;
  const whiskerHi = band.max ?? band.p75;
  const points = [
    whiskerLo,
    whiskerHi,
    band.p25,
    band.p75,
    band.median,
    ...(current !== null ? [current] : []),
    ...(peer ? [peer.value] : []),
  ];
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

  const nowFrac =
    current === null ? 0.5 : (x(current) - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT);
  const hideLoLabel = current !== null && nowFrac < 0.34;
  const hideHiLabel = current !== null && nowFrac > 0.66;

  const ariaLabel =
    (current !== null ? `Now ${fmt(current)}. ` : "") +
    `${band.years}-year range ${fmt(whiskerLo)} to ${fmt(whiskerHi)}, ` +
    `middle half ${fmt(band.p25)} to ${fmt(band.p75)}, median ${fmt(band.median)}.` +
    (peer ? ` ${peer.label} ${fmt(peer.value)}.` : "");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
          <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.32} />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.45} />
        </linearGradient>
      </defs>

      {/* Cheap→rich gradient rail. */}
      <rect
        x={PLOT_LEFT}
        y={AXIS_Y - RAIL_H / 2}
        width={PLOT_RIGHT - PLOT_LEFT}
        height={RAIL_H}
        rx={RAIL_H / 2}
        fill={`url(#${gradientId})`}
      />

      {/* Interquartile box — where the multiple spent its middle half. */}
      <rect
        x={x(band.p25)}
        y={BOX_TOP}
        width={Math.max(1, x(band.p75) - x(band.p25))}
        height={BOX_BOTTOM - BOX_TOP}
        rx={2}
        className="fill-foreground/[0.06] stroke-foreground/25"
        strokeWidth={1.25}
      />

      {/* Median. */}
      <line
        x1={x(band.median)}
        x2={x(band.median)}
        y1={BOX_TOP}
        y2={BOX_BOTTOM}
        className="stroke-foreground/55"
        strokeWidth={1.5}
      />
      <text
        x={x(band.median)}
        y={MED_LABEL_Y}
        textAnchor="middle"
        className="fill-muted-foreground tabular-nums"
        fontSize={8}
      >
        med {fmt(band.median)}
      </text>

      {/* Range-end labels — the one nearest "now" is suppressed to avoid a collision. */}
      {hideLoLabel ? null : (
        <text
          x={x(whiskerLo)}
          y={END_LABEL_Y}
          textAnchor="start"
          className="fill-muted-foreground tabular-nums"
          fontSize={8}
        >
          {fmt(whiskerLo)}
        </text>
      )}
      {hideHiLabel ? null : (
        <text
          x={x(whiskerHi)}
          y={END_LABEL_Y}
          textAnchor="end"
          className="fill-muted-foreground tabular-nums"
          fontSize={8}
        >
          {fmt(whiskerHi)}
        </text>
      )}

      {/* Peer / industry median, below the axis on its own row so it never collides with "now". */}
      {peer ? (
        <g>
          <title>{`${peer.label} ${fmt(peer.value)}`}</title>
          <line
            x1={x(peer.value)}
            x2={x(peer.value)}
            y1={AXIS_Y}
            y2={PEER_LABEL_Y - 9}
            className="stroke-sky-500/60"
            strokeWidth={1}
          />
          <circle
            cx={x(peer.value)}
            cy={AXIS_Y}
            r={4}
            className="fill-sky-500 stroke-background"
            strokeWidth={1.5}
          />
          <text
            x={x(peer.value)}
            y={PEER_LABEL_Y}
            textAnchor="middle"
            className="fill-sky-600 tabular-nums dark:fill-sky-400"
            fontSize={8.5}
          >
            {peer.label} {fmt(peer.value)}
          </text>
        </g>
      ) : null}

      {/* "Now" marker, toned by the lens pill. */}
      {current !== null ? (
        <g>
          <title>{`Now ${fmt(current)}`}</title>
          <circle
            cx={x(current)}
            cy={AXIS_Y}
            r={5}
            className={`${nowFillClass} stroke-background`}
            strokeWidth={2}
          />
          <text
            x={x(current)}
            y={NOW_LABEL_Y}
            textAnchor={nowAnchor}
            className="fill-foreground font-semibold tabular-nums"
            fontSize={9.5}
          >
            now {fmt(current)}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
