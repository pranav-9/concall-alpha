// The GARP scan — growth at a reasonable price. A company is a hit when its
// Growth score sits in the top half of the growth bands (Solid or better) AND
// its Valuation score is Fair or better — real growth the price hasn't already
// run away with. PURE: both legs and their bands are the leaderboard's own
// (lib/growth-band, lib/valuation-band), so a hit reads the same two numbers the
// board and the company page print. Context, never a buy list.

import { bandForGrowthScore, type GrowthBandKey } from "@/lib/growth-band";
import { bandForValuationScore, type ValuationBandKey } from "@/lib/valuation-band";
import { assessStaleness } from "@/lib/valuation-check/normalize";

import type { ScanCompany } from "./red-flags";

/** Growth "Solid" or better — the teal half of the growth bands (the fleet median). */
export const GARP_GROWTH_MIN = 6.5;
/** Valuation "Fair" or better on the 0-10 board scale (stored 40 / 100). */
export const GARP_VALUATION_MIN = 4.0;

export type GarpRow = ScanCompany & {
  /** Growth score, 0-10 (latest growth_outlook run). */
  growth: number;
  /** Base-case growth as the Growth tab prints it ("25-30%"). */
  baseGrowth: string | null;
  /** Valuation score ALREADY rescaled to 0-10 (lib/valuation-band toValuationScale). */
  valuation: number;
  pricedAsOf: string | null;
  priceAtRun: number | null;
};

export function isGarpHit(row: GarpRow): boolean {
  return row.growth >= GARP_GROWTH_MIN && row.valuation >= GARP_VALUATION_MIN;
}

/** The two legs weighed equally — the row's place in the list. */
export const garpScore = (row: GarpRow) => (row.growth + row.valuation) / 2;

/** Best blend first; ties go to the cheaper one, then by name. */
export function compareGarpRows(a: GarpRow, b: GarpRow): number {
  return (
    garpScore(b) - garpScore(a) ||
    b.valuation - a.valuation ||
    (a.name ?? a.code).localeCompare(b.name ?? b.code)
  );
}

export const garpGrowthBand = (row: GarpRow): GrowthBandKey => bandForGrowthScore(row.growth);
export const garpValuationBand = (row: GarpRow): ValuationBandKey => bandForValuationScore(row.valuation);

export type GarpScan = {
  /** Fresh rows that pass both cuts, best blend first. */
  hits: GarpRow[];
  /** Fresh rows with both legs — what the scan could read. */
  scanned: number;
  /** Fresh rows that miss: growth fine but priced above Fair. */
  richGrowers: number;
  /** Rows held back: priced past the Valuation Check's freshness bound. */
  staleCount: number;
  latestPricedAsOf: string | null;
};

export function buildGarpScan(rows: readonly GarpRow[], now: Date = new Date()): GarpScan {
  const fresh: GarpRow[] = [];
  let staleCount = 0;
  for (const row of rows) {
    // A valuation score on a price that has since moved is the same mistake as
    // a stale verdict: the bound the leaderboard and the PEG scan apply.
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
  return {
    hits: fresh.filter(isGarpHit).sort(compareGarpRows),
    scanned: fresh.length,
    richGrowers: fresh.filter((r) => r.growth >= GARP_GROWTH_MIN && r.valuation < GARP_VALUATION_MIN).length,
    staleCount,
    latestPricedAsOf,
  };
}
