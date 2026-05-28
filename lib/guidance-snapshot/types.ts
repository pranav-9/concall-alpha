import type { GuidanceTrackingRow, NormalizedGuidanceItem } from "@/lib/guidance-tracking/types";

export type GuidanceSnapshotRow = {
  company_code: string;
  generated_at?: string | null;
  analysis_window_quarters?: number | null;
  guidance_items?: unknown;
  source_files?: unknown;
  details?: unknown;
  updated_at?: string | null;
};

export type GuidanceSnapshotGuidanceItemRow = Omit<
  GuidanceTrackingRow,
  "id" | "company_code" | "generated_at"
>;

export type NormalizedGuidanceSnapshot = {
  companyCode: string;
  generatedAtRaw: string | null;
  updatedAtRaw: string | null;
  analysisWindowQuarters: number | null;
  guidanceItems: NormalizedGuidanceItem[];
  sourceFiles: unknown[];
  details: Record<string, unknown> | null;
};
