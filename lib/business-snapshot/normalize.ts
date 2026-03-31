import type {
  BusinessSnapshotRow,
  NormalizedAboutCompany,
  NormalizedBusinessSnapshot,
  NormalizedHistoricalEconomics,
  NormalizedHistoricalEconomicsSummary,
  NormalizedRevenueBreakdown,
  NormalizedRevenueBreakdownItem,
  NormalizedRevenueHistoryByUnit,
  NormalizedRevenueHistoryByUnitRow,
  NormalizedRevenueMixHistoryByUnit,
  NormalizedRevenueMixHistoryByUnitRow,
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
    revenueHistoryByUnit,
    revenueMixHistoryByUnit,
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
  const hasHistoricalEconomicsSource = Boolean(
    snapshotRow.historical_economics != null ||
      businessSnapshotObject?.historical_economics != null ||
      detailsBusinessSnapshot?.historical_economics != null ||
      detailsNestedBusinessSnapshot?.historical_economics != null,
  );

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
    schemaHints: Array.from(schemaHints),
  };
}
