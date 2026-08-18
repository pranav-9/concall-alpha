// "What the price is assuming" — the reverse-DCF implied CAGR placed on one axis against our
// fair-value cases (Phase 5 downside/base/upside) and what the company has actually delivered
// (delivered revenue CAGR). Three encodings, matching the legend:
//   • fair-value cases  → violet
//   • what it's delivered → teal
//   • the ask (implied) → orange, emphasised
// Server-rendered SVG, no client JS. Units are percent throughout (scenarios arrive as fractions
// and are scaled here). Follows the viewBox/tailwind-ink conventions of read-distribution-curve.
//
// The below-axis markers get greedy multi-row label placement: when the implied CAGR sits far from
// the cases/delivered (e.g. price implies 47% but everything delivered clustered at 10–22%), the
// left markers bunch up, so labels stack into as many rows as collision-avoidance needs and the
// viewBox grows to fit. Labels are kept short ("Base 17.5%", "5y 22%") to reduce stacking.

type Marker = {
  id: string;
  label: string;
  pct: number;
  kind: "case" | "delivered" | "ask";
};

// viewBox units — large type relative to the box so it stays legible when the SVG scales down to a
// phone. One row above the axis for the ask; below-axis labels stack downward as needed.
const W = 340;
const PAD_X = 22;
const PLOT_LEFT = PAD_X;
const PLOT_RIGHT = W - PAD_X;
const AXIS_Y = 40;
const ASK_LABEL_Y = 24;
const BELOW_FIRST_ROW_Y = 53;
const ROW_H = 12;
// Rough glyph width at fontSize 8 in viewBox units, plus padding, for collision estimation.
const CHAR_W = 4.1;
const LABEL_PAD = 7;

const KIND_INK: Record<Marker["kind"], string> = {
  case: "text-violet-600 dark:text-violet-400",
  delivered: "text-teal-600 dark:text-teal-400",
  ask: "text-orange-600 dark:text-orange-400",
};

