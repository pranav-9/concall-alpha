// The Order book scan — every covered company that discloses an order book,
// ranked by that book against today's market cap, with how fast the book is
// growing beside it (so a small book that is compounding shows as well as a
// big one). PURE: the book is the ₹-crore level series the company's Key
// Variables card already tracks (lib/key-variables-snapshot), the market cap is
// the Screener figure under its Valuation Check, so a row here restates what
// that company's own page prints. Descriptive only — a backlog is not revenue
// until it is executed, and a book can be multi-year.

import { assessStaleness } from "@/lib/valuation-check/normalize";

import type { ScanCompany } from "./red-flags";

/** A book last disclosed longer ago than this is held back — too old to set against today's price. */
export const OLD_BOOK_AFTER_DAYS = 455;

export type BookPeriod = { fy: number; qtr: number; label: string };
export type BookPoint = BookPeriod & { value: number };

export type OrderBookSeries = {
  variable: string;
  metric: string;
  /** Oldest first, ₹ cr. */
  points: BookPoint[];
};

export type OrderBookRow = ScanCompany & {
  variable: string;
  /** The row's own label — names a segment book ("Defence order book (₹ cr)") where that is all the company discloses. */
  metric: string;
  /** ₹ cr, the latest disclosed level. */
  book: number;
  period: BookPeriod;
  growthPct: number | null;
  growthFrom: BookPeriod | null;
  /** `yoy` = the same period a year earlier; `prior` = the previous disclosed point. */
  growthKind: "yoy" | "prior" | null;
  /** ₹ cr, Screener via the Valuation Check. */
  marketCap: number;
  pricedAsOf: string | null;
  priceAtRun: number | null;
};

// ── Reading the Key Variables series ─────────────────────────────────────────

const BOOK_RE = /order\s*-?\s*book|orderbook|backlog|unexecuted|orders?\s+(?:in|on)\s+hand|confirmed\s+POs/i;
/** A row about the book that is not its level: a share, a ratio, a flow, a count, or revenue under a book-named variable. */
const NOT_A_LEVEL_RE =
  /share|%|\bmix\b|growth|change|ratio|\bcover\b|coverage|\(x\)|÷|inflow|intake|added|\bwon\b|\bwins?\b|booked|\bnew\b|pipeline|conversion|count|\bMWh?\b|signed|TCV|contract value|potential|lifetime|revenue|sales/i;
const RUPEE_RE = /₹|INR|\bRs\.?|rupee/i;
const SCALES: ReadonlyArray<readonly [RegExp, number]> = [
  [/\bcr\b|crores?/i, 1],
  [/\bmn\b|million/i, 0.1],
  [/\bbn\b|billion/i, 100],
  [/lakhs?/i, 0.01],
];

/** ₹-crore multiplier named in a unit text ("₹ cr", "Rs. in Mn", "INR bn"), or null when it is not rupee money. */
export function rupeeCroreScale(text: string | null | undefined): number | null {
  if (!text || !RUPEE_RE.test(text)) return null;
  for (const [re, scale] of SCALES) if (re.test(text)) return scale;
  return null;
}

const PERIOD_RE = /^(?:(Q[1-4])|(H[12])|(9M))?\s*'?FY\s*'?(\d{2}|\d{4})$/i;

/** "Q1 FY27" / "Q1FY27" / "FY26" / "H1 FY26" / "9M FY25" → a period; anything else null. */
export function parseBookPeriod(raw: string | null | undefined): BookPeriod | null {
  const m = PERIOD_RE.exec((raw ?? "").trim());
  if (!m) return null;
  const year = Number(m[4]);
  const fy = year < 100 ? 2000 + year : year;
  const fyLabel = `FY${String(fy).slice(-2)}`;
  if (m[1]) {
    const qtr = Number(m[1].slice(1));
    return { fy, qtr, label: `Q${qtr} ${fyLabel}` };
  }
  if (m[2]) {
    const half = m[2].toUpperCase();
    return { fy, qtr: half === "H1" ? 2 : 4, label: `${half} ${fyLabel}` };
  }
  if (m[3]) return { fy, qtr: 3, label: `9M ${fyLabel}` };
  return { fy, qtr: 4, label: fyLabel };
}

