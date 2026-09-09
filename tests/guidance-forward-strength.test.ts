import assert from "node:assert/strict";

import {
  parseForwardStrength,
  parseStrategyNarrative,
} from "../lib/guidance-snapshot/types";

// The parsers are the frontend gate for details.forward_strength /
// details.strategy_narrative (schema guidance_strength_v1). They must accept a
// well-formed block and reject anything the schema rejects — a malformed block
// parses to null and the section falls back to the credibility-first layout.

const validForwardStrength = {
  forward_strength: {
    ambition: {
      label: "conservative",
      rationale: "Guiding below delivered history.",
      guardrail: {
        fwd_growth_pct: 27.5,
        trailing_delivered_cagr_pct: 76,
        ratio: 0.362,
        expected_band: "conservative",
        override_flagged: false,
        note: "forward 28% vs delivered 76%",
      },
    },
    evidence: {
      label: "partly_evidenced",
      live_total: 16,
      order_backed: 7,
      asserted: 7,
      aspiration: 2,
    },
    headline: "Conservative live guide.",
    supporting_line: "The near-term guides sit at or below delivered history.",
  },
};

// A valid block round-trips with camelCase fields.
{
  const fs = parseForwardStrength(validForwardStrength);
  assert.ok(fs, "valid forward_strength should parse");
  assert.equal(fs!.ambition.label, "conservative");
  assert.equal(fs!.evidence.label, "partly_evidenced");
  assert.equal(fs!.evidence.liveTotal, 16);
  assert.equal(fs!.evidence.orderBacked, 7);
  assert.equal(fs!.ambition.guardrail?.expectedBand, "conservative");
  assert.equal(fs!.ambition.guardrail?.overrideFlagged, false);
}

// null / missing details → null (no card).
assert.equal(parseForwardStrength(null), null);
assert.equal(parseForwardStrength({}), null);

// A bad ambition label the schema enum would reject → null.
{
  const bad = structuredClone(validForwardStrength);
  bad.forward_strength.ambition.label = "wildly_ambitious";
  assert.equal(parseForwardStrength(bad), null, "unknown ambition label rejected");
}

// A bad evidence band → null.
{
  const bad = structuredClone(validForwardStrength);
  bad.forward_strength.evidence.label = "sort_of_evidenced";
  assert.equal(parseForwardStrength(bad), null, "unknown evidence band rejected");
}

// live_total: 0 is a real value (a company with no live threads), not falsy-null.
{
  const zero = structuredClone(validForwardStrength);
  zero.forward_strength.evidence.live_total = 0;
  zero.forward_strength.evidence.order_backed = 0;
  zero.forward_strength.evidence.asserted = 0;
  zero.forward_strength.evidence.aspiration = 0;
  const fs = parseForwardStrength(zero);
  assert.ok(fs, "live_total 0 should still parse");
  assert.equal(fs!.evidence.liveTotal, 0);
}

// Negative / non-integer counts (schema: integer, minimum 0) → null.
{
  const neg = structuredClone(validForwardStrength);
  neg.forward_strength.evidence.order_backed = -1;
  assert.equal(parseForwardStrength(neg), null, "negative count rejected");
  const frac = structuredClone(validForwardStrength);
  frac.forward_strength.evidence.asserted = 2.5;
  assert.equal(parseForwardStrength(frac), null, "non-integer count rejected");
}

// Missing headline / supporting_line → null (both are required in the schema).
{
  const noHeadline = structuredClone(validForwardStrength);
  (noHeadline.forward_strength as Record<string, unknown>).headline = "";
  assert.equal(parseForwardStrength(noHeadline), null, "empty headline rejected");
}

// A block with no guardrail yet (before the scorer runs) still parses; guardrail is null.
{
  const noGuard = structuredClone(validForwardStrength);
  delete (noGuard.forward_strength.ambition as Record<string, unknown>).guardrail;
  const fs = parseForwardStrength(noGuard);
  assert.ok(fs, "forward_strength without a guardrail should still parse");
  assert.equal(fs!.ambition.guardrail, null);
}

// --- strategy_narrative ---

{
  const sn = parseStrategyNarrative({
    strategy_narrative: {
      headline: "Fill the plant, shift the mix.",
      body: "Every live guide is one bet.",
      implied_lever: { label: "MIX SHIFT", from: "71%", to: "85-90%", basis: "value-added share" },
    },
  });
  assert.ok(sn, "valid strategy_narrative should parse");
  assert.equal(sn!.impliedLever?.label, "MIX SHIFT");
  assert.equal(sn!.impliedLever?.to, "85-90%");
}

// Null block (no single lever dominates) → null.
assert.equal(parseStrategyNarrative({ strategy_narrative: null }), null);
assert.equal(parseStrategyNarrative({}), null);

// headline+body present but no lever → parses, impliedLever null.
{
  const sn = parseStrategyNarrative({
    strategy_narrative: { headline: "A strategy.", body: "The body." },
  });
  assert.ok(sn, "strategy without a lever should still parse");
  assert.equal(sn!.impliedLever, null);
}

// Missing body → null (schema now requires headline + body).
assert.equal(
  parseStrategyNarrative({ strategy_narrative: { headline: "Only a headline." } }),
  null,
  "strategy_narrative missing body rejected",
);

console.log("guidance-forward-strength: all assertions passed");
