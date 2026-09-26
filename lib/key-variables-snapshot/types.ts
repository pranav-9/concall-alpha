export type KeyVariablesSnapshotRow = {
  company_code: string;
  generated_at?: string | null;
  discovery_summary?: unknown;
  full_variable_list?: unknown;
  deep_treatment?: unknown;
  section_synthesis?: string | null;
  section_headline?: string | null;
  details?: unknown;
  updated_at?: string | null;
};

export type NormalizedKeyVariableSourceBasis =
  | "industry_standard"
  | "management_tracked"
  | "concall"
  | "presentation"
  | "annual_report"
  | "both"
  | "unknown";

/**
 * How a change in a metric bears on the investment case. This is NOT the sign
 * of the change: rising working-capital days is a negative move that reads
 * `hurts`, rising order book is a positive move that reads `helps`. Derive it
 * with `getThesisEffect(delta, direction)`; never colour a delta by sign alone.
 */
export type ThesisEffect = "helps" | "hurts" | "caution" | "neutral";

export type MetricDirection = "higher_is_better" | "lower_is_better";

export type NormalizedKeyVariableLatest = {
  /** Already formatted for display, e.g. "24.5%". */
  value: string;
  /** e.g. "▲ +170 bps" | "Near ceiling" | "High". */
  deltaLabel: string | null;
  effect: ThesisEffect;
  /** e.g. "Deck · Q1 FY27" | "Annual report · FY26". */
  asOf: string | null;
};

export type NormalizedKeyVariableListItem = {
  variable: string;
  whyFlagged: string | null;
  sourceBasis: NormalizedKeyVariableSourceBasis;
  /** Only rendered for variables NOT in deep treatment (the "On the radar" list). */
  latest: NormalizedKeyVariableLatest | null;
  /** The trigger sentence shown after "Watch for —". */
  watchFor: string | null;
  nextToPromote: boolean;
};

export type NormalizedKeyVariableTransition = "retained" | "promoted";

export type NormalizedKeyVariableGuide = {
  value: number;
  /** e.g. "Guide 120 · FY27". */
  label: string;
};

export type NormalizedKeyVariableDeepTreatmentItem = {
  variable: string;
  kpiHistory: NormalizedKeyVariableKpiHistory | null;
  currentRead: string | null;
  whatItTracks: string | null;
  whyItMattersNow: string | null;
  trendInterpretation: string | null;
  transition: NormalizedKeyVariableTransition | null;
  transitionReason: string | null;
  /** The eyebrow: "Sets the growth" | "Sets the cash". */
  thesisRole: string | null;
  /** Which kpiHistory row is the hero + bars. Always clamped to the rows; 0 when unset. */
  leadMetricIndex: number;
  /** Suffix on the hero value: "₹ cr" | "days" | "%" | "x". */
  leadUnit: string | null;
  /** Keyed by row.metric. Every row present, defaulting to higher_is_better. Null without history. */
  metricDirections: Record<string, MetricDirection> | null;
  guide: NormalizedKeyVariableGuide | null;
};

export type NormalizedKeyVariableDroppedItem = {
  variable: string;
  reason: string | null;
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

export type NormalizedKeyVariablesSnapshot = {
  companyCode: string;
  generatedAtRaw: string | null;
  updatedAtRaw: string | null;
  discoverySummary: NormalizedKeyVariableDiscoverySummary | null;
  fullVariableList: NormalizedKeyVariableListItem[];
  deepTreatment: NormalizedKeyVariableDeepTreatmentItem[];
  droppedVariables: NormalizedKeyVariableDroppedItem[];
  /** One-liner above the synthesis: "Vinyas has the orders. The open question is whether they turn into cash." */
  sectionHeadline: string | null;
  sectionSynthesis: string | null;
  details: Record<string, unknown> | null;
};
