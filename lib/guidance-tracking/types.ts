export type GuidanceTrackingRow = {
  id: number;
  company_code: string;
  guidance_key: string;
  guidance_text?: string | null;
  guidance_family?: string | null;
  metric_subtype?: string | null;
  segment?: string | null;
  segment_canonical?: string | null;
  value?: unknown;
  horizon?: unknown;
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
  | "missed"
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
  // Per-step value carried at this trail entry, when management stated a
  // value at this point. Optional — null when the step is a pure repeat
  // with no new value information.
  valuePercent: number | null;
  valueText: string | null;
  valueKind: "percent" | "absolute" | null;
  numericValue: number | null;
  unit: string | null;
  // Per-step horizon — lets a multi-FY trajectory thread carry FY26+FY27+FY28
  // commitments across the trail without flattening to a single top-level
  // horizon. Optional — null when the step doesn't restate a horizon.
  horizonType: string | null;
  appliesFrom: string | null;
  appliesTo: string | null;
  horizonLabel: string | null;
};

// Phase 6 narrowed scope: GROWTH only. Margin family is out of scope until
// re-enabled. Gross subtype is consequently also out of scope.
export type GuidanceFamily = "growth";
export type GuidanceMetricSubtype = "revenue" | "ebitda" | "pat";

export type NormalizedGuidanceItem = {
  id: number;
  companyCode: string;
  guidanceKey: string;
  guidanceText: string;
  guidanceFamily: GuidanceFamily | null;
  metricSubtype: GuidanceMetricSubtype | null;
  metricLabel: string | null;
  segment: string | null;
  segmentCanonical: string | null;
  horizonType: string | null;
  appliesFrom: string | null;
  appliesTo: string | null;
  horizonLabel: string | null;
  valuePercent: number | null;
  valueText: string | null;
  // PR2: typed value capture. valueKind tells you how to interpret
  // numericValue + unit. Readers should prefer these over the legacy
  // valuePercent when present, and fall back to valueText extraction
  // otherwise.
  valueKind: "percent" | "absolute" | null;
  numericValue: number | null;
  unit: string | null;
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
