import type {
  CompanyIndustryAnalysisRow,
  NormalizedCompanyIndustryAnalysis,
  NormalizedIndustryPositioning,
  NormalizedIndustryRegulatoryChange,
  NormalizedIndustryTheme,
} from "@/lib/company-industry-analysis/types";

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

const formatCompactLabel = (value: string) => value.replace(/_/g, " ").trim();

const formatList = (items: string[]) => {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

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

const buildIndustryEconomicsSummary = (
  positioningRecord: JsonRecord | null,
  detailsRoot: JsonRecord | null,
) => {
  const valueChainMap = parseJsonObjectLike(detailsRoot?.value_chain_map);
  const synthesis = asString(valueChainMap?.synthesis);
  const structureType =
    asString(positioningRecord?.value_chain_structure_type) ??
    asString(valueChainMap?.structure_type);
  const classificationDimensions = parseJsonArrayLike(positioningRecord?.classification_dimensions)
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));

  const detailParts: string[] = [];
  if (structureType) {
    detailParts.push(`Value chain structure: ${formatCompactLabel(structureType)}.`);
  }
  if (classificationDimensions.length > 0) {
    detailParts.push(`Key classification dimensions: ${formatList(classificationDimensions)}.`);
  }

  return [synthesis, detailParts.join(" ")].filter((item): item is string => Boolean(item)).join(" ");
};

const buildCompanyFitSummary = (detailsRoot: JsonRecord | null) => {
  const classificationMap = parseJsonObjectLike(detailsRoot?.classification_map);
  const dimensionRecords = parseJsonArrayLike(classificationMap?.dimensions)
    .map((item) => parseJsonObjectLike(item))
    .filter((item): item is JsonRecord => Boolean(item));

  const summaries = dimensionRecords
    .map((dimensionRecord) => {
      const dimensionName = asString(dimensionRecord.dimension_name);
      const positionedCategories = parseJsonArrayLike(dimensionRecord.categories)
        .map((item) => parseJsonObjectLike(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .filter((item) => item.is_company_position === true)
        .map((item) => asString(item.category))
        .filter((item): item is string => Boolean(item));

      if (!dimensionName || positionedCategories.length === 0) return null;
      return `${dimensionName}: ${formatList(positionedCategories)}`;
    })
    .filter((item): item is string => Boolean(item));

  const implications = dimensionRecords
    .map((dimensionRecord) => asString(dimensionRecord.implication))
    .filter((item): item is string => Boolean(item));

  return [...summaries, ...implications.slice(0, 1)].join(" ");
};

const normalizeIndustryPositioning = (
  value: unknown,
  detailsRoot: JsonRecord | null,
): NormalizedIndustryPositioning | null => {
  const record = parseJsonObjectLike(value);
  const customerNeed =
    asString(record?.customer_need) ??
    asString(record?.industry_summary) ??
    asString(record?.industry_overview) ??
    asString(detailsRoot?.industry_overview);
  const industryEconomicsForCompany =
    asString(record?.industry_economics_for_company) ??
    asString(record?.why_this_industry_exists) ??
    buildIndustryEconomicsSummary(record, detailsRoot) ??
    null;
  const whereThisCompanyFits =
    asString(record?.where_this_company_fits) ??
    buildCompanyFitSummary(detailsRoot) ??
    null;

  if (!customerNeed && !industryEconomicsForCompany && !whereThisCompanyFits) {
    return null;
  }

  return {
    customerNeed,
    industryEconomicsForCompany,
    whereThisCompanyFits,
  };
};

const normalizeRegulatoryChange = (
  value: unknown,
): NormalizedIndustryRegulatoryChange | null => {
  const record = parseJsonObjectLike(value);
  const change = asString(record?.change);
  if (!change) return null;

  return {
    change,
    period: asString(record?.period),
    whatChanged: asString(record?.what_changed),
    companyImpactMechanism: asString(record?.company_impact_mechanism),
    impactDirection: asLowerString(record?.impact_direction),
  };
};

const normalizeTheme = (value: unknown): NormalizedIndustryTheme | null => {
  const record = parseJsonObjectLike(value);
  const theme = asString(record?.theme);
  if (!theme) return null;
  return {
    theme,
    companyMechanism:
      asString(record?.company_mechanism) ??
      asString(record?.why_it_matters_for_company),
    timeHorizon: asString(record?.time_horizon),
    horizonBasis: asString(record?.horizon_basis),
  };
};

const normalizeSources = (value: unknown): string[] =>
  parseJsonArrayLike(value)
    .map((item) => {
      if (typeof item === "string") return asString(item);
      const record = parseJsonObjectLike(item);
      return asString(record?.url);
    })
    .filter((item): item is string => Boolean(item));

export function normalizeCompanyIndustryAnalysis(
  row: CompanyIndustryAnalysisRow | null | undefined,
): NormalizedCompanyIndustryAnalysis | null {
  if (!row) return null;

  const schemaHints = new Set<string>();
  if (parseJsonObjectLike(row.industry_positioning)) schemaHints.add("industry_positioning_column");
  if (parseJsonArrayLike(row.regulatory_changes).length > 0) schemaHints.add("regulatory_changes_column");
  if (parseJsonArrayLike(row.tailwinds).length > 0) schemaHints.add("tailwinds_column");
  if (parseJsonArrayLike(row.headwinds).length > 0) schemaHints.add("headwinds_column");
  if (normalizeSources(row.sources).length > 0) schemaHints.add("sources_column");

  const detailsRoot = parseJsonObjectLike(row.details);
  const detailsNested = parseJsonObjectLike(detailsRoot?.details);
  const sourcesUsed = asString(detailsNested?.sources_used);
  if (sourcesUsed) schemaHints.add(`sources_used:${sourcesUsed}`);
  const contextSource = asString(detailsNested?.context_source);
  if (contextSource) schemaHints.add(`context_source:${contextSource}`);

  const industryPositioning = normalizeIndustryPositioning(row.industry_positioning, detailsRoot);
  const regulatoryChanges = parseJsonArrayLike(row.regulatory_changes)
    .map((item) => normalizeRegulatoryChange(item))
    .filter((item): item is NormalizedIndustryRegulatoryChange => Boolean(item));
  const tailwinds = parseJsonArrayLike(row.tailwinds)
    .map((item) => normalizeTheme(item))
    .filter((item): item is NormalizedIndustryTheme => Boolean(item));
  const headwinds = parseJsonArrayLike(row.headwinds)
    .map((item) => normalizeTheme(item))
    .filter((item): item is NormalizedIndustryTheme => Boolean(item));

  if (
    !industryPositioning &&
    regulatoryChanges.length === 0 &&
    tailwinds.length === 0 &&
    headwinds.length === 0
  ) {
    return null;
  }

  return {
    company: row.company,
    sector: asString(row.sector),
    subSector: asString(row.sub_sector),
    generatedAtRaw: asString(row.generated_at),
    generatedAtLabel: formatDateLabel(asString(row.generated_at)),
    sourceUrls: normalizeSources(row.sources),
    industryPositioning,
    regulatoryChanges,
    tailwinds,
    headwinds,
    schemaHints: Array.from(schemaHints),
  };
}
