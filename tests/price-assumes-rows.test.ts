import assert from "node:assert/strict";

import {
  buildPriceAssumesRows,
  buildPriceMarkers,
  deliveredRowLabel,
} from "../lib/valuation-check/price-assumes-rows";

// Scenarios are fractions and get scaled; delivered is already percent; the
// ask sorts by its number like everything else.
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
      ["downside", 15],
      ["delivered-5y", 17],
      ["base", 19],
      ["upside", 20],
      ["ask", 39.5],
      ["delivered-ttm", 78],
    ],
    "cases scaled ×100, merged with delivered and the ask, sorted ascending",
  );
  assert.equal(rows.find((r) => r.kind === "ask")?.label, "The ask · growth implied by today's price");
}

// A cheap stock: the ask below our base case must sort BELOW it, not last.
{
  const rows = buildPriceAssumesRows({
    impliedPct: 8,
    scenarios: { downside: 0.1, base: 0.15, upside: 0.2 },
    delivered: [{ key: "10y", label: "10-yr delivered", pct: 12 }],
    metric: "growth",
  });
  assert.deepEqual(
    rows.map((r) => r.key),
    ["ask", "downside", "delivered-10y", "base", "upside"],
  );
}

// Null scenarios are omitted, not rendered as 0; a 0 scenario is kept.
{
  const rows = buildPriceAssumesRows({
    impliedPct: 12,
    scenarios: { downside: null, base: 0.1, upside: 0 },
    delivered: [],
    metric: "growth",
  });
  assert.deepEqual(
    rows.map((r) => [r.key, r.pct]),
    [
      ["upside", 0],
      ["base", 10],
      ["ask", 12],
    ],
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

// The bar and the list share one marker builder: same ids, same pct values.
{
  const input = {
    impliedPct: 30,
    scenarios: { downside: 0.1, base: 0.2, upside: null },
    delivered: [{ key: "1y", label: "TTM", pct: 25 }],
  };
  const markers = buildPriceMarkers(input);
  assert.deepEqual(
    markers.map((m) => [m.id, m.pct, m.kind]),
    [
      ["downside", 10, "case"],
      ["base", 20, "case"],
      ["delivered-1y", 25, "delivered"],
      ["ask", 30, "ask"],
    ],
    "source order: cases, delivered, ask — the bar's own layout order",
  );
  const rows = buildPriceAssumesRows({ ...input, metric: "growth" });
  assert.deepEqual(
    new Map(rows.map((r) => [r.key, r.pct])),
    new Map(markers.map((m) => [m.id, m.pct])),
    "every marker appears in the list with the identical value",
  );
}

console.log("price-assumes-rows: all assertions passed");
