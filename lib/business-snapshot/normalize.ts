import type {
  BusinessSnapshotRow,
  NormalizedAboutCompany,
  NormalizedBusinessSnapshot,
  NormalizedHistoricalEconomics,
  NormalizedHistoricalEconomicsSummary,
  NormalizedRevenueBreakdown,
  NormalizedRevenueBreakdownItem,
  NormalizedRevenueHistoryBySegment,
  NormalizedRevenueHistoryBySegmentRow,
  NormalizedRevenueHistoryByUnit,
  NormalizedRevenueHistoryByUnitRow,
  NormalizedRevenueMixHistoryBySegment,
  NormalizedRevenueMixHistoryBySegmentRow,
  NormalizedRevenueMixHistoryByUnit,
  NormalizedRevenueMixHistoryByUnitRow,
  NormalizedSegmentHistoryQuarterly,
  NormalizedSegmentPeriodRow,
  NormalizedConsolidatedFinancialsAnnual,
  NormalizedConsolidatedAnnualRow,
} from "@/lib/business-snapshot/types";

type JsonRecord = Record<string, unknown>;

const parseJsonValue = (value: unknown): unknown => {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
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

const asLowerString = (value: unknown): string | null => {
  const normalized = asString(value);
  return normalized ? normalized.toLowerCase() : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
};

// True only if `value` carries at least one populated leaf (non-empty string,
// finite number, true, or a nested array/object that itself has one). An empty
// object/array or all-null/empty content reads as false. Used so a
// present-but-empty `historical_economics` ({} or tables with empty rows) is not
// mistaken for "data exists" — otherwise the Business Momentum section renders
// its "stored structure does not match" fallback instead of hiding cleanly.
const hasPopulatedValue = (value: unknown): boolean => {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.some(hasPopulatedValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasPopulatedValue);
  }
  return false;
};

const toStringArray = (value: unknown): string[] =>
  parseJsonArrayLike(value)
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const toRevenueItem = (
  value: unknown,
  keyCandidates: string[],
  descriptionCandidates: string[],
): NormalizedRevenueBreakdownItem | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const name =
    keyCandidates
      .map((key) => asString(row[key]))
      .find((item): item is string => Boolean(item)) ?? null;
  if (!name) return null;

  const description =
    descriptionCandidates
      .map((key) => asString(row[key]))
      .find((item): item is string => Boolean(item)) ?? null;

  return {
    name,
    description,
    revenueSharePercent: asNumber(row.revenue_share_percent),
    marginProfile: asLowerString(row.margin_profile),
    marginProfileNote: asString(row.margin_profile_note),
    rolePill: asLowerString(row.role_pill),
    growthDirectionPill: asLowerString(row.growth_direction_pill),
  };
};

const toRevenueItems = (
  value: unknown,
  keyCandidates: string[],
  descriptionCandidates: string[],
): NormalizedRevenueBreakdownItem[] =>
  parseJsonArrayLike(value)
    .map((row) => toRevenueItem(row, keyCandidates, descriptionCandidates))
    .filter((item): item is NormalizedRevenueBreakdownItem => Boolean(item));

const normalizeAboutCompany = ({
  aboutCompanySource,
  businessSnapshotObject,
}: {
  aboutCompanySource: JsonRecord | null;
  businessSnapshotObject: JsonRecord | null;
}): NormalizedAboutCompany | null => {
  const aboutShort =
    asString(aboutCompanySource?.about_short) ??
    asString(businessSnapshotObject?.business_summary_short) ??
    null;
  const aboutLong =
    asString(aboutCompanySource?.about_long) ??
    asString(businessSnapshotObject?.business_summary_long) ??
    asString(aboutCompanySource?.business_activity) ??
    asString(aboutCompanySource?.economic_problem_solved) ??
    null;
  if (!aboutShort && !aboutLong) {
    return null;
  }

  return {
    aboutShort,
    aboutLong,
  };
};

