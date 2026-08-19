import { BusinessSnapshotSection } from "concall-alpha";
import type {
  NormalizedBusinessSnapshot,
  NormalizedHistoricalEconomics,
  NormalizedRevenueBreakdownItem,
} from "@/lib/business-snapshot/types";

// Business Snapshot is the first analysis section on a company page and the
// only one that owns its own SectionCard. It takes a fully normalized snapshot
// (never a Supabase row) and picks one of three renders:
//
//   1. STRUCTURED - the current pipeline shape: About, Business Segments,
//      Business Momentum, and the segment history table.
//   2. LEGACY - older rows with no About text at all: revenue drivers, model
//      watchpoints and mix shift, with the long lists behind drawers.
//   3. MISSING - snapshot is null, or carries neither shape.
//
// The branch test is narrower than it looks. `businessSummaryShort` and
// `businessSummaryLong` are FALLBACKS for the About block, so a legacy row that
// carries either one is routed to the STRUCTURED branch and renders as About
// alone. The legacy layout below is reachable only when both summary fields are
// empty and the driver / dependency / risk lists are not.
//
// The header pills are derived, not passed: they name whichever blocks the
// payload actually produced, so they double as a contents list. `hasMoatAnalysis`
// only adds a pill - the moat section itself lives further down the page.
// `generatedAtShort` is formatShortDate() output ("12 Aug"), not an ISO string.
//
// Running example: Anvira Speciality Chemicals (ANVIRACHEM), a mid-cap CDMO and
// agrochemical-intermediates maker, snapshot regenerated after the Q1 FY27 call.

const SEGMENTS: NormalizedRevenueBreakdownItem[] = [
  {
    name: "CDMO & Custom Synthesis",
    description:
      "Late-stage intermediates made to innovator specifications under multi-year supply contracts.",
    revenueSharePercent: 41.2,
    marginProfile: "high_margin",
    marginProfileNote: "Cost-plus contracts with a validated-process premium.",
    rolePill: "core_engine",
    growthDirectionPill: "accelerating",
  },
  {
    name: "Agrochemical Intermediates",
    description: "Herbicide and fungicide intermediates sold to global agro majors.",
    revenueSharePercent: 26.4,
    marginProfile: "improving",
    marginProfileNote: "Recovering off the FY24 destocking trough.",
    rolePill: "support_engine",
    growthDirectionPill: "stable",
  },
  {
    name: "Performance Additives",
    description: "Antioxidants and rubber chemicals for tyre and polymer customers.",
    revenueSharePercent: 15.1,
    marginProfile: "high_margin",
    marginProfileNote: "Formulation-led pricing; volumes track domestic tyre build.",
    rolePill: "support_engine",
    growthDirectionPill: "stable",
  },
  {
    name: "Pigment Intermediates",
    description: "Naphthalene-derived intermediates supplied to pigment and dye formulators.",
    revenueSharePercent: 8.3,
    marginProfile: "improving",
    marginProfileNote: "Captive naphthalene cracking lifted contribution margin from FY25.",
    rolePill: "support_engine",
    growthDirectionPill: "stable",
  },
  {
    name: "Pharma Intermediates",
    description: "Off-patent API intermediates sold on the merchant market.",
    revenueSharePercent: 5.2,
    marginProfile: "pre_scale",
    marginProfileNote: "Sub-scale block; guided to fold into CDMO by FY28.",
    rolePill: "emerging",
    growthDirectionPill: "accelerating",
  },
  {
    name: "Bulk & Traded Chemicals",
    description: "Low-margin solvent and acid trading that fills spare tankage.",
    revenueSharePercent: 2.6,
    marginProfile: "drag",
    marginProfileNote: "Pass-through economics; kept to hold logistics contracts.",
    rolePill: "drag",
    growthDirectionPill: "declining",
  },
];

const YEARS = ["FY22", "FY23", "FY24", "FY25", "FY26"];
const byYear = (values: number[]): Record<string, number | null> =>
  Object.fromEntries(YEARS.map((y, i) => [y, values[i]]));

