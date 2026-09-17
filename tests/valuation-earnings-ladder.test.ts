import assert from "node:assert/strict";

import { TRAILING_PEG_MIN_EPS_CAGR, normalizeValuationCheck } from "../lib/valuation-check/normalize";
import type { ValuationCheckRow } from "../lib/valuation-check/types";

// 2026-09-17: Phase 12 grades the reverse-DCF zone on Phase 5's EARNINGS ladder when the base
// case was bridged through an issuer-guided margin. The portal must (a) say "earnings", (b)
// plot profit windows as the delivered markers so units match, (c) mark the forward PEG as a
// real (earnings-based) PEG, and (d) withhold a trailing PEG on sub-5% EPS growth.

const earningsRow = {
  company_code: "LUMAXIND",
  relative_valuation: { pe: { available: true, fetch_status: "ok", current: 30, pill: "In-line" } },
  reverse_dcf: {
    ladder_basis: "earnings",
    ladder_metric: "ebitda",
    phase5_scenarios: { downside: 0.156, base: 0.231, upside: 0.271 },
    phase5_revenue_scenarios: { downside: 0.15, base: 0.175, upside: 0.2 },
    margin_path: { metric: "ebitda", current_pct: 9.8, current_period: "FY26", guided_pct: "10.5-11%", guided_period: "FY27" },
    delivered_cagr: { "5y": 12, "3y": 14 },
    delivered_profit_cagr: { "5y": 18, "3y": 25, ttm: 34 },
    implied_cagr_pct: 18.7,
    zone_vs_phase5: "bear_to_base",
    zone_basis: "phase5_scenarios",
    solve_status: "ok",
  },
  market_data: { eps_summary: { cagr_5y: 0.2, has_loss_year: false } },
} as unknown as ValuationCheckRow;

const e = normalizeValuationCheck(earningsRow);
assert.ok(e);
assert.equal(e.ladderBasis, "earnings");
assert.equal(e.ladderMetric, "ebitda");
assert.equal(e.scenarios.base, 0.231);
assert.deepEqual(e.revenueScenarios, { downside: 0.15, base: 0.175, upside: 0.2 });
assert.equal(e.marginPath?.guidedPct, "10.5-11%");
assert.equal(e.marginPath?.currentPct, 9.8);
// delivered markers switch to PROFIT windows, longest first
assert.deepEqual(
  e.deliveredCagr.map((m) => [m.key, m.pct]),
  [["5y", 18], ["3y", 25], ["ttm", 34]],
);
// forward PEG divides by the earnings base and says so
assert.equal(e.peg?.forward?.basis, "earnings");
assert.equal(e.peg?.forward?.growthPct, 23.1);
assert.equal(e.peg?.forward?.ratio, 30 / 23.1);
assert.equal(e.peg?.trailing?.growthPct, 20);
assert.equal(e.peg?.trailingWithheld, null);

// revenue-ladder row (older payloads): nothing changes
const revenueRow = {
  ...earningsRow,
  reverse_dcf: {
    phase5_scenarios: { downside: 0.15, base: 0.175, upside: 0.2 },
    delivered_cagr: { "5y": 12 },
    delivered_profit_cagr: { "5y": 18 },
    implied_cagr_pct: 18.7,
    zone_vs_phase5: "at_base",
    zone_basis: "phase5_scenarios",
    solve_status: "ok",
  },
} as unknown as ValuationCheckRow;
const r = normalizeValuationCheck(revenueRow);
assert.ok(r);
assert.equal(r.ladderBasis, "revenue");
assert.equal(r.ladderMetric, null);
assert.equal(r.revenueScenarios, null);
assert.equal(r.marginPath, null);
assert.deepEqual(r.deliveredCagr.map((m) => [m.key, m.pct]), [["5y", 12]]);
assert.equal(r.peg?.forward?.basis, "revenue");
assert.equal(r.peg?.forward?.growthPct, 17.5);

// trailing PEG floor: 1% EPS CAGR is withheld, not printed as PEG 157
assert.equal(TRAILING_PEG_MIN_EPS_CAGR, 0.05);
const lowGrowth = {
  ...earningsRow,
  market_data: { eps_summary: { cagr_5y: 0.01, has_loss_year: false } },
} as unknown as ValuationCheckRow;
const l = normalizeValuationCheck(lowGrowth);
assert.equal(l?.peg?.trailing, null);
assert.equal(l?.peg?.trailingWithheld?.growthPct, 1);
// exactly at the floor still computes
const atFloor = {
  ...earningsRow,
  market_data: { eps_summary: { cagr_5y: 0.05, has_loss_year: false } },
} as unknown as ValuationCheckRow;
assert.equal(normalizeValuationCheck(atFloor)?.peg?.trailing?.growthPct, 5);
// negative / zero EPS growth: no PEG and no withheld note (the old behaviour)
const negative = {
  ...earningsRow,
  market_data: { eps_summary: { cagr_5y: -0.02, has_loss_year: false } },
} as unknown as ValuationCheckRow;
assert.equal(normalizeValuationCheck(negative)?.peg?.trailing, null);
assert.equal(normalizeValuationCheck(negative)?.peg?.trailingWithheld, null);

console.log("valuation-earnings-ladder: all assertions passed");
