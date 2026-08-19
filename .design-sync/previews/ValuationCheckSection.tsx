import { ValuationCheckSection } from "concall-alpha";
// Both props are computed: normalizeValuationCheck derives the lens pair from
// lens_selection, and derives BOTH PEG legs (P/E divided by trailing EPS CAGR
// and by the Phase 5 base case) rather than reading them off the row. Hand-
// writing a NormalizedValuationCheck would let those ratios drift from the
// numbers printed beside them. Both helpers are pure TS.
import {
  assessStaleness,
  normalizeValuationCheck,
} from "@/lib/valuation-check/normalize";

// Trishul Speciality Chemicals (TRISHULCH). Phase 12 prices on the calendar,
// not on documents, so staleness is graded against a FIXED "now" here — the
// real page passes the request time, and a preview that used new Date() would
// silently flip from a verdict to a withheld one as the fixture aged.
const NOW = new Date("2026-08-19T00:00:00Z");

const PE_BAND = {
  years: 5,
  n_weeks: 261,
  from: "2021-08-20",
  to: "2026-08-14",
  median: 33.1,
  p25: 27.6,
  p75: 41.2,
};

const EV_EBITDA_BAND = {
  years: 5,
  n_weeks: 261,
  from: "2021-08-20",
  to: "2026-08-14",
  median: 18.9,
  p25: 15.4,
  p75: 22.8,
};

const baseRow = {
  company_code: "TRISHULCH",
  schema_version: "valuation_check_v2",
  priced_as_of: "2026-08-18",
  price_at_run: 1284,
  run_timestamp: "2026-08-18T19:40:00+05:30",
  narrative_generated_at: "2026-08-18T19:44:00+05:30",
  verdict: "FAIRLY VALUED" as const,
  score: 52,
  rateable: true,
  primary_lens: "pe" as const,
  source: { provider: "screener.in", listing: "NSE" },
  market_data: {
    market_cap_cr: 6912,
    ttm_eps: 33.4,
    roce_pct: 24.1,
    eps_summary: { cagr_5y: 0.246, has_loss_year: false },
  },
  lens_selection: {
    primary: "pe" as const,
    cross_check: "ev_ebitda" as const,
    basis: "asset-light speciality manufacturer with a clean earnings history",
    statement:
      "Priced on P/E with EV/EBITDA as the cross-check — the balance sheet carries modest net debt, so the two lenses should agree, and they do.",
    horizon_label: "5-year own history",
  },
  relative_valuation: {
    pe: {
      available: true,
      fetch_status: "ok" as const,
      current: 38.4,
      as_of: "2026-08-18",
      screener_reported_median: 33.4,
      band_5y: PE_BAND,
      pill: "In-line" as const,
      pill_basis: "38.4x sits between the 5-year 27.6x-41.2x interquartile band",
      interpretation:
        "Trading in the upper half of its own five-year band but inside it — the CDMO re-rating of FY25 is already in the price, the FY28 doubling is not.",
    },
    ev_ebitda: {
      available: true,
      fetch_status: "ok" as const,
      current: 21.7,
      as_of: "2026-08-18",
      band_5y: EV_EBITDA_BAND,
      pill: "In-line" as const,
      pill_basis: "21.7x against a 15.4x-22.8x band",
      interpretation: "Agrees with the P/E read; net debt is small enough that the two barely diverge.",
    },
  },
  peers: {
    subject_present: true,
    named_peers: ["Privi Speciality", "Neuland Laboratories", "Solara Active Pharma"],
    industry_n: null,
    industry_median_pe: null,
    context_only: true,
    pill: null,
    pill_skipped_reason: "the sub-sector median is built on eleven listings, too few to price against",
    quality_context_note: null,
  },
  reverse_dcf: {
    anchor_variable: "revenue CAGR",
    implied_cagr: 0.187,
    implied_cagr_pct: 18.7,
    implied_year1_cagr: 0.244,
    implied_year1_cagr_pct: 24.4,
    implied_fy2_cagr: 0.187,
    solve_status: "solved",
    zone_vs_phase5: "bear_to_base" as const,
    zone_basis: "phase5_scenarios" as const,
    earnings_basis: "ttm" as const,
    reading:
      "At ₹1,284 the market is paying for about 18.7% a year — below our 23.5% base case and comfortably above the 12% downside.",
    held_constant: { ebitda_margin_pct: 22.5, tax_rate_pct: 25.2, wacc_pct: 11.5 },
    phase5_scenarios: { downside: 0.12, base: 0.235, upside: 0.3 },
    plausibility_check:
      "18.7% is above the 15.4% Trishul has actually compounded revenue at, so the price is not assuming a slowdown.",
  },
  overlay: {
    rows: [
      { source: "Moat (v15)", verdict: "NARROW", impact: "supports a mid-band multiple" },
      { source: "Forensics (Phase 8)", verdict: "not yet built", impact: "—" },
    ],
    forensics_available: false,
  },
  verdict_block: {
    score: 52,
    verdict: "FAIRLY VALUED" as const,
    reasoning:
      "Upper half of its own five-year band on both lenses, and priced for less growth than we forecast. A fair price for what is visible, with the FY28 CDMO ramp as unpaid-for optionality.",
    derivation: [
      "Start at 50 — the neutral anchor for a company inside its own interquartile band on the primary lens.",
      "Cross-check agrees (EV/EBITDA also In-line), so no divergence penalty.",
      "Reverse DCF lands between downside and base: +4.",
      "Narrow moat caps the upward adjustment at +2 in total: final 52.",
    ],
    caps_applied: [],
    what_would_change_the_call: [
      "Unit-4 utilisation exiting FY27 below 55%.",
      "The P/E crossing 41.2x, which would move the primary lens out of its own band.",
    ],
  },
  calibration: null,
  unrated_reasons: [],
  incomplete_reasons: [],
  caveats: [
    "Screener multiples are computed on standalone reported earnings; the consolidated series starts only in FY24.",
  ],
  valuation_published: true,
};

