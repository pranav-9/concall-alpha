// The PEG scan — forward and trailing PEG across the covered universe. PURE:
// the ratios come from derivePeg (lib/valuation-check/normalize), the same
// helper the Valuation Check section prints, so the scan and the company page
// can't disagree. PEG is context, never a score input — and never a buy list.

import { assessStaleness } from "@/lib/valuation-check/normalize";
import type { NormalizedValuationCheck } from "@/lib/valuation-check/types";
import type { ScanCompany } from "./red-flags";

/** The scan's line: PEG under this is "cheap" on the Valuation Check's own bands. */
export const PEG_CHEAP_BELOW = 1.0;

type Peg = NonNullable<NormalizedValuationCheck["peg"]>;

export type PegRow = ScanCompany & {
  pe: number;
  forward: Peg["forward"];
  trailing: Peg["trailing"];
  /** EPS grew, but under 5% a year — trailing PEG not meaningful. */
  trailingWithheldGrowthPct: number | null;
  pricedAsOf: string | null;
  priceAtRun: number | null;
};

export const PEG_VIEWS = ["both", "forward", "trailing", "all"] as const;
export type PegView = (typeof PEG_VIEWS)[number];
export const PEG_SORTS = ["forward", "trailing"] as const;
export type PegSort = (typeof PEG_SORTS)[number];

export const PEG_VIEW_LABEL: Record<PegView, string> = {
  both: "Both under 1",
  forward: "Forward under 1",
  trailing: "Trailing under 1",
  all: "All",
};

export function parsePegView(raw: string | null | undefined): PegView {
  return (PEG_VIEWS as readonly string[]).includes(raw ?? "") ? (raw as PegView) : "both";
}

export function parsePegSort(raw: string | null | undefined): PegSort {
  return raw === "trailing" ? "trailing" : "forward";
}

const cheap = (leg: { ratio: number } | null) => leg != null && leg.ratio < PEG_CHEAP_BELOW;

export function inPegView(row: PegRow, view: PegView): boolean {
  switch (view) {
    case "both":
      return cheap(row.forward) && cheap(row.trailing);
    case "forward":
      return cheap(row.forward);
    case "trailing":
      return cheap(row.trailing);
    case "all":
      return row.forward != null || row.trailing != null;
  }
}

/** Ascending on the chosen leg (cheapest first), rows without it last, then the other leg. */
export function comparePegRows(a: PegRow, b: PegRow, sort: PegSort): number {
  const other: PegSort = sort === "forward" ? "trailing" : "forward";
  const key = (r: PegRow, leg: PegSort) => r[leg]?.ratio ?? Number.POSITIVE_INFINITY;
  return (
    key(a, sort) - key(b, sort) ||
    key(a, other) - key(b, other) ||
    (a.name ?? a.code).localeCompare(b.name ?? b.code)
  );
}

export type PegScan = {
  /** Fresh rows with at least one PEG leg. */
  rows: PegRow[];
  counts: Record<PegView, number>;
  /** Rows dropped because the price under them is past the Valuation Check's freshness bound. */
  staleCount: number;
  /** Newest pricing date among the fresh rows. */
  latestPricedAsOf: string | null;
};

export function buildPegScan(allRows: readonly PegRow[], now: Date = new Date()): PegScan {
  const fresh: PegRow[] = [];
  let staleCount = 0;
  for (const row of allRows) {
    if (row.forward == null && row.trailing == null) continue;
    // A PEG on a price that has since moved is the same mistake as a stale verdict:
    // the same bound the leaderboard and Featured Reads apply.
    if (assessStaleness({ pricedAsOf: row.pricedAsOf, priceAtRun: row.priceAtRun }, now).stale) {
      staleCount += 1;
      continue;
    }
    fresh.push(row);
  }
  const counts = Object.fromEntries(
    PEG_VIEWS.map((view) => [view, fresh.filter((r) => inPegView(r, view)).length]),
  ) as Record<PegView, number>;
  const latestPricedAsOf = fresh.reduce<string | null>(
    (max, r) => (r.pricedAsOf && (!max || r.pricedAsOf > max) ? r.pricedAsOf : max),
    null,
  );
  return { rows: fresh, counts, staleCount, latestPricedAsOf };
}

export function selectPegRows(scan: PegScan, view: PegView, sort: PegSort): PegRow[] {
  return scan.rows.filter((r) => inPegView(r, view)).sort((a, b) => comparePegRows(a, b, sort));
}
