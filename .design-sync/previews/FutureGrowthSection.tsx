import { FutureGrowthSection } from "concall-alpha";
// The outlook prop is the normalized Phase 5 payload: catalysts are re-ranked
// by weighted_priority, evidence lines are collapsed to meta + text, and
// scenario confidence is rescaled from percent to a fraction. Running the real
// normalizer keeps the fixture inside what the pipeline emits.
// lib/growth-outlook/normalize is pure TS.
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";

// Trishul Speciality Chemicals (TRISHULCH) — CDMO + performance intermediates
// + agro actives, out of Dahej and Ankleshwar. Phase 5 run against the Q1 FY27
// transcript and the FY26 annual report.
//
// BAND VOCABULARY: this section reads on lib/growth-band (Exceptional / Strong
// / Solid / Moderate / Soft / Weak, cuts at 8.5 / 8 / 7.5 / 7 / 6.5), NOT the
// quarterly sentiment ramp. 7.8 is "Solid" here and would be "Bullish" there.
const DETAILS = {
  company_name: "Trishul Speciality Chemicals",
  schema_version: "growth_outlook_v3",
  fiscal_year: "FY27",
  horizon_quarters: 8,
  horizon_years: 2,
  base_growth_pct: "23.5",
  upside_growth_pct: "30",
  downside_growth_pct: "12",
  summary_bullets: [
    "The FY27 growth case rests on one asset filling up: the Dahej Unit-4 multipurpose block, commissioned in May and running at 41%.",
    "Nine CDMO molecules sit in Phase-3 validation against seven in commercial supply — the widest that funnel has been.",
    "Agro actives is still repricing contract by contract after the Ankleshwar shutdown, and is the drag on the base case.",
  ],
  growth_score_formula:
    "0.25 catalysts + 0.20 guidance + 0.15 scenarios + 0.15 execution + 0.10 sentiment + 0.10 forward facts + 0.05 industry",
  growth_score_components: {
    sentiment_score: 7.5,
    catalyst_strength: 8.2,
    guidance_strength: 8,
    scenario_strength: 7.4,
    execution_confidence: 7.6,
    quantified_forward_facts: 7.1,
    industry_score: 7.9,
  },
  discovery_summary: {
    selected_count: 3,
    total_candidates_considered: 11,
    selection_priority_stack: "quantified>time_relevance>certainty",
  },
  also_considered_note:
    "Two candidates were screened out for being restatements of the Unit-4 ramp rather than independent drivers.",
  also_considered: [
    {
      catalyst: "Contract-research services desk at Ankleshwar",
      current_stage: "announced",
      why_not_top_3: "₹18 cr of annualised revenue at full run-rate — too small to move a ₹1,842 cr base.",
    },
    {
      catalyst: "Backward integration into two key intermediates",
      current_stage: "in_progress",
      why_not_top_3: "A margin lever, not a growth one; it shows up in the EBITDA guidance rather than the revenue case.",
    },
    {
      catalyst: "European distribution tie-up for performance intermediates",
      current_stage: "announced",
      why_not_top_3: "Signed but not quantified; management declined to size it on the Q1 FY27 call.",
    },
  ],
  fact_base: [
    {
      period: "Q1 FY27",
      source: "transcript",
      quote_or_fact: "Unit-4 was commissioned in May and ran at 41% utilisation through the June quarter.",
    },
    {
      period: "Q1 FY27",
      source: "presentation",
      quote_or_fact: "CDMO revenue of ₹236 cr, up 38% year on year, against consolidated ₹512 cr.",
    },
    {
      period: "FY26",
      source: "annual_report",
      quote_or_fact: "Reactor capacity of 11,800 KL across Dahej and Ankleshwar before the Unit-4 addition.",
    },
  ],
  source_files: [
    { fy: "FY27", quarter: "Q1", kind: "transcript", source_url: "https://www.trishulchem.example/ir/q1fy27-transcript.pdf" },
    { fy: "FY27", quarter: "Q1", kind: "presentation", source_url: "https://www.trishulchem.example/ir/q1fy27-investor-deck.pdf" },
    { fy: "FY26", quarter: null, kind: "annual_report", source_url: "https://www.trishulchem.example/ir/fy26-annual-report.pdf" },
  ],
  catalysts: [
    {
      catalyst: "Dahej Unit-4 multipurpose block ramp",
      type: "capacity",
      timing: "H2 FY27",
      status_tag: "ramping",
      expected_impact: "revenue",
      pill_revenue_impact: "high",
      pill_confidence: "high",
      pill_dependency: "customer validation schedules",
      what_is_changing: "4,200 KL of multipurpose reactor capacity came online in May and is loading customer by customer",
      why_it_matters: "the FY27 margin band assumes it exits the year near 70% utilisation, against 41% today",
      quantified: { unit: "Cr", value: 420 },
      priority: {
        impact_score: 9,
        time_relevance: 9,
        certainty_score: 8,
        progression_depth: 8,
        weighted_priority: 0.86,
      },
      investibility_checks: {
        adoption: "Three customers have already qualified campaigns on the block.",
        feasibility: "Commissioned and running; the risk is loading, not construction.",
        entry_timing: "The utilisation curve is disclosed quarterly in the deck.",
        unit_economics: "Contribution margin on the block is guided at parity with Unit-3.",
      },
      timeline_evidence: [
        {
          stage: "announced",
          period: "Q1 FY26",
          source: "transcript",
          quote_or_fact: "₹210 cr multipurpose block approved for Dahej, targeted for commissioning in FY27.",
        },
        {
          stage: "commissioned",
          period: "Q1 FY27",
          source: "presentation",
          quote_or_fact: "Unit-4 commissioned in May 2026; 4,200 KL of reactor capacity added.",
          delta_vs_prev: "On schedule and ₹6 cr under the approved budget.",
        },
        {
          stage: "in_progress",
          period: "Q1 FY27",
          source: "transcript",
          quote_or_fact: "Running at 41% in the June quarter with three qualified campaigns.",
          delta_vs_prev: "First utilisation number management has put on the record.",
        },
      ],
      evidence: [
        { period: "Q1 FY27", source: "transcript", quote_or_fact: "We expect Unit-4 to be in the high sixties on utilisation as we exit this financial year." },
      ],
    },
    {
      catalyst: "Two CDMO molecules converting to commercial supply",
      type: "customer_win",
      timing: "H2 FY27",
      status_tag: "in_delivery",
      expected_impact: "revenue",
      pill_revenue_impact: "high",
      pill_confidence: "medium",
      pill_dependency: "innovator launch timing",
      what_is_changing: "two of the nine Phase-3 validation molecules are contracted to move into repeat commercial supply",
      why_it_matters: "commercial molecules carry three-to-five-year visibility; validation campaigns carry none",
      quantified: { unit: "Cr", value: 260 },
      priority: {
        impact_score: 8,
        time_relevance: 8,
        certainty_score: 7,
        progression_depth: 7,
        weighted_priority: 0.79,
      },
      timeline_evidence: [
        {
          stage: "announced",
          period: "Q3 FY26",
          source: "transcript",
          quote_or_fact: "Two molecules have cleared validation and are in commercial negotiation.",
        },
        {
          stage: "in_progress",
          period: "Q1 FY27",
          source: "transcript",
          quote_or_fact: "Both supply agreements are signed; first commercial campaigns are scheduled for the December quarter.",
          delta_vs_prev: "Moved from negotiation to signed inside two quarters.",
        },
      ],
      evidence: [
        { period: "Q1 FY27", source: "transcript", quote_or_fact: "We are not able to name the molecules, but both are contracted for H2." },
      ],
    },
    {
      catalyst: "Agro actives repricing after the Ankleshwar revamp",
      type: "pricing",
      timing: "FY27-FY28",
      status_tag: "announced",
      expected_impact: "margin",
      pill_margin_impact: "expanding",
      pill_confidence: "low",
      pill_dependency: "kharif channel inventory",
      what_is_changing: "contracts are being renegotiated one at a time as they come up for renewal",
      why_it_matters: "the segment ran below its FY24 realisation for six quarters and is the drag on the base case",
      priority: {
        impact_score: 6,
        time_relevance: 6,
        certainty_score: 5,
        progression_depth: 5,
        weighted_priority: 0.61,
      },
      timeline_evidence: [
        {
          stage: "announced",
          period: "Q1 FY27",
          source: "transcript",
          quote_or_fact: "Roughly a third of the agro book reprices this financial year.",
        },
      ],
      evidence: [
        { period: "Q1 FY27", source: "transcript", quote_or_fact: "We are not going to chase volume at FY26 pricing." },
      ],
    },
  ],
  scenarios: {
    downside: {
      growth_pct: "12%",
      confidence_pct: 20,
      quick_takeaway: "Unit-4 stalls in the low fifties and agro actives repricing slips a year.",
      drivers: ["Base CDMO book holds at FY26 volumes", "Performance intermediates grow with the market"],
      risks: [
        "Innovator launch slippage pushes both commercial conversions into FY28",
        "Kharif channel destocking repeats and agro realisation falls again",
      ],
      risk_watch: "Utilisation below 55% at the Q3 FY27 print would put this case in play.",
    },
    base: {
      growth_pct: "23.5%",
      confidence_pct: 55,
      quick_takeaway: "Unit-4 exits FY27 near 70% and both contracted molecules ship in H2.",
      drivers: [
        "Unit-4 loading follows the three already-qualified campaigns",
        "CDMO mix keeps lifting consolidated gross margin",
      ],
      risks: ["Agro actives stays flat rather than recovering"],
      risk_watch: "The base case assumes no further shutdown at Ankleshwar.",
    },
    upside: {
      growth_pct: "30%",
      confidence_pct: 25,
      quick_takeaway: "A third molecule converts early and agro realisation returns to FY24 levels.",
      drivers: [
        "Validation queue converts faster than the one-a-year historical rate",
        "European distribution tie-up gets sized and contributes in H2",
      ],
      risks: ["Capacity becomes the constraint again a year earlier than planned"],
      risk_watch: "Would need a second capex approval inside FY28.",
    },
  },
  run_timestamp: "2026-08-14T09:20:00+05:30",
};