const fair = normalizeValuationCheck(baseRow)!;

// Same read, four weeks old. The verdict is withheld rather than shown against
// a price that has since moved. Overlay suppressed here so the withheld block
// and its reason stay above the fold.
const staleRead = normalizeValuationCheck({
  ...baseRow,
  priced_as_of: "2026-07-16",
  run_timestamp: "2026-07-16T19:40:00+05:30",
  overlay: { rows: [], forensics_available: false },
})!;

// Right after the demerger listing: Screener serves no multiple history, so the
// bands (and with them the pills) do not exist, and the score is withheld.
const unratedRow = {
  ...baseRow,
  rateable: false,
  score: null,
  verdict: null,
  verdict_block: null,
  relative_valuation: {
    pe: {
      available: false,
      fetch_status: "empty" as const,
      reason: "no weekly multiple series for this listing",
      current: null,
      current_from_ratios: 38.4,
      band_5y: null,
      pill: null,
    },
    ev_ebitda: {
      available: false,
      fetch_status: "empty" as const,
      reason: "no weekly multiple series for this listing",
      current: null,
      current_from_ratios: 21.7,
      band_5y: null,
      pill: null,
    },
  },
  reverse_dcf: {
    ...baseRow.reverse_dcf,
    implied_cagr: null,
    implied_cagr_pct: null,
    zone_vs_phase5: "unknown" as const,
    solve_status: "insufficient_history",
    plausibility_check:
      "Four quarters of consolidated earnings is not enough to solve a fade path against.",
  },
  unrated_reasons: [
    "no five-year multiple history: the current listing has traded for eleven months",
    "the earnings series is too short to price a fade path against",
  ],
  incomplete_reasons: ["peer set not yet mapped for the post-demerger entity"],
};
const unrated = normalizeValuationCheck(unratedRow)!;

