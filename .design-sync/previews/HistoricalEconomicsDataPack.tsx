import { HistoricalEconomicsDataPack } from "concall-alpha";
import type {
  NormalizedHistoricalEconomics,
  NormalizedRevenueHistoryBySegment,
  NormalizedRevenueHistoryByUnit,
  NormalizedRevenueMixHistoryBySegment,
  NormalizedRevenueMixHistoryByUnit,
} from "@/lib/business-snapshot/types";

// "Business Momentum" - the five-year revenue data pack inside Business
// Snapshot. It takes the whole NormalizedHistoricalEconomics object and picks
// its own path: revenue history BY SEGMENT if that slot exists, otherwise BY
// ECONOMIC UNIT (geography, plant, subsidiary). Mix history goes in a drawer
// under it, collapsed, because absolute revenue is the first read and share of
// mix is the second.
//
// Behaviour worth teaching:
//   * Each module is a Table/Graph toggle over the same rows - the table opens
//     first, the line chart is one click away, and both use one colour per
//     series shared with the segment strip higher up the page.
//   * A row flagged `isTotal` (or `isConsolidated`) is demoted to the bottom and
//     never ranked as "largest segment".
//   * Every cell carries its period-over-period delta under the number; the mix
//     table carries pp changes instead of percentages.
//   * `insights` are one interpretive line per row, capped at six.
//
// Running example: Anvira Speciality Chemicals (ANVIRACHEM), revenue in Rs cr,
// FY22-FY26, as read in Q1 FY27.

const YEARS = ["FY22", "FY23", "FY24", "FY25", "FY26"];

const byYear = (values: number[]): Record<string, number | null> =>
  Object.fromEntries(YEARS.map((y, i) => [y, values[i]]));

const REVENUE_BY_SEGMENT: NormalizedRevenueHistoryBySegment = {
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
      segment: "Performance Additives",
      isTotal: false,
      revenueByYear: byYear([238, 268, 291, 312, 323]),
      comparabilityLabel: "reported",
      growthMetricPeriod: "FY22-FY26",
      growthMetricPercent: 7.9,
      latestPeriodRevenue: 323,
    },
    {
      segment: "Pigment Intermediates",
      isTotal: false,
      revenueByYear: byYear([129, 141, 149, 160, 178]),
      comparabilityLabel: "restated",
      growthMetricPeriod: "FY22-FY26",
      growthMetricPercent: 8.4,
      latestPeriodRevenue: 178,
    },
    {
      segment: "Pharma Intermediates",
      isTotal: false,
      revenueByYear: byYear([58, 74, 83, 96, 111]),
      comparabilityLabel: "reported",
      growthMetricPeriod: "FY22-FY26",
      growthMetricPercent: 17.6,
      latestPeriodRevenue: 111,
    },
    {
      segment: "Bulk & Traded Chemicals",
      isTotal: false,
      revenueByYear: byYear([67, 61, 55, 52, 56]),
      comparabilityLabel: "reported",
      growthMetricPeriod: "FY22-FY26",
      growthMetricPercent: -4.4,
      latestPeriodRevenue: 56,
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
    "CDMO & Custom Synthesis: a fifth of revenue to the largest block in four years, with no margin given up.",
    "Agrochemical Intermediates: the FY23-FY25 slide was destocking, not share loss.",
    "Pigment Intermediates: captive naphthalene cracking from FY25 turned a flat line into a rising one.",
    "Bulk & Traded Chemicals: shrinking on purpose - the trading book is being exited by FY28.",
  ],
};

const MIX_BY_SEGMENT: NormalizedRevenueMixHistoryBySegment = {
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
    {
      segment: "Performance Additives",
      isTotal: false,
      mixPercentByYear: byYear([19.2, 18.1, 17.9, 17.3, 15.3]),
      directionLabel: "losing_share",
      latestMixPercent: 15.3,
      comparabilityLabel: "reported",
    },
    {
      segment: "Pigment Intermediates",
      isTotal: false,
      mixPercentByYear: byYear([10.4, 9.5, 9.1, 8.9, 8.4]),
      directionLabel: "stable_share",
      latestMixPercent: 8.4,
      comparabilityLabel: "restated",
    },
    {
      segment: "Pharma Intermediates",
      isTotal: false,
      mixPercentByYear: byYear([4.7, 5, 5.1, 5.3, 5.2]),
      directionLabel: "stable_share",
      latestMixPercent: 5.2,
      comparabilityLabel: "reported",
    },
    {
      segment: "Bulk & Traded Chemicals",
      isTotal: false,
      mixPercentByYear: byYear([5.4, 4.1, 3.4, 2.9, 2.6]),
      directionLabel: "becoming_less_important",
      latestMixPercent: 2.6,
      comparabilityLabel: "reported",
    },
  ],
  insights: [
    "CDMO & Custom Synthesis: nearly twice the share it had in FY22 - this is the whole re-rating case.",
    "Agrochemical Intermediates: gave up 11pp of mix without ever shrinking below a quarter of revenue.",
    "Bulk & Traded Chemicals: down to 2.6% and being exited, so mix loss here is a decision, not a warning.",
  ],
};

