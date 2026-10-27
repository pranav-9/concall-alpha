import assert from "node:assert/strict";

import {
  amountChange,
  buildQuarterResults,
  marginChange,
  periodEndLabel,
  type QuarterFinancialsPoint,
} from "../lib/quarter-results";

// The ConcallScore tab's Results card: lib/quarter-results builds the table
// for the scored quarter from quarterly_financials rows. Pure arithmetic.

const row = (
  fy: number,
  qtr: number,
  periodEnd: string,
  over: Partial<QuarterFinancialsPoint> = {},
): QuarterFinancialsPoint => ({
  fy,
  qtr,
  periodEnd,
  basis: "consolidated",
  revenueCr: 1000,
  operatingProfitCr: 200,
  opmPct: 20,
  netProfitCr: 100,
  eps: 5,
  ...over,
});

// 1. Period labels follow Screener's column header.
assert.equal(periodEndLabel("2026-09-30"), "Sep 2026");
assert.equal(periodEndLabel("2025-03-31"), "Mar 2025");
assert.equal(periodEndLabel("garbage"), "garbage");

// 2. Changes: growth off a positive base, a multiple past tenfold, n/m off a loss.
assert.deepEqual(amountChange(1446, 1000), { kind: "pct", value: 44.6 });
assert.deepEqual(amountChange(900, 1000), { kind: "pct", value: -10 });
assert.deepEqual(amountChange(517, 4), { kind: "multiple", value: 129 });
assert.deepEqual(amountChange(50, -29), { kind: "n/m" });
assert.deepEqual(amountChange(50, 0), { kind: "n/m" });
assert.equal(amountChange(null, 10), null);
assert.equal(amountChange(10, null), null);
assert.deepEqual(marginChange(27.1, 20.8), { kind: "pp", value: 6.3 });
assert.deepEqual(marginChange(13.6, 27.1), { kind: "pp", value: -13.5 });

// 3. The full table: current, previous quarter, year-ago; Q1's previous is last FY's Q4.
{
  const rows = [
    row(2027, 1, "2026-06-30", { revenueCr: 1200, operatingProfitCr: 194, opmPct: 16, netProfitCr: 117, eps: 8.75 }),
    row(2026, 4, "2026-03-31", { revenueCr: 1224, operatingProfitCr: 192, opmPct: 16, netProfitCr: 115, eps: 8.58 }),
    row(2026, 1, "2025-06-30", { revenueCr: 1056, operatingProfitCr: 159, opmPct: 15, netProfitCr: 72, eps: 5.43 }),
  ];
  const t = buildQuarterResults(rows, 2027, 1);
  assert.ok(t);
  assert.deepEqual(t.quarter, { fy: 2027, qtr: 1, label: "Jun 2026" });
  assert.deepEqual(t.previous, { fy: 2026, qtr: 4, label: "Mar 2026" });
  assert.deepEqual(t.yearAgo, { fy: 2026, qtr: 1, label: "Jun 2025" });
  assert.equal(t.basis, "consolidated");
  assert.deepEqual(
    t.rows.map((r) => r.key),
    ["revenue", "operating_profit", "opm", "net_profit", "eps"],
  );
  const revenue = t.rows[0];
  assert.equal(revenue.current, 1200);
  assert.equal(revenue.previous, 1224);
  assert.equal(revenue.yearAgo, 1056);
  assert.deepEqual(revenue.yoy, { kind: "pct", value: 13.6 });
  assert.deepEqual(revenue.qoq, { kind: "pct", value: -2 });
  const opm = t.rows[2];
  assert.equal(opm.sub, true);
  assert.deepEqual(opm.yoy, { kind: "pp", value: 1 });
  assert.deepEqual(opm.qoq, { kind: "pp", value: 0 });
}

// 4. Missing comparison rows: columns null, changes null; no row at all → null table.
{
  const rows = [row(2027, 2, "2026-09-30")];
  const t = buildQuarterResults(rows, 2027, 2);
  assert.ok(t);
  assert.equal(t.previous, null);
  assert.equal(t.yearAgo, null);
  assert.equal(t.rows[0].yoy, null);
  assert.equal(t.rows[0].qoq, null);
  assert.equal(buildQuarterResults(rows, 2027, 1), null);
  assert.equal(buildQuarterResults([], 2027, 2), null);
}

// 5. A line blank in every column drops (a bank with no OPM / EPS on Screener).
{
  const rows = [
    row(2027, 2, "2026-09-30", { opmPct: null, eps: null }),
    row(2027, 1, "2026-06-30", { opmPct: null, eps: null }),
  ];
  const t = buildQuarterResults(rows, 2027, 2);
  assert.ok(t);
  assert.deepEqual(
    t.rows.map((r) => r.key),
    ["revenue", "operating_profit", "net_profit"],
  );
}

// 6. Loss-to-profit prints n/m, never a growth rate.
{
  const rows = [
    row(2027, 1, "2026-06-30", { netProfitCr: 246, eps: 1.49 }),
    row(2026, 1, "2025-06-30", { netProfitCr: -29, eps: -0.22 }),
  ];
  const t = buildQuarterResults(rows, 2027, 1);
  assert.ok(t);
  const pat = t.rows.find((r) => r.key === "net_profit")!;
  assert.deepEqual(pat.yoy, { kind: "n/m" });
  const eps = t.rows.find((r) => r.key === "eps")!;
  assert.deepEqual(eps.yoy, { kind: "n/m" });
}

console.log("quarter-results: ok");
