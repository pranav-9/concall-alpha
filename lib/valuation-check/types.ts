// Mirrors schemas/valuation_check_v2.json — the schema is the structural authority, this
// file follows it. Phase 12 (Business Analysis Framework v14 Section 6). v1 rows still
// exist in the table until the next fleet refresh; v2-only fields are optional here and
// consumers gate on their presence, not on schema_version.

export type ValuationLensId = "pe" | "pbv" | "ev_ebitda" | "mcap_sales";

export type ValuationPill = "Cheap" | "In-line" | "Expensive" | "Stretched";

export type ValuationVerdict =
  | "DEEPLY UNDERVALUED"
  | "UNDERVALUED"
  | "FAIRLY VALUED"
  | "EXPENSIVE"
  | "RICHLY PRICED";

/** What the price implies against the Phase 5 growth scenarios. */
export type ValuationZone =
  | "below_bear"
  | "bear_to_base"
  | "at_base"
  | "base_to_bull"
  | "above_bull"
  | "unknown";

export type ValuationBand = {
  years: number;
  n_weeks: number;
  n_weeks_excluded?: number;
  from?: string;
  to?: string;
  median: number;
  mean?: number;
  stdev?: number;
  p25: number;
  p75: number;
  min?: number;
  max?: number;
  /** p75/p25 > 3x — the band is too wide for "In-line" to discriminate. */
  wide_band?: boolean;
};

export type ValuationLensRow = {
  available: boolean;
  /** "empty" = Screener genuinely has no history. "error" = we could not reach it. */
  fetch_status?: "ok" | "empty" | "error";
  reason?: string;
  current?: number | null;
  current_from_ratios?: number | null;
  as_of?: string | null;
  screener_reported_median?: number | null;
  band_5y?: ValuationBand | null;
  band_10y?: ValuationBand | null;
  pill?: ValuationPill | null;
  pill_basis?: string;
  short_history?: boolean;
  low_information_band?: boolean;
  interpretation?: string | null;
};

export type ValuationOverlayRow = {
  source: string;
  verdict: string;
  impact: string;
};

export type ValuationCheckRow = {
  company_code: string;
  schema_version: string | null;
  priced_as_of: string | null;
  price_at_run: number | null;
  run_timestamp: string | null;
  narrative_generated_at: string | null;
  verdict: ValuationVerdict | null;
  score: number | null;
  rateable: boolean;
  primary_lens: ValuationLensId | null;
  source: Record<string, unknown> | null;
  /**
   * Mostly numeric levels; since Phase D (v2+) also carries `eps_summary` (object) and
   * `peak_earnings_flag` (boolean) — hence the widened value type.
   */
  market_data: Record<string, unknown> | null;
  lens_selection: {
    primary: ValuationLensId | null;
    cross_check: ValuationLensId | null;
    basis?: string;
    statement?: string | null;
    horizon_label?: string | null;
    source?: string;
  } | null;
  relative_valuation: Partial<Record<ValuationLensId, ValuationLensRow>> | null;
  peers: {
    subject_present?: boolean;
    named_peers?: string[];
    industry_n?: number | null;
    industry_median_pe?: number | null;
    context_only?: boolean;
    /** Phase C peer pill (v2+): current multiple vs the whole-industry median row. */
    pill?: ValuationPill | null;
    ratio_to_industry_median?: number | null;
    pill_basis?: string | null;
    pill_skipped_reason?: string | null;
    /**
     * Approach A (2026-08-18): deterministic, code-built ROCE-context sentence, present only
     * when the peer pill is Expensive/Stretched AND the company out-earns its industry-median
     * ROCE by >25%. Neutral disclosure — states two facts, asserts no causal verdict. Null when
     * the gate does not fire.
     */
    quality_context_note?: string | null;
    roce_ratio?: number | null;
  } | null;
  reverse_dcf: {
    anchor_variable: string | null;
    /**
     * v2 semantics (growth fade, 2026-08-15): the fade path's implied FY+2 CAGR —
     * the number the zone is graded on. v1 rows stored a 10-year constant-rate
     * solve here; tell them apart by schema_version.
     */
    implied_cagr: number | null;
    implied_cagr_pct: number | null;
    /** Year-1 rate of the linear fade (v2+ only). */
    implied_year1_cagr?: number | null;
    implied_year1_cagr_pct?: number | null;
    /** Explicit duplicate of the graded FY+2 number (v2+ only). */
    implied_fy2_cagr?: number | null;
    /** Retired v1 constant-rate solve — bridge field, dropped after one cycle. */
    implied_cagr_flat_legacy?: number | null;
    solve_status: string;
    zone_vs_phase5: ValuationZone;
    /** What the zone was graded against (v2+) — mirrors the schema enum. */
    zone_basis?: "phase5_scenarios" | "delivered_cagr" | "delivered_roe" | null;
    /** Phase D (v2+): which earnings the model priced — mirrors the schema enum. */
    earnings_basis?:
      | "ttm"
      | "normalized_5y_median_eps"
      | "normalized_5y_median_eps_trough"
      | null;
    /** For normalized cyclical solves: what TTM earnings would have implied. */
    ttm_alternative?: {
      implied_fy2_cagr?: number | null;
      zone_vs_phase5?: string | null;
      solve_status?: string | null;
    } | null;
    /** Phase F (v2+): delivered revenue CAGR, percent units — fallback ladder / narrator context. */
    delivered_cagr?: Record<string, number | null> | null;
    reading?: string;
    held_constant?: Record<string, number | string | null>;
    phase5_scenarios?: { downside?: number | null; base?: number | null; upside?: number | null };
    plausibility_check?: string | null;
    /** Phase E (financials): the reverse residual-income model rides in this block, disambiguated
     * by zone_basis="delivered_roe". implied_cagr(_pct) carries the implied RoE, not a CAGR. */
    pricing_model?: "reverse_dcf" | "residual_income" | null;
    residual_income?: {
      price_to_book?: number | null;
      implied_roe_pct?: number | null;
      delivered_roe_pct?: number | null;
      delivered_roe_basis?: string | null;
      cost_of_equity_pct?: number | null;
      sustainable_growth_pct?: number | null;
      roe_gap_pp?: number | null;
    } | null;
  } | null;
  overlay: {
    rows: ValuationOverlayRow[];
    forensics_available: boolean;
    cash_quality_flag?: string | null;
    interpretation?: string | null;
  } | null;
  verdict_block: {
    score: number | null;
    verdict: ValuationVerdict | null;
    derivation: string[];
    caps_applied: string[];
    reasoning?: string | null;
    what_would_change_the_call?: string[] | null;
  } | null;
  calibration: Record<string, unknown> | null;
  unrated_reasons: string[] | null;
  incomplete_reasons: string[] | null;
  caveats: string[] | null;
  valuation_published: boolean;
};

