import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FutureGrowthSection } from "../app/company/components/future-growth-section";
import {
  DERIVED_FROM_GUIDANCE,
  getEarningsMetricLabel,
  isDerivedBasis,
  scenarioEarningsLine,
  shouldShowEarnings,
} from "../lib/growth-outlook/earnings-display";
import { normalizeGrowthOutlook } from "../lib/growth-outlook/normalize";
import { buildGrowthSummary, isEarningsBridged } from "../lib/growth-outlook/summary";
import type { NormalizedGrowthOutlook, NormalizedGrowthScenario } from "../lib/growth-outlook/types";

// derived_from_guidance: when the issuer guides no margin (volume, EBITDA per
// unit, price instead) the pipeline derives revenue growth AND EPS growth per
// scenario and states the assumptions. The scenario cards then show both,
// labelled, with the assumptions under the EPS figure. These pin that path and
// prove the guided_margin_* / flat_margin / loss_making / unknown paths did not
// move (normalizer output, helper output, and the rendered section markup).

// tsconfig has jsx: "preserve" (Next compiles JSX itself), so under tsx the
// component's JSX uses the classic React.createElement transform and needs a
// React binding in scope.
(globalThis as { React?: typeof React }).React = React;

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Fixtures. Field names are the data contract the Python side writes.
// ---------------------------------------------------------------------------
const BASE_ASSUMPTION =
  "Volume +15% a year; EBITDA per kg held; costs below EBITDA flat; 17% tax; coffee price -5% in FY27 only";
const UP_ASSUMPTION = "Volume +20% a year; EBITDA per kg +3%; costs below EBITDA flat; 17% tax";
const DOWN_ASSUMPTION = "Volume +8% a year; EBITDA per kg -4%; costs below EBITDA flat; 17% tax";

const derivedScenario = (over: Record<string, unknown>) => ({
  margin_at_horizon_pct: null,
  earnings_basis: DERIVED_FROM_GUIDANCE,
  quick_takeaway: "Volume-led growth.",
  risk_watch: "Coffee price.",
  drivers: ["Capacity ramp"],
  risks: ["Green coffee cost"],
  ...over,
});
const derivedScenarios = {
  base: derivedScenario({
    growth_pct: "12%",
    driver_growth_pct: "15%",
    confidence_pct: 65,
    earnings_growth_pct: "22%",
    earnings_growth_low: 22,
    earnings_growth_high: 22,
    earnings_assumption: BASE_ASSUMPTION,
  }),
  upside: derivedScenario({
    growth_pct: "16%",
    driver_growth_pct: "20%",
    confidence_pct: 45,
    earnings_growth_pct: "30%",
    earnings_growth_low: 30,
    earnings_growth_high: 30,
    earnings_assumption: UP_ASSUMPTION,
  }),
  downside: derivedScenario({
    growth_pct: "6%",
    driver_growth_pct: "8%",
    confidence_pct: 30,
    earnings_growth_pct: "9%",
    earnings_growth_low: 9,
    earnings_growth_high: 9,
    earnings_assumption: DOWN_ASSUMPTION,
  }),
};
const derivedDetails = {
  run_timestamp: "2026-09-19T12:00:00",
  // A stable-but-unquantified margin path can coexist with a derived ladder;
  // it must not pull in the "earnings read as growing with revenue" sentence.
  margin_path: { metric: "ebitda", current_pct: null, guided_pct: null, direction: "stable" },
  earnings_ladder: {
    basis: DERIVED_FROM_GUIDANCE,
    metric: null,
    current_margin_pct: null,
    horizon_years_used: 3,
    note: "EPS derived from guided volume and EBITDA per kg",
  },
  earnings_derivation: { volume_growth_pct: 15, tax_rate_pct: 17 }, // not rendered
};

