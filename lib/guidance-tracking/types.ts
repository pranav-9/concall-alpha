export type GuidanceTrackingRow = {
  id: number;
  company_code: string;
  guidance_key: string;
  guidance_text?: string | null;
  guidance_family?: string | null;
  metric_subtype?: string | null;
  value?: unknown;
  horizon?: unknown;
  first_mentioned_in?: unknown;
  source_mentions?: unknown;
  trail?: unknown;
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

export type NormalizedGuidanceTrailItem = {
  quarter: string | null;
  summary: string | null;
  excerpt: string | null;
  mentionType: string | null;
  documentType: string | null;
  documentLabel: string | null;
  sourceReference: string | null;
  confidence: number | null;
  positionInStory: number | null;
};

export type GuidanceFamily = "growth" | "margin";
export type GuidanceMetricSubtype = "revenue" | "ebitda" | "pat" | "gross";

export type NormalizedGuidanceItem = {
  id: number;
  companyCode: string;
  guidanceKey: string;
  guidanceText: string;
  guidanceFamily: GuidanceFamily | null;
  metricSubtype: GuidanceMetricSubtype | null;
  metricLabel: string | null;
  horizonType: string | null;
  appliesFrom: string | null;
  appliesTo: string | null;
  horizonLabel: string | null;
  valuePercent: number | null;
  valueText: string | null;
  firstMentionPeriod: string | null;
  latestMentionPeriod: string | null;
  mentionedPeriods: string[];
  statusKey: NormalizedGuidanceStatusKey;
  statusLabel: string;
  latestView: string | null;
  statusReason: string | null;
  confidence: number | null;
  generatedAtRaw: string | null;
  sourceMentions: NormalizedGuidanceMention[];
  trail: NormalizedGuidanceTrailItem[];
};
