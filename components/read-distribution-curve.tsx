// The Read distribution across covered companies, with a chosen few marked on
// it. Server-rendered SVG — there is no state here, and a static picture with
// native <title> tooltips beats shipping a charting library to the client for
// one figure.
//
// TWO ENCODINGS ONLY, on purpose. The shape is the population (neutral ink); the
// needles are yours (sky). The x-axis already carries the score, so colouring the
// curve by score as well would encode the same variable twice — and worse, would
// borrow the teal→red band ramp for a composite that lib/board-read is careful
// NOT to present as a sentiment score.
//
// Geometry lives here, statistics live in lib/read-distribution.ts.

import {
  estimateLabelWidthUnits,
  MARKER_LABEL_FONT,
  MARKER_SCORE_FONT,
  PLOT_WIDTH_UNITS,
  type ReadDistribution,
} from "@/lib/read-distribution";

// viewBox units. Type sizes are deliberately large relative to the box: the SVG
// scales to its container, so a 10-unit label would render at ~5px on a 360px
// phone. At 20 units it lands near 10px there and reads fine on desktop.
//
// PLOT_WIDTH_UNITS and the two font sizes come from lib/read-distribution
// because the label-collision test is computed there — if the plot were wider
// here than the layout believed, labels would be rationed against a phantom.
const PAD_X = 24;
const W = PLOT_WIDTH_UNITS + 2 * PAD_X;
const H = 200;
const PLOT_LEFT = PAD_X;
const PLOT_RIGHT = W - PAD_X;
const BASELINE = 156;
const CURVE_TOP = 56;
const CURVE_H = BASELINE - CURVE_TOP;
const RUG_TOP = BASELINE + 2;
const RUG_BOTTOM = BASELINE + 10;
const TICK_LABEL_Y = 188;
/** Text baselines for the two direct-label rows; row 0 sits nearest the curve. */
const LABEL_ROW_Y = [46, 18];

const fmt = (n: number) => n.toFixed(1);

