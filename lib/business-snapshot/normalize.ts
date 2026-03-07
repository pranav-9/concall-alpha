import type {
  BusinessSnapshotRow,
  NormalizedAboutCompany,
  NormalizedBusinessSnapshot,
  NormalizedRevenueBreakdown,
  NormalizedRevenueBreakdownItem,
  NormalizedRevenueEngine,
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

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
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
    null;
  const economicProblemSolved = asString(aboutCompanySource?.economic_problem_solved) ?? null;
  const businessActivity = asString(aboutCompanySource?.business_activity) ?? null;
  const industryRole = asString(aboutCompanySource?.industry_role) ?? null;
  const valueChainPosition =
    asString(aboutCompanySource?.value_chain_position) ??
    asString(businessSnapshotObject?.value_chain_position) ??
    null;
  const coreProductsOrServices = toStringArray(aboutCompanySource?.core_products_or_services);
  const primaryCustomers = toStringArray(aboutCompanySource?.primary_customers);

  if (
    !aboutShort &&
    !aboutLong &&
    !economicProblemSolved &&
    !businessActivity &&
    !industryRole &&
    !valueChainPosition &&
    coreProductsOrServices.length === 0 &&
    primaryCustomers.length === 0
  ) {
    return null;
  }

  return {
    aboutShort,
    aboutLong,
    economicProblemSolved,
    businessActivity,
    industryRole,
    primaryCustomers,
    valueChainPosition,
    coreProductsOrServices,
  };
};

const normalizeRevenueEngine = ({
  revenueEngineSource,
}: {
  revenueEngineSource: JsonRecord | null;
}): NormalizedRevenueEngine | null => {
  const monetizationUnit = asString(revenueEngineSource?.monetization_unit) ?? null;
  const revenueFormula = asString(revenueEngineSource?.revenue_formula) ?? null;
  const revenueModelType = asString(revenueEngineSource?.revenue_model_type) ?? null;

  if (!monetizationUnit && !revenueFormula && !revenueModelType) {
    return null;
  }

  return {
    monetizationUnit,
    revenueFormula,
    revenueModelType,
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
  const byGeography = toRevenueItems(
    revenueBreakdownSource?.by_geography,
    ["region", "geography", "name"],
    ["description"],
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

  if (
    bySegmentWithFallback.length === 0 &&
    byGeography.length === 0 &&
    byProductOrService.length === 0
  ) {
    return null;
  }

  return {
    bySegment: bySegmentWithFallback,
    byGeography,
    byProductOrService,
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

  const revenueEngineSource =
    parseJsonObjectLike(snapshotRow.revenue_engine) ??
    parseJsonObjectLike(businessSnapshotObject?.revenue_engine) ??
    parseJsonObjectLike(detailsBusinessSnapshot?.revenue_engine) ??
    parseJsonObjectLike(detailsNestedBusinessSnapshot?.revenue_engine) ??
    null;

  if (parseJsonObjectLike(snapshotRow.revenue_engine)) {
    schemaHints.add("revenue_engine_column");
  } else if (parseJsonObjectLike(businessSnapshotObject?.revenue_engine)) {
    schemaHints.add("revenue_engine_nested");
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
  const normalizedRevenueEngine = normalizeRevenueEngine({
    revenueEngineSource,
  });

  return {
    companyCode: snapshotRow.company ?? companyCode,
    generatedAtRaw: asString(snapshotRow.generated_at),
    generatedAtLabel: formatDateLabel(asString(snapshotRow.generated_at)),
    documentsProcessed: asNumber(snapshotRow.documents_processed),
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
    revenueEngine: normalizedRevenueEngine,
    schemaHints: Array.from(schemaHints),
  };
}
