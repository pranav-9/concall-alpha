export type KeyVariablesSnapshotRow = {
  company_code: string;
  generated_at?: string | null;
  analysis_window_quarters?: number | null;
  discovery_summary?: unknown;
  full_variable_list?: unknown;
  deep_treatment?: unknown;
  section_synthesis?: string | null;
  source_files?: unknown;
  details?: unknown;
  updated_at?: string | null;
};

export type NormalizedKeyVariableSourceBasis =
  | "industry_standard"
  | "management_tracked"
  | "both"
  | "unknown";

export type NormalizedKeyVariableListItem = {
  variable: string;
  whyFlagged: string | null;
  sourceBasis: NormalizedKeyVariableSourceBasis;
};

export type NormalizedKeyVariableDeepTreatmentItem = {
  variable: string;
  kpiHistory: NormalizedKeyVariableKpiHistory | null;
  currentRead: string | null;
  whatItTracks: string | null;
  whyItMattersNow: string | null;
  trendInterpretation: string | null;
};

export type NormalizedKeyVariableKpiHistory = {
  periods: string[];
  rows: NormalizedKeyVariableKpiHistoryRow[];
};

export type NormalizedKeyVariableKpiHistoryRow = {
  metric: string;
  valuesByPeriod: Record<string, string | number | null>;
};

export type NormalizedKeyVariableDiscoverySummary = {
  selectedFullListCount: number | null;
  selectedDeepTreatmentCount: number | null;
  totalCandidatesConsidered: number | null;
  selectionPriorityStack: string | null;
};

export type NormalizedKeyVariableSourceFile = {
  fy: string | null;
  kind: string | null;
  quarter: string | null;
  pdfName: string | null;
  sourceUrl: string | null;
};

export type NormalizedKeyVariablesSnapshot = {
  companyCode: string;
  generatedAtRaw: string | null;
  updatedAtRaw: string | null;
  analysisWindowQuarters: number | null;
  discoverySummary: NormalizedKeyVariableDiscoverySummary | null;
  fullVariableList: NormalizedKeyVariableListItem[];
  deepTreatment: NormalizedKeyVariableDeepTreatmentItem[];
  sectionSynthesis: string | null;
  sourceFiles: NormalizedKeyVariableSourceFile[];
  details: Record<string, unknown> | null;
};
