import type {
  BusinessSnapshotRow,
  NormalizedBusinessSnapshot,
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

  if (parseJsonObjectLike(snapshotRow.business_snapshot)) {
    schemaHints.add("business_snapshot_column");
  } else if (businessSnapshotObject) {
    schemaHints.add("details_fallback");
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
    schemaHints: Array.from(schemaHints),
  };
}
