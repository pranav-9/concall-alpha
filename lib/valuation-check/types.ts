// Mirrors schemas/valuation_check_v1.json — the schema is the structural authority, this
// file follows it. Phase 12 (Business Analysis Framework v14 Section 6).

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
  market_data: Record<string, number | null> | null;
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
  } | null;
  reverse_dcf: {
    anchor_variable: string | null;
    implied_cagr: number | null;
    implied_cagr_pct: number | null;
    solve_status: string;
    zone_vs_phase5: ValuationZone;
    reading?: string;
    held_constant?: Record<string, number | string | null>;
    phase5_scenarios?: { downside?: number | null; base?: number | null; upside?: number | null };
    plausibility_check?: string | null;
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
  scenarios: { downside: number | null; base: number | null; upside: number | null };
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
  peerContext: { medianPe: number | null; industryN: number | null } | null;
};
