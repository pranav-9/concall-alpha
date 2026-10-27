// The ConcallScore tab's "Results" card: the scored quarter's reported P&L
// beside the quarter before it and the year-ago quarter, with YoY and QoQ
// changes. Pure arithmetic over concallyser's `quarterly_financials` rows
// (Screener's quarterly table; schema /schemas/quarterly_financials_v1.json).
// Nothing here is a judgement — a missing row simply drops its column, and a
// change off a non-positive base is "n/m", never a growth rate.
//
// Kept free of "@/" value imports so the node test runner can exercise it.

export type QuarterFinancialsPoint = {
  fy: number;
  qtr: number;
  /** YYYY-MM-DD, the quarter's last day. */
  periodEnd: string;
  basis: "consolidated" | "standalone";
  revenueCr: number | null;
  operatingProfitCr: number | null;
  opmPct: number | null;
  netProfitCr: number | null;
  eps: number | null;
};

export type ResultsChange =
  | { kind: "pct"; value: number }
  /** An amount that at least tenfolded: "129×" reads, "+12,825%" does not. */
  | { kind: "multiple"; value: number }
  /** A margin: the move in percentage points. */
  | { kind: "pp"; value: number }
  /** Base non-positive (a loss-to-profit swing is not a growth rate), or a side missing. */
  | { kind: "n/m" }
  | null;

export type ResultsMetricKey = "revenue" | "operating_profit" | "opm" | "net_profit" | "eps";

export type ResultsRow = {
  key: ResultsMetricKey;
  label: string;
  unit: "cr" | "pct" | "rs";
  /** Indented under its parent (OPM under operating profit). */
  sub: boolean;
  current: number | null;
  previous: number | null;
  yearAgo: number | null;
  yoy: ResultsChange;
  qoq: ResultsChange;
};

export type ResultsColumn = { fy: number; qtr: number; label: string };

export type QuarterResults = {
  /** The scored quarter. */
  quarter: ResultsColumn;
  /** The quarter before; null when no row is on file. */
  previous: ResultsColumn | null;
  /** The same quarter a year earlier; null when no row is on file. */
  yearAgo: ResultsColumn | null;
  basis: "consolidated" | "standalone";
  rows: ResultsRow[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-30" → "Sep 2026" (Screener's own column header). */
export const periodEndLabel = (periodEnd: string): string => {
  const m = periodEnd.match(/^(\d{4})-(\d{2})/);
  if (!m) return periodEnd;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : periodEnd;
};

/** Fiscal quarter index for ordering: Q1 FY27 = 2027*4 + 0. */
const quarterIndex = (fy: number, qtr: number) => fy * 4 + (qtr - 1);

const findRow = (rows: QuarterFinancialsPoint[], fy: number, qtr: number) =>
  rows.find((r) => r.fy === fy && r.qtr === qtr) ?? null;

const previousQuarter = (fy: number, qtr: number): { fy: number; qtr: number } =>
  qtr === 1 ? { fy: fy - 1, qtr: 4 } : { fy, qtr: qtr - 1 };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Growth off a positive base; a tenfold-or-more amount becomes a multiple. */
export const amountChange = (current: number | null, base: number | null): ResultsChange => {
  if (current == null || base == null) return null;
  if (base <= 0) return { kind: "n/m" };
  const ratio = current / base;
  if (ratio >= 10) return { kind: "multiple", value: Math.round(ratio) };
  return { kind: "pct", value: round1((ratio - 1) * 100) };
};

/** Percentage-point move of a margin. */
export const marginChange = (current: number | null, base: number | null): ResultsChange => {
  if (current == null || base == null) return null;
  return { kind: "pp", value: round1(current - base) };
};

const column = (row: QuarterFinancialsPoint): ResultsColumn => ({
  fy: row.fy,
  qtr: row.qtr,
  label: periodEndLabel(row.periodEnd),
});

/**
 * The results table for the quarter scored at (fy, qtr). Null when no P&L row
 * exists for that quarter — the card then stays off the page rather than
 * showing a table of dashes. Rows whose value is null in every column drop
 * (a bank has no OPM line worth printing when Screener leaves it blank).
 */
export function buildQuarterResults(
  rows: QuarterFinancialsPoint[],
  fy: number,
  qtr: number,
): QuarterResults | null {
  const current = findRow(rows, fy, qtr);
  if (!current) return null;
  const prevKey = previousQuarter(fy, qtr);
  const previous = findRow(rows, prevKey.fy, prevKey.qtr);
  const yearAgo = findRow(rows, fy - 1, qtr);

  const amountRow = (
    key: ResultsMetricKey,
    label: string,
    unit: "cr" | "rs",
    pick: (r: QuarterFinancialsPoint) => number | null,
  ): ResultsRow => ({
    key,
    label,
    unit,
    sub: false,
    current: pick(current),
    previous: previous ? pick(previous) : null,
    yearAgo: yearAgo ? pick(yearAgo) : null,
    yoy: amountChange(pick(current), yearAgo ? pick(yearAgo) : null),
    qoq: amountChange(pick(current), previous ? pick(previous) : null),
  });

  const rowsOut: ResultsRow[] = [
    amountRow("revenue", "Revenue", "cr", (r) => r.revenueCr),
    amountRow("operating_profit", "Operating profit", "cr", (r) => r.operatingProfitCr),
    {
      key: "opm" as const,
      label: "OPM",
      unit: "pct" as const,
      sub: true,
      current: current.opmPct,
      previous: previous?.opmPct ?? null,
      yearAgo: yearAgo?.opmPct ?? null,
      yoy: marginChange(current.opmPct, yearAgo?.opmPct ?? null),
      qoq: marginChange(current.opmPct, previous?.opmPct ?? null),
    },
    amountRow("net_profit", "PAT", "cr", (r) => r.netProfitCr),
    amountRow("eps", "EPS", "rs", (r) => r.eps),
  ].filter((row) => row.current != null || row.previous != null || row.yearAgo != null);

  if (rowsOut.length === 0) return null;

  return {
    quarter: column(current),
    previous: previous ? column(previous) : null,
    yearAgo: yearAgo ? column(yearAgo) : null,
    basis: current.basis,
    rows: rowsOut,
  };
}

/** Newest-first order helper for callers that hold the rows unsorted. */
export const sortNewestFirst = (rows: QuarterFinancialsPoint[]) =>
  [...rows].sort((a, b) => quarterIndex(b.fy, b.qtr) - quarterIndex(a.fy, a.qtr));
