import assert from "node:assert/strict";

import { formatOrderSize, parseOrderSize } from "../lib/exchange-desk/types";

// The order-size chip on desk rows: the pipeline's order-size gate stores
// details.classifier.order_size.pct_of_mcap + details.order.status on
// order_win rows (concallyser app/exchange_desk/events.py). Real rows below.

const stltech = {
  classifier: { order_size: { mcap_cr: 41554, pct_of_mcap: 27.4, llm_impact: "positive", rule: null } },
  order: { value_cr: 11400, status: "framework" },
};
const e2e = {
  classifier: { order_size: { pct_of_mcap: 7.7 } },
  order: { value_cr: 1000, status: "firm" },
};

assert.deepEqual(parseOrderSize("order_win", stltech), { pctOfMcap: 27.4, softness: "framework" });
assert.equal(formatOrderSize(parseOrderSize("order_win", stltech)!), "27% of mcap · framework");
assert.equal(formatOrderSize(parseOrderSize("order_win", e2e)!), "7.7% of mcap", "a firm order carries no softness tag");
assert.equal(
  formatOrderSize({ pctOfMcap: 0.04, softness: "LOI" }),
  "<1% of mcap · LOI",
  "tiny orders don't print 0%",
);

// Only order wins, and only rows the pipeline actually sized.
assert.equal(parseOrderSize("ma", stltech), null);
assert.equal(parseOrderSize("order_win", { order: { value_cr: 500, status: "firm" } }), null);
assert.equal(parseOrderSize("order_win", null), null);
assert.equal(parseOrderSize("order_win", { classifier: { order_size: { pct_of_mcap: "27" } } }), null);

console.log("desk-order-size: ok");