const COMPANY_CAGR = {
  basis: "consolidated_reported",
  scope: "consolidated",
  startYear: "FY23",
  endYear: "FY26",
  cagrPercent: 12.7,
};

const HISTORICAL_ECONOMICS: NormalizedHistoricalEconomics = {
  companyRevenueCagr3y: COMPANY_CAGR,
  revenueSplitHistory: [],
  segmentGrowthCagr3y: [],
  summary: {
    companyRevenueCagr: COMPANY_CAGR,
    periods: YEARS,
    overallConfidence: "high",
    methodologyNote: "Segment revenue taken as printed in the segment note.",
  },
  revenueHistoryBySegment: {
    years: YEARS,
    latestPeriod: null,
    rows: [
      {
        segment: "CDMO & Custom Synthesis",
        isTotal: false,
        revenueByYear: byYear([274, 421, 566, 712, 882]),
        comparabilityLabel: "reported",
        growthMetricPeriod: "FY22-FY26",
        growthMetricPercent: 34,
        latestPeriodRevenue: 882,
      },
      {
        segment: "Agrochemical Intermediates",
        isTotal: false,
        revenueByYear: byYear([471, 512, 486, 468, 565]),
        comparabilityLabel: "reported",
        growthMetricPeriod: "FY22-FY26",
        growthMetricPercent: 4.7,
        latestPeriodRevenue: 565,
      },
      {
        segment: "Consolidated revenue",
        isTotal: true,
        revenueByYear: byYear([1237, 1477, 1630, 1800, 2115]),
        comparabilityLabel: "reported",
        growthMetricPeriod: "FY22-FY26",
        growthMetricPercent: 14.3,
        latestPeriodRevenue: 2115,
      },
    ],
    insights: [
      "CDMO & Custom Synthesis: went from a fifth of revenue to the largest block in four years, without giving up margin to do it.",
      "Agrochemical Intermediates: the FY23-FY25 slide was channel destocking, not share loss.",
    ],
  },
  revenueMixHistoryBySegment: {
    years: YEARS,
    latestPeriod: null,
    rows: [
      {
        segment: "CDMO & Custom Synthesis",
        isTotal: false,
        mixPercentByYear: byYear([22.1, 28.5, 34.7, 39.6, 41.7]),
        directionLabel: "gaining_share",
        latestMixPercent: 41.7,
        comparabilityLabel: "reported",
      },
      {
        segment: "Agrochemical Intermediates",
        isTotal: false,
        mixPercentByYear: byYear([38.1, 34.7, 29.8, 26, 26.7]),
        directionLabel: "losing_share",
        latestMixPercent: 26.7,
        comparabilityLabel: "reported",
      },
    ],
    insights: [
      "CDMO & Custom Synthesis: nearly twice the share it had in FY22 - this is the whole re-rating case.",
    ],
  },
  revenueHistoryByUnit: null,
  revenueMixHistoryByUnit: null,
};

const BASE: NormalizedBusinessSnapshot = {
  companyCode: "ANVIRACHEM",
  generatedAtRaw: "2026-08-12T10:20:00+05:30",
  generatedAtLabel: "12 Aug 2026",
  website: "https://www.anvira.co.in",
  snapshotPhase: 3,
  snapshotSource: "annual_report+investor_ppt",
  sourceUrls: [
    "https://www.anvira.co.in/investors/ANVIRACHEM-Annual-Report-FY26.pdf",
    "https://www.anvira.co.in/investors/ANVIRACHEM-Q1FY27-Investor-Presentation.pdf",
  ],
  businessSummaryShort: null,
  businessSummaryLong: null,
  businessModelQuality: "contract_manufacturing",
  operatingModel: "asset_heavy",
  valueChainPosition: "intermediates",
  demandShape: "contracted",
  dominantSegment: "CDMO & Custom Synthesis",
  emergingSegment: "Pharma Intermediates",
  mixShiftSummary: null,
  topRevenueDrivers: [],
  topGrowthDrivers: [],
  keyDependencies: [],
  keyRisksToModel: [],
  segmentProfiles: [],
  aboutCompany: null,
  revenueBreakdown: null,
  historicalEconomics: null,
  hasHistoricalEconomicsSource: false,
  segmentHistoryQuarterly: null,
  segmentHistoryAnnual: null,
  consolidatedFinancialsAnnual: null,
  schemaHints: [],
};

