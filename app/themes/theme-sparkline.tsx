// The KPI tile's sparkline: a server-rendered inline SVG, no chart library.
// Actual points are drawn solid, estimates dashed from the last actual, with a
// dot on the last actual so the eye lands where the series really is. First and
// last period labels sit under the line. Two points is a valid series (a from →
// to figure); the schema forbids padding, so never interpolate here.

import type { ThemeStoryPoint } from "@/lib/themes/story";

const W = 120;
const H = 36;
const PAD_X = 4;
const PAD_Y = 5;

export function ThemeSparkline({ points, label }: { points: readonly ThemeStoryPoint[]; label: string }) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const xs = points.map((_, i) => PAD_X + (i * (W - 2 * PAD_X)) / (points.length - 1));
  const ys = points.map((p) => PAD_Y + (H - 2 * PAD_Y) * (1 - (p.value - min) / span));

  let lastActual = -1;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (!points[i].est) {
      lastActual = i;
      break;
    }
  }
  const pt = (i: number) => `${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
  const solid = lastActual >= 1 ? points.slice(0, lastActual + 1).map((_, i) => pt(i)).join(" ") : null;
  const dashedFrom = lastActual >= 0 ? lastActual : 0;
  const dashed =
    dashedFrom < points.length - 1
      ? points
          .slice(dashedFrom)
          .map((_, i) => pt(dashedFrom + i))
          .join(" ")
      : null;
  const first = points[0].period;
  const last = points[points.length - 1];
  const lastLabel = `${last.period}${last.est ? "E" : ""}`;

  return (
    <figure className="m-0 flex shrink-0 flex-col items-stretch">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={`${label}: ${points.map((p) => `${p.period}${p.est ? " (est)" : ""} ${p.value}`).join(", ")}`}
        className="block overflow-visible text-teal-600 dark:text-teal-400"
      >
        {solid && (
          <polyline points={solid} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {dashed && (
          <polyline
            points={dashed}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.8}
          />
        )}
        {lastActual >= 0 && (
          <circle cx={xs[lastActual]} cy={ys[lastActual]} r={3} className="fill-amber-500 dark:fill-amber-400" />
        )}
      </svg>
      <figcaption className="mt-1 flex justify-between font-mono text-[10px] tracking-[0.02em] text-muted-foreground/70">
        <span>{first}</span>
        <span>{lastLabel}</span>
      </figcaption>
    </figure>
  );
}
