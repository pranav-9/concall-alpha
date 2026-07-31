// The shape of the Read column across the covered universe, plus where a given
// set of companies (a watchlist) falls on it.
//
// WHY A CURVE AND NOT A RANK. The board below already answers "which of mine is
// best" — it's sorted. What it can't show is the reference population: a Read of
// 7.1 means nothing until you know the universe clusters at 6.4 with a thin
// right tail. This is the only surface that carries that context, so it renders
// the distribution, not another ordering.
//
// PURE MATH ONLY — no React, no colour, no pixels. The component owns geometry;
// this file owns the statistics so they can be pinned by tests/read-distribution.test.ts.
// Everything here is in SCORE UNITS (0–10), never viewBox units.

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

const finite = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n);

/** Linear-interpolated quantile over an ASCENDING array. */
export function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return Number.NaN;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const pos = (sortedAsc.length - 1) * clamp(q, 0, 1);
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedAsc[base + 1];
  return next === undefined ? sortedAsc[base] : sortedAsc[base] + rest * (next - sortedAsc[base]);
}

/**
 * Silverman's rule of thumb, with the IQR term that keeps one outlier from
 * over-smoothing the body, and hard bounds either side.
 *
 * The bounds are the load-bearing part at our n. Unbounded, ~100 companies with
 * sd(Read) around 0.5 give h ≈ 0.18, which renders as a comb of one bump per
 * company rather than a distribution; and a near-degenerate spread gives h → 0,
 * which divides by zero. 0.12–1.2 keeps the curve readable at both ends.
 */
export function silvermanBandwidth(sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n < 2) return 0.5;
  const mean = sortedAsc.reduce((a, b) => a + b, 0) / n;
  const variance = sortedAsc.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const iqr = quantile(sortedAsc, 0.75) - quantile(sortedAsc, 0.25);
  const spread = iqr > 0 ? Math.min(sd, iqr / 1.349) : sd;
  return clamp(0.9 * (spread > 0 ? spread : 0.3) * Math.pow(n, -1 / 5), 0.12, 1.2);
}

const gaussian = (u: number) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);

/** Share of the population strictly below `score`, 0–1. */
export function percentileOf(score: number, population: number[]): number {
  if (population.length === 0) return 0;
  let below = 0;
  for (const value of population) if (value < score) below += 1;
  return below / population.length;
}

export type ReadDistributionInput = {
  code: string;
  name: string;
  /** The board composite. Null (or a "no read" row) drops out of the plot. */
  score: number | null;
  /** The configuration word from lib/board-read, e.g. "Aligned & cheap". */
  readLabel?: string | null;
};

export type PlottedMarker = {
  code: string;
  name: string;
  score: number;
  readLabel: string | null;
  /** Height of the curve at this score, 0–1 — where the marker's dot sits. */
  density: number;
  /** Share of the universe this company reads above, 0–1. */
  percentile: number;
  /**
   * Which label row this marker gets, or null when it was crowded out. Markers
   * are always drawn; only the text is rationed.
   */
  labelRow: number | null;
};

export type ReadDistribution = {
  /** Sampled density, normalised so the mode is 1. */
  curve: Array<{ score: number; density: number }>;
  domain: [number, number];
  ticks: number[];
  /** One value per covered company — drawn as the baseline rug. */
  rug: number[];
  universeCount: number;
  universeMedian: number;
  /** Median of the plotted markers, for the "yours vs the field" line. */
  markerMedian: number | null;
  markers: PlottedMarker[];
  /** Markers with no read — counted, not plotted. */
  unplottedCount: number;
  bandwidth: number;
};

const SAMPLES = 121;
const MAX_LABELS = 6;
const LABEL_ROWS = 2;

// Label geometry, in the component's viewBox units. It lives here because the
// collision test needs it and the collision test has to be testable — the
// component imports these back so the two can't drift.
/** Plot width the component draws into (viewBox width minus both pads). */
export const PLOT_WIDTH_UNITS = 672;
export const MARKER_LABEL_FONT = 20;
export const MARKER_SCORE_FONT = 16;
/** Breathing room between two labels that sit side by side. */
const LABEL_GUTTER = 14;

/**
 * Width of "TICKER 8.4" in viewBox units.
 *
 * Estimated from character count rather than measured, because this renders on
 * the server where there is no text metrics API. The 0.62 em factor is an
 * upper-ish bound for the bold uppercase tickers we actually show, so the
 * estimate errs toward spacing labels out rather than overprinting them.
 */
export function estimateLabelWidthUnits(code: string): number {
  return code.length * 0.62 * MARKER_LABEL_FONT + 4 * 0.6 * MARKER_SCORE_FONT;
}

/**
 * Ration the labels: extremes first, then anything that still fits.
 *
 * Priority is distance from the universe median because those are the markers
 * that carry information — a holding sitting exactly on the median is the one
 * whose name you least need printed, since the median line already says where
 * it is. Ties break on code so the layout is stable across renders.
 *
 * Collision is tested against BOTH labels' widths, not a fixed gap. A fixed gap
 * is what the first cut used, and an eight-character ticker promptly printed
 * straight through its neighbour: the needles were far enough apart, the text
 * wasn't.
 */
