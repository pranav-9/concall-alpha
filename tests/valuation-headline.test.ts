import assert from "node:assert/strict";

import { buildValuationHeadline, VERDICT_DISPLAY } from "../lib/valuation-check/headline";
import type {
  NormalizedValuationCheck,
  NormalizedValuationLens,
  ValuationPill,
  ValuationVerdict,
  ValuationZone,
} from "../lib/valuation-check/types";

// ---------------------------------------------------------------------------
// Fixture builder — only the fields buildValuationHeadline reads are set; the
// rest of the normalized shape is irrelevant to the headline and left blank.
// ---------------------------------------------------------------------------

const lens = (pill: ValuationPill | null, id = "pe"): NormalizedValuationLens =>
  ({
    id,
    label: id.toUpperCase(),
    role: "primary",
    current: null,
    band: null,
    pill,
    pillBasis: null,
    interpretation: null,
    shortHistory: false,
    lowInformationBand: false,
    levelWithoutBand: null,
  }) as NormalizedValuationLens;

const make = (
  overrides: {
    verdict?: ValuationVerdict | null;
    pills?: (ValuationPill | null)[];
    zone?: ValuationZone;
    reverseDcfApplicable?: boolean;
    isResidualIncome?: boolean;
  } = {},
): NormalizedValuationCheck =>
  ({
    companyCode: "TEST",
    verdict: overrides.verdict === undefined ? "FAIRLY VALUED" : overrides.verdict,
    lenses: (overrides.pills ?? []).map((p, i) => lens(p, `lens${i}`)),
    zone: overrides.zone ?? "unknown",
    reverseDcfApplicable: overrides.reverseDcfApplicable ?? false,
    isResidualIncome: overrides.isResidualIncome ?? false,
  }) as unknown as NormalizedValuationCheck;

// ---------------------------------------------------------------------------
// VERDICT_DISPLAY — Title-cased for every stored verdict
// ---------------------------------------------------------------------------

assert.deepEqual(
  VERDICT_DISPLAY,
  {
    "DEEPLY UNDERVALUED": "Deeply undervalued",
    UNDERVALUED: "Undervalued",
    "FAIRLY VALUED": "Fairly valued",
    EXPENSIVE: "Expensive",
    "RICHLY PRICED": "Richly priced",
  },
  "every verdict has a Title-cased display word",
);

// ---------------------------------------------------------------------------
// No verdict → null
// ---------------------------------------------------------------------------

assert.equal(buildValuationHeadline(make({ verdict: null })), null, "no verdict → null");
assert.equal(
  buildValuationHeadline(make({ verdict: null, pills: ["Cheap"], zone: "at_base", reverseDcfApplicable: true })),
  null,
  "no verdict → null even when pills and zone are present",
);

// ---------------------------------------------------------------------------
// Multiples-only (no reverse-DCF zone)
// ---------------------------------------------------------------------------

assert.equal(
  buildValuationHeadline(make({ pills: ["Cheap", "Cheap"] })),
  "Cheap on its own multiples.",
  "all-Cheap pills → cheap clause",
);
assert.equal(
  buildValuationHeadline(make({ pills: ["Cheap", "In-line"] })),
  "In line with its own history.",
  "cheapish but not all Cheap → in-line clause",
);
assert.equal(
  buildValuationHeadline(make({ pills: ["In-line"] })),
  "In line with its own history.",
  "In-line only → in-line clause",
);
assert.equal(
  buildValuationHeadline(make({ pills: ["Expensive"] })),
  "Expensive on its own multiples.",
  "Expensive only → richish clause",
);
assert.equal(
  buildValuationHeadline(make({ pills: ["Stretched", "Expensive"] })),
  "Expensive on its own multiples.",
  "Stretched counts as richish",
);
assert.equal(
  buildValuationHeadline(make({ pills: ["Cheap", "Stretched"] })),
  "Mixed against its own history.",
  "cheapish + richish → mixed clause",
);
assert.equal(
  buildValuationHeadline(make({ pills: [null, "Cheap", null] })),
  "Cheap on its own multiples.",
  "null pills are ignored when reading the lenses",
);

// reverseDcfApplicable=false means the zone is ignored entirely.
assert.equal(
  buildValuationHeadline(make({ pills: ["Cheap"], zone: "above_bull", reverseDcfApplicable: false })),
  "Cheap on its own multiples.",
  "zone ignored when reverse DCF is not applicable",
);

// ---------------------------------------------------------------------------
// Price-only (zone, no pills) — growth wording, lead capitalised
// ---------------------------------------------------------------------------

const growthZoneCases: [ValuationZone, string][] = [
  ["above_bull", "The price banks on growth above anything it has delivered."],
  ["base_to_bull", "The price leans on growth above its base case."],
  ["at_base", "The price sits at our base case."],
  ["bear_to_base", "The price assumes growth below our base case."],
  ["below_bear", "The price assumes less growth than even our downside case."],
];
for (const [zone, expected] of growthZoneCases) {
  assert.equal(
    buildValuationHeadline(make({ zone, reverseDcfApplicable: true })),
    expected,
    `price-only growth zone ${zone}`,
  );
}

// ---------------------------------------------------------------------------
// Residual-income zones (financials, Phase E) — RoE wording
// ---------------------------------------------------------------------------

