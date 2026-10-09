import assert from "node:assert/strict";

import { scannersHref } from "../app/scanners/href";
import {
  buildGuidanceUpgradeScan,
  isLegibleRaise,
  latestCallFloor,
  latestCallLabel,
  parseValueLabel,
  type GuidanceUpgradeRow,
} from "../lib/scanners/guidance-upgrades";
import { buildPegScan, comparePegRows, isPegHit, parsePegSort, sortPegHits, type PegRow } from "../lib/scanners/peg";
import {
  buildTrendRow,
  buildTrendScan,
  trendEps,
  trendMove,
  trendPe,
  trendReason,
  type TrendRow,
} from "../lib/scanners/price-trend";
import { buildRedFlagScan, type RedFlagHit, type RedFlagRow } from "../lib/scanners/red-flags";
import { buildScans, listedScope, scanCounts, watchlistScope } from "../lib/scanners/scope";
import { derivePeg } from "../lib/valuation-check/normalize";

// ── Red flags ────────────────────────────────────────────────────────────────

const h = (id: RedFlagHit["id"], name: string): RedFlagHit => ({ id, name, metric: "m", note: "n" });
const rf = (code: string, flags: RedFlagHit[], watches: RedFlagHit[] = []): RedFlagRow => ({
  code,
  name: `${code} Ltd`,
  sector: null,
  listed: true,
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

// ── PEG scan: one rule, under 1× on both legs ───────────────────────────────

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
  listed: true,
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
    pr("BOTHB", 0.5, 0.9),
    pr("FWD", 0.5, 1.4),
    pr("TRL", 1.8, 0.9),
    pr("FWDONLY", 0.95, null),
    pr("STALE", 0.3, 0.3, "2026-09-01"),
  ],
  NOW,
);

assert.equal(pegScan.staleCount, 1, "a price older than the freshness bound is held back");
assert.equal(pegScan.scanned, 5, "scanned = fresh rows with a PEG leg");
assert.deepEqual(pegScan.hits.map((r) => r.code).sort(), ["BOTH", "BOTHB"], "only rows cheap on both legs");
assert.equal(isPegHit(pr("EDGE", 1.0, 0.5)), false, "exactly 1.0 is fair, not cheap");
assert.equal(isPegHit(pr("ONE", 0.5, null)), false, "a missing leg is not a hit");
assert.equal(pegScan.latestPricedAsOf, "2026-10-04");

assert.deepEqual(sortPegHits(pegScan, "forward").map((r) => r.code), ["BOTHB", "BOTH"], "cheapest forward first");
assert.deepEqual(sortPegHits(pegScan, "trailing").map((r) => r.code), ["BOTH", "BOTHB"], "cheapest trailing first");
assert.ok(comparePegRows(pr("A", 0.5, 1), pr("B", 0.5, 2), "forward") < 0, "tie on the sort leg → the other leg decides");
assert.equal(parsePegSort("trailing"), "trailing");
assert.equal(parsePegSort(undefined), "forward");

// ── Guidance upgrades ───────────────────────────────────────────────────────

// The printed values must read as a raise on their own — the cases that
// leaked through on live data 2026-10-06.
assert.deepEqual(parseValueLabel("20-24%"), { mid: 22, unit: "%" });
assert.deepEqual(parseValueLabel("₹1,500cr+"), { mid: 1500, unit: "cr" });
assert.deepEqual(parseValueLabel("₹4000 cr"), { mid: 4000, unit: "cr" });
assert.equal(parseValueLabel("mid-teens"), null, "prose is not a value");
assert.equal(isLegibleRaise("15.5%", "20-30%"), true, "a real raise");
assert.equal(isLegibleRaise("₹400cr", "₹700cr"), true, "1.75x is a raise");
assert.equal(isLegibleRaise("₹1500cr", "₹400cr"), false, "RATNAVEER: printed values go DOWN");
assert.equal(isLegibleRaise("45%", "₹45cr"), false, "RISHABH: % vs ₹ is not one quantity");
assert.equal(isLegibleRaise("1.3%", "20%"), false, "RADICO: 15x is a different quantity (bps vs level)");
assert.equal(isLegibleRaise("₹120cr", "₹1000cr"), false, "SHREEREF: PAT vs turnover");
assert.equal(isLegibleRaise(null, "20%"), false, "no 'from' = nothing to call a raise");
assert.equal(isLegibleRaise("20%", "20%"), false, "flat is not a raise");

