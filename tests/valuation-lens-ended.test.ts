import assert from "node:assert/strict";

import { normalizeValuationCheck } from "../lib/valuation-check/normalize";
import type { ValuationCheckRow } from "../lib/valuation-check/types";

// EPACK 2026-11-11: trailing earnings turned to a loss in May, so Screener's P/E series ends
// 2026-05-15. The pipeline now writes that lens as `available: false` with the date it stopped,
// instead of carrying the May P/E (56.5) as today's reading. The card must show no level, no
// pill and no PEG off the dead number, and must know the series ended (not "no history").
const row = {
  company_code: "EPACK",
  lens_selection: { primary: "pe", cross_check: "ev_ebitda" },
  relative_valuation: {
    pe: {
      available: false,
      fetch_status: "ok",
      series_ended_on: "2026-05-15",
      last_reading: 56.5,
      reason:
        "the P/E series ended on 2026-05-15 -- trailing-twelve-month earnings are a loss, so there is no current P/E",
      current_from_ratios: null,
      pill: null,
      pill_basis: "no current reading; the P/E series ended on 2026-05-15",
    },
    ev_ebitda: {
      available: true,
      current: 20.3,
      as_of: "2026-11-11",
      band_5y: { years: 5, n_weeks: 120, median: 21.4, p25: 19.6, p75: 23.6, min: 15, max: 30 },
      pill: "In-line",
      pill_basis: "within the 5y interquartile range (19.6-23.6)",
    },
  },
  reverse_dcf: { phase5_scenarios: { base: 0.31 } },
  market_data: { eps_summary: null },
} as unknown as ValuationCheckRow;

const normalized = normalizeValuationCheck(row);
assert.ok(normalized, "the row normalizes");
const pe = normalized.lenses.find((lens) => lens.id === "pe");
assert.ok(pe, "the primary lens is still listed");
assert.equal(pe.endedOn, "2026-05-15");
assert.equal(pe.lastReading, 56.5);
assert.equal(pe.current, null, "the last reading is not today's level");
assert.equal(pe.levelWithoutBand, null);
assert.equal(pe.pill, null);
assert.equal(pe.band, null);
assert.equal(normalized.peg, null, "no PEG off a P/E that no longer exists");

const ev = normalized.lenses.find((lens) => lens.id === "ev_ebitda");
assert.ok(ev);
assert.equal(ev.endedOn, null, "a live lens is not marked ended");
assert.equal(ev.lastReading, null);
assert.equal(ev.current, 20.3);

// A lens that reads again must not keep an old "ended" stamp.
const revived = normalizeValuationCheck({
  ...row,
  relative_valuation: {
    pe: { available: true, current: 31.2, as_of: "2026-12-01", series_ended_on: "2026-05-15", last_reading: 56.5, pill: null },
  },
} as unknown as ValuationCheckRow);
const revivedPe = revived?.lenses.find((lens) => lens.id === "pe");
assert.equal(revivedPe?.endedOn, null);
assert.equal(revivedPe?.current, 31.2);

console.log("valuation-lens-ended: all assertions passed");
