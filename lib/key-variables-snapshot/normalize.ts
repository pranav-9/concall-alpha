import type {
  KeyVariablesSnapshotRow,
  MetricDirection,
  NormalizedKeyVariableDeepTreatmentItem,
  NormalizedKeyVariableDiscoverySummary,
  NormalizedKeyVariableDroppedItem,
  NormalizedKeyVariableGuide,
  NormalizedKeyVariableKpiHistory,
  NormalizedKeyVariableKpiHistoryRow,
  NormalizedKeyVariableLatest,
  NormalizedKeyVariableListItem,
  NormalizedKeyVariableSourceBasis,
  NormalizedKeyVariablesSnapshot,
  NormalizedKeyVariableTransition,
  ThesisEffect,
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
  switch (normalized) {
    case "industry_standard":
    case "management_tracked":
    case "concall":
    case "presentation":
    case "annual_report":
    case "both":
      return normalized;
    default:
      return "unknown";
  }
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

const normalizeThesisEffect = (value: unknown): ThesisEffect => {
  const normalized = asString(value)?.toLowerCase();
  switch (normalized) {
    case "helps":
    case "hurts":
    case "caution":
    case "neutral":
      return normalized;
    default:
      return "neutral";
  }
};

const normalizeLatest = (value: unknown): NormalizedKeyVariableLatest | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;
  const rawValue = row.value;
  const displayValue =
    typeof rawValue === "number" && Number.isFinite(rawValue)
      ? String(rawValue)
      : asString(rawValue);
  if (!displayValue) return null;

  return {
    value: displayValue,
    deltaLabel: asString(row.delta_label),
    effect: normalizeThesisEffect(row.effect),
    asOf: asString(row.as_of),
  };
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
    latest: normalizeLatest(row?.latest),
    watchFor: asString(row?.watch_for),
    nextToPromote: row?.next_to_promote === true,
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

const normalizeTransition = (value: unknown): NormalizedKeyVariableTransition | null => {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "retained" || normalized === "promoted" ? normalized : null;
};

const normalizeMetricDirection = (value: unknown): MetricDirection => {
  const normalized = asString(value)?.toLowerCase().replace(/[\s-]+/g, "_");
  return normalized === "lower_is_better" ? "lower_is_better" : "higher_is_better";
};

/**
 * Every row in the history gets a direction, defaulting to higher_is_better,
 * so the UI never has to reason about a missing key. Null when there is no
 * history to key off.
 */
const normalizeMetricDirections = (
  value: unknown,
  history: NormalizedKeyVariableKpiHistory | null,
): Record<string, MetricDirection> | null => {
  if (!history || history.rows.length === 0) return null;
  const raw = parseJsonObjectLike(value) ?? {};
  const rawByKey = new Map<string, unknown>();
  for (const [metric, direction] of Object.entries(raw)) {
    rawByKey.set(metric.trim().toLowerCase(), direction);
  }
  return history.rows.reduce<Record<string, MetricDirection>>((acc, row) => {
    acc[row.metric] = normalizeMetricDirection(rawByKey.get(row.metric.trim().toLowerCase()));
    return acc;
  }, {});
};

/** Clamp to the rows; anything invalid (missing, negative, non-integer, out of range) is 0. */
const normalizeLeadMetricIndex = (
  value: unknown,
  history: NormalizedKeyVariableKpiHistory | null,
): number => {
  const rowCount = history?.rows.length ?? 0;
  if (rowCount === 0) return 0;
  const parsed = asNumber(value);
  if (parsed == null || !Number.isInteger(parsed) || parsed < 0 || parsed >= rowCount) return 0;
  return parsed;
};

/** A guide needs a finite numeric value; otherwise the whole guide is dropped. */
const normalizeGuide = (value: unknown): NormalizedKeyVariableGuide | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;
  const guideValue = asNumber(row.value);
  if (guideValue == null) return null;
  return {
    value: guideValue,
    label: asString(row.label) ?? `Guide ${guideValue}`,
  };
};

const normalizeDeepTreatmentItem = (
  value: unknown,
): NormalizedKeyVariableDeepTreatmentItem | null => {
  const row = parseJsonObjectLike(value);
  const variable = asString(row?.variable);
  if (!variable) return null;

  const kpiHistory = normalizeKpiHistory(row?.kpi_history);

  return {
    variable,
    kpiHistory,
    currentRead: asString(row?.current_read),
    whatItTracks: asString(row?.what_it_tracks),
    whyItMattersNow: asString(row?.why_it_matters_now),
    trendInterpretation: asString(row?.trend_interpretation),
    transition: normalizeTransition(row?.transition),
    transitionReason: asString(row?.transition_reason),
    thesisRole: asString(row?.thesis_role),
    leadMetricIndex: normalizeLeadMetricIndex(row?.lead_metric_index, kpiHistory),
    leadUnit: asString(row?.lead_unit),
    metricDirections: normalizeMetricDirections(row?.metric_directions, kpiHistory),
    guide: normalizeGuide(row?.guide),
  };
};

const normalizeDroppedItem = (value: unknown): NormalizedKeyVariableDroppedItem | null => {
  const row = parseJsonObjectLike(value);
  const variable = asString(row?.variable);
  if (!variable) return null;

  return {
    variable,
    reason: asString(row?.reason),
  };
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

  const droppedVariables = parseJsonArrayLike(
    parseJsonObjectLike(row.deep_treatment)?.dropped_variables,
  )
    .map((entry) => normalizeDroppedItem(entry))
    .filter((entry): entry is NormalizedKeyVariableDroppedItem => Boolean(entry));

  const sectionSynthesis = asString(row.section_synthesis);
  const discoverySummary = normalizeDiscoverySummary(row.discovery_summary);
  const details = parseJsonObjectLike(row.details);
  // `key_variables_snapshot` has no section_headline column: the pipeline's
  // import routes every top-level key it does not promote into `details`, so a
  // hand-built row's headline lives at details.section_headline. Read both.
  const sectionHeadline = asString(row.section_headline) ?? asString(details?.section_headline);

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
    discoverySummary,
    fullVariableList,
    deepTreatment,
    droppedVariables,
    sectionHeadline,
    sectionSynthesis,
    details,
  };
}
