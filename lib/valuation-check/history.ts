// Valuation score history → sparkline points.
//
// `valuation_check` holds only the current read (one row, overwritten on every
// re-pricing). The time series lives in the append-only `valuation_check_history`
// table — one row per recomputation. This turns those rows into the {period, value}
// shape KpiSparkline expects, plotting the published verdict SCORE over time.
//
// Two rules mirror the pipeline's own `--evaluate` grouping:
//   1. Dedupe by `priced_as_of`, keeping the latest `recorded_at` — a single as-of
//      date can be re-run several times; the reader should see one point per date.
//   2. Drop rows with no score or no as-of date (not plottable).

export type ValuationScorePoint = { period: string; value: number };

export type ValuationScoreHistoryRow = {
  priced_as_of: string | null;
  recorded_at: string;
  score: number | null;
};

export function buildValuationScoreHistory(
  rows: ValuationScoreHistoryRow[] | null,
): ValuationScorePoint[] {
  if (!rows?.length) return [];

  const latestByDate = new Map<string, ValuationScoreHistoryRow>();
  for (const row of rows) {
    if (row.priced_as_of == null || row.score == null) continue;
    const existing = latestByDate.get(row.priced_as_of);
    if (!existing || row.recorded_at > existing.recorded_at) {
      latestByDate.set(row.priced_as_of, row);
    }
  }

  return [...latestByDate.values()]
    .sort((a, b) => (a.priced_as_of! < b.priced_as_of! ? -1 : 1))
    .map((row) => ({ period: row.priced_as_of!, value: row.score! }));
}
