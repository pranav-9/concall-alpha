import type { GuidanceTrackingRow, NormalizedGuidanceItem } from "@/lib/guidance-tracking/types";

export type GuidanceSnapshotRow = {
  company_code: string;
  generated_at?: string | null;
  analysis_window_quarters?: number | null;
  guidance_style_classification?: unknown;
  big_picture_growth_guidance?: unknown;
  current_year_revenue_guidance?: unknown;
  prior_two_year_accuracy?: unknown;
  guidance_items?: unknown;
  source_files?: unknown;
  details?: unknown;
  updated_at?: string | null;
};

export type GuidanceSnapshotGuidanceItemRow = Omit<
  GuidanceTrackingRow,
  "id" | "company_code" | "generated_at"
>;

export type NormalizedGuidanceStyleClassification = {
  style: string | null;
  rationale: string | null;
  evidenceQuarters: string[];
};

export type NormalizedBigPictureGrowthGuidance = {
  source: string | null;
  currentStatement: string | null;
  headlineStatement: string | null;
  statusSinceFirst: string | null;
};

export type NormalizedCurrentYearRevenueGuidance = {
  fiscalYear: string | null;
  signalTrend: string | null;
  sourceQuarters: string[];
  inYearRevisionFlag: boolean;
  inYearRevisionNote: string | null;
  consolidatedStatement: string | null;
  officialCurrentGuidanceText: string | null;
  officialCurrentGuidancePercent: number | null;
  officialCurrentGuidanceSourceQuarter: string | null;
  sourceQuarterTimeline: NormalizedCurrentYearRevenueGuidanceTimelineRow[];
};

export type NormalizedCurrentYearRevenueGuidanceTimelineRow = {
  quarter: string | null;
  guidanceType: string | null;
  whatWasSaid: string | null;
  guidancePercent: number | null;
  sourceReference: string | null;
};

export type NormalizedPriorTwoYearAccuracyRow = {
  fiscalYear: string | null;
  verdict: string | null;
  signalType: string | null;
  signalSummary: string | null;
  inYearRevision: string | null;
  finalSignalAfterRevisions: string | null;
  actualOutcome: string | null;
  reason: string | null;
};

export type NormalizedGuidanceSnapshot = {
  companyCode: string;
  generatedAtRaw: string | null;
  updatedAtRaw: string | null;
  analysisWindowQuarters: number | null;
  guidanceStyleClassification: NormalizedGuidanceStyleClassification | null;
  bigPictureGrowthGuidance: NormalizedBigPictureGrowthGuidance | null;
  currentYearRevenueGuidance: NormalizedCurrentYearRevenueGuidance | null;
  priorTwoYearAccuracy: NormalizedPriorTwoYearAccuracyRow[];
  guidanceItems: NormalizedGuidanceItem[];
  sourceFiles: unknown[];
  details: Record<string, unknown> | null;
};
