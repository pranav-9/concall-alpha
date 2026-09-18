import type { NormalizedRevenueMixHistoryBySegment } from "./types";

export function buildBusinessMixPeriods(history: NormalizedRevenueMixHistoryBySegment) {
  const rows = history.rows.filter((row) => !row.isTotal);
  return history.years.map((year) => {
    const known = rows.flatMap((row) => {
      const value = row.mixPercentByYear[year];
      const comparable = row.comparabilityLabel === "reported" || row.comparabilityLabel === "restated";
      return comparable && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
        ? [{ name: row.segment, value }] : [];
    });
    const total = known.reduce((sum, item) => sum + item.value, 0);
    return { year, known, total, valid: known.length >= 2 && total > 0 && total <= 100 };
  });
}

/** Earliest vs latest disclosed-and-comparable period, for a two-bar compare.
 * An outer year in the window can itself be non-comparable, so this picks the
 * first/last VALID entries rather than assuming years[0]/years[years.length-1]. */
export function pickComparisonPeriods(periods: ReturnType<typeof buildBusinessMixPeriods>) {
  const valid = periods.filter((period) => period.valid);
  if (valid.length < 2) return null;
  return { baseline: valid[0], latest: valid[valid.length - 1] };
}

/** Percentage-point delta from the first to the last period in a series.
 * Shared by the by-unit/by-segment history tables (historical-economics-data-pack.tsx)
 * and the segment history panel's "Mix % · Δ Share" column — same operation,
 * previously duplicated per caller. `latestFallback` covers rows (like segment
 * mix history) that carry a separately-disclosed latest value alongside the
 * period series. */
export function getBaselineToLatestPpDelta(
  valuesByPeriod: Record<string, number | null>,
  periods: string[],
  latestFallback?: number | null,
) {
  if (periods.length === 0) return null;
  const firstValue = valuesByPeriod[periods[0]];
  const latestValue = valuesByPeriod[periods[periods.length - 1]] ?? latestFallback ?? null;
  if (typeof firstValue !== "number" || typeof latestValue !== "number") return null;
  return latestValue - firstValue;
}

/**
 * Segment-name → Δ-share (percentage points, first-to-latest disclosed year)
 * from the historical-economics revenue-mix-history slot. That slot and
 * segment_history_annual come from the same LLM call but are
 * schema-independent free-text `segment` fields — matched by exact
 * trim+lowercase, silent no-delta on a mismatch (no fuzzy matching), matching
 * this codebase's "legitimate absence renders as absent" convention.
 */
export function buildDeltaShareBySegment(
  history: NormalizedRevenueMixHistoryBySegment | null | undefined,
): Map<string, number | null> {
  const map = new Map<string, number | null>();
  if (!history) return map;
  history.rows
    .filter((row) => !row.isTotal)
    .forEach((row) => {
      const delta = getBaselineToLatestPpDelta(row.mixPercentByYear, history.years, row.latestMixPercent);
      map.set(row.segment.trim().toLowerCase(), delta);
    });
  return map;
}

/** Period-over-period point change ending at `period` (null at the series' first period). */
export function getPeriodOverPeriodPpChange(
  periods: string[],
  valuesByPeriod: Record<string, number | null>,
  period: string,
) {
  const periodIndex = periods.indexOf(period);
  if (periodIndex <= 0) return null;
  const currentValue = valuesByPeriod[periods[periodIndex]];
  const previousValue = valuesByPeriod[periods[periodIndex - 1]];
  if (typeof currentValue !== "number" || typeof previousValue !== "number") return null;
  return currentValue - previousValue;
}

/** "+Npp" / "-Npp" / "0pp" for a percentage-point delta. */
export function formatMixDeltaLabel(value: number | null | undefined) {
  if (value == null) return "—";
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}pp`;
}

/** Emerald/rose/neutral pill tone for a signed delta (CAGR, Δ Share, etc). */
export function getCagrDisplayClassName(value: number | null | undefined) {
  if (value == null) {
    return "border-border/60 bg-muted/60 text-muted-foreground";
  }
  if (value > 0) {
    return "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200";
  }
  if (value < 0) {
    return "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200";
  }
  return "border-border/60 bg-muted/60 text-foreground";
}
