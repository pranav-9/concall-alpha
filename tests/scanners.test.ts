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
import {
  buildGuidanceUpgradeScan,
  isLegibleRaise,
  parseGuidanceWindow,
  parseValueLabel,
  selectGuidanceUpgradeRows,
  windowFloor,
  windowLabel,
  type GuidanceUpgradeRow,
} from "../lib/scanners/guidance-upgrades";

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
assert.equal(windowFloor("latest", Q2FY27), idx(2027, 1), "latest = the Q1 FY27 call onward");
assert.equal(windowFloor("recent", Q2FY27), idx(2026, 4), "recent = since Q4 FY26");
assert.equal(windowFloor("all", Q2FY27), null);
assert.equal(windowLabel("latest", Q2FY27), "Raised on the Q1 FY27 call");
assert.equal(windowLabel("recent", Q2FY27), "Since Q4 FY26");
assert.equal(windowLabel("latest", { fy: 2027, qtr: 1, label: "Q1 FY27" }), "Raised on the Q4 FY26 call", "wraps the FY");
assert.equal(parseGuidanceWindow("bogus"), "latest");

const gu = (code: string, quarters: Array<[number, number] | null>, skipped = 0): GuidanceUpgradeRow => {
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
    raises,
    skippedRaises: skipped,
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
    gu("LASTQ", [[2026, 4]]),
    gu("UNDATED", [null]),
    gu("ALLSKIPPED", [], 2),
  ],
  20,
  Q2FY27,
);
assert.deepEqual(
  gScan.rows.map((r) => r.code),
  ["NEWTWO", "NEWONE", "LASTQ", "OLD", "UNDATED"],
  "most recent raise first, then more raises; a company whose every raise was skipped is not listed",
);
assert.deepEqual(gScan.counts, { latest: 2, recent: 3, all: 5 });
assert.equal(gScan.skippedRaises, 2, "skipped raises are counted for the page to state");
assert.deepEqual(selectGuidanceUpgradeRows(gScan, "recent", Q2FY27).map((r) => r.code), ["NEWTWO", "NEWONE", "LASTQ"]);

const trusted = { ...gu("TRUSTED", [[2027, 1]]), tier: "high_trust" as const, tierLabel: "High trust", metCount: 5, countedCount: 5 };
const shaky = { ...gu("SHAKY", [[2027, 1], [2027, 1], [2027, 1]]), tier: "low_trust" as const, tierLabel: "Low trust", metCount: 1, countedCount: 7 };
assert.deepEqual(
  buildGuidanceUpgradeScan([shaky, trusted], 2, Q2FY27).rows.map((r) => r.code),
  ["TRUSTED", "SHAKY"],
  "same quarter: the management that delivers outranks the one that raised more items",
);

console.log("All scanners tests passed.");