/** Last day of the period, ISO (Indian financial year: Q1 ends 30 Jun of fy-1 … Q4 ends 31 Mar of fy). */
export function bookPeriodEnd({ fy, qtr }: Pick<BookPeriod, "fy" | "qtr">): string {
  switch (qtr) {
    case 1:
      return `${fy - 1}-06-30`;
    case 2:
      return `${fy - 1}-09-30`;
    case 3:
      return `${fy - 1}-12-31`;
    default:
      return `${fy}-03-31`;
  }
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const asText = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const asNumber = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * The first deep-treated variable that carries the book's ₹ level over time:
 * the hero row first, then the rest, in the analyst's order. A row qualifies
 * when it (or its variable) names the book, it is a level rather than a share
 * or a flow, and its unit is rupee money — read off the row label, else the
 * hero row's lead unit, else the variable's name.
 */
export function pickOrderBookSeries(variables: unknown): OrderBookSeries | null {
  if (!Array.isArray(variables)) return null;
  for (const raw of variables) {
    const v = asRecord(raw);
    if (!v) continue;
    const variable = asText(v.variable);
    const history = asRecord(v.kpi_history);
    const rows = Array.isArray(history?.rows) ? history.rows.map(asRecord) : [];
    const leadRaw = asNumber(v.lead_metric_index) ?? 0;
    const lead = Number.isInteger(leadRaw) && leadRaw >= 0 && leadRaw < rows.length ? leadRaw : 0;
    const order = rows.length ? [lead, ...rows.map((_, i) => i).filter((i) => i !== lead)] : [];
    for (const i of order) {
      const row = rows[i];
      if (!row) continue;
      const metric = asText(row.metric);
      if (!(BOOK_RE.test(metric) || BOOK_RE.test(variable)) || NOT_A_LEVEL_RE.test(metric)) continue;
      const scale =
        rupeeCroreScale(metric) ?? (i === lead ? rupeeCroreScale(asText(v.lead_unit)) : null) ?? rupeeCroreScale(variable);
      if (scale == null) continue;
      const values = asRecord(row.values_by_period);
      if (!values) continue;
      const byKey = new Map<string, BookPoint>();
      for (const [label, value] of Object.entries(values)) {
        const period = parseBookPeriod(label);
        const n = asNumber(value);
        if (!period || n == null || n <= 0) continue;
        byKey.set(`${period.fy}-${period.qtr}`, { ...period, value: n * scale });
      }
      const points = [...byKey.values()].sort((a, b) => a.fy - b.fy || a.qtr - b.qtr);
      if (points.length === 0) continue;
      return { variable, metric, points };
    }
  }
  return null;
}

// ── Rows and the scan ────────────────────────────────────────────────────────

export function buildOrderBookRow(
  company: ScanCompany,
  series: OrderBookSeries,
  valuation: { marketCap: number; pricedAsOf: string | null; priceAtRun: number | null },
): OrderBookRow | null {
  const latest = series.points[series.points.length - 1];
  if (!latest || !(valuation.marketCap > 0)) return null;
  const yoy = series.points.find((p) => p.fy === latest.fy - 1 && p.qtr === latest.qtr) ?? null;
  const prior = series.points.length > 1 ? series.points[series.points.length - 2] : null;
  const from = yoy ?? prior;
  const { value: _v, ...period } = latest;
  void _v;
  return {
    ...company,
    variable: series.variable,
    metric: series.metric,
    book: latest.value,
    period,
    growthPct: from ? (latest.value / from.value - 1) * 100 : null,
    growthFrom: from ? { fy: from.fy, qtr: from.qtr, label: from.label } : null,
    growthKind: yoy ? "yoy" : prior ? "prior" : null,
    marketCap: valuation.marketCap,
    pricedAsOf: valuation.pricedAsOf,
    priceAtRun: valuation.priceAtRun,
  };
}

/** Rupees of signed-but-unbilled work per rupee of market value. */
export const orderBookRatio = (row: OrderBookRow) => row.book / row.marketCap;

/** Biggest book against the market cap first; ties by name. */
export function compareByRatio(a: OrderBookRow, b: OrderBookRow): number {
  return orderBookRatio(b) - orderBookRatio(a) || (a.name ?? a.code).localeCompare(b.name ?? b.code);
}

/** Fastest-growing book first; a book with no earlier point sits last, in ratio order. */
export function compareByGrowth(a: OrderBookRow, b: OrderBookRow): number {
  if (a.growthPct == null || b.growthPct == null) {
    if (a.growthPct == null && b.growthPct == null) return compareByRatio(a, b);
    return a.growthPct == null ? 1 : -1;
  }
  return b.growthPct - a.growthPct || compareByRatio(a, b);
}

export type OrderBookSort = "ratio" | "growth";
export const parseOrderBookSort = (raw: string | undefined): OrderBookSort => (raw === "growth" ? "growth" : "ratio");

export type OrderBookScan = {
  /** Every fresh row, biggest book against market cap first. */
  rows: OrderBookRow[];
  scanned: number;
  /** Rows held back: the book was last disclosed more than OLD_BOOK_AFTER_DAYS ago. */
  oldBookCount: number;
  /** Rows held back: priced past the Valuation Check's freshness bound. */
  staleCount: number;
  latestPricedAsOf: string | null;
};

export function buildOrderBookScan(rows: readonly OrderBookRow[], now: Date = new Date()): OrderBookScan {
  const fresh: OrderBookRow[] = [];
  let oldBookCount = 0;
  let staleCount = 0;
  for (const row of rows) {
    const bookAgeDays = (now.getTime() - new Date(`${bookPeriodEnd(row.period)}T00:00:00Z`).getTime()) / 86_400_000;
    if (bookAgeDays > OLD_BOOK_AFTER_DAYS) {
      oldBookCount += 1;
      continue;
    }
    // The market cap is the price underneath the ratio: the bound the leaderboard, PEG and GARP apply.
    if (assessStaleness({ pricedAsOf: row.pricedAsOf, priceAtRun: row.priceAtRun }, now).stale) {
      staleCount += 1;
      continue;
    }
    fresh.push(row);
  }
  const latestPricedAsOf = fresh.reduce<string | null>(
    (max, r) => (r.pricedAsOf && (!max || r.pricedAsOf > max) ? r.pricedAsOf : max),
    null,
  );
  return { rows: fresh.sort(compareByRatio), scanned: fresh.length, oldBookCount, staleCount, latestPricedAsOf };
}

export function sortOrderBookRows(scan: OrderBookScan, sort: OrderBookSort): OrderBookRow[] {
  return sort === "growth" ? [...scan.rows].sort(compareByGrowth) : scan.rows;
}