const normalizeRevenueBreakdown = ({
  revenueBreakdownSource,
  segmentProfiles,
}: {
  revenueBreakdownSource: JsonRecord | null;
  segmentProfiles: unknown[];
}): NormalizedRevenueBreakdown | null => {
  const bySegment = toRevenueItems(
    revenueBreakdownSource?.by_segment,
    ["segment", "segment_name"],
    ["segment_explained", "segment_description", "description"],
  );
  const byProductOrService = toRevenueItems(
    revenueBreakdownSource?.by_product_or_service,
    ["product_or_service", "product", "service", "name"],
    ["description"],
  );

  const bySegmentWithFallback =
    bySegment.length > 0
      ? bySegment
      : segmentProfiles
          .map((item) =>
            toRevenueItem(item, ["segment_name", "segment"], ["segment_description", "segment_explained", "description"]),
          )
          .filter((item): item is NormalizedRevenueBreakdownItem => Boolean(item));

  if (bySegmentWithFallback.length === 0 && byProductOrService.length === 0) {
    return null;
  }

  return {
    bySegment: bySegmentWithFallback,
    byProductOrService,
  };
};

const normalizeCompanyRevenueCagr3y = (value: unknown) => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const basis = asString(row.basis) ?? null;
  const scope = asString(row.scope) ?? null;
  const startYear = asString(row.start_year) ?? null;
  const endYear = asString(row.end_year) ?? null;
  const cagrPercent = asNumber(row.cagr_percent);

  if (!basis && !scope && !startYear && !endYear && cagrPercent == null) {
    return null;
  }

  return {
    basis,
    scope,
    startYear,
    endYear,
    cagrPercent,
  };
};

const normalizeNumericPeriodMap = (value: unknown): Record<string, number | null> => {
  const row = parseJsonObjectLike(value);
  if (!row) return {};

  return Object.entries(row).reduce<Record<string, number | null>>((acc, [key, rawValue]) => {
    const numericValue = asNumber(rawValue);
    if (numericValue != null || rawValue === null) {
      acc[key] = numericValue;
    }
    return acc;
  }, {});
};

const collectPeriodsFromNumericMaps = (
  maps: Record<string, number | null>[],
): string[] => {
  const periods: string[] = [];
  const seen = new Set<string>();

  maps.forEach((valueMap) => {
    Object.keys(valueMap).forEach((period) => {
      if (!seen.has(period)) {
        seen.add(period);
        periods.push(period);
      }
    });
  });

  return periods;
};

const normalizeHistoricalEconomicsSummary = (
  value: unknown,
): NormalizedHistoricalEconomicsSummary | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const companyRevenueCagr =
    normalizeCompanyRevenueCagr3y(row.company_revenue_cagr) ??
    normalizeCompanyRevenueCagr3y(row.company_revenue_cagr_3y);
  const periods = toStringArray(row.periods);
  const overallConfidence = asString(row.overall_confidence) ?? null;
  const methodologyNote = asString(row.methodology_note) ?? null;

  if (!companyRevenueCagr && periods.length === 0 && !overallConfidence && !methodologyNote) {
    return null;
  }

  return {
    companyRevenueCagr,
    periods,
    overallConfidence,
    methodologyNote,
  };
};

const normalizeRevenueSplitHistoryRow = (value: unknown) => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const year = asString(row.year) ?? null;
  const basis = asString(row.basis) ?? null;
  const comparabilityNote = asString(row.comparability_note) ?? null;
  const buckets = parseJsonArrayLike(row.buckets)
    .map((item) => {
      const bucket = parseJsonObjectLike(item);
      if (!bucket) return null;
      const name = asString(bucket.name) ?? null;
      if (!name) return null;
      return {
        name,
        revenueSharePercent: asNumber(bucket.revenue_share_percent),
      };
    })
    .filter(
      (
        item,
      ): item is {
        name: string;
        revenueSharePercent: number | null;
      } => Boolean(item),
    );

  if (!year && !basis && !comparabilityNote && buckets.length === 0) {
    return null;
  }

  return {
    year,
    basis,
    comparabilityNote,
    buckets,
  };
};

