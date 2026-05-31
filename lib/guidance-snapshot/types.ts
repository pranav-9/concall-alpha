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

// Per-snapshot provenance entry (PR2 item 16). Phase 6 v2 emits these in
// `source_files` so the frontend can render click-through links back to
// the underlying transcript / PPT / annual report PDF rather than opaque
// chunk ids. Legacy snapshots may still carry raw chunk-id lists; the
// normalizer surfaces whatever is there as `sourceFiles: unknown[]`.
export type GuidanceSnapshotSourceFile = {
  source_doc_id: number;
  period_label: string | null;
  fy: number | null;
  qtr: number | null;
  doc_type: string | null;
  url: string | null;
  local_path: string | null;
};

export type NormalizedGuidanceSnapshot = {
  companyCode: string;
  generatedAtRaw: string | null;
  updatedAtRaw: string | null;
  analysisWindowQuarters: number | null;
  guidanceItems: NormalizedGuidanceItem[];
  // Heterogeneous by design — legacy rows may have number[] (chunk ids);
  // PR2-onwards rows have GuidanceSnapshotSourceFile[]. UI must handle both.
  sourceFiles: unknown[];
  details: Record<string, unknown> | null;
};