export function ReadDistributionCurve({
  distribution,
  subjectLabel,
}: {
  distribution: ReadDistribution;
  /** What the marked companies are, e.g. "this watchlist". */
  subjectLabel: string;
}) {
  const { curve, domain, ticks, rug, markers, universeCount, universeMedian, markerMedian } =
    distribution;

  const span = domain[1] - domain[0] || 1;
  const x = (score: number) => PLOT_LEFT + ((score - domain[0]) / span) * (PLOT_RIGHT - PLOT_LEFT);
  const y = (density: number) => BASELINE - density * CURVE_H;

  const areaPath = [
    `M ${x(curve[0].score).toFixed(2)} ${BASELINE}`,
    ...curve.map((p) => `L ${x(p.score).toFixed(2)} ${y(p.density).toFixed(2)}`),
    `L ${x(curve[curve.length - 1].score).toFixed(2)} ${BASELINE}`,
    "Z",
  ].join(" ");

  const ariaLabel =
    `Distribution of Read scores across ${universeCount} covered companies, median ${fmt(universeMedian)}. ` +
    `${markers.length} from ${subjectLabel} marked` +
    (markerMedian != null ? `, median ${fmt(markerMedian)}.` : ".");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Population: the shape, then the raw values it was smoothed from. A rug
          keeps the curve honest — a bump made of three companies looks like a
          bump made of three companies. */}
      <path d={areaPath} className="fill-foreground/[0.08] stroke-foreground/25" strokeWidth={2} />
      {rug.map((score, i) => (
        <line
          key={`rug-${i}`}
          x1={x(score)}
          x2={x(score)}
          y1={RUG_TOP}
          y2={RUG_BOTTOM}
          className="stroke-foreground/20"
          strokeWidth={1.5}
        />
      ))}

      {/* Universe median. Labelled in the legend rather than on the plot, so it
          can never collide with a company label. */}
      <line
        x1={x(universeMedian)}
        x2={x(universeMedian)}
        y1={CURVE_TOP - 4}
        y2={BASELINE}
        className="stroke-foreground/35"
        strokeWidth={1.5}
        strokeDasharray="5 5"
      />

      <line
        x1={PLOT_LEFT}
        x2={PLOT_RIGHT}
        y1={BASELINE}
        y2={BASELINE}
        className="stroke-border"
        strokeWidth={1.5}
      />
      {ticks.map((tick) => (
        <text
          key={`tick-${tick}`}
          x={x(tick)}
          y={TICK_LABEL_Y}
          textAnchor="middle"
          className="fill-muted-foreground tabular-nums"
          fontSize={MARKER_SCORE_FONT}
        >
          {tick % 1 === 0 ? tick : tick.toFixed(1)}
        </text>
      ))}

      {/* The marked companies. Every one gets a needle; only some get a name. */}
      <g className="text-sky-600 dark:text-sky-400">
        {markers.map((marker) => {
          const cx = x(marker.score);
          const cy = y(marker.density);
          const labelY = marker.labelRow != null ? LABEL_ROW_Y[marker.labelRow] : null;
          // Centred labels, except near the edges where centring would push the
          // text out of the viewBox and clip it.
          const half = estimateLabelWidthUnits(marker.code) / 2;
          const anchor = cx - half < 4 ? "start" : cx + half > W - 4 ? "end" : "middle";
          const percentile = Math.round(marker.percentile * 100);
          return (
            <g key={marker.code}>
              <title>
                {`${marker.name} — Read ${fmt(marker.score)}` +
                  (marker.readLabel ? ` · ${marker.readLabel}` : "") +
                  ` · above ${percentile}% of covered companies`}
              </title>
              {/* One line from the axis, through the dot, up to the label: the
                  leader and the stem are the same stroke, so a labelled needle
                  never reads as two marks. */}
              <line
                x1={cx}
                x2={cx}
                y1={BASELINE}
                y2={labelY != null ? labelY + 6 : cy}
                className="stroke-current"
                strokeWidth={1.5}
                strokeOpacity={0.55}
              />
              <circle
                cx={cx}
                cy={cy}
                r={5}
                className="fill-current stroke-background"
                strokeWidth={2.5}
              />
              {labelY != null && (
                <text
                  x={cx}
                  y={labelY}
                  textAnchor={anchor}
                  className="fill-current font-semibold"
                  fontSize={MARKER_LABEL_FONT}
                >
                  {marker.code}
                  <tspan
                    className="fill-muted-foreground font-normal tabular-nums"
                    fontSize={MARKER_SCORE_FONT}
                  >
                    {` ${fmt(marker.score)}`}
                  </tspan>
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/**
 * The whole figure compressed to one line, for the collapsed state.
 *
 * The curve is supporting evidence — it earns a click, not permanent height.
 * But "your median against the field" is the one thing a reader would have
 * taken from it anyway, and it costs a single row, so it stays visible whether
 * the chart is open or not.
 */
export function ReadDistributionHeadline({ distribution }: { distribution: ReadDistribution }) {
  const { markerMedian, universeMedian, universeCount } = distribution;
  return (
    <span className="text-[11px] text-muted-foreground">
      {markerMedian != null ? (
        <>
          your median{" "}
          <span className="font-semibold tabular-nums text-foreground">{fmt(markerMedian)}</span>{" "}
          vs <span className="tabular-nums">{fmt(universeMedian)}</span> across {universeCount}{" "}
          covered companies
        </>
      ) : (
        <>{universeCount} covered companies, median {fmt(universeMedian)}</>
      )}
    </span>
  );
}

/** Legend + the one comparison a reader wants in words, not pixels. */
export function ReadDistributionLegend({
  distribution,
  subjectLabel,
}: {
  distribution: ReadDistribution;
  subjectLabel: string;
}) {
  const { universeCount, universeMedian, markerMedian, markers, unplottedCount } = distribution;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-[2px] bg-foreground/15 ring-1 ring-inset ring-foreground/25" />
        {universeCount} covered companies
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-sky-600 dark:bg-sky-400" />
        {markers.length} from {subjectLabel}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0 w-4 border-t border-dashed border-foreground/40" />
        Universe median {fmt(universeMedian)}
      </span>
      {markerMedian != null && (
        <span>
          Your median{" "}
          <span className="font-semibold tabular-nums text-foreground">{fmt(markerMedian)}</span>
        </span>
      )}
      {unplottedCount > 0 && (
        <span>
          {unplottedCount} not plotted (no read)
        </span>
      )}
    </div>
  );
}