const normalizeHistoricalEconomicsInsight = (
  value: unknown,
): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const segment = asString(row.segment) ?? null;
  const trendInsight = asString(row.trend_insight) ?? asString(row.trendInsight) ?? null;
  if (!trendInsight) return null;

  return segment ? `${segment}: ${trendInsight}` : trendInsight;
};

// A segment-history row that is actually the company total (sum of the
// segments), not a segment. The extractor contract forbids these, but they
// still appear (e.g. a "Consolidated" row), so we flag them to demote rather
// than rank them as the largest "segment". Mirrors the by-unit isConsolidated.
const TOTAL_ROW_NAMES = new Set([
  "consolidated",
  "total",
  "grand total",
  "company total",
  "consolidated total",
  "total revenue",
  "total income",
  "net revenue",
]);

const isTotalRowName = (name: string): boolean => {
  const normalized = name.trim().toLowerCase();
  return TOTAL_ROW_NAMES.has(normalized) || normalized.includes("consolidated");
};

const normalizeRevenueHistoryBySegmentRow = (
  value: unknown,
): NormalizedRevenueHistoryBySegmentRow | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const segment = asString(row.segment) ?? asString(row.segment_name) ?? null;
  if (!segment) return null;

  const primaryRevenueByYear = normalizeNumericPeriodMap(
    row.revenue_by_year ?? row.values_by_year ?? row.values_by_period,
  );
  const revenueByYear =
    Object.keys(primaryRevenueByYear).length > 0
      ? primaryRevenueByYear
      : normalizeNumericPeriodMap(row.values);
  const comparabilityLabel = asString(row.comparability_label) ?? null;
  const growthMetricPeriod = asString(row.growth_metric_period) ?? null;
  const growthMetricPercent = asNumber(row.growth_metric_percent);
  const latestPeriodRevenue = asNumber(row.latest_period_revenue);

  if (
    Object.keys(revenueByYear).length === 0 &&
    comparabilityLabel == null &&
    growthMetricPeriod == null &&
    growthMetricPercent == null &&
    latestPeriodRevenue == null
  ) {
    return null;
  }

  return {
    segment,
    isTotal: (asBoolean(row.is_consolidated) ?? asBoolean(row.is_total) ?? false) || isTotalRowName(segment),
    revenueByYear,
    comparabilityLabel,
    growthMetricPeriod,
    growthMetricPercent,
    latestPeriodRevenue,
  };
};

const normalizeRevenueHistoryBySegment = (
  value: unknown,
): NormalizedRevenueHistoryBySegment | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const rows = parseJsonArrayLike(row.rows)
    .map((item) => normalizeRevenueHistoryBySegmentRow(item))
    .filter((item): item is NormalizedRevenueHistoryBySegmentRow => Boolean(item));
  const periodsFromRows = collectPeriodsFromNumericMaps(
    rows.map((item) => item.revenueByYear),
  );
  const years = toStringArray(row.years);
  const insights = parseJsonArrayLike(row.insights)
    .map((item) => normalizeHistoricalEconomicsInsight(item))
    .filter((item): item is string => Boolean(item));
  const latestPeriod = asString(row.latest_period) ?? null;

  if (
    rows.length === 0 &&
    years.length === 0 &&
    periodsFromRows.length === 0 &&
    insights.length === 0 &&
    !latestPeriod
  ) {
    return null;
  }

  return {
    years: years.length > 0 ? years : periodsFromRows,
    rows,
    insights,
    latestPeriod,
  };
};

const normalizeRevenueHistoryByUnitRow = (
  value: unknown,
): NormalizedRevenueHistoryByUnitRow | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const unit = asString(row.unit) ?? null;
  if (!unit) return null;

  const primaryValuesByPeriod = normalizeNumericPeriodMap(row.values_by_period);
  const fallbackValuesByPeriod = normalizeNumericPeriodMap(row.values);
  const valuesByPeriod =
    Object.keys(primaryValuesByPeriod).length > 0
      ? primaryValuesByPeriod
      : fallbackValuesByPeriod;
  const cagrPercent = asNumber(row.cagr_percent);
  const confidence = asString(row.confidence) ?? null;
  const isConsolidated = asBoolean(row.is_consolidated) ?? false;

  if (
    Object.keys(valuesByPeriod).length === 0 &&
    cagrPercent == null &&
    !confidence &&
    !isConsolidated
  ) {
    return null;
  }

  return {
    unit,
    valuesByPeriod,
    cagrPercent,
    confidence,
    isConsolidated,
  };
};

