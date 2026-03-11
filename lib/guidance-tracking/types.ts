export type GuidanceTrackingRow = {
  id: number;
  company_code: string;
  guidance_key: string;
  guidance_text?: string | null;
  guidance_type?: string | null;
  first_mentioned_in?: unknown;
  target_period?: string | null;
  source_mentions?: unknown;
  status?: string | null;
  status_reason?: string | null;
  latest_view?: string | null;
  confidence?: number | string | null;
  generated_at?: string | null;
  details?: unknown;
};

export type GuidanceStatusKey =
  | "met"
  | "delayed"
  | "revised"
  | "active"
  | "dropped"
  | "not_yet_clear";

export type NormalizedGuidanceStatusKey = GuidanceStatusKey | "unknown";

export type NormalizedGuidanceMention = {
  period: string | null;
  sourceUrl: string | null;
  mentionText: string | null;
  documentType: string | null;
  interpretation: string | null;
};

export type NormalizedGuidanceItem = {
  id: number;
  companyCode: string;
  guidanceKey: string;
  guidanceText: string;
  guidanceType: string | null;
  guidanceTypeLabel: string | null;
  firstMentionPeriod: string | null;
  latestMentionPeriod: string | null;
  targetPeriod: string | null;
  mentionedPeriods: string[];
  statusKey: NormalizedGuidanceStatusKey;
  statusLabel: string;
  latestView: string | null;
  statusReason: string | null;
  confidence: number | null;
  generatedAtRaw: string | null;
  sourceMentions: NormalizedGuidanceMention[];
};