const Q2FY27 = { fy: 2027, qtr: 2, label: "Q2 FY27" };
const idx = (fy: number, qtr: number) => fy * 4 + qtr;
assert.equal(latestCallFloor(Q2FY27), idx(2027, 1), "in Q2 season the window opens on the Q1 FY27 call");
assert.equal(latestCallLabel(Q2FY27), "Q1 FY27");
assert.equal(latestCallLabel({ fy: 2027, qtr: 1, label: "Q1 FY27" }), "Q4 FY26", "wraps the FY");

const gu = (
  code: string,
  quarters: Array<[number, number] | null>,
  skipped: Array<number | null> = [],
): GuidanceUpgradeRow => {
  const raises = quarters.map((q, i) => ({
    key: `${code}-${i}`,
    label: "Revenue growth (FY27)",
    from: "20%",
    to: "25%",
    raisedIn: q ? `Q${q[1]} FY${q[0] - 2000}` : null,
    raisedIndex: q ? idx(q[0], q[1]) : null,
  }));
  return {
    code,
    name: code,
    sector: null,
    listed: true,
    raises,
    skippedRaisedIndexes: skipped,
    latestRaisedIndex: raises[0]?.raisedIndex ?? null,
    latestRaisedIn: raises[0]?.raisedIn ?? null,
    loweredCount: 0,
    tier: "credible",
    tierLabel: "Credible",
    metCount: 3,
    countedCount: 4,
  };
};

const gScan = buildGuidanceUpgradeScan(
  [
    gu("OLD", [[2026, 2]]),
    gu("NEWTWO", [[2027, 1], [2026, 4]]),
    gu("NEWONE", [[2027, 1]]),
    gu("Q2CALL", [[2027, 2]]),
    gu("UNDATED", [null]),
    gu("ALLSKIPPED", [], [idx(2027, 1), idx(2026, 3)]),
  ],
  20,
  Q2FY27,
);
assert.deepEqual(
  gScan.rows.map((r) => r.code),
  ["Q2CALL", "NEWTWO", "NEWONE"],
  "only raises on the latest call or later, most recent first; old, undated and all-skipped rows drop",
);
assert.equal(gScan.skippedRaises, 1, "only skipped raises inside the window are counted");
assert.equal(gScan.sinceLabel, "Q1 FY27");

const trusted = { ...gu("TRUSTED", [[2027, 1]]), tier: "high_trust" as const, tierLabel: "High trust", metCount: 5, countedCount: 5 };
const shaky = { ...gu("SHAKY", [[2027, 1], [2027, 1], [2027, 1]]), tier: "low_trust" as const, tierLabel: "Low trust", metCount: 1, countedCount: 7 };
assert.deepEqual(
  buildGuidanceUpgradeScan([shaky, trusted], 2, Q2FY27).rows.map((r) => r.code),
  ["TRUSTED", "SHAKY"],
  "same quarter: the management that delivers outranks the one that raised more items",
);

// ── Price trend ─────────────────────────────────────────────────────────────

const tr = (code: string, kind: TrendRow["kind"], priceRatio: number, years: number, o: Partial<TrendRow> = {}): TrendRow => ({
  code,
  name: `${code} Ltd`,
  sector: null,
  listed: true,
  asOf: "2026-10-09",
  kind,
  since: "2026-01-01",
  years,
  priceRatio,
  driver: "MULTIPLE",
  epsRatio: 1.1,
  peFrom: 20,
  peTo: 20 * (priceRatio / 1.1),
  splitMissing: null,
  ...o,
});

