import type {
  CompanyIndustryAnalysisRow,
  NormalizedCompanyIndustryAnalysis,
  NormalizedIndustryCompanyFit,
  NormalizedIndustryCompetition,
  NormalizedIndustryPositioning,
  NormalizedIndustryProfitPool,
  NormalizedIndustryTheme,
  NormalizedIndustryValueChain,
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

const normalizeIndustryPositioning = (
  value: unknown,
): NormalizedIndustryPositioning | null => {
  const record = parseJsonObjectLike(value);
  const industrySummary = asString(record?.industry_summary);
  const whereThisCompanyFits = asString(record?.where_this_company_fits);
  const whyThisIndustryExists = asString(record?.why_this_industry_exists);

  if (!industrySummary && !whereThisCompanyFits && !whyThisIndustryExists) {
    return null;
  }

  return {
    industrySummary,
    whereThisCompanyFits,
    whyThisIndustryExists,
  };
};

const normalizeValueChain = (value: unknown): NormalizedIndustryValueChain | null => {
  const record = parseJsonObjectLike(value);
  const stages = toStringArray(record?.stages);
  const companyRole = asString(record?.company_role);
  const companyStage = asString(record?.company_stage);

  if (stages.length === 0 && !companyRole && !companyStage) {
    return null;
  }

  return {
    stages,
    companyRole,
    companyStage,
  };
};

const normalizeProfitPool = (value: unknown): NormalizedIndustryProfitPool | null => {
  const record = parseJsonObjectLike(value);
  const pool = asString(record?.pool);
  if (!pool) return null;
  return {
    pool,
    whoCapturesIt: asString(record?.who_captures_it),
    companyExposure: asString(record?.company_exposure),
    whyItIsProfitable: asString(record?.why_it_is_profitable),
  };
};

const normalizeCompanyFit = (value: unknown): NormalizedIndustryCompanyFit | null => {
  const record = parseJsonObjectLike(value);
  const businessModelPosition = asString(record?.business_model_position);
  const advantagesInContext = toStringArray(record?.advantages_in_context);
  const constraintsInContext = toStringArray(record?.constraints_in_context);

  if (!businessModelPosition && advantagesInContext.length === 0 && constraintsInContext.length === 0) {
    return null;
  }

  return {
    businessModelPosition,
    advantagesInContext,
    constraintsInContext,
  };
};

const normalizeCompetition = (value: unknown): NormalizedIndustryCompetition | null => {
  const record = parseJsonObjectLike(value);
  const name = asString(record?.name);
  if (!name) return null;
  return {
    name,
    type: asString(record?.type),
    whyItMatters: asString(record?.why_it_matters),
    comparisonBasis: asString(record?.comparison_basis),
  };
};

const normalizeTheme = (value: unknown): NormalizedIndustryTheme | null => {
  const record = parseJsonObjectLike(value);
  const theme = asString(record?.theme);
  if (!theme) return null;
  return {
    theme,
    timeHorizon: asString(record?.time_horizon),
    whyItMattersForCompany: asString(record?.why_it_matters_for_company),
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
  if (parseJsonObjectLike(row.value_chain)) schemaHints.add("value_chain_column");
  if (parseJsonArrayLike(row.profit_pools).length > 0) schemaHints.add("profit_pools_column");
  if (parseJsonObjectLike(row.company_fit)) schemaHints.add("company_fit_column");
  if (parseJsonArrayLike(row.competition).length > 0) schemaHints.add("competition_column");
  if (parseJsonArrayLike(row.tailwinds).length > 0) schemaHints.add("tailwinds_column");
  if (parseJsonArrayLike(row.headwinds).length > 0) schemaHints.add("headwinds_column");
  if (normalizeSources(row.sources).length > 0) schemaHints.add("sources_column");

  const detailsRoot = parseJsonObjectLike(row.details);
  const detailsNested = parseJsonObjectLike(detailsRoot?.details);
  const sourcesUsed = asString(detailsNested?.sources_used);
  if (sourcesUsed) schemaHints.add(`sources_used:${sourcesUsed}`);
  const contextSource = asString(detailsNested?.context_source);
  if (contextSource) schemaHints.add(`context_source:${contextSource}`);

  const industryPositioning = normalizeIndustryPositioning(row.industry_positioning);
  const valueChain = normalizeValueChain(row.value_chain);
  const profitPools = parseJsonArrayLike(row.profit_pools)
    .map((item) => normalizeProfitPool(item))
    .filter((item): item is NormalizedIndustryProfitPool => Boolean(item));
  const companyFit = normalizeCompanyFit(row.company_fit);
  const competition = parseJsonArrayLike(row.competition)
    .map((item) => normalizeCompetition(item))
    .filter((item): item is NormalizedIndustryCompetition => Boolean(item));
  const tailwinds = parseJsonArrayLike(row.tailwinds)
    .map((item) => normalizeTheme(item))
    .filter((item): item is NormalizedIndustryTheme => Boolean(item));
  const headwinds = parseJsonArrayLike(row.headwinds)
    .map((item) => normalizeTheme(item))
    .filter((item): item is NormalizedIndustryTheme => Boolean(item));

  if (
    !industryPositioning &&
    !valueChain &&
    profitPools.length === 0 &&
    !companyFit &&
    competition.length === 0 &&
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
    valueChain,
    profitPools,
    companyFit,
    competition,
    tailwinds,
    headwinds,
    schemaHints: Array.from(schemaHints),
  };
}
