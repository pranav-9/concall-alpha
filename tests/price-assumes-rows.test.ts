import assert from "node:assert/strict";

import {
  buildPriceAssumesRows,
  deliveredRowLabel,
} from "../lib/valuation-check/price-assumes-rows";

// Scenarios are fractions and get scaled; delivered is already percent.
{
  const rows = buildPriceAssumesRows({
    impliedPct: 39.5,
    scenarios: { downside: 0.15, base: 0.19, upside: 0.2 },
    delivered: [
      { key: "5y", label: "5-yr delivered", pct: 17 },
      { key: "ttm", label: "TTM", pct: 78 },
    ],
    metric: "growth",
  });
  assert.deepEqual(
    rows.map((r) => [r.key, r.pct]),
    [
      ["down", 15],
      ["d-5y", 17],
      ["base", 19],
      ["up", 20],
      ["d-ttm", 78],
      ["ask", 39.5],
    ],
    "cases scaled ×100, merged with delivered, sorted ascending, ask last",
  );
  assert.equal(rows.at(-1)?.kind, "ask");
  assert.equal(rows.at(-1)?.label, "The ask · growth implied by today's price");
}

// Null scenarios are omitted, not rendered as 0.
{
  const rows = buildPriceAssumesRows({
    impliedPct: 12,
    scenarios: { downside: null, base: 0.1, upside: null },
    delivered: [],
    metric: "growth",
  });
  assert.deepEqual(
    rows.map((r) => r.key),
    ["base", "ask"],
  );
}

// The ask closes the list even when it is the smallest number.
{
  const rows = buildPriceAssumesRows({
    impliedPct: 2,
    scenarios: { downside: 0.05, base: 0.1, upside: 0.15 },
    delivered: [{ key: "10y", label: "10-yr delivered", pct: 9 }],
    metric: "growth",
  });
  assert.equal(rows.at(-1)?.key, "ask");
  assert.deepEqual(
    rows.slice(0, -1).map((r) => r.pct),
    [5, 9, 10, 15],
  );
}

// Delivered labels say "delivered" exactly once.
assert.equal(deliveredRowLabel("10-yr delivered", "growth"), "10-yr delivered");
assert.equal(deliveredRowLabel("delivered 3-yr", "growth"), "Delivered 3-yr");
assert.equal(deliveredRowLabel("TTM", "growth"), "TTM delivered");

// Residual-income (financials) relabels the delivered row and the ask.
{
  const rows = buildPriceAssumesRows({
    impliedPct: 14.2,
    scenarios: { downside: null, base: null, upside: null },
    delivered: [{ key: "roe", label: "Delivered RoE 12.5%", pct: 12.5 }],
    metric: "roe",
  });
  assert.deepEqual(
    rows.map((r) => r.label),
    ["Return on equity it earns", "The ask · implied by today's price"],
  );
}

console.log("price-assumes-rows: all assertions passed");
