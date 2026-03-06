export type BusinessSnapshotRow = {
  company: string;
  generated_at?: string | null;
  documents_processed?: number | null;
  segment_profiles?: unknown;
  business_snapshot?: unknown;
  about_company?: unknown;
  revenue_breakdown?: unknown;
  details?: unknown;
  snapshot_phase?: number | null;
  snapshot_source?: string | null;
  source_urls?: unknown;
};

export type NormalizedAboutCompany = {
  aboutShort: string | null;
  aboutLong: string | null;
  primaryCustomers: string[];
  valueChainPosition: string | null;
  coreProductsOrServices: string[];
};

export type NormalizedRevenueBreakdownItem = {
  name: string;
  description: string | null;
  revenueSharePercent: number | null;
};

export type NormalizedRevenueBreakdown = {
  bySegment: NormalizedRevenueBreakdownItem[];
  byGeography: NormalizedRevenueBreakdownItem[];
  byProductOrService: NormalizedRevenueBreakdownItem[];
};

export type NormalizedBusinessSnapshot = {
  companyCode: string;
  generatedAtRaw: string | null;
  generatedAtLabel: string | null;
  documentsProcessed: number | null;
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
  schemaHints: string[];
};