const fmtPct = (n: number) => `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;

const shortLabel = (m: Marker): string => {
  if (m.kind === "case") {
    const name = m.id === "downside" ? "Down" : m.id === "upside" ? "Up" : "Base";
    return `${name} ${fmtPct(m.pct)}`;
  }
  // delivered ids are `delivered-<key>`.
  const key = m.id.replace("delivered-", "");
  const name = key === "1y" || key === "ttm" ? "TTM" : key;
  return `${name} ${fmtPct(m.pct)}`;
};

export function ValuationHorizonBar({
  impliedPct,
  scenarios,
  delivered,
}: {
  impliedPct: number;
  scenarios: { downside: number | null; base: number | null; upside: number | null };
  delivered: { key: string; label: string; pct: number }[];
}) {
  const markers: Marker[] = [];
  // Scenarios are fractions (0.23) — scale to percent.
  if (scenarios.downside !== null)
    markers.push({ id: "downside", label: "Downside", pct: scenarios.downside * 100, kind: "case" });
  if (scenarios.base !== null)
    markers.push({ id: "base", label: "Base", pct: scenarios.base * 100, kind: "case" });
  if (scenarios.upside !== null)
    markers.push({ id: "upside", label: "Upside", pct: scenarios.upside * 100, kind: "case" });
  for (const d of delivered)
    markers.push({ id: `delivered-${d.key}`, label: d.label, pct: d.pct, kind: "delivered" });
  markers.push({ id: "ask", label: "Price implies", pct: impliedPct, kind: "ask" });

  const values = markers.map((m) => m.pct);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const range = hi - lo || 1;
  const pad = Math.max(2, range * 0.14);
  const domainLo = lo - pad;
  const domainHi = hi + pad;
  const span = domainHi - domainLo || 1;
  const x = (pct: number) => PLOT_LEFT + ((pct - domainLo) / span) * (PLOT_RIGHT - PLOT_LEFT);

  const ask = markers.find((m) => m.kind === "ask")!;

  // Greedy row assignment for the below-axis labels: left→right, first row that clears the last
  // label placed in it.
  const below = markers.filter((m) => m.kind !== "ask").sort((a, b) => a.pct - b.pct);
  const rowsRight: number[] = [];
  const placed = below.map((m) => {
    const cx = x(m.pct);
    const label = shortLabel(m);
    const halfW = (label.length * CHAR_W + LABEL_PAD) / 2;
    let row = 0;
    while (row < rowsRight.length && cx - halfW < rowsRight[row] + 2) row++;
    rowsRight[row] = cx + halfW;
    return { m, cx, label, row };
  });
  const rowCount = Math.max(1, rowsRight.length);
  const H = BELOW_FIRST_ROW_Y + rowCount * ROW_H;

  const ariaLabel =
    `Today's price implies ${fmtPct(impliedPct)} revenue growth a year. ` +
    below.map((m) => `${m.label} ${fmtPct(m.pct)}`).join(", ") + ".";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Shade the gap between our highest fair-value case and the ask, when the ask sits above it
          — the extra growth the price is demanding beyond anything we model. */}
      {(() => {
        const cases = markers.filter((m) => m.kind === "case");
        if (!cases.length) return null;
        const topCase = Math.max(...cases.map((m) => m.pct));
        if (ask.pct <= topCase) return null;
        return (
          <rect
            x={x(topCase)}
            y={AXIS_Y - 5}
            width={x(ask.pct) - x(topCase)}
            height={10}
            className="fill-orange-500/15"
          />
        );
      })()}

      {/* Axis. */}
      <line
        x1={PLOT_LEFT}
        x2={PLOT_RIGHT}
        y1={AXIS_Y}
        y2={AXIS_Y}
        className="stroke-border"
        strokeWidth={1.5}
      />

      {/* Below-axis markers with stacked labels. */}
      {placed.map(({ m, cx, label, row }) => {
        const labelY = BELOW_FIRST_ROW_Y + row * ROW_H;
        const anchor = cx < PLOT_LEFT + 20 ? "start" : cx > PLOT_RIGHT - 20 ? "end" : "middle";
        return (
          <g key={m.id} className={KIND_INK[m.kind]}>
            <title>{`${m.label} — ${fmtPct(m.pct)}`}</title>
            <line
              x1={cx}
              x2={cx}
              y1={AXIS_Y}
              y2={labelY - 8}
              className="stroke-current"
              strokeWidth={1}
              strokeOpacity={0.4}
            />
            <circle cx={cx} cy={AXIS_Y} r={3} className="fill-current stroke-background" strokeWidth={1.5} />
            <text x={cx} y={labelY} textAnchor={anchor} className="fill-current font-medium tabular-nums" fontSize={8}>
              {label}
            </text>
          </g>
        );
      })}

      {/* The ask, above the axis, emphasised (the exact number leads the block header, so this is a
          compact single label, not a second giant figure). */}
      {(() => {
        const cx = x(ask.pct);
        const anchor = cx < PLOT_LEFT + 40 ? "start" : cx > PLOT_RIGHT - 40 ? "end" : "middle";
        return (
          <g className={KIND_INK.ask}>
            <title>{`Price implies ${fmtPct(ask.pct)}`}</title>
            <line x1={cx} x2={cx} y1={ASK_LABEL_Y + 3} y2={AXIS_Y} className="stroke-current" strokeWidth={1.5} />
            <circle cx={cx} cy={AXIS_Y} r={4.5} className="fill-current stroke-background" strokeWidth={2} />
            <text x={cx} y={ASK_LABEL_Y} textAnchor={anchor} className="fill-current font-semibold tabular-nums" fontSize={9}>
              Price implies {fmtPct(ask.pct)}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

/** Legend row for the horizon bar, matching the three marker encodings. */
export function ValuationHorizonLegend({ hasDelivered }: { hasDelivered: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-violet-500" />
        our fair-value cases
      </span>
      {hasDelivered ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-500" />
          what it&apos;s delivered
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-orange-500" />
        the ask
      </span>
    </div>
  );
}
