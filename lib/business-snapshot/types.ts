export type BusinessSnapshotRow = {
  company: string;
  generated_at?: string | null;
  segment_profiles?: unknown;
  business_snapshot?: unknown;
  historical_economics?: unknown;
  about_company?: unknown;
  revenue_breakdown?: unknown;
  revenue_engine?: unknown;
  details?: unknown;
  snapshot_phase?: number | null;
  snapshot_source?: string | null;
  source_urls?: unknown;
};

export type NormalizedAboutCompany = {
  aboutShort: string | null;
  aboutLong: string | null;
};

export type NormalizedRevenueBreakdownItem = {
  name: string;
  description: string | null;
  revenueSharePercent: number | null;
  marginProfile: string | null;
  marginProfileNote: string | null;
  rolePill: string | null;
  growthDirectionPill: string | null;
};

export type NormalizedRevenueBreakdown = {
  bySegment: NormalizedRevenueBreakdownItem[];
  byProductOrService: NormalizedRevenueBreakdownItem[];
};

export type NormalizedCompanyRevenueCagr3y = {
  basis: string | null;
  scope: string | null;
  startYear: string | null;
  endYear: string | null;
  cagrPercent: number | null;
};

export type NormalizedHistoricalEconomicsSummary = {
  companyRevenueCagr: NormalizedCompanyRevenueCagr3y | null;
  periods: string[];
  overallConfidence: string | null;
  methodologyNote: string | null;
};

export type NormalizedRevenueSplitHistoryBucket = {
  name: string;
  revenueSharePercent: number | null;
};

export type NormalizedRevenueSplitHistoryRow = {
  year: string | null;
  basis: string | null;
  comparabilityNote: string | null;
  buckets: NormalizedRevenueSplitHistoryBucket[];
};

export type NormalizedSegmentGrowthCagr3yRow = {
  basis: string | null;
  segment: string;
  startYear: string | null;
  endYear: string | null;
  cagrPercent: number | null;
  comparability: string | null;
};

export type NormalizedRevenueHistoryByUnitRow = {
  unit: string;
  valuesByPeriod: Record<string, number | null>;
  cagrPercent: number | null;
  confidence: string | null;
  isConsolidated: boolean;
};

export type NormalizedRevenueHistoryByUnit = {
  periods: string[];
  rows: NormalizedRevenueHistoryByUnitRow[];
  insights: string[];
  methodologyNote: string | null;
};

export type NormalizedRevenueMixHistoryByUnitRow = {
  unit: string;
  mixByPeriod: Record<string, number | null>;
  direction: string | null;
  confidence: string | null;
};

export type NormalizedRevenueMixHistoryByUnit = {
  periods: string[];
  rows: NormalizedRevenueMixHistoryByUnitRow[];
  insights: string[];
  methodologyNote: string | null;
};

export type NormalizedRevenueHistoryBySegmentInsight = {
  segment: string | null;
  trendInsight: string;
};

export type NormalizedRevenueHistoryBySegmentRow = {
  segment: string;
  revenueByYear: Record<string, number | null>;
  comparabilityLabel: string | null;
  growthMetricPeriod: string | null;
  growthMetricPercent: number | null;
  latestPeriodRevenue: number | null;
};

export type NormalizedRevenueHistoryBySegment = {
  years: string[];
  rows: NormalizedRevenueHistoryBySegmentRow[];
  insights: string[];
  latestPeriod: string | null;
};

export type NormalizedRevenueMixHistoryBySegmentRow = {
  segment: string;
  mixPercentByYear: Record<string, number | null>;
  directionLabel: string | null;
  latestMixPercent: number | null;
  comparabilityLabel: string | null;
};

export type NormalizedRevenueMixHistoryBySegment = {
  years: string[];
  rows: NormalizedRevenueMixHistoryBySegmentRow[];
  insights: string[];
  latestPeriod: string | null;
};

export type NormalizedHistoricalEconomics = {
  companyRevenueCagr3y: NormalizedCompanyRevenueCagr3y | null;
  revenueSplitHistory: NormalizedRevenueSplitHistoryRow[];
  segmentGrowthCagr3y: NormalizedSegmentGrowthCagr3yRow[];
  summary: NormalizedHistoricalEconomicsSummary | null;
  revenueHistoryBySegment: NormalizedRevenueHistoryBySegment | null;
  revenueMixHistoryBySegment: NormalizedRevenueMixHistoryBySegment | null;
  revenueHistoryByUnit: NormalizedRevenueHistoryByUnit | null;
  revenueMixHistoryByUnit: NormalizedRevenueMixHistoryByUnit | null;
};

export type NormalizedBusinessSnapshot = {
  companyCode: string;
  generatedAtRaw: string | null;
  generatedAtLabel: string | null;
  website: string | null;
  snapshotPhase: number | null;
  snapshotSource: string | null;
  sourceUrls: string[];
  businessSummaryShort: string | null;
  businessSummaryLong: string | null;
  businessModelQuality: string | null;
  operatingModel: string | null;
  valueChainPosition: string | null;
  demandShape: string | null;
  dominantSegment: string | null;
  emergingSegment: string | null;
  mixShiftSummary: string | null;
  topRevenueDrivers: string[];
  topGrowthDrivers: string[];
  keyDependencies: string[];
  keyRisksToModel: string[];
  segmentProfiles: unknown[];
  aboutCompany: NormalizedAboutCompany | null;
  revenueBreakdown: NormalizedRevenueBreakdown | null;
  historicalEconomics: NormalizedHistoricalEconomics | null;
  hasHistoricalEconomicsSource: boolean;
  schemaHints: string[];
};
