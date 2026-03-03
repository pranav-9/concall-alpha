export type BusinessSnapshotRow = {
  company: string;
  generated_at?: string | null;
  documents_processed?: number | null;
  segment_profiles?: unknown;
  business_snapshot?: unknown;
  details?: unknown;
  snapshot_phase?: number | null;
  snapshot_source?: string | null;
  source_urls?: unknown;
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
  schemaHints: string[];
};