const normalizeRevenueHistoryByUnit = (
  value: unknown,
): NormalizedRevenueHistoryByUnit | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const rows = parseJsonArrayLike(row.rows)
    .map((item) => normalizeRevenueHistoryByUnitRow(item))
    .filter((item): item is NormalizedRevenueHistoryByUnitRow => Boolean(item));
  const periodsFromRows = collectPeriodsFromNumericMaps(rows.map((item) => item.valuesByPeriod));
  const periods = toStringArray(row.periods);
  const insights = toStringArray(row.insights);
  const methodologyNote = asString(row.methodology_note) ?? null;

  if (
    rows.length === 0 &&
    periods.length === 0 &&
    periodsFromRows.length === 0 &&
    insights.length === 0 &&
    !methodologyNote
  ) {
    return null;
  }

  return {
    periods: periods.length > 0 ? periods : periodsFromRows,
    rows,
    insights,
    methodologyNote,
  };
};

const normalizeSegmentGrowthCagr3yRow = (value: unknown) => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const segment = asString(row.segment) ?? null;
  if (!segment) return null;

  return {
    basis: asString(row.basis) ?? null,
    segment,
    startYear: asString(row.start_year) ?? null,
    endYear: asString(row.end_year) ?? null,
    cagrPercent: asNumber(row.cagr_percent),
    comparability: asString(row.comparability) ?? null,
  };
};

const normalizeRevenueMixHistoryByUnitRow = (
  value: unknown,
): NormalizedRevenueMixHistoryByUnitRow | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const unit = asString(row.unit) ?? null;
  if (!unit) return null;

  const primaryMixByPeriod = normalizeNumericPeriodMap(row.mix_by_period);
  const fallbackMixByPeriod = normalizeNumericPeriodMap(row.values_by_period);
  const mixByPeriod =
    Object.keys(primaryMixByPeriod).length > 0
      ? primaryMixByPeriod
      : fallbackMixByPeriod;
  const direction = asString(row.direction) ?? null;
  const confidence = asString(row.confidence) ?? null;

  if (Object.keys(mixByPeriod).length === 0 && !direction && !confidence) {
    return null;
  }

  return {
    unit,
    mixByPeriod,
    direction,
    confidence,
  };
};

const normalizeRevenueMixHistoryByUnit = (
  value: unknown,
): NormalizedRevenueMixHistoryByUnit | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const rows = parseJsonArrayLike(row.rows)
    .map((item) => normalizeRevenueMixHistoryByUnitRow(item))
    .filter((item): item is NormalizedRevenueMixHistoryByUnitRow => Boolean(item));
  const periodsFromRows = collectPeriodsFromNumericMaps(rows.map((item) => item.mixByPeriod));
  const periods = toStringArray(row.periods);
  const insights = toStringArray(row.insights);
  const methodologyNote = asString(row.methodology_note) ?? null;

  if (
    rows.length === 0 &&
    periods.length === 0 &&
    periodsFromRows.length === 0 &&
    insights.length === 0 &&
    !methodologyNote
  ) {
    return null;
  }

  return {
    periods: periods.length > 0 ? periods : periodsFromRows,
    rows,
    insights,
    methodologyNote,
  };
};