/**
 * Canonical: the structured render. About with the long version behind "Read
 * more", then Business Segments - the mix strip plus the four largest segments,
 * with the two smallest folded away. The header pills name exactly the blocks
 * this payload produced.
 */
export const StructuredSnapshot = () => (
  <BusinessSnapshotSection
    snapshot={{
      ...BASE,
      aboutCompany: {
        aboutShort:
          "Anvira makes late-stage chemical intermediates - most of it to order for innovator pharma and global agrochemical majors.",
        aboutLong:
          "Two manufacturing blocks at Dahej, both USFDA-inspected and REACH-registered, plus an older multipurpose site at Ankleshwar. The CDMO block works on multi-year contracts with take-or-pay minimums; the agrochemical and additives books are sold on annual price agreements into a market that competes on cost. Revenue was Rs 2,115 cr in FY26, of which roughly two-fifths came from the CDMO block, up from a fifth four years earlier.",
      },
      revenueBreakdown: { bySegment: SEGMENTS, byProductOrService: [] },
    }}
    companyCode="ANVIRACHEM"
    companyName="Anvira Speciality Chemicals"
    generatedAtShort="12 Aug"
    hasMoatAnalysis
  />
);

/**
 * The same section when the historical-economics slot is populated: a Business
 * Momentum block whose one-line preview is computed from the data (latest YoY,
 * company CAGR, period and segment counts, confidence), with the full data pack
 * under it. About is omitted here so the momentum block is what you see.
 */
export const WithBusinessMomentum = () => (
  <BusinessSnapshotSection
    snapshot={{
      ...BASE,
      revenueBreakdown: { bySegment: SEGMENTS.slice(0, 2), byProductOrService: [] },
      historicalEconomics: HISTORICAL_ECONOMICS,
      hasHistoricalEconomicsSource: true,
    }}
    companyCode="ANVIRACHEM"
    companyName="Anvira Speciality Chemicals"
    generatedAtShort="12 Aug"
    hasMoatAnalysis
  />
);

/**
 * A pre-structured row with no About text: revenue drivers and model
 * watchpoints as lists behind drawers, plus a mix-shift note. The header pills
 * change with the branch - "Revenue drivers" and "Model watchpoints" replace
 * "About" and "Business segments" - and the missing summary is stated rather
 * than papered over.
 */
export const LegacyDriversAndWatchpoints = () => (
  <BusinessSnapshotSection
    snapshot={{
      ...BASE,
      snapshotPhase: 1,
      snapshotSource: "annual_report",
      mixShiftSummary:
        "Contracted CDMO revenue has roughly doubled its share of the mix since FY22, mostly at the expense of the agrochemical book.",
      topRevenueDrivers: [
        "Four commercial molecules at the Dahej Block 2 CDMO site",
        "Herbicide intermediate volumes with the top three agro majors",
        "Antioxidant pricing into the domestic tyre build",
      ],
      keyDependencies: [
        "Two Chinese suppliers for the nitro intermediate, roughly 11% of raw-material cost",
        "Top five CDMO customers are 58% of segment revenue",
      ],
      keyRisksToModel: [
        "A second source qualified by an innovator would break the re-filing lock",
        "Gujarat Pollution Control Board consent renewal at Ankleshwar is due in FY28",
      ],
    }}
    companyCode="ANVIRACHEM"
    companyName="Anvira Speciality Chemicals"
    generatedAtShort="18 Nov"
    hasMoatAnalysis={false}
  />
);

/**
 * No snapshot at all. The section still renders - the reader learns it exists,
 * why it is blank, and gets the request control - rather than disappearing from
 * the page. No pills, no date.
 */
export const NotGeneratedYet = () => (
  <BusinessSnapshotSection
    snapshot={null}
    companyCode="ANVIRACHEM"
    companyName="Anvira Speciality Chemicals"
    generatedAtShort={null}
    hasMoatAnalysis={false}
  />
);