const guidedScenario = (over: Record<string, unknown>) => ({
  confidence_pct: 70,
  quick_takeaway: "Capacity-led.",
  risk_watch: "Ramp delays.",
  drivers: ["CDMO ramp"],
  risks: ["Pricing"],
  ...over,
});
const guidedScenarios = {
  base: guidedScenario({
    growth_pct: "18-22%",
    margin_at_horizon_pct: "32-33%",
    earnings_growth_low: 14.4,
    earnings_growth_high: 19.9,
    earnings_growth_pct: "14-20%",
    earnings_basis: "guided_margin_ebitda",
  }),
  upside: guidedScenario({
    growth_pct: ">25%",
    confidence_pct: 50,
    margin_at_horizon_pct: "34-35%",
    earnings_growth_pct: ">25%",
    earnings_basis: "guided_margin_ebitda",
  }),
  // a scenario that fell back to a flat margin inside a guided ladder
  downside: guidedScenario({
    growth_pct: "<15%",
    confidence_pct: 30,
    margin_at_horizon_pct: null,
    earnings_growth_pct: "<15%",
    earnings_basis: "flat_margin",
  }),
};
const guidedDetails = {
  run_timestamp: "2026-09-17T12:00:00",
  margin_path: {
    metric: "ebitda",
    current_pct: 34.2,
    current_period: "Q1 FY27",
    guided_pct: "32-33%",
    guided_period: "medium term",
    direction: "stable",
  },
  earnings_ladder: { basis: "guided_margin_ebitda", metric: "ebitda", current_margin_pct: 34.2, horizon_years_used: 2, note: null },
};

const flatScenarios = {
  base: guidedScenario({ growth_pct: "18-22%", margin_at_horizon_pct: null, earnings_growth_pct: "18-22%", earnings_basis: "flat_margin" }),
  upside: guidedScenario({ growth_pct: ">25%", margin_at_horizon_pct: null, earnings_growth_pct: ">25%", earnings_basis: "flat_margin" }),
  downside: guidedScenario({ growth_pct: "<15%", margin_at_horizon_pct: null, earnings_growth_pct: "<15%", earnings_basis: "flat_margin" }),
};

const outlookOf = (details: Record<string, unknown>, scenarios: unknown): NormalizedGrowthOutlook => {
  const outlook = normalizeGrowthOutlook({
    details,
    growthScore: 6.4,
    runTimestamp: details.run_timestamp,
    scenarios,
  });
  assert.ok(outlook, "fixture normalizes");
  return outlook;
};

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------
test("derived basis: revenue, EPS, basis and assumption parse; no margin", () => {
  const outlook = outlookOf(derivedDetails, derivedScenarios);
  const base = outlook.scenarios?.base;
  assert.equal(base?.growth, "12%", "growth_pct is the REVENUE growth");
  assert.equal(base?.earningsGrowth, "22%");
  assert.equal(base?.earningsBasis, "derived_from_guidance");
  assert.equal(base?.marginAtHorizon, null);
  assert.equal(base?.earningsAssumption, BASE_ASSUMPTION);
  assert.equal(outlook.scenarios?.upside?.earningsAssumption, UP_ASSUMPTION);
  assert.equal(outlook.scenarios?.downside?.earningsAssumption, DOWN_ASSUMPTION);
  assert.equal(outlook.earningsLadder?.basis, "derived_from_guidance");
});

test("guided_margin_* and flat_margin scenarios normalize exactly as before (plus a null assumption)", () => {
  const outlook = outlookOf(guidedDetails, guidedScenarios);
  assert.deepEqual(outlook.scenarios?.base, {
    confidence: 0.7,
    growth: "18-22%",
    earningsGrowth: "14-20%",
    earningsBasis: "guided_margin_ebitda",
    marginAtHorizon: "32-33%",
    earningsAssumption: null,
    summary: "Capacity-led.",
    riskWatch: "Ramp delays.",
    drivers: ["CDMO ramp"],
    risks: ["Pricing"],
  });
  assert.deepEqual(outlook.scenarios?.downside, {
    confidence: 0.3,
    growth: "<15%",
    earningsGrowth: "<15%",
    earningsBasis: "flat_margin",
    marginAtHorizon: null,
    earningsAssumption: null,
    summary: "Capacity-led.",
    riskWatch: "Ramp delays.",
    drivers: ["CDMO ramp"],
    risks: ["Pricing"],
  });
  assert.deepEqual(outlook.earningsLadder, {
    basis: "guided_margin_ebitda",
    metric: "ebitda",
    currentMarginPct: 34.2,
    horizonYearsUsed: 2,
    note: null,
  });
});