const normalizeRevenueMixHistoryBySegmentRow = (
  value: unknown,
): NormalizedRevenueMixHistoryBySegmentRow | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const segment = asString(row.segment) ?? asString(row.segment_name) ?? null;
  if (!segment) return null;

  const primaryMixPercentByYear = normalizeNumericPeriodMap(
    row.mix_percent_by_year ?? row.values_by_year ?? row.values_by_period,
  );
  const mixPercentByYear =
    Object.keys(primaryMixPercentByYear).length > 0
      ? primaryMixPercentByYear
      : normalizeNumericPeriodMap(row.values);
  const directionLabel = asString(row.direction_label) ?? asString(row.direction) ?? null;
  const latestMixPercent = asNumber(row.latest_mix_percent);
  const comparabilityLabel = asString(row.comparability_label) ?? null;

  if (
    Object.keys(mixPercentByYear).length === 0 &&
    directionLabel == null &&
    latestMixPercent == null &&
    comparabilityLabel == null
  ) {
    return null;
  }

  return {
    segment,
    isTotal: (asBoolean(row.is_consolidated) ?? asBoolean(row.is_total) ?? false) || isTotalRowName(segment),
    mixPercentByYear,
    directionLabel,
    latestMixPercent,
    comparabilityLabel,
  };
};

const normalizeRevenueMixHistoryBySegment = (
  value: unknown,
): NormalizedRevenueMixHistoryBySegment | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const rows = parseJsonArrayLike(row.rows)
    .map((item) => normalizeRevenueMixHistoryBySegmentRow(item))
    .filter((item): item is NormalizedRevenueMixHistoryBySegmentRow => Boolean(item));
  const periodsFromRows = collectPeriodsFromNumericMaps(
    rows.map((item) => item.mixPercentByYear),
  );
  const years = toStringArray(row.years);
  const insights = parseJsonArrayLike(row.insights)
    .map((item) => normalizeHistoricalEconomicsInsight(item))
    .filter((item): item is string => Boolean(item));
  const latestPeriod = asString(row.latest_period) ?? null;

  if (
    rows.length === 0 &&
    years.length === 0 &&
    periodsFromRows.length === 0 &&
    insights.length === 0 &&
    !latestPeriod
  ) {
    return null;
  }

  return {
    years: years.length > 0 ? years : periodsFromRows,
    rows,
    insights,
    latestPeriod,
  };
};

const normalizeHistoricalEconomics = ({
  historicalEconomicsSource,
}: {
  historicalEconomicsSource: JsonRecord | null;
}): NormalizedHistoricalEconomics | null => {
  const summary = normalizeHistoricalEconomicsSummary(historicalEconomicsSource?.summary);
  const companyRevenueCagr3y = normalizeCompanyRevenueCagr3y(
    historicalEconomicsSource?.company_revenue_cagr_3y,
  );
  const revenueSplitHistory = parseJsonArrayLike(historicalEconomicsSource?.revenue_split_history)
    .map((item) => normalizeRevenueSplitHistoryRow(item))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const segmentGrowthCagr3y = parseJsonArrayLike(historicalEconomicsSource?.segment_growth_cagr_3y)
    .map((item) => normalizeSegmentGrowthCagr3yRow(item))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const revenueHistoryBySegment = normalizeRevenueHistoryBySegment(
    historicalEconomicsSource?.revenue_history_by_segment,
  );
  const revenueMixHistoryBySegment = normalizeRevenueMixHistoryBySegment(
    historicalEconomicsSource?.revenue_mix_history_by_segment,
  );
  const revenueHistoryByUnit = normalizeRevenueHistoryByUnit(
    historicalEconomicsSource?.revenue_history_by_unit,
  );
  const revenueMixHistoryByUnit = normalizeRevenueMixHistoryByUnit(
    historicalEconomicsSource?.revenue_mix_history_by_unit,
  );

  if (
    !summary &&
    !companyRevenueCagr3y &&
    revenueSplitHistory.length === 0 &&
    segmentGrowthCagr3y.length === 0 &&
    !revenueHistoryBySegment &&
    !revenueMixHistoryBySegment &&
    !revenueHistoryByUnit &&
    !revenueMixHistoryByUnit
  ) {
    return null;
  }

  return {
    companyRevenueCagr3y,
    revenueSplitHistory,
    segmentGrowthCagr3y,
    summary,
    revenueHistoryBySegment,
    revenueMixHistoryBySegment,
    revenueHistoryByUnit,
    revenueMixHistoryByUnit,
  };
};

