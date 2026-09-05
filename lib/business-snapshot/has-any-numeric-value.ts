/**
 * True when at least one row carries a finite number in at least one of the
 * given periods. The history tables in the Business Snapshot render a full
 * grid of "—" cells (and a blank sparkline per row) for a module whose rows
 * are all null — this is the guard that skips that grid while keeping the
 * module's prose takeaways. NaN is not a value.
 */
export function hasAnyNumericValue<Row>(
  rows: readonly Row[],
  periods: readonly string[],
  pick: (row: Row) => Record<string, number | null | undefined>,
): boolean {
  return rows.some((row) => {
    const values = pick(row);
    return periods.some((period) => Number.isFinite(values[period]));
  });
}
