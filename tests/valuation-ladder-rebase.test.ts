import assert from "node:assert/strict";

import { normalizeValuationCheck } from "../lib/valuation-check/normalize";
import type { ValuationCheckRow } from "../lib/valuation-check/types";

// 2026-11-02: Phase 12 restates the cases from the trailing twelve months when the TTM has run
// ahead of the base case's own path (SKYGOLD: EBITDA 1.40x FY26). `phase5_scenarios` then holds
// the RESTATED rates, which no longer match the Growth tab, so the section must say so — and a
// row that was never restated must not.

const rebasedRow = {
  company_code: "SKYGOLD",
  relative_valuation: {},
  reverse_dcf: {
    ladder_basis: "earnings",
    ladder_metric: "ebitda",
    phase5_scenarios: { downside: 0.0868, base: 0.1722, upside: 0.3084 },
    ladder_rebase: {
      metric: "ebitda",
      fy_label: "Mar 2026",
      ttm_end: "Sep 2026",
      ttm_over_fy: 1.399,
      offset_years: 0.5,
      scenarios_as_stated: { downside: 0.259, base: 0.3325, upside: 0.447 },
      scenarios_rebased: { downside: 0.0868, base: 0.1722, upside: 0.3084 },
      trigger: "ahead_of_base_path",
      base_path_ratio: 1.154,
    },
    implied_cagr_pct: 24.5,
    zone_vs_phase5: "base_to_bull",
    zone_basis: "phase5_scenarios",
    solve_status: "ok",
  },
} as unknown as ValuationCheckRow;

const r = normalizeValuationCheck(rebasedRow);
assert.ok(r);
assert.deepEqual(r.ladderRebase, { metricLabel: "EBITDA", fyLabel: "Mar 2026", ttmEnd: "Sep 2026", ttmOverFy: 1.399, statedBase: 0.3325 });
// The plotted cases stay the restated ones: they are what the zone was graded on.
assert.equal(r.scenarios.base, 0.1722);

const plain = normalizeValuationCheck({
  ...rebasedRow,
  reverse_dcf: { ...(rebasedRow.reverse_dcf as object), ladder_rebase: undefined },
} as unknown as ValuationCheckRow);
assert.ok(plain);
assert.equal(plain.ladderRebase, null);

const empty = normalizeValuationCheck({
  ...rebasedRow,
  reverse_dcf: { ...(rebasedRow.reverse_dcf as object), ladder_rebase: { fy_label: null } },
} as unknown as ValuationCheckRow);
assert.ok(empty);
assert.deepEqual(empty.ladderRebase, { metricLabel: null, fyLabel: null, ttmEnd: null, ttmOverFy: null, statedBase: null });

console.log("valuation-ladder-rebase: ok");