const riZoneCases: [ValuationZone, string][] = [
  ["above_bull", "The price banks on a return on equity above what it earns."],
  ["base_to_bull", "The price leans on a return on equity above what it earns."],
  ["at_base", "The price sits near the return on equity it earns."],
  ["bear_to_base", "The price implies a return on equity below what it earns."],
  ["below_bear", "The price implies a return on equity well below what it earns."],
];
for (const [zone, expected] of riZoneCases) {
  assert.equal(
    buildValuationHeadline(make({ zone, reverseDcfApplicable: true, isResidualIncome: true })),
    expected,
    `price-only residual-income zone ${zone}`,
  );
}

// isResidualIncome without reverseDcfApplicable → no price clause at all.
assert.equal(
  buildValuationHeadline(make({ verdict: "EXPENSIVE", zone: "above_bull", isResidualIncome: true })),
  "Priced above what the fundamentals support.",
  "residual-income flag alone does not unlock the price clause",
);

// ---------------------------------------------------------------------------
// Both clauses — joiner logic
// ---------------------------------------------------------------------------

// Disagree: cheapish multiples but aggressive price.
assert.equal(
  buildValuationHeadline(make({ pills: ["Cheap"], zone: "above_bull", reverseDcfApplicable: true })),
  "Cheap on its own multiples — but the price banks on growth above anything it has delivered.",
  "cheap multiples + aggressive price → ' — but '",
);
assert.equal(
  buildValuationHeadline(make({ pills: ["In-line"], zone: "base_to_bull", reverseDcfApplicable: true })),
  "In line with its own history — but the price leans on growth above its base case.",
  "in-line multiples + base_to_bull → ' — but '",
);

// Disagree: rich multiples but cheap price.
assert.equal(
  buildValuationHeadline(make({ pills: ["Expensive"], zone: "below_bear", reverseDcfApplicable: true })),
  "Expensive on its own multiples — but the price assumes less growth than even our downside case.",
  "rich multiples + below_bear → ' — but '",
);
assert.equal(
  buildValuationHeadline(make({ pills: ["Stretched"], zone: "bear_to_base", reverseDcfApplicable: true })),
  "Expensive on its own multiples — but the price assumes growth below our base case.",
  "rich multiples + bear_to_base → ' — but '",
);

// Agree: cheap + cheap.
assert.equal(
  buildValuationHeadline(make({ pills: ["Cheap"], zone: "below_bear", reverseDcfApplicable: true })),
  "Cheap on its own multiples, and the price assumes less growth than even our downside case.",
  "cheap multiples + cheap price → ', and '",
);

// Agree: rich + rich.
assert.equal(
  buildValuationHeadline(make({ pills: ["Expensive"], zone: "above_bull", reverseDcfApplicable: true })),
  "Expensive on its own multiples, and the price banks on growth above anything it has delivered.",
  "rich multiples + aggressive price → ', and '",
);

// at_base is neither aggressive nor cheap → always "and".
assert.equal(
  buildValuationHeadline(make({ pills: ["Cheap"], zone: "at_base", reverseDcfApplicable: true })),
  "Cheap on its own multiples, and the price sits at our base case.",
  "at_base never disagrees (cheap side)",
);
assert.equal(
  buildValuationHeadline(make({ pills: ["Expensive"], zone: "at_base", reverseDcfApplicable: true })),
  "Expensive on its own multiples, and the price sits at our base case.",
  "at_base never disagrees (rich side)",
);

// Mixed multiples: richish is true, so only a cheap price disagrees.
assert.equal(
  buildValuationHeadline(make({ pills: ["Cheap", "Expensive"], zone: "above_bull", reverseDcfApplicable: true })),
  "Mixed against its own history, and the price banks on growth above anything it has delivered.",
  "mixed multiples + aggressive price → ', and '",
);
assert.equal(
  buildValuationHeadline(make({ pills: ["Cheap", "Expensive"], zone: "bear_to_base", reverseDcfApplicable: true })),
  "Mixed against its own history — but the price assumes growth below our base case.",
  "mixed multiples + cheap price → ' — but '",
);

// Residual-income both-clause path uses the same joiner rule.
assert.equal(
  buildValuationHeadline(
    make({ pills: ["Cheap"], zone: "above_bull", reverseDcfApplicable: true, isResidualIncome: true }),
  ),
  "Cheap on its own multiples — but the price banks on a return on equity above what it earns.",
  "residual-income disagree joiner",
);

// ---------------------------------------------------------------------------
// Unknown zone with reverse DCF applicable → price clause null → fall through
// ---------------------------------------------------------------------------

assert.equal(
  buildValuationHeadline(make({ pills: ["Cheap"], zone: "unknown", reverseDcfApplicable: true })),
  "Cheap on its own multiples.",
  "unknown zone drops the price clause, multiples clause stands alone",
);

// ---------------------------------------------------------------------------
// Verdict-word fallback — no pills, no usable zone
// ---------------------------------------------------------------------------

const fallbackCases: [ValuationVerdict, string][] = [
  ["DEEPLY UNDERVALUED", "Trading well below what the fundamentals support."],
  ["UNDERVALUED", "Trading below what the fundamentals support."],
  ["FAIRLY VALUED", "Priced roughly in line with the fundamentals."],
  ["EXPENSIVE", "Priced above what the fundamentals support."],
  ["RICHLY PRICED", "Priced well above what the fundamentals support."],
];
for (const [verdict, expected] of fallbackCases) {
  assert.equal(buildValuationHeadline(make({ verdict })), expected, `fallback for ${verdict}`);
  assert.equal(
    buildValuationHeadline(make({ verdict, zone: "unknown", reverseDcfApplicable: true, pills: [null] })),
    expected,
    `fallback for ${verdict} with unknown zone and null-only pills`,
  );
}

console.log("valuation-headline: all assertions passed");
