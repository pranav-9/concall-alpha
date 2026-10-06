import assert from "node:assert/strict";

import {
  buildPegScan,
  comparePegRows,
  inPegView,
  parsePegSort,
  parsePegView,
  selectPegRows,
  type PegRow,
} from "../lib/scanners/peg";
import {
  buildRedFlagScan,
  filterByCheck,
  type RedFlagHit,
  type RedFlagRow,
} from "../lib/scanners/red-flags";
import { derivePeg } from "../lib/valuation-check/normalize";

// ── Red flags ────────────────────────────────────────────────────────────────

const h = (id: RedFlagHit["id"], name: string): RedFlagHit => ({ id, name, metric: "m", note: "n" });
const rf = (code: string, flags: RedFlagHit[], watches: RedFlagHit[] = []): RedFlagRow => ({
  code,
  name: `${code} Ltd`,
  sector: null,
  flags,
  watches,
  assessed: 6,
});

const cash = h("profit_to_cash", "Profit → cash");
const debt = h("debt_load", "Debt load");
const pledge = h("promoter_pledge", "Promoter pledge");

const scan = buildRedFlagScan([
  rf("BBB", [cash]),
  rf("AAA", [cash], [debt]),
  rf("CCC", [cash, debt, pledge]),
  rf("DDD", [], [debt]),
  rf("EEE", []),
]);

assert.deepEqual(
  scan.flagged.map((r) => r.code),
  ["CCC", "AAA", "BBB"],
  "most flags first, then most watches, then name",
);
assert.deepEqual(scan.watchOnly.map((r) => r.code), ["DDD"], "watch-only companies held apart");
assert.equal(scan.scanned, 5, "scanned counts every readable company, clean ones too");
assert.deepEqual(
  scan.checkCounts.map((c) => [c.id, c.count]),
  [["profit_to_cash", 3], ["debt_load", 1], ["promoter_pledge", 1]],
  "chip counts are FLAGS only (a watch on debt doesn't count), most common first",
);
assert.deepEqual(filterByCheck(scan.flagged, "debt_load").map((r) => r.code), ["CCC"], "filter by one check");
assert.equal(filterByCheck(scan.flagged, null).length, 3, "no filter = whole list");

// ── PEG: derivePeg is the company page's own math ───────────────────────────

const peg = derivePeg({
  relative_valuation: { pe: { current: 30 } } as never,
  reverse_dcf: { phase5_scenarios: { base: 0.2 }, ladder_basis: "earnings" } as never,
  market_data: { eps_summary: { cagr_5y: 0.25, has_loss_year: false } },
});
assert.ok(peg?.forward && peg.trailing, "both legs compute");
assert.equal(peg.forward.ratio, 1.5, "forward = P/E ÷ base-case growth %");
assert.equal(peg.forward.basis, "earnings");
assert.equal(peg.trailing.ratio, 1.2, "trailing = P/E ÷ 5-yr EPS CAGR %");

const slow = derivePeg({
  relative_valuation: { pe: { current: 30 } } as never,
  reverse_dcf: null,
  market_data: { eps_summary: { cagr_5y: 0.02 } },
});
assert.equal(slow?.trailing, null, "EPS growth under 5% → no trailing PEG");
assert.equal(slow?.trailingWithheld?.growthPct, 2, "…but the withheld growth is reported");
assert.equal(
  derivePeg({ relative_valuation: { pe: { current: -5 } } as never, reverse_dcf: null, market_data: null }),
  null,
  "negative P/E → no PEG at all",
);

// ── PEG scan ────────────────────────────────────────────────────────────────

const NOW = new Date("2026-10-06T12:00:00Z");
const pr = (
  code: string,
  fwd: number | null,
  trl: number | null,
  pricedAsOf = "2026-10-04",
): PegRow => ({
  code,
  name: code,
  sector: null,
  pe: 20,
  forward: fwd == null ? null : { ratio: fwd, growthPct: 20, basis: "earnings" },
  trailing: trl == null ? null : { ratio: trl, growthPct: 20, hasLossYear: false },
  trailingWithheldGrowthPct: null,
  pricedAsOf,
  priceAtRun: 100,
});

const pegScan = buildPegScan(
  [
    pr("BOTH", 0.8, 0.6),
    pr("FWD", 0.5, 1.4),
    pr("TRL", 1.8, 0.9),
    pr("NONE", 2.4, 2.1),
    pr("FWDONLY", 0.95, null),
    pr("STALE", 0.3, 0.3, "2026-09-01"),
  ],
  NOW,
);

assert.equal(pegScan.staleCount, 1, "a price older than the freshness bound is held back");
assert.ok(!pegScan.rows.some((r) => r.code === "STALE"), "…and never listed, however cheap");
assert.deepEqual(pegScan.counts, { both: 1, forward: 3, trailing: 2, all: 5 });
assert.equal(pegScan.latestPricedAsOf, "2026-10-04");
assert.equal(inPegView(pr("EDGE", 1.0, 0.5), "both"), false, "exactly 1.0 is fair, not cheap");

assert.deepEqual(
  selectPegRows(pegScan, "forward", "forward").map((r) => r.code),
  ["FWD", "BOTH", "FWDONLY"],
  "cheapest forward first",
);
assert.deepEqual(
  selectPegRows(pegScan, "all", "trailing").map((r) => r.code),
  ["BOTH", "TRL", "FWD", "NONE", "FWDONLY"],
  "trailing sort puts a missing trailing leg last",
);
assert.ok(comparePegRows(pr("A", 0.5, 1), pr("B", 0.5, 2), "forward") < 0, "tie on the sort leg → the other leg decides");

assert.equal(parsePegView("bogus"), "both", "unknown view → default");
assert.equal(parsePegView("all"), "all");
assert.equal(parsePegSort("trailing"), "trailing");
assert.equal(parsePegSort(undefined), "forward");

console.log("All scanners tests passed.");
