import assert from "node:assert/strict";

import { normalizeValuationCheck } from "../lib/valuation-check/normalize";
import type { ValuationCheckRow } from "../lib/valuation-check/types";

// OBSCP regression: Screener exposes a positive current P/E in its ratios payload but
// serves no own-history P/E chart. PEG is display-only, so that current level should still
// pair with an available Phase 5 base case; it must not create a valuation-history lens.
const row = {
  company_code: "OBSCP",
  relative_valuation: {
    pe: {
      available: false,
      fetch_status: "empty",
      current: null,
      current_from_ratios: 74.8,
      pill: null,
    },
  },
  reverse_dcf: { phase5_scenarios: { base: 0.425 } },
  market_data: { eps_summary: null },
} as unknown as ValuationCheckRow;

const normalized = normalizeValuationCheck(row);
assert.ok(normalized?.peg?.forward, "ratio-only P/E should produce the directional forward PEG card");
assert.equal(normalized.peg.forward.growthPct, 42.5);
assert.equal(normalized.peg.forward.ratio, 74.8 / 42.5);
assert.equal(normalized.peg.trailing, null, "no EPS history means no textbook trailing PEG");
assert.equal(normalized.lenses.length, 0, "PEG fallback must not manufacture a history-based lens");

console.log("valuation-peg-normalize: all assertions passed");