const outlookFor = (growthScore: number) =>
  normalizeGrowthOutlook({
    details: { ...DETAILS, growth_score: growthScore },
    growthScore,
    runTimestamp: "2026-08-14T09:20:00+05:30",
    companyName: "Trishul Speciality Chemicals",
  });

const solid = outlookFor(7.8);
const exceptional = outlookFor(8.7);

// The same section a year on, with the forward case thinned out: the score
// drops into the Weak band and only one catalyst survives. Short enough that
// the bear / base / bull scenario row — the block the taller cards push below
// the fold — reads in full here.
const weak = normalizeGrowthOutlook({
  details: {
    ...DETAILS,
    growth_score: 6.1,
    base_growth_pct: "9",
    upside_growth_pct: "14",
    downside_growth_pct: "3",
    summary_bullets: [
      "The forward case has thinned to one asset: Unit-4 utilisation, which has not moved for two quarters.",
      "No CDMO molecule has converted to commercial supply since Q3 FY26.",
    ],
    also_considered: [],
    catalysts: [DETAILS.catalysts[0]],
    scenarios: {
      downside: {
        growth_pct: "3%",
        confidence_pct: 35,
        quick_takeaway: "Unit-4 stays near 40% and the agro book reprices down again.",
        drivers: ["Performance intermediates hold their FY26 volumes"],
        risks: ["A second validation molecule slips out of FY28"],
        risk_watch: "A third flat utilisation quarter would confirm this case.",
      },
      base: {
        growth_pct: "9%",
        confidence_pct: 45,
        quick_takeaway: "Utilisation grinds to the mid-fifties without a new molecule.",
        drivers: ["Existing commercial molecules run at contracted volumes"],
        risks: ["Nothing in the pipeline converts inside the horizon"],
        risk_watch: "The base case now assumes no CDMO conversion at all.",
      },
      upside: {
        growth_pct: "14%",
        confidence_pct: 20,
        quick_takeaway: "One validation molecule converts and pulls the block to 65%.",
        drivers: ["A single conversion is worth roughly six points of growth"],
        risks: ["Needs an innovator launch we have no visibility on"],
        risk_watch: "No contract has been signed for this case.",
      },
    },
  },
  growthScore: 6.1,
  runTimestamp: "2026-08-14T09:20:00+05:30",
  companyName: "Trishul Speciality Chemicals",
});

