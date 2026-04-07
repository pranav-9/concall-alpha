import type {
  KeyVariablesSnapshotRow,
  NormalizedKeyVariableDeepTreatmentItem,
  NormalizedKeyVariableDiscoverySummary,
  NormalizedKeyVariableKpiHistory,
  NormalizedKeyVariableKpiHistoryRow,
  NormalizedKeyVariableListItem,
  NormalizedKeyVariableSourceBasis,
  NormalizedKeyVariableSourceFile,
  NormalizedKeyVariablesSnapshot,
} from "@/lib/key-variables-snapshot/types";

type JsonRecord = Record<string, unknown>;

const parseJsonValue = (value: unknown): unknown => {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
};

const parseJsonObjectLike = (value: unknown): JsonRecord | null => {
  const parsed = parseJsonValue(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as JsonRecord)
    : null;
};

const parseJsonArrayLike = (value: unknown): unknown[] => {
  const parsed = parseJsonValue(value);
  return Array.isArray(parsed) ? parsed : [];
};

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asDisplayValue = (value: unknown): string | number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
};

const normalizeSourceBasis = (value: unknown): NormalizedKeyVariableSourceBasis => {
  const normalized = asString(value)?.toLowerCase().replace(/[\s-]+/g, "_");
  if (
    normalized === "industry_standard" ||
    normalized === "management_tracked" ||
    normalized === "both"
  ) {
    return normalized;
  }
  return "unknown";
};

const normalizeDiscoverySummary = (
  value: unknown,
): NormalizedKeyVariableDiscoverySummary | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const normalized: NormalizedKeyVariableDiscoverySummary = {
    selectedFullListCount: asNumber(row.selected_full_list_count),
    selectedDeepTreatmentCount: asNumber(row.selected_deep_treatment_count),
    totalCandidatesConsidered: asNumber(row.total_candidates_considered),
    selectionPriorityStack: asString(row.selection_priority_stack),
  };

  if (
    normalized.selectedFullListCount == null &&
    normalized.selectedDeepTreatmentCount == null &&
    normalized.totalCandidatesConsidered == null &&
    !normalized.selectionPriorityStack
  ) {
    return null;
  }

  return normalized;
};

const normalizeFullVariableListItem = (
  value: unknown,
): NormalizedKeyVariableListItem | null => {
  const row = parseJsonObjectLike(value);
  const variable = asString(row?.variable);
  if (!variable) return null;

  return {
    variable,
    whyFlagged: asString(row?.why_flagged),
    sourceBasis: normalizeSourceBasis(row?.source_basis),
  };
};

const normalizeKpiHistoryRow = (value: unknown): NormalizedKeyVariableKpiHistoryRow | null => {
  const row = parseJsonObjectLike(value);
  const metric = asString(row?.metric);
  const values = parseJsonObjectLike(row?.values_by_period);
  if (!metric || !values) return null;

  const valuesByPeriod = Object.entries(values).reduce<Record<string, string | number | null>>(
    (acc, [period, periodValue]) => {
      const normalizedPeriod = period.trim();
      if (!normalizedPeriod) return acc;
      acc[normalizedPeriod] = asDisplayValue(periodValue);
      return acc;
    },
    {},
  );

  if (Object.keys(valuesByPeriod).length === 0) return null;

  return {
    metric,
    valuesByPeriod,
  };
};

const normalizeKpiHistory = (value: unknown): NormalizedKeyVariableKpiHistory | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const periods = parseJsonArrayLike(row.periods)
    .map((period) => asString(period))
    .filter((period): period is string => Boolean(period));
  const rows = parseJsonArrayLike(row.rows)
    .map((entry) => normalizeKpiHistoryRow(entry))
    .filter((entry): entry is NormalizedKeyVariableKpiHistoryRow => Boolean(entry));

  if (periods.length === 0 && rows.length === 0) return null;

  return {
    periods,
    rows,
  };
};

const normalizeDeepTreatmentItem = (
  value: unknown,
): NormalizedKeyVariableDeepTreatmentItem | null => {
  const row = parseJsonObjectLike(value);
  const variable = asString(row?.variable);
  if (!variable) return null;

  return {
    variable,
    kpiHistory: normalizeKpiHistory(row?.kpi_history),
    currentRead: asString(row?.current_read),
    whatItTracks: asString(row?.what_it_tracks),
    whyItMattersNow: asString(row?.why_it_matters_now),
    trendInterpretation: asString(row?.trend_interpretation),
  };
};

const normalizeSourceFile = (value: unknown): NormalizedKeyVariableSourceFile | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const normalized: NormalizedKeyVariableSourceFile = {
    fy: asString(row.fy),
    kind: asString(row.kind),
    quarter: asString(row.quarter),
    pdfName: asString(row.pdf_name),
    sourceUrl: asString(row.source_url),
  };

  if (!normalized.fy && !normalized.kind && !normalized.quarter && !normalized.pdfName && !normalized.sourceUrl) {
    return null;
  }

  return normalized;
};

const extractVariablesArray = (value: unknown) => parseJsonArrayLike(parseJsonObjectLike(value)?.variables ?? value);

export function normalizeKeyVariablesSnapshot(
  row: KeyVariablesSnapshotRow | null | undefined,
): NormalizedKeyVariablesSnapshot | null {
  if (!row?.company_code) return null;

  const fullVariableList = extractVariablesArray(row.full_variable_list)
    .map((entry) => normalizeFullVariableListItem(entry))
    .filter((entry): entry is NormalizedKeyVariableListItem => Boolean(entry));

  const deepTreatment = extractVariablesArray(row.deep_treatment)
    .map((entry) => normalizeDeepTreatmentItem(entry))
    .filter((entry): entry is NormalizedKeyVariableDeepTreatmentItem => Boolean(entry));

  const sectionSynthesis = asString(row.section_synthesis);
  const discoverySummary = normalizeDiscoverySummary(row.discovery_summary);
  const sourceFiles = parseJsonArrayLike(row.source_files)
    .map((entry) => normalizeSourceFile(entry))
    .filter((entry): entry is NormalizedKeyVariableSourceFile => Boolean(entry));
  const details = parseJsonObjectLike(row.details);

  if (
    fullVariableList.length === 0 &&
    deepTreatment.length === 0 &&
    !sectionSynthesis &&
    !discoverySummary
  ) {
    return null;
  }

  return {
    companyCode: row.company_code,
    generatedAtRaw: asString(row.generated_at),
    updatedAtRaw: asString(row.updated_at),
    analysisWindowQuarters: asNumber(row.analysis_window_quarters),
    discoverySummary,
    fullVariableList,
    deepTreatment,
    sectionSynthesis,
    sourceFiles,
    details,
  };
}