// ── Tri-axis slots (chunks-fed): segment_history_quarterly + consolidated_financials_annual ──
// Independent, fill-if-found. Each returns null when the source is absent or empty {}.

const normalizeSegmentHistoryQuarterly = (
  value: unknown,
): NormalizedSegmentHistoryQuarterly | null => {
  const obj = parseJsonObjectLike(value);
  if (!obj) return null;
  const rows = parseJsonArrayLike(obj.rows)
    .map((item): NormalizedSegmentPeriodRow | null => {
      const r = parseJsonObjectLike(item);
      if (!r) return null;
      const segment = asString(r.segment) ?? asString(r.segment_name);
      if (!segment) return null;
      const amountByPeriod = normalizeNumericPeriodMap(r.amount_by_period ?? r.values_by_period);
      if (Object.keys(amountByPeriod).length === 0) return null;
      return {
        segment,
        amountByPeriod,
        unit: asString(r.unit),
        mixPctLatest: asNumber(r.mix_pct_latest),
        comparabilityLabel: asString(r.comparability_label),
      };
    })
    .filter((r): r is NormalizedSegmentPeriodRow => Boolean(r));
  if (rows.length === 0) return null;
  const periods = toStringArray(obj.periods);
  const insights = parseJsonArrayLike(obj.insights)
    .map((i) => {
      const r = parseJsonObjectLike(i);
      return r ? asString(r.trend_insight) : null;
    })
    .filter((s): s is string => Boolean(s));
  return {
    periods: periods.length > 0 ? periods : collectPeriodsFromNumericMaps(rows.map((r) => r.amountByPeriod)),
    rows,
    insights,
  };
};

const normalizeConsolidatedFinancialsAnnual = (
  value: unknown,
): NormalizedConsolidatedFinancialsAnnual | null => {
  const obj = parseJsonObjectLike(value);
  if (!obj) return null;
  const rows = parseJsonArrayLike(obj.rows)
    .map((item): NormalizedConsolidatedAnnualRow | null => {
      const r = parseJsonObjectLike(item);
      if (!r) return null;
      const metric = asString(r.metric);
      if (!metric) return null;
      const valueByPeriod = normalizeNumericPeriodMap(r.value_by_period ?? r.values_by_period);
      if (Object.keys(valueByPeriod).length === 0) return null;
      return {
        metric,
        valueByPeriod,
        unit: asString(r.unit),
        comparabilityLabel: asString(r.comparability_label),
      };
    })
    .filter((r): r is NormalizedConsolidatedAnnualRow => Boolean(r));
  if (rows.length === 0) return null;
  const periods = toStringArray(obj.periods);
  const insights = parseJsonArrayLike(obj.insights)
    .map((i) => {
      const r = parseJsonObjectLike(i);
      return r ? asString(r.trend_insight) : null;
    })
    .filter((s): s is string => Boolean(s));
  return {
    periods: periods.length > 0 ? periods : collectPeriodsFromNumericMaps(rows.map((r) => r.valueByPeriod)),
    rows,
    insights,
  };
};