test("pre-v8 rows: no basis, no assumption", () => {
  const outlook = outlookOf(
    { run_timestamp: "2026-08-21T00:00:00" },
    { base: { growth_pct: "18-22%", confidence_pct: 70, quick_takeaway: "x", drivers: [], risks: [] }, upside: null, downside: null },
  );
  assert.equal(outlook.scenarios?.base?.earningsBasis, null);
  assert.equal(outlook.scenarios?.base?.earningsAssumption, null);
  assert.equal(outlook.earningsLadder, null);
});

test("an unrecognised basis is not whitelisted by the normalizer, but nothing ever shows for it", () => {
  const outlook = outlookOf(
    { run_timestamp: "2026-09-19T12:00:00", earnings_ladder: { basis: "mystery_basis", metric: "ebitda" } },
    { base: guidedScenario({ growth_pct: "10%", earnings_growth_pct: "9%", earnings_basis: "mystery_basis" }), upside: null, downside: null },
  );
  const base = outlook.scenarios?.base;
  assert.equal(base?.earningsBasis, "mystery_basis");
  assert.equal(outlook.earningsLadder?.basis, "mystery_basis");
  assert.equal(shouldShowEarnings(outlook.earningsLadder?.basis), false);
  assert.equal(scenarioEarningsLine(outlook.earningsLadder?.basis, base!, "EBITDA"), null);
});

test("earnings_assumption is trimmed; blank and non-string values read as absent", () => {
  const assumptionOf = (raw: unknown) =>
    outlookOf(derivedDetails, {
      base: derivedScenario({ growth_pct: "12%", earnings_growth_pct: "22%", earnings_assumption: raw }),
      upside: null,
      downside: null,
    }).scenarios?.base?.earningsAssumption;
  assert.equal(assumptionOf("  Volume +10% a year  "), "Volume +10% a year");
  for (const raw of ["", "   ", 42, null, undefined, ["a"]]) {
    assert.equal(assumptionOf(raw), null, JSON.stringify(raw));
  }
});

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------
test("shouldShowEarnings: guided_margin_* and derived only", () => {
  for (const basis of ["guided_margin_ebitda", "guided_margin_ebit", "guided_margin_pat", "derived_from_guidance"]) {
    assert.equal(shouldShowEarnings(basis), true, basis);
  }
  for (const basis of ["flat_margin", "loss_making", "implausible_margin_path", "mystery_basis", "", null, undefined]) {
    assert.equal(shouldShowEarnings(basis), false, String(basis));
  }
});

test("metric label is EPS for a derived figure and the generic Earnings otherwise", () => {
  assert.equal(getEarningsMetricLabel("derived_from_guidance"), "EPS");
  for (const basis of ["guided_margin_ebitda", "guided_margin_pat", "flat_margin", "mystery_basis", null, undefined]) {
    assert.equal(getEarningsMetricLabel(basis), "Earnings", String(basis));
  }
  assert.equal(isDerivedBasis("derived_from_guidance"), true);
  assert.equal(isDerivedBasis("guided_margin_ebitda"), false);
  assert.equal(isDerivedBasis(null), false);
});

test("for every pre-existing basis the card gate agrees with the summary card's rule", () => {
  const ladder = (basis: string | null) => ({
    earningsLadder: basis ? { basis, metric: "ebitda", currentMarginPct: null, horizonYearsUsed: null, note: null } : null,
  });
  for (const basis of ["guided_margin_ebitda", "guided_margin_ebit", "guided_margin_pat", "flat_margin", "loss_making", "implausible_margin_path", null]) {
    assert.equal(shouldShowEarnings(basis), isEarningsBridged(ladder(basis)), String(basis));
  }
  // The one intentional difference: derived shows on the scenario cards only.
  assert.equal(shouldShowEarnings("derived_from_guidance"), true);
  assert.equal(isEarningsBridged(ladder("derived_from_guidance")), false);
});

const scenarioOf = (over: Partial<NormalizedGrowthScenario> = {}) => ({
  earningsGrowth: "14-20%",
  earningsBasis: "guided_margin_ebitda",
  marginAtHorizon: "32-33%",
  earningsAssumption: null,
  ...over,
});