{
  const NOW_T = new Date("2026-10-11T00:00:00Z");
  const scan = buildTrendScan(
    [
      tr("SMALLUP", "up", 1.3, 0.5),
      tr("BIGUP", "up", 3.8, 1.5, { driver: "EARNINGS" }),
      tr("DEEP", "down", 0.4, 1),
      tr("MILD", "down", 0.8, 0.3),
      tr("LONGFLAT", "side", 0.95, 2.1),
      tr("SHORTFLAT", "side", 1.05, 0.4, { driver: null, epsRatio: null, peFrom: null, peTo: null, splitMissing: "no_pe" }),
      tr("OLD", "up", 2, 1, { asOf: "2026-09-20" }),
    ],
    NOW_T,
  );
  assert.deepEqual(scan.groups.up.map((r) => r.code), ["BIGUP", "SMALLUP"], "up: biggest run first");
  assert.deepEqual(scan.groups.down.map((r) => r.code), ["DEEP", "MILD"], "down: deepest fall first");
  assert.deepEqual(scan.groups.side.map((r) => r.code), ["LONGFLAT", "SHORTFLAT"], "sideways: longest first");
  assert.equal(scan.scanned, 6);
  assert.equal(scan.staleCount, 1, "prices past the valuation staleness bound are held back, not grouped");
  assert.deepEqual(scan.multipleLed, { up: 1, side: 1, down: 2 });
  assert.equal(scan.latestAsOf, "2026-10-09");

  const flat = scan.groups.side[1];
  assert.equal(trendReason(flat), "No split");
  assert.equal(trendEps(flat), null);
  assert.equal(trendPe(flat), null);
  assert.equal(trendReason(scan.groups.up[0]), "Mostly earnings");
  assert.equal(trendMove(scan.groups.up[0]), "3.8x");
  assert.equal(trendMove(scan.groups.down[1]), "−20%");

  // the row is the card's current phase: P/E from → to read off the pivots at its ends
  const row = buildTrendRow(
    { code: "SJS", name: "SJS Enterprises", sector: null, listed: true },
    "2026-10-09",
    [
      { start: "2025-03-13", end: "2026-08-14", kind: "up", price_ratio: 3.09, years: 1.42, rate: "+121% CAGR",
        eps_ratio: 1.69, pe_ratio: 1.83, driver: "MULTIPLE", split_missing: null, what_changed: null },
      { start: "2026-08-14", end: "2026-10-09", kind: "down", price_ratio: 0.777, years: 0.15, rate: "−22% in 2 months",
        eps_ratio: 0.99, pe_ratio: 0.786, driver: "MULTIPLE", split_missing: null, what_changed: null },
    ],
    [
      { date: "2025-03-13", price: 819, pe: 23, eps: 35.6, pe_source: "screener" },
      { date: "2026-08-14", price: 2532, pe: 42, eps: 60.3, pe_source: "screener" },
      { date: "2026-10-09", price: 1967, pe: 33, eps: 59.6, pe_source: "screener" },
    ],
  );
  assert.ok(row);
  assert.equal(row.kind, "down");
  assert.equal(row.since, "2026-08-14");
  assert.equal(trendPe(row), "42x → 33x");
  assert.equal(trendEps(row), "flat");
}

// ── Scope: listed by default, the reader's watchlist (listed or not) with the filter ──

const unlisted = { ...rf("BIGCAP", [cash]), listed: false };
const inputs = {
  redFlagRows: [rf("AAA", [cash]), rf("BBB", [debt]), rf("CLEAN", []), unlisted],
  pegRows: [{ ...pr("AAA", 0.5, 0.5), listed: true }, { ...pr("BIGCAP", 0.4, 0.4), listed: false }],
  guidance: {
    rows: [{ ...gu("BBB", [[2027, 1]]) }],
    readable: [rf("AAA", []), rf("BBB", []), { ...rf("BIGCAP", []), listed: false }],
  },
  trendRows: [tr("AAA", "up", 2, 1, { asOf: "2026-10-05" }), { ...tr("BIGCAP", "down", 0.5, 1, { asOf: "2026-10-05" }), listed: false }],
};
const listed = buildScans(inputs, listedScope, Q2FY27, NOW);
assert.deepEqual(scanCounts(listed), { "red-flags": 2, peg: 1, guidance: 1, trend: 1 }, "default = listed companies only");
assert.equal(listed.redFlags?.scanned, 3, "an unlisted company is not in the default universe");
assert.equal(listed.guidance?.scanned, 2);

const mineScans = buildScans(inputs, watchlistScope(new Set(["AAA", "BIGCAP"])), Q2FY27, NOW);
assert.deepEqual(
  mineScans.redFlags?.flagged.map((r) => r.code),
  ["AAA", "BIGCAP"],
  "watchlist = the reader's companies, including one outside the discovery list",
);
assert.deepEqual(scanCounts(mineScans), { "red-flags": 2, peg: 2, guidance: 0, trend: 2 });
assert.equal(mineScans.guidance?.scanned, 2, "BBB isn't watched, so its raise drops; AAA + BIGCAP were read");
assert.deepEqual(
  scanCounts(buildScans({ redFlagRows: null, pegRows: null, guidance: null, trendRows: null }, listedScope, Q2FY27, NOW)),
  { "red-flags": null, peg: null, guidance: null, trend: null },
  "a failed read stays unavailable, never an empty scan",
);

// ── Links ───────────────────────────────────────────────────────────────────

assert.equal(scannersHref("red-flags", false), "/scanners", "the default scan is the bare route");
assert.equal(scannersHref("peg", true), "/scanners?scan=peg&mine=1");
assert.equal(scannersHref("peg", false, { sort: "trailing" }), "/scanners?scan=peg&sort=trailing");
assert.equal(scannersHref("red-flags", true), "/scanners?mine=1");
assert.equal(scannersHref("trend", false), "/scanners?scan=trend");

console.log("All scanners tests passed.");
