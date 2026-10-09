// The Price trend scan — every covered company sorted into Up / Sideways / Down by
// its CURRENT price phase, with what drove that phase as a column. PURE: the phase,
// its EPS × P/E split and the driver come from the price_phases row the company
// page's Price journey card reads (concallyser/scripts/price_phases.py), and the
// labels from that card's own normalizer, so a row here always matches the card.
// Descriptive only: where the price is and why it moved, never what to do.

import { formatMultiple, formatTimes, moveLabel } from "@/lib/price-phases/normalize";
import type { PhaseKind, PricePhase, PricePivot } from "@/lib/price-phases/types";
import { VALUATION_STALE_AFTER_DAYS } from "@/lib/valuation-check/normalize";

import type { ScanCompany } from "./red-flags";

export type TrendRow = ScanCompany & {
  asOf: string;
  kind: PhaseKind;
  /** First day of the current phase. */
  since: string;
  years: number;
  priceRatio: number;
  driver: "EARNINGS" | "MULTIPLE" | null;
  epsRatio: number | null;
  peFrom: number | null;
  peTo: number | null;
  /** Why the phase has no EPS × P/E split (loss stretch, near-zero or stale EPS). */
  splitMissing: PricePhase["split_missing"];
};

export const TREND_KINDS = ["up", "side", "down"] as const satisfies readonly PhaseKind[];

/** One company's row from its latest phase, or null when the row carries none. */
export function buildTrendRow(
  company: ScanCompany,
  asOf: string,
  phases: readonly PricePhase[],
  pivots: readonly PricePivot[],
): TrendRow | null {
  const cur = phases[phases.length - 1];
  if (!cur) return null;
  const at = new Map(pivots.map((p) => [p.date, p]));
  const split = cur.driver != null;
  return {
    ...company,
    asOf,
    kind: cur.kind,
    since: cur.start,
    years: cur.years,
    priceRatio: cur.price_ratio,
    driver: cur.driver,
    epsRatio: split ? cur.eps_ratio : null,
    peFrom: split ? (at.get(cur.start)?.pe ?? null) : null,
    peTo: split ? (at.get(cur.end)?.pe ?? null) : null,
    splitMissing: cur.split_missing,
  };
}

/**
 * Up: biggest run first. Down: deepest fall first. Sideways: longest first — a
 * long flat stretch is the one worth opening. Ties by name.
 */
export function compareTrendRows(a: TrendRow, b: TrendRow): number {
  const key = (r: TrendRow) => (r.kind === "up" ? -r.priceRatio : r.kind === "down" ? r.priceRatio : -r.years);
  return key(a) - key(b) || (a.name ?? a.code).localeCompare(b.name ?? b.code);
}

export type TrendScan = {
  groups: Record<PhaseKind, TrendRow[]>;
  /** Fresh rows — what the scan could read. */
  scanned: number;
  /** Phases in each group the P/E drove (the rest: earnings, or no split). */
  multipleLed: Record<PhaseKind, number>;
  /** Rows held back: prices older than the valuation staleness bound. */
  staleCount: number;
  latestAsOf: string | null;
};

const DAY_MS = 86_400_000;

export function buildTrendScan(rows: readonly TrendRow[], now: Date = new Date()): TrendScan {
  const groups: Record<PhaseKind, TrendRow[]> = { up: [], side: [], down: [] };
  const multipleLed: Record<PhaseKind, number> = { up: 0, side: 0, down: 0 };
  let staleCount = 0;
  let latestAsOf: string | null = null;
  for (const row of rows) {
    // The current phase ends at the latest price: an old row's "now" is not now.
    const age = Math.floor((now.getTime() - Date.parse(`${row.asOf}T00:00:00Z`)) / DAY_MS);
    if (!(age <= VALUATION_STALE_AFTER_DAYS)) {
      staleCount += 1;
      continue;
    }
    groups[row.kind].push(row);
    if (row.driver === "MULTIPLE") multipleLed[row.kind] += 1;
    if (!latestAsOf || row.asOf > latestAsOf) latestAsOf = row.asOf;
  }
  for (const k of TREND_KINDS) groups[k].sort(compareTrendRows);
  const scanned = groups.up.length + groups.side.length + groups.down.length;
  return { groups, scanned, multipleLed, staleCount, latestAsOf };
}

/** "Mostly the P/E" / "Mostly earnings" / "No split" — the card's own words. */
export function trendReason(row: TrendRow): string {
  if (row.driver === "MULTIPLE") return "Mostly the P/E";
  if (row.driver === "EARNINGS") return "Mostly earnings";
  return "No split";
}

export function trendMove(row: TrendRow): string {
  return moveLabel(row.priceRatio);
}

export function trendEps(row: TrendRow): string | null {
  return row.epsRatio == null ? null : formatTimes(row.epsRatio);
}

export function trendPe(row: TrendRow): string | null {
  return row.peFrom == null || row.peTo == null ? null : `${formatMultiple(row.peFrom)} → ${formatMultiple(row.peTo)}`;
}

export const SPLIT_MISSING_NOTE: Record<NonNullable<TrendRow["splitMissing"]>, string> = {
  no_pe: "no P/E at one end (losses, or before Screener's P/E history)",
  near_zero_eps: "earnings near zero at one end",
  stale_eps: "Screener's EPS was stale at one end",
};