// The same business after a re-rating to ₹1,980: the price now implies more
// growth than our own upside case, the peer pill turns Stretched, and the
// ROCE-context note fires.
const richRow = {
  ...baseRow,
  priced_as_of: "2026-08-18",
  price_at_run: 1980,
  verdict: "RICHLY PRICED" as const,
  score: 18,
  relative_valuation: {
    pe: {
      ...baseRow.relative_valuation.pe,
      current: 59.3,
      pill: "Stretched" as const,
      pill_basis: "59.3x against a 5-year 75th percentile of 41.2x",
      interpretation:
        "Well outside its own five-year band. The last time it traded here was the four weeks after the FY25 CDMO contract announcement.",
    },
    ev_ebitda: {
      ...baseRow.relative_valuation.ev_ebitda,
      current: 33.4,
      pill: "Expensive" as const,
      pill_basis: "33.4x against a 15.4x-22.8x band",
      low_information_band: true,
      interpretation: "The cross-check agrees, though its band widened materially during the FY25 re-rating.",
    },
  },
  peers: {
    ...baseRow.peers,
    industry_n: 28,
    industry_median_pe: 41.6,
    pill: "Stretched" as const,
    pill_skipped_reason: null,
    ratio_to_industry_median: 1.43,
    pill_basis: "59.3x against an industry-median 41.6x",
    quality_context_note:
      "Trishul earns a 24.1% ROCE against an industry-median 17.5% — 38% higher. Both facts are stated; the badge above is not adjusted for the difference.",
    roce_ratio: 1.38,
  },
  // Overlay suppressed here so the capped verdict block stays above the fold —
  // the quality-and-risk rows are shown in FairlyValued and NotRatedNoHistory.
  overlay: { rows: [], forensics_available: false },
  reverse_dcf: {
    ...baseRow.reverse_dcf,
    implied_cagr: 0.318,
    implied_cagr_pct: 31.8,
    zone_vs_phase5: "above_bull" as const,
    reading: "At ₹1,980 the price is paying for 31.8% a year — more than our 30% upside case.",
    plausibility_check:
      "31.8% would need every one of the nine validation molecules to convert on schedule.",
  },
  verdict_block: {
    score: 18,
    verdict: "RICHLY PRICED" as const,
    reasoning:
      "Outside its own band on both lenses and priced past our upside case. The quality is real; the price now assumes an outcome better than the best one we forecast.",
    derivation: [
      "Start at 50 — the neutral anchor.",
      "Primary lens above its own 75th percentile: -18.",
      "Implied growth above the upside case: -14.",
      "Final 18, before caps.",
    ],
    caps_applied: [
      "Score capped at 20: implied growth sits above our own upside case, so no quality adjustment can lift it further.",
    ],
    what_would_change_the_call: [
      "A move back inside the 41.2x upper band on the primary lens.",
      "The base case rising toward 30% on a contracted, not indicative, CDMO order.",
    ],
  },
};
const rich = normalizeValuationCheck(richRow)!;

const caption = "text-[11px] leading-relaxed text-muted-foreground";

/**
 * Canonical: a rateable, freshly-priced read. The reverse DCF leads, the own-
 * history lenses follow, PEG is shown as explicit context-only, and the verdict
 * block carries its derivation behind a disclosure.
 */
export const FairlyValued = () => (
  <ValuationCheckSection valuation={fair} staleness={assessStaleness(fair, NOW)} />
);

/**
 * The other end of the verdict ramp: outside its own band, above the upside
 * case, with a cap applied and the ROCE peer-context note firing.
 */
export const RichlyPriced = () => (
  <ValuationCheckSection valuation={rich} staleness={assessStaleness(rich, NOW)} />
);

/**
 * Priced 34 days ago. Everything that does not decay still renders; only the
 * verdict is withheld, and the reason names the age.
 */
export const StaleVerdictWithheld = () => (
  <ValuationCheckSection valuation={staleRead} staleness={assessStaleness(staleRead, NOW)} />
);

/**
 * NOT RATED as a designed state, not an empty one: the lenses show the level
 * they do know without a pill, and the unrated reasons are listed.
 */
export const NotRatedNoHistory = () => (
  <div className="space-y-2">
    <ValuationCheckSection valuation={unrated} staleness={assessStaleness(unrated, NOW)} />
    <p className={caption}>
      A second unrated path exists for lenders and insurers, where v14 rules a cash-flow
      model out entirely: the reverse-DCF block is replaced by a one-line explanation and no
      multiples are graded at all.
    </p>
  </div>
);