test("scenarioEarningsLine: guided text is exactly what the card printed before", () => {
  assert.deepEqual(scenarioEarningsLine("guided_margin_ebitda", scenarioOf(), "EBITDA"), {
    label: "Earnings",
    value: "14-20%",
    note: "at 32-33% EBITDA margin",
    derived: false,
  });
  assert.equal(
    scenarioEarningsLine("guided_margin_pat", scenarioOf({ earningsBasis: "guided_margin_pat", marginAtHorizon: "20%" }), "PAT")?.note,
    "at 20% PAT margin",
  );
  // a scenario that fell back to a flat margin inside a guided ladder
  assert.equal(
    scenarioEarningsLine("guided_margin_ebitda", scenarioOf({ earningsBasis: "flat_margin", marginAtHorizon: null }), "EBITDA")?.note,
    "margins held flat",
  );
  // guided basis but no margin figure for this scenario: same fallback
  assert.equal(
    scenarioEarningsLine("guided_margin_ebitda", scenarioOf({ marginAtHorizon: null }), "EBITDA")?.note,
    "margins held flat",
  );
  // a guided basis with a stray assumption string never prints it
  assert.equal(
    scenarioEarningsLine("guided_margin_ebitda", scenarioOf({ earningsAssumption: "stray" }), "EBITDA")?.note,
    "at 32-33% EBITDA margin",
  );
});

test("scenarioEarningsLine: derived shows EPS with the stated assumptions, never a margin", () => {
  const derived = scenarioOf({
    earningsGrowth: "22%",
    earningsBasis: "derived_from_guidance",
    marginAtHorizon: null,
    earningsAssumption: BASE_ASSUMPTION,
  });
  assert.deepEqual(scenarioEarningsLine("derived_from_guidance", derived, ""), {
    label: "EPS",
    value: "22%",
    note: BASE_ASSUMPTION,
    derived: true,
  });
  // even if a margin figure rode along, the derived line does not print it
  assert.equal(
    scenarioEarningsLine("derived_from_guidance", { ...derived, marginAtHorizon: "30%" }, "EBITDA")?.note,
    BASE_ASSUMPTION,
  );
  // no assumption in the payload: the figure still shows, with no note
  assert.equal(scenarioEarningsLine("derived_from_guidance", { ...derived, earningsAssumption: null }, "")?.note, null);
});

test("scenarioEarningsLine: nothing without an earnings figure, or on a basis that shows none", () => {
  assert.equal(scenarioEarningsLine("derived_from_guidance", scenarioOf({ earningsGrowth: null, earningsBasis: "derived_from_guidance" }), ""), null);
  assert.equal(scenarioEarningsLine("guided_margin_ebitda", scenarioOf({ earningsGrowth: null }), "EBITDA"), null);
  for (const basis of ["flat_margin", "loss_making", "implausible_margin_path", "mystery_basis", null, undefined]) {
    assert.equal(scenarioEarningsLine(basis, scenarioOf(), "EBITDA"), null, String(basis));
    // ...even when the scenario itself claims a derived basis
    assert.equal(scenarioEarningsLine(basis, scenarioOf({ earningsBasis: "derived_from_guidance" }), "EBITDA"), null, String(basis));
  }
});

test("the Growth summary card stays revenue-only for a derived ladder", () => {
  const summary = buildGrowthSummary(outlookOf(derivedDetails, derivedScenarios));
  assert.ok(summary);
  assert.equal(summary.revenueGrowth, "12%");
  assert.equal(summary.bearGrowth, "6%");
  assert.equal(summary.bullGrowth, "16%");
  assert.equal(summary.earnings, null);
});

// ---------------------------------------------------------------------------
// Rendered section (real component, static markup)
// ---------------------------------------------------------------------------
const renderSection = (outlook: NormalizedGrowthOutlook) =>
  renderToStaticMarkup(
    React.createElement(FutureGrowthSection, { outlook, companyCode: "TEST", companyName: "Test Co" }),
  );
// Everything from the "Scenario Analysis" heading down: the explainer + the cards.
const scenarioBlock = (html: string) => {
  const start = html.indexOf("Scenario Analysis");
  assert.ok(start > 0, "scenario analysis block renders");
  return html.slice(start);
};
const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .replace(/’/g, "'")
    .trim();