const RANK_INFO = {
  rank: 14,
  total: 100,
  percentile: 86,
  href: "/leaderboards?board=growth",
};

/**
 * Canonical company-page render: summary block with the growth-score chip and
 * band word, the top three catalysts ranked by weighted priority, and the
 * bear / base / bull scenario row. 7.8 is "Solid" on the growth ramp.
 */
export const SolidOutlook = () => (
  <FutureGrowthSection
    outlook={solid}
    companyCode="TRISHULCH"
    companyName="Trishul Speciality Chemicals"
    rankInfo={RANK_INFO}
  />
);

/** Top of the growth ramp — 8.7 crosses the 8.5 cut into "Exceptional". */
export const ExceptionalOutlook = () => (
  <FutureGrowthSection
    outlook={exceptional}
    companyCode="TRISHULCH"
    companyName="Trishul Speciality Chemicals"
    rankInfo={{ rank: 3, total: 100, percentile: 97, href: "/leaderboards?board=growth" }}
  />
);

/**
 * Bottom of the ramp: 6.1 is "Weak" on the growth scale. One catalyst survives,
 * and the bear / base / bull scenario row sits underneath with the base case
 * emerald-ringed as the anchor read.
 */
export const WeakOutlook = () => (
  <FutureGrowthSection
    outlook={weak}
    companyCode="TRISHULCH"
    companyName="Trishul Speciality Chemicals"
  />
);

/**
 * Phase 5 has never run for this company. The section keeps its shell and
 * offers the reader a way to ask for it, rather than disappearing from the page.
 */
export const NotGeneratedYet = () => (
  <FutureGrowthSection
    outlook={null}
    companyCode="TRISHULCH"
    companyName="Trishul Speciality Chemicals"
  />
);
