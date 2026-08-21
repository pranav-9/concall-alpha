import assert from "node:assert/strict";

import {
  buildImpactFacet,
  IMPACT_ORDER,
  type ExchangeImpact,
} from "../lib/exchange-desk/types";

// buildImpactFacet drives the Exchange Desk quality-filter tabs: count by impact
// tier, emit in IMPACT_ORDER, drop any tier with zero rows. Pure, so we can pin
// it directly. See lib/exchange-desk/types.ts.

const rows = (...impacts: ExchangeImpact[]) => impacts.map((impact) => ({ impact }));

// ---------------------------------------------------------------------------
// Order: output follows IMPACT_ORDER (good→bad), never input order.
// ---------------------------------------------------------------------------
const mixed = buildImpactFacet(
  rows("negative", "positive", "transformative", "neutral", "positive"),
);
assert.deepEqual(
  mixed.map((f) => f.key),
  ["transformative", "positive", "neutral", "negative"],
  "tiers must be ordered by IMPACT_ORDER, not by input order",
);
assert.equal(mixed.find((f) => f.key === "positive")?.count, 2, "counts aggregate per tier");
assert.equal(mixed.find((f) => f.key === "transformative")?.count, 1);

// The order the facet emits is exactly IMPACT_ORDER filtered to present tiers.
const present = IMPACT_ORDER.filter((k) => mixed.some((f) => f.key === k));
assert.deepEqual(mixed.map((f) => f.key), present);

// ---------------------------------------------------------------------------
// count>0 suppression: a tier with no rows gets no facet entry (no empty tab).
// ---------------------------------------------------------------------------
assert.equal(
  mixed.some((f) => f.key === "severe"),
  false,
  "Severe has no rows here, so it must not appear as a tab",
);

const positiveOnly = buildImpactFacet(rows("positive", "positive"));
assert.deepEqual(
  positiveOnly,
  [{ key: "positive", label: "Positive", count: 2 }],
  "single-tier input yields exactly one facet entry",
);

// ---------------------------------------------------------------------------
// Labels: the neutral tier's tab label is "Neutral", not the badge's "Routine".
// ---------------------------------------------------------------------------
const neutral = buildImpactFacet(rows("neutral")).find((f) => f.key === "neutral");
assert.equal(neutral?.label, "Neutral", "neutral tab label is 'Neutral' (badge stays 'Routine')");

// ---------------------------------------------------------------------------
// Empty input → empty facet (the "All" tab still renders from payload total).
// ---------------------------------------------------------------------------
assert.deepEqual(buildImpactFacet([]), [], "no rows → no tabs");

console.log("desk-impact-facet: all assertions passed");
