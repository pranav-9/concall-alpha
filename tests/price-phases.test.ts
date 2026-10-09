import assert from "node:assert/strict";

import { formatMultiple, formatTimes, moveLabel, normalizePricePhases } from "../lib/price-phases/normalize";
import { parsePricePhasesPayload } from "../lib/price-phases/types";

// A compact price_phases_v1 payload shaped like the SJS sandbox row: a run on a rising
// P/E, a correction, a second run, and the current pullback; the first phase starts
// before Screener's P/E history (no split).
const payload = {
  schema_version: "price_phases_v1",
  company_code: "SJS",
  basis: "consolidated",
  as_of: "2026-10-09",
  source: {
    provider: "screener",
    chart_url: "https://www.screener.in/api/company/1/chart/",
    fetched_at: "2026-10-09T08:00:00+00:00",
    method: "auto_segmentation_v1",
    computed_at: "2026-10-09T08:00:05+00:00",
    params: { tol: 0.25 },
  },
  series: [
    ["2022-03-25", 393],
    ["2024-12-06", 1295],
    ["2025-03-13", 819],
    ["2026-08-14", 2532],
    ["2026-10-09", 1967],
  ],
  pivots: [
    { date: "2022-03-25", price: 393, pe: null, eps: null, pe_source: null },
    { date: "2024-12-06", price: 1295, pe: 38, eps: 34.08, pe_source: "screener" },
    { date: "2025-03-13", price: 819, pe: 23, eps: 35.61, pe_source: "screener" },
    { date: "2026-08-14", price: 2532, pe: 42, eps: 60.29, pe_source: "screener" },
    { date: "2026-10-09", price: 1967, pe: 33, eps: 59.61, pe_source: "derived" },
  ],
  phases: [
    { start: "2022-03-25", end: "2024-12-06", kind: "up", price_ratio: 3.295, years: 2.7, rate: "+56% CAGR",
      eps_ratio: null, pe_ratio: null, driver: null, split_missing: "no_pe", what_changed: null },
    { start: "2024-12-06", end: "2025-03-13", kind: "down", price_ratio: 0.632, years: 0.27, rate: "−37% in 3 months",
      eps_ratio: 1.045, pe_ratio: 0.605, driver: "MULTIPLE", split_missing: null, what_changed: null },
    { start: "2025-03-13", end: "2026-08-14", kind: "up", price_ratio: 3.092, years: 1.42, rate: "+121% CAGR",
      eps_ratio: 1.693, pe_ratio: 1.826, driver: "MULTIPLE", split_missing: null,
      what_changed: { fy_from: "Mar 2024", fy_to: "Mar 2026", text: "FY24 → FY26: Net profit ₹85 → ₹172 Cr",
        items: [{ metric: "Net profit", from: 85, to: 172, unit: "cr", score: 2.6 }] } },
    { start: "2026-08-14", end: "2026-10-09", kind: "down", price_ratio: 0.777, years: 0.15, rate: "−22% in 2 months",
      eps_ratio: 0.989, pe_ratio: 0.786, driver: "MULTIPLE", split_missing: null, what_changed: null },
  ],
  summary: { current_kind: "down", current_driver: "MULTIPLE", current_since: "2026-08-14", window_start: "2022-03-25",
    price_ratio: 5.005, eps_ratio: null, pe_ratio: null },
};

const NOW = Date.parse("2026-10-11T12:00:00Z");

// --- labels
assert.equal(moveLabel(3.82), "3.8x");
assert.equal(moveLabel(12.4), "12x");
assert.equal(moveLabel(1.26), "+26%");
assert.equal(moveLabel(0.632), "−37%");
assert.equal(formatTimes(1.02), "flat");
assert.equal(formatTimes(2.6), "×2.6");
assert.equal(formatTimes(0.66), "×0.66");
assert.equal(formatMultiple(7.6), "7.6x");
assert.equal(formatMultiple(68.6), "69x");

// --- the gate mirrors the schema: accepts the payload, rejects drift
assert.ok(parsePricePhasesPayload(payload).ok);
assert.ok(!parsePricePhasesPayload({ ...payload, extra: 1 }).ok, "unknown top-level key rejected (additionalProperties: false)");
assert.ok(!parsePricePhasesPayload({ ...payload, phases: [] }).ok, "at least one phase");
assert.ok(
  !parsePricePhasesPayload({ ...payload, phases: [{ ...payload.phases[0], split_missing: "losses" }] }).ok,
  "split_missing is a closed set",
);

// --- normalize
const r = normalizePricePhases({ company_code: "SJS", payload }, NOW);
assert.ok(r && r.ok);
const d = r.data;
assert.equal(d.stale, false);
assert.equal(d.ageDays, 2);
assert.equal(d.phases.length, 4);
assert.equal(d.phases[3].isCurrent, true);
assert.equal(d.headline, "Down 22% since Aug ’26, mostly the P/E (42x → 33x); EPS flat.");
assert.equal(d.windowLine, null, "no window line when the first pivot has no P/E");

const first = d.phases[0];
assert.equal(first.split, null);
assert.match(first.missingReason ?? "", /no P\/E/);

const run = d.phases[2];
assert.deepEqual(run.split, { driver: "MULTIPLE", lead: "Mostly the P/E", primary: "23x → 42x", secondary: "EPS ×1.7" });
assert.equal(d.phases[3].rate, "in 2 months", "a sub-year phase drops the repeated percent");
assert.equal(run.rate, "+121% CAGR");
assert.equal(run.whatChanged, "FY24 → FY26: Net profit ₹85 → ₹172 Cr");
assert.equal(run.dateRange, "Mar ’25 → Aug ’26");

// earnings-led current phase reads the other way round
const earnings = {
  ...payload,
  phases: [payload.phases[0], { ...payload.phases[2], driver: "EARNINGS" }],
  pivots: [payload.pivots[0], payload.pivots[2], payload.pivots[3]],
};
earnings.phases[0] = { ...payload.phases[0], end: "2025-03-13" };
const e = normalizePricePhases({ company_code: "SJS", payload: earnings }, NOW);
assert.ok(e && e.ok);
assert.equal(e.data.headline, "Up 3.1x since Mar ’25, mostly earnings (EPS ×1.7); P/E 23x → 42x.");

// stale: prices past the valuation window
const stale = normalizePricePhases({ company_code: "SJS", payload }, Date.parse("2026-10-25T00:00:00Z"));
assert.ok(stale && stale.ok && stale.data.stale);

// a missing row is not an error
assert.equal(normalizePricePhases(null), null);

console.log("price-phases: ok");
