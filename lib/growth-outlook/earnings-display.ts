// What the Growth tab's scenario cards show for earnings, as pure functions so
// the rules are testable without rendering (tests/growth-derived-earnings.test.ts).
//
// Two bases give a scenario a real earnings figure beside its revenue figure:
//   * guided_margin_<metric> — revenue growth bridged through the issuer's own
//     margin target (Phase 5 v8 earnings ladder);
//   * derived_from_guidance — the issuer guides no margin (volume, unit
//     economics, price instead), so revenue growth and EPS growth are both
//     derived from that guidance, and the assumptions ride with the figure.
// flat_margin only repeats the revenue number, and loss_making /
// implausible_margin_path are not trustworthy, so none of those show a second
// number — nor does a basis we do not recognise, or a missing one.

import type { NormalizedGrowthScenario } from "@/lib/growth-outlook/types";

export const DERIVED_FROM_GUIDANCE = "derived_from_guidance";

type Basis = string | null | undefined;

export const isDerivedBasis = (basis: Basis): boolean => basis === DERIVED_FROM_GUIDANCE;

export const isGuidedMarginBasis = (basis: Basis): boolean => Boolean(basis?.startsWith("guided_margin"));

// Ladder-level gate (details.earnings_ladder.basis): does the scenario grid
// label the headline "Revenue" and add an earnings line under it?
export const shouldShowEarnings = (ladderBasis: Basis): boolean =>
  isGuidedMarginBasis(ladderBasis) || isDerivedBasis(ladderBasis);

// The earnings line's label: "EPS" for a derived figure, otherwise the generic
// "Earnings" (the margin metric — EBITDA / EBIT / PAT — rides in its note).
export const getEarningsMetricLabel = (basis: Basis): string => (isDerivedBasis(basis) ? "EPS" : "Earnings");

export type ScenarioEarningsLine = {
  label: string;
  value: string;
  // The small muted text with the figure. Derived: the stated assumptions
  // (null when the payload carries none). Otherwise the margin the bridge lands
  // on, or "margins held flat" when this scenario fell back to a flat margin.
  note: string | null;
  // Derived figures put the note under the number; the rest keep it inline.
  derived: boolean;
};

export const scenarioEarningsLine = (
  ladderBasis: Basis,
  scenario: Pick<
    NormalizedGrowthScenario,
    "earningsGrowth" | "earningsBasis" | "marginAtHorizon" | "earningsAssumption"
  >,
  marginMetricLabel: string,
): ScenarioEarningsLine | null => {
  if (!shouldShowEarnings(ladderBasis) || !scenario.earningsGrowth) return null;
  const label = getEarningsMetricLabel(scenario.earningsBasis);
  if (isDerivedBasis(scenario.earningsBasis)) {
    return { label, value: scenario.earningsGrowth, note: scenario.earningsAssumption, derived: true };
  }
  return {
    label,
    value: scenario.earningsGrowth,
    note:
      isGuidedMarginBasis(scenario.earningsBasis) && scenario.marginAtHorizon
        ? `at ${scenario.marginAtHorizon} ${marginMetricLabel} margin`
        : "margins held flat",
    derived: false,
  };
};
