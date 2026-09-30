import assert from "node:assert/strict";

import {
  parseForwardStrength,
  parseStrategyNarrative,
} from "../lib/guidance-snapshot/types";

// The parsers are the frontend gate for details.forward_strength /
// details.strategy_narrative (schema guidance_strength_v2; v1 = no horizons). They must accept a
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

// --- horizons (schema v2) ---
// The per-horizon block is optional (v1 payloads keep parsing, horizons null)
// and all-or-nothing on its anchor; each horizon is independently nullable and
// independently rejected, and the block is null when neither survives — the
// section then falls back to the whole-book card, never a half-rendered pair.

const horizonBlock = (label: string, extra: Record<string, unknown> = {}) => ({
  horizon_label: label,
  ambition: { label: "measured", rationale: "r", guardrail: null },
  evidence: { label: "well_evidenced", live_total: 4, order_backed: 3, asserted: 1, aspiration: 0 },
  headline: `Headline ${label}.`,
  supporting_line: `Line ${label}.`,
  ...extra,
});

const withHorizons = (horizons: unknown) => {
  const block = structuredClone(validForwardStrength) as { forward_strength: Record<string, unknown> };
  block.forward_strength.horizons = horizons;
  return block;
};

// v1 payload → whole book parses, horizons null.
assert.equal(parseForwardStrength(validForwardStrength)!.horizons, null);
assert.equal(parseForwardStrength(withHorizons(null))!.horizons, null);

// A full v2 block round-trips; vision_label is read for long_term only.
{
  const fs = parseForwardStrength(
    withHorizons({
      anchor_fy: "FY27",
      this_year: horizonBlock("FY27", { vision_label: "ignored on this year" }),
      long_term: horizonBlock("FY28–FY31", { ambition: { label: "ambitious" }, vision_label: "'Advait 2030'" }),
    }),
  );
  assert.ok(fs?.horizons, "v2 horizons should parse");
  assert.equal(fs!.horizons!.anchorFyLabel, "FY27");
  assert.equal(fs!.horizons!.thisYear?.horizonLabel, "FY27");
  assert.equal(fs!.horizons!.thisYear?.visionLabel, null, "vision_label is a long-term field");
  assert.equal(fs!.horizons!.longTerm?.horizonLabel, "FY28–FY31");
  assert.equal(fs!.horizons!.longTerm?.ambition.label, "ambitious");
  assert.equal(fs!.horizons!.longTerm?.ambition.guardrail, null);
  assert.equal(fs!.horizons!.longTerm?.visionLabel, "'Advait 2030'");
  assert.equal(fs!.horizons!.longTerm?.evidence.orderBacked, 3);
  // the whole-book fields are untouched by the split
  assert.equal(fs!.headline, "Conservative live guide.");
}

// One horizon nulled by the scorer (nothing due in that window) → that side null, the other renders.
{
  const fs = parseForwardStrength(withHorizons({ anchor_fy: "FY27", this_year: null, long_term: horizonBlock("FY28") }));
  assert.equal(fs!.horizons!.thisYear, null);
  assert.equal(fs!.horizons!.longTerm?.horizonLabel, "FY28");
}

// A horizon missing what the schema requires is rejected on its own; the other survives.
{
  const noHeadline = horizonBlock("FY28", { headline: "" });
  const fs = parseForwardStrength(withHorizons({ anchor_fy: "FY27", this_year: horizonBlock("FY27"), long_term: noHeadline }));
  assert.equal(fs!.horizons!.longTerm, null, "horizon without a headline rejected");
  assert.ok(fs!.horizons!.thisYear);
  const badBand = horizonBlock("FY27", { evidence: { label: "sort_of", live_total: 1, order_backed: 1, asserted: 0, aspiration: 0 } });
  assert.equal(parseForwardStrength(withHorizons({ anchor_fy: "FY27", this_year: badBand, long_term: horizonBlock("FY28") }))!.horizons!.thisYear, null);
  const badAmbition = horizonBlock("FY27", { ambition: { label: "bold" } });
  assert.equal(parseForwardStrength(withHorizons({ anchor_fy: "FY27", this_year: badAmbition, long_term: horizonBlock("FY28") }))!.horizons!.thisYear, null);
  const noLabel = horizonBlock("", {});
  assert.equal(parseForwardStrength(withHorizons({ anchor_fy: "FY27", this_year: noLabel, long_term: horizonBlock("FY28") }))!.horizons!.thisYear, null);
}

// Neither horizon survives → horizons null (whole-book card), whole book still parses.
{
  const fs = parseForwardStrength(withHorizons({ anchor_fy: "FY27", this_year: null, long_term: null }));
  assert.ok(fs, "whole book still parses");
  assert.equal(fs!.horizons, null);
  const fs2 = parseForwardStrength(withHorizons({ anchor_fy: "FY27", this_year: horizonBlock("FY27", { headline: "" }), long_term: null }));
  assert.equal(fs2!.horizons, null);
}

// A bad anchor fails the whole split (schema: ^FY\d{2}$), never a half-parsed pair.
{
  assert.equal(parseForwardStrength(withHorizons({ anchor_fy: "2027", this_year: horizonBlock("FY27"), long_term: null }))!.horizons, null);
  assert.equal(parseForwardStrength(withHorizons({ this_year: horizonBlock("FY27"), long_term: null }))!.horizons, null);
  assert.equal(parseForwardStrength(withHorizons("FY27"))!.horizons, null);
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