export function layoutMarkerLabels<T extends { code: string; score: number }>(
  markers: T[],
  {
    median,
    domainSpan,
    maxLabels = MAX_LABELS,
    rows = LABEL_ROWS,
    plotWidth = PLOT_WIDTH_UNITS,
    widthOf = (marker: T) => estimateLabelWidthUnits(marker.code),
  }: {
    median: number;
    domainSpan: number;
    maxLabels?: number;
    rows?: number;
    plotWidth?: number;
    /** Rendered label width in viewBox units. */
    widthOf?: (marker: T) => number;
  },
): Map<string, number> {
  // Score units per viewBox unit — collisions are a pixel problem, priorities
  // are a score problem, so one of them has to be converted.
  const perUnit = domainSpan / plotWidth;
  const byPriority = [...markers].sort((a, b) => {
    const diff = Math.abs(b.score - median) - Math.abs(a.score - median);
    return diff !== 0 ? diff : a.code.localeCompare(b.code);
  });

  const placedByRow: Array<Array<{ score: number; halfWidth: number }>> = Array.from(
    { length: rows },
    () => [],
  );
  const assignment = new Map<string, number>();

  for (const marker of byPriority) {
    if (assignment.size >= maxLabels) break;
    const halfWidth = (widthOf(marker) / 2) * perUnit;
    const gutter = (LABEL_GUTTER / 2) * perUnit;
    for (let row = 0; row < rows; row += 1) {
      const collides = placedByRow[row].some(
        (placed) =>
          Math.abs(placed.score - marker.score) < placed.halfWidth + halfWidth + gutter,
      );
      if (collides) continue;
      placedByRow[row].push({ score: marker.score, halfWidth });
      assignment.set(marker.code, row);
      break;
    }
  }

  return assignment;
}

/**
 * Build the whole plot model.
 *
 * `universeScores` is the reference population (covered companies with a read);
 * `markers` is the subset being highlighted. A marker need NOT be in the
 * universe — a watchlist is user-owned and can hold a large cap, which the
 * coverage policy keeps out of the reference population. It still gets plotted.
 */
export function buildReadDistribution(
  universeScores: Array<number | null | undefined>,
  markers: ReadDistributionInput[],
): ReadDistribution | null {
  const universe = universeScores.filter(finite).sort((a, b) => a - b);
  const plottable = markers.filter((m): m is ReadDistributionInput & { score: number } =>
    finite(m.score),
  );

  // Under ~12 companies a kernel density estimate is drawing its own bandwidth,
  // not the data. Better to render nothing than a bell that isn't one.
  if (universe.length < 12) return null;

  const bandwidth = silvermanBandwidth(universe);

  const observed = [...universe, ...plottable.map((m) => m.score)];
  const lo = clamp(Math.min(...observed) - 1.5 * bandwidth, 0, 10);
  const hi = clamp(Math.max(...observed) + 1.5 * bandwidth, 0, 10);
  const domain: [number, number] = lo < hi ? [lo, hi] : [clamp(lo - 0.5, 0, 10), clamp(hi + 0.5, 0, 10)];
  const span = domain[1] - domain[0];

  const densityAt = (x: number) => {
    let sum = 0;
    for (const value of universe) sum += gaussian((x - value) / bandwidth);
    return sum / (universe.length * bandwidth);
  };

  const raw = Array.from({ length: SAMPLES }, (_, i) => {
    const score = domain[0] + (span * i) / (SAMPLES - 1);
    return { score, density: densityAt(score) };
  });
  const peak = raw.reduce((max, p) => Math.max(max, p.density), 0) || 1;
  const curve = raw.map((p) => ({ score: p.score, density: p.density / peak }));

  const universeMedian = quantile(universe, 0.5);
  const markerScores = plottable.map((m) => m.score).sort((a, b) => a - b);

  const labelRows = layoutMarkerLabels(
    plottable.map((m) => ({ code: m.code, score: m.score })),
    { median: universeMedian, domainSpan: span },
  );

  const markerList: PlottedMarker[] = plottable
    .map((m) => ({
      code: m.code,
      name: m.name,
      score: m.score,
      readLabel: m.readLabel ?? null,
      density: densityAt(m.score) / peak,
      percentile: percentileOf(m.score, universe),
      labelRow: labelRows.get(m.code) ?? null,
    }))
    // Draw left-to-right so overlapping stems stack predictably.
    .sort((a, b) => a.score - b.score || a.code.localeCompare(b.code));

  // Whole-number ticks unless the domain is too narrow to carry three of them.
  const wholeTicks: number[] = [];
  for (let t = Math.ceil(domain[0]); t <= Math.floor(domain[1]); t += 1) wholeTicks.push(t);
  const ticks =
    wholeTicks.length >= 3
      ? wholeTicks
      : (() => {
          const halves: number[] = [];
          for (let t = Math.ceil(domain[0] * 2) / 2; t <= domain[1]; t += 0.5) halves.push(t);
          return halves;
        })();

  return {
    curve,
    domain,
    ticks,
    rug: universe,
    universeCount: universe.length,
    universeMedian,
    markerMedian: markerScores.length > 0 ? quantile(markerScores, 0.5) : null,
    markers: markerList,
    unplottedCount: markers.length - plottable.length,
    bandwidth,
  };
}
