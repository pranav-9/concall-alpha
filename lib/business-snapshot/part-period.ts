import type { NormalizedRevenueHistoryBySegment } from "./types";

/**
 * The segment revenue table's part-year column (2026-10-30, MTARTECH). A results-season pass stores the newest half
 * or quarter as `latest_period` ("H1 FY27") with each row's `latest_period_revenue`, beside full fiscal years in
 * `years`. It renders as its own column after the years — never inside the year series, where a half beside a full
 * year reads as a fall — and stays out of the period-over-period deltas, the sparkline and the CAGR.
 *
 * Returns the column label, or null when the period is already a year column, is blank, or no row carries a figure.
 */
export function partPeriodColumn(module: NormalizedRevenueHistoryBySegment): string | null {
  const period = module.latestPeriod?.trim();
  if (!period || module.years.includes(period)) return null;
  const hasFigure = module.rows.some(
    (row) => typeof row.latestPeriodRevenue === "number" && Number.isFinite(row.latestPeriodRevenue),
  );
  return hasFigure ? period : null;
}