export function normalizeBusinessSnapshot({
  companyCode,
  companyWebsite,
  snapshotRow,
}: {
  companyCode: string;
  companyWebsite: string | null;
  snapshotRow: BusinessSnapshotRow | null | undefined;
}): NormalizedBusinessSnapshot | null {
  if (!snapshotRow) return null;

  const schemaHints = new Set<string>();
  const detailsRoot = parseJsonObjectLike(snapshotRow.details);
  const detailsNested = parseJsonObjectLike(detailsRoot?.details);

  const businessSnapshotObject =
    parseJsonObjectLike(snapshotRow.business_snapshot) ??
    parseJsonObjectLike(detailsRoot?.business_snapshot) ??
    parseJsonObjectLike(detailsRoot?.snapshot) ??
    parseJsonObjectLike(detailsNested?.business_snapshot);
  const detailsBusinessSnapshot = parseJsonObjectLike(detailsRoot?.business_snapshot);
  const detailsNestedBusinessSnapshot = parseJsonObjectLike(detailsNested?.business_snapshot);

  if (parseJsonObjectLike(snapshotRow.business_snapshot)) {
    schemaHints.add("business_snapshot_column");
  } else if (businessSnapshotObject) {
    schemaHints.add("details_fallback");
  }

  const aboutCompanySource =
    parseJsonObjectLike(snapshotRow.about_company) ??
    parseJsonObjectLike(businessSnapshotObject?.about_company) ??
    parseJsonObjectLike(detailsBusinessSnapshot?.about_company) ??
    parseJsonObjectLike(detailsNestedBusinessSnapshot?.about_company) ??
    null;

  if (parseJsonObjectLike(snapshotRow.about_company)) {
    schemaHints.add("about_company_column");
  } else if (parseJsonObjectLike(businessSnapshotObject?.about_company)) {
    schemaHints.add("about_company_nested");
  }

  const revenueBreakdownSource =
    parseJsonObjectLike(snapshotRow.revenue_breakdown) ??
    parseJsonObjectLike(businessSnapshotObject?.revenue_breakdown) ??
    parseJsonObjectLike(detailsBusinessSnapshot?.revenue_breakdown) ??
    parseJsonObjectLike(detailsNestedBusinessSnapshot?.revenue_breakdown) ??
    null;

  if (parseJsonObjectLike(snapshotRow.revenue_breakdown)) {
    schemaHints.add("revenue_breakdown_column");
  } else if (parseJsonObjectLike(businessSnapshotObject?.revenue_breakdown)) {
    schemaHints.add("revenue_breakdown_nested");
  }

  const historicalEconomicsSource =
    parseJsonObjectLike(snapshotRow.historical_economics) ??
    parseJsonObjectLike(businessSnapshotObject?.historical_economics) ??
    parseJsonObjectLike(detailsBusinessSnapshot?.historical_economics) ??
    parseJsonObjectLike(detailsNestedBusinessSnapshot?.historical_economics) ??
    null;
  // Only treat historical economics as "present" when the resolved source object
  // actually has populated content. A bare {} (the generator's conditional-empty
  // case, e.g. companies without comparable multi-year segment history) must not
  // trip the "data exists but not display-ready" fallback.
  const hasHistoricalEconomicsSource = hasPopulatedValue(historicalEconomicsSource);

  if (parseJsonObjectLike(snapshotRow.historical_economics)) {
    schemaHints.add("historical_economics_column");
  } else if (parseJsonObjectLike(businessSnapshotObject?.historical_economics)) {
    schemaHints.add("historical_economics_nested");
  }

  const segmentProfiles =
    parseJsonArrayLike(snapshotRow.segment_profiles).length > 0
      ? parseJsonArrayLike(snapshotRow.segment_profiles)
      : parseJsonArrayLike(detailsRoot?.segment_profiles);

  if (segmentProfiles.length > 0) {
    schemaHints.add(
      parseJsonArrayLike(snapshotRow.segment_profiles).length > 0
        ? "segment_profiles_column"
        : "segment_profiles_fallback",
    );
  }

  const sourceUrls =
    toStringArray(snapshotRow.source_urls).length > 0
      ? toStringArray(snapshotRow.source_urls)
      : toStringArray(detailsNested?.source_urls);

  if (sourceUrls.length > 0) {
    schemaHints.add(
      toStringArray(snapshotRow.source_urls).length > 0
        ? "source_urls_column"
        : "source_urls_fallback",
    );
  }

  const website =
    asString(companyWebsite) ??
    asString(detailsNested?.website) ??
    sourceUrls[0] ??
    null;

  if (asString(companyWebsite)) {
    schemaHints.add("company_website");
  } else if (asString(detailsNested?.website)) {
    schemaHints.add("details_website_fallback");
  } else if (sourceUrls[0]) {
    schemaHints.add("source_url_website_fallback");
  }

  const sourceType = asString(detailsNested?.source_type);
  if (sourceType) {
    schemaHints.add(`details_source_type:${sourceType}`);
  }

  const normalizedAboutCompany = normalizeAboutCompany({
    aboutCompanySource,
    businessSnapshotObject,
  });
  const normalizedRevenueBreakdown = normalizeRevenueBreakdown({
    revenueBreakdownSource,
    segmentProfiles,
  });
  const normalizedHistoricalEconomics = normalizeHistoricalEconomics({
    historicalEconomicsSource,
  });

  // Tri-axis slots — sibling keys in the business_snapshot body (chunks-fed merge).
  const segmentHistoryQuarterlySource =
    parseJsonObjectLike(snapshotRow.segment_history_quarterly) ??
    parseJsonObjectLike(businessSnapshotObject?.segment_history_quarterly) ??
    parseJsonObjectLike(detailsBusinessSnapshot?.segment_history_quarterly) ??
    null;
  const consolidatedFinancialsAnnualSource =
    parseJsonObjectLike(snapshotRow.consolidated_financials_annual) ??
    parseJsonObjectLike(businessSnapshotObject?.consolidated_financials_annual) ??
    parseJsonObjectLike(detailsBusinessSnapshot?.consolidated_financials_annual) ??
    null;
  const segmentHistoryAnnualSource =
    parseJsonObjectLike(snapshotRow.segment_history_annual) ??
    parseJsonObjectLike(businessSnapshotObject?.segment_history_annual) ??
    parseJsonObjectLike(detailsBusinessSnapshot?.segment_history_annual) ??
    null;
  const segmentHistoryQuarterly = normalizeSegmentHistoryQuarterly(segmentHistoryQuarterlySource);
  // Per-segment annual reuses the same shape/normalizer as quarterly.
  const segmentHistoryAnnual = normalizeSegmentHistoryQuarterly(segmentHistoryAnnualSource);
  const consolidatedFinancialsAnnual = normalizeConsolidatedFinancialsAnnual(
    consolidatedFinancialsAnnualSource,
  );
  if (segmentHistoryQuarterly) schemaHints.add("segment_history_quarterly");
  if (segmentHistoryAnnual) schemaHints.add("segment_history_annual");
  if (consolidatedFinancialsAnnual) schemaHints.add("consolidated_financials_annual");

  return {
    companyCode: snapshotRow.company ?? companyCode,
    generatedAtRaw: asString(snapshotRow.generated_at),
    generatedAtLabel: formatDateLabel(asString(snapshotRow.generated_at)),
    website,
    snapshotPhase: asNumber(snapshotRow.snapshot_phase),
    snapshotSource: asString(snapshotRow.snapshot_source),
    sourceUrls,
    businessSummaryShort: asString(businessSnapshotObject?.business_summary_short),
    businessSummaryLong: asString(businessSnapshotObject?.business_summary_long),
    businessModelQuality: asString(businessSnapshotObject?.business_model_quality),
    operatingModel: asString(businessSnapshotObject?.operating_model),
    valueChainPosition: asString(businessSnapshotObject?.value_chain_position),
    demandShape: asString(businessSnapshotObject?.demand_shape),
    dominantSegment: asString(businessSnapshotObject?.dominant_segment),
    emergingSegment: asString(businessSnapshotObject?.emerging_segment),
    mixShiftSummary: asString(businessSnapshotObject?.mix_shift_summary),
    topRevenueDrivers: toStringArray(businessSnapshotObject?.top_3_revenue_drivers).slice(0, 3),
    topGrowthDrivers: toStringArray(businessSnapshotObject?.top_3_growth_drivers).slice(0, 3),
    keyDependencies: toStringArray(businessSnapshotObject?.key_dependencies).slice(0, 3),
    keyRisksToModel: toStringArray(businessSnapshotObject?.key_risks_to_model).slice(0, 3),
    segmentProfiles,
    aboutCompany: normalizedAboutCompany,
    revenueBreakdown: normalizedRevenueBreakdown,
    historicalEconomics: normalizedHistoricalEconomics,
    hasHistoricalEconomicsSource,
    segmentHistoryQuarterly,
    segmentHistoryAnnual,
    consolidatedFinancialsAnnual,
    schemaHints: Array.from(schemaHints),
  };
}
