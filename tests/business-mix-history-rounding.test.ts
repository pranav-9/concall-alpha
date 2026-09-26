import assert from "node:assert/strict";

import { buildBusinessMixPeriods } from "../lib/business-snapshot/mix-history";
import type { NormalizedRevenueMixHistoryBySegment } from "../lib/business-snapshot/types";

const row = (segment: string, byYear: Record<string, number | null>) => ({
  segment,
  isTotal: false,
  mixPercentByYear: byYear,
  directionLabel: null,
  latestMixPercent: null,
  comparabilityLabel: "reported",
});

// SBCL (2026-09-26): the issuer's two-decimal FY26 shares sum to 100.01 and the
// strict `total <= 100` check dropped the year, so the page drew no mix bars.
const history: NormalizedRevenueMixHistoryBySegment = {
  years: ["FY25", "FY26", "FY27"],
  rows: [
    row("Shunt Resistors", { FY25: 41.76, FY26: 40.27, FY27: 50 }),
    row("Thermostatic Bimetals", { FY25: 44.21, FY26: 40.37, FY27: 40 }),
    row("Electrical Contacts", { FY25: 14.03, FY26: 19.37, FY27: 20 }),
  ],
  insights: [],
  latestPeriod: "FY26",
};

const periods = buildBusinessMixPeriods(history);
const byYear = Object.fromEntries(periods.map((p) => [p.year, p]));

assert.equal(byYear.FY25.valid, true, "FY25 sums to 100.00");
assert.equal(byYear.FY26.valid, true, "FY26 sums to 100.01 — rounding, still valid");
assert.equal(byYear.FY27.valid, false, "FY27 sums to 110 — a real overlap stays invalid");

console.log("business-mix-history-rounding: ok");