// Exact-text elements, e.g. count(html, "Revenue") matches <p ...>Revenue</p> only.
const count = (html: string, elementText: string) => (html.match(new RegExp(`>${elementText}<`, "g")) ?? []).length;

test("render: derived ladder labels Revenue + EPS on every card, with the assumptions under the EPS figure", () => {
  const block = scenarioBlock(renderSection(outlookOf(derivedDetails, derivedScenarios)));
  const text = plainText(block);

  assert.equal(count(block, "Revenue"), 3);
  assert.equal(count(block, "EPS"), 3);
  assert.equal(count(block, "Earnings"), 0);
  for (const figure of ["12%", "22%", "16%", "30%", "6%", "9%"]) {
    assert.ok(text.includes(figure), `renders ${figure}`);
  }
  for (const assumption of [BASE_ASSUMPTION, UP_ASSUMPTION, DOWN_ASSUMPTION]) {
    assert.ok(text.includes(assumption), `renders "${assumption}"`);
  }
  // the assumption sits on its own row under the number, in the small muted style
  assert.equal(
    (block.match(/<span class="mt-0\.5 basis-full text-\[10px\] leading-snug text-muted-foreground">/g) ?? []).length,
    3,
  );
  // the margin line and the flat-margin sentence never appear for a derived ladder
  assert.ok(!text.includes("margins held flat"));
  assert.ok(!/at [^ ]+ [A-Z]* ?margin/.test(text), "no 'at X margin' line");
  assert.ok(!text.includes("Earnings are read as growing with revenue"));
  assert.ok(!text.includes("bridged from it through"));
  assert.ok(
    text.includes(
      "Revenue growth is the headline. EPS growth is derived from the issuer's own guidance and the assumptions stated with each case.",
    ),
  );
  // earnings_derivation is not rendered
  assert.ok(!text.includes("tax_rate_pct"));
});

test("render: a derived scenario with no assumption still shows its EPS figure, without a note row", () => {
  const block = scenarioBlock(
    renderSection(
      outlookOf(derivedDetails, {
        base: derivedScenario({ growth_pct: "12%", earnings_growth_pct: "22%" }),
        upside: null,
        downside: null,
      }),
    ),
  );
  assert.equal(count(block, "EPS"), 1);
  assert.ok(plainText(block).includes("EPS 22%"));
  assert.ok(!block.includes("basis-full"));
});

test("render: guided_margin ladder is unchanged (Revenue + Earnings, at-margin and held-flat notes, bridged sentence)", () => {
  const block = scenarioBlock(renderSection(outlookOf(guidedDetails, guidedScenarios)));
  const text = plainText(block);

  assert.equal(count(block, "Revenue"), 3);
  assert.equal(count(block, "Earnings"), 3);
  assert.equal(count(block, "EPS"), 0);
  assert.ok(text.includes("Earnings 14-20% at 32-33% EBITDA margin"));
  assert.ok(text.includes("Earnings >25% at 34-35% EBITDA margin"));
  assert.ok(text.includes("Earnings <15% margins held flat"));
  assert.ok(text.includes("Earnings growth is bridged from it through the issuer's own EBITDA margin target: 34.2% in Q1 FY27 to 32-33% by medium term."));
  assert.ok(!block.includes("basis-full"));
  assert.ok(!text.includes("derived from the issuer's own guidance"));
});

test("render: flat_margin, loss_making, implausible and unknown bases show one unlabelled number, as before", () => {
  for (const basis of ["flat_margin", "loss_making", "implausible_margin_path", "mystery_basis"]) {
    const block = scenarioBlock(
      renderSection(outlookOf({ ...guidedDetails, earnings_ladder: { ...guidedDetails.earnings_ladder, basis } }, flatScenarios)),
    );
    assert.equal(count(block, "Revenue"), 0, basis);
    assert.equal(count(block, "Earnings"), 0, basis);
    assert.equal(count(block, "EPS"), 0, basis);
    assert.ok(!block.includes("basis-full"), basis);
    assert.ok(plainText(block).includes("18-22%"), basis);
  }
});

console.log("growth-derived-earnings: all assertions passed");
