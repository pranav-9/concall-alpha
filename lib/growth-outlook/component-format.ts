/**
 * Typed per-key display formats for the growth score breakdown drawer.
 *
 * The pipeline's growth_score_components dict mixes FOUR unit kinds
 * (concallyser app/phase5_growth/growth_outlook.py, v7):
 *   - 0-10 sub-scores      -> "6.5" + "/10"  (incl. raw_composite, pre-stretch)
 *   - multipliers          -> "×0.85"      (credibility discount, 0.6-1.0)
 *   - raw counts           -> "3"          (quantified forward facts)
 *   - raw percents         -> "19.8%"      (delivered_backing; v6 rows carry the
 *                                          older delivered_cagr_blend key;
 *                                          base_confidence_pct is reported, not
 *                                          scored, since v7)
 * Structured / string values (delivered_cagr windows dict, credibility_gate,
 * ladder_flag) are non-numeric and already dropped by
 * normalizeGrowthScoreComponents.
 *
 * Rendering everything as "X/10" — the pre-2026-08-21 behavior — showed a
 * 1.0 credibility multiplier as a terrible-looking "1.0/10" and a 19.8%
 * CAGR as an impossible "19.8/10".
 */

export type GrowthComponentDisplay = {
  /** Main value text, e.g. "6.5", "×0.85", "3", "19.8" */
  value: string;
  /** Small suffix rendered after the value, e.g. "/10", "%"; null = none */
  suffix: string | null;
};

const MULTIPLIER_KEYS = new Set(["credibility_multiplier"]);
const COUNT_KEYS = new Set(["quantified_forward_facts"]);
const RAW_PCT_KEYS = new Set([
  "delivered_cagr_blend",
  "delivered_backing",
  "base_confidence_pct",
]);
const SCORE_KEYS = new Set([
  "sentiment_score",
  "catalyst_strength",
  "guidance_strength",
  "scenario_strength",
  "scenario_adjusted",
  "raw_composite",
  "execution_confidence",
  "industry_score",
]);

const oneDecimal = (value: number): string =>
  (Math.round(value * 10) / 10).toString();

/**
 * Format one component for the drawer. Returns null when the value should be
 * hidden (unknown key whose magnitude can't plausibly be a 0-10 score).
 */
export const formatGrowthScoreComponent = (
  key: string,
  score: number,
): GrowthComponentDisplay | null => {
  if (!Number.isFinite(score)) return null;
  if (MULTIPLIER_KEYS.has(key)) {
    return { value: `×${(Math.round(score * 100) / 100).toString()}`, suffix: null };
  }
  if (COUNT_KEYS.has(key)) {
    return { value: Math.round(score).toString(), suffix: null };
  }
  if (RAW_PCT_KEYS.has(key)) {
    return { value: oneDecimal(score), suffix: "%" };
  }
  if (SCORE_KEYS.has(key)) {
    return { value: oneDecimal(score), suffix: "/10" };
  }
  // Unknown key: only claim the /10 scale when the magnitude is plausible.
  if (score >= 0 && score <= 10) {
    return { value: oneDecimal(score), suffix: "/10" };
  }
  return null;
};