const REVENUE_BY_UNIT: NormalizedRevenueHistoryByUnit = {
  periods: YEARS,
  methodologyNote:
    "Geography split taken from the annual report's revenue-by-location note; not reconciled to the segment note.",
  rows: [
    {
      unit: "India (domestic)",
      valuesByPeriod: byYear([545, 620, 654, 682, 741]),
      cagrPercent: 8,
      confidence: "high",
      isConsolidated: false,
    },
    {
      unit: "Europe",
      valuesByPeriod: byYear([372, 456, 512, 574, 668]),
      cagrPercent: 15.8,
      confidence: "high",
      isConsolidated: false,
    },
    {
      unit: "North America",
      valuesByPeriod: byYear([198, 267, 328, 401, 552]),
      cagrPercent: 29.2,
      confidence: "medium",
      isConsolidated: false,
    },
    {
      unit: "Rest of world",
      valuesByPeriod: byYear([122, 134, 136, 143, 154]),
      cagrPercent: 6,
      confidence: "medium",
      isConsolidated: false,
    },
    {
      unit: "Consolidated revenue",
      valuesByPeriod: byYear([1237, 1477, 1630, 1800, 2115]),
      cagrPercent: 14.3,
      confidence: "high",
      isConsolidated: true,
    },
  ],
  insights: [
    "North America: compounded near 30% and is now a quarter of revenue - this is where the CDMO contracts land.",
    "India (domestic): the slowest of the four, and almost all of it is the agrochemical book.",
    "Europe: steady share gain on REACH-registered intermediates rather than on price.",
  ],
};

const MIX_BY_UNIT: NormalizedRevenueMixHistoryByUnit = {
  periods: YEARS,
  methodologyNote: "Shares derived from the geography note; rounding means columns need not sum to 100.",
  rows: [
    {
      unit: "India (domestic)",
      mixByPeriod: byYear([44.1, 42, 40.1, 37.9, 35]),
      direction: "losing_share",
      confidence: "high",
    },
    {
      unit: "Europe",
      mixByPeriod: byYear([30.1, 30.9, 31.4, 31.9, 31.6]),
      direction: "stable_share",
      confidence: "high",
    },
    {
      unit: "North America",
      mixByPeriod: byYear([16, 18.1, 20.1, 22.3, 26.1]),
      direction: "gaining_share",
      confidence: "medium",
    },
    {
      unit: "Rest of world",
      mixByPeriod: byYear([9.9, 9.1, 8.3, 7.9, 7.3]),
      direction: "becoming_less_important",
      confidence: "medium",
    },
  ],
  insights: [
    "North America: 10pp of mix gained in four years, all of it from the domestic book.",
  ],
};

const COMPANY_CAGR = {
  basis: "consolidated_reported",
  scope: "consolidated",
  startYear: "FY23",
  endYear: "FY26",
  cagrPercent: 12.7,
};

const bySegment: NormalizedHistoricalEconomics = {
  companyRevenueCagr3y: COMPANY_CAGR,
  revenueSplitHistory: [],
  segmentGrowthCagr3y: [],
  summary: {
    companyRevenueCagr: COMPANY_CAGR,
    periods: YEARS,
    overallConfidence: "high",
    methodologyNote:
      "Segment revenue taken as printed in the segment note; FY22 and FY23 restated after the pigment block was folded into intermediates.",
  },
  revenueHistoryBySegment: REVENUE_BY_SEGMENT,
  revenueMixHistoryBySegment: MIX_BY_SEGMENT,
  revenueHistoryByUnit: null,
  revenueMixHistoryByUnit: null,
};

const byUnit: NormalizedHistoricalEconomics = {
  ...bySegment,
  revenueHistoryBySegment: null,
  revenueMixHistoryBySegment: null,
  revenueHistoryByUnit: REVENUE_BY_UNIT,
  revenueMixHistoryByUnit: MIX_BY_UNIT,
};

const mixOnly: NormalizedHistoricalEconomics = {
  ...bySegment,
  revenueHistoryBySegment: null,
  revenueMixHistoryBySegment: MIX_BY_SEGMENT,
};

const Frame = ({ preview, children }: { preview: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border/35 bg-background/75 p-4 shadow-md shadow-black/20 space-y-3">
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/90">
        Business Momentum
      </p>
      <p className="text-[11px] leading-snug text-muted-foreground">{preview}</p>
    </div>
    {children}
  </div>
);

/**
 * Canonical: the by-segment path. Six segments plus a demoted consolidated row,
 * five fiscal years with YoY deltas under every number, a sticky CAGR column,
 * and the mix-shift module folded into the drawer beneath.
 */
export const RevenueTrendBySegment = () => (
  <Frame preview="FY26 +17.5% YoY · 12.7% company CAGR (FY23 -> FY26) · 5 periods · 6 segments · high confidence">
    <HistoricalEconomicsDataPack history={bySegment} />
  </Frame>
);

/**
 * The fallback path: a company that publishes revenue by geography rather than
 * by segment. Same table grammar, different noun - "Unit" instead of "Segment",
 * and the total row is badged "Consolidated".
 */
export const RevenueTrendByEconomicUnit = () => (
  <Frame preview="FY26 +17.5% YoY · 12.7% company CAGR (FY23 -> FY26) · 5 periods · 4 units · high confidence">
    <HistoricalEconomicsDataPack history={byUnit} />
  </Frame>
);

/**
 * Mix history published but no absolute revenue history - a real and common
 * partial. The data pack degrades to the drawer alone rather than fabricating a
 * revenue table from percentages.
 */
export const MixHistoryOnly = () => (
  <Frame preview="Mix shift tracked across 5 periods; absolute segment revenue not disclosed.">
    <HistoricalEconomicsDataPack history={mixOnly} />
  </Frame>
);