export type NormalizedValuationLens = {
  id: ValuationLensId;
  label: string;
  role: "primary" | "cross-check";
  current: number | null;
  band: ValuationBand | null;
  pill: ValuationPill | null;
  pillBasis: string | null;
  interpretation: string | null;
  shortHistory: boolean;
  lowInformationBand: boolean;
  /** Level known from the ratios block when no history series exists. */
  levelWithoutBand: number | null;
};

export type NormalizedValuationCheck = {
  companyCode: string;
  lensStatement: string | null;
  horizonLabel: string | null;
  lenses: NormalizedValuationLens[];
  impliedCagrPct: number | null;
  zone: ValuationZone;
  zoneReading: string | null;
  /** Phase E: true when the pricing block is a reverse residual-income read (financials) — the
   * block relabels and the implied/delivered figures below are a return on equity, not growth. */
  isResidualIncome: boolean;
  impliedRoePct: number | null;
  deliveredRoePct: number | null;
  scenarios: { downside: number | null; base: number | null; upside: number | null };
  /**
   * Delivered revenue CAGR markers for the reverse-DCF horizon bar, from
   * `reverse_dcf.delivered_cagr` (percent units). Empty when the payload carries none. Sorted
   * longest-window-first; `label` is a display string ("5-yr delivered", "TTM", …).
   */
  deliveredCagr: { key: string; label: string; pct: number }[];
  plausibilityCheck: string | null;
  reverseDcfApplicable: boolean;
  reverseDcfNote: string | null;
  overlayRows: ValuationOverlayRow[];
  overlayInterpretation: string | null;
  forensicsAvailable: boolean;
  verdict: ValuationVerdict | null;
  score: number | null;
  reasoning: string | null;
  whatWouldChangeTheCall: string[];
  derivation: string[];
  capsApplied: string[];
  rateable: boolean;
  unratedReasons: string[];
  incompleteReasons: string[];
  caveats: string[];
  pricedAsOf: string | null;
  priceAtRun: number | null;
  /**
   * PEG lenses — display-only context, NEVER an input to the score or verdict. Present only
   * when P/E is positive and at least one growth leg computes; either leg can be independently
   * null (e.g. NOT-RATED lenders carry no base case, so `forward` drops while `trailing` may
   * survive).
   *   - trailing: current P/E ÷ trailing 5-yr EPS CAGR — textbook PEG. `hasLossYear` warns when
   *     a loss inside the window makes the growth rate (and this ratio) unreliable.
   *   - forward: current P/E ÷ Phase 5 base-case growth. That base case is a REVENUE CAGR, not
   *     an EPS forecast (we don't forecast EPS), so it is directional, not a textbook PEG.
   */
  peg: {
    pe: number;
    trailing: { ratio: number; growthPct: number; hasLossYear: boolean } | null;
    forward: { ratio: number; growthPct: number } | null;
  } | null;
  peerContext: {
    medianPe: number | null;
    industryN: number | null;
    qualityContextNote: string | null;
  } | null;
};
