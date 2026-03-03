import type {
  NormalizedSectorCatalyst,
  NormalizedSectorCoveredCompany,
  NormalizedSectorEvidence,
  NormalizedSectorIntelligence,
  NormalizedSectorPolicy,
  NormalizedSectorTheme,
  SectorIntelligenceRow,
} from "@/lib/sector-intelligence/types";

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

const normalizeBlankString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringArray = (value: unknown): string[] =>
  parseJsonArrayLike(value)
    .map((item) => normalizeBlankString(item))
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

const normalizeEvidence = (value: unknown): NormalizedSectorEvidence[] =>
  parseJsonArrayLike(value)
    .map((item) => parseJsonObjectLike(item))
    .filter((item): item is JsonRecord => Boolean(item))
    .map((item) => ({
      note: normalizeBlankString(item.note) ?? "",
      source: normalizeBlankString(item.source),
    }))
    .filter((item) => item.note);

const normalizeTheme = (value: unknown): NormalizedSectorTheme | null => {
  const record = parseJsonObjectLike(value);
  const theme = normalizeBlankString(record?.theme);
  if (!theme) return null;
  return {
    theme,
    confidence: toNumberOrNull(record?.confidence),
    impactArea: normalizeBlankString(record?.impact_area),
    timeHorizon: normalizeBlankString(record?.time_horizon),
    whyItMatters: normalizeBlankString(record?.why_it_matters),
    evidence: normalizeEvidence(record?.evidence),
  };
};

const normalizeCatalyst = (value: unknown): NormalizedSectorCatalyst | null => {
  const record = parseJsonObjectLike(value);
  const catalyst = normalizeBlankString(record?.catalyst);
  if (!catalyst) return null;
  return {
    type: normalizeBlankString(record?.type),
    catalyst,
    confidence: toNumberOrNull(record?.confidence),
    timeHorizon: normalizeBlankString(record?.time_horizon),
    whyItMatters: normalizeBlankString(record?.why_it_matters),
    expectedImpact: normalizeBlankString(record?.expected_impact),
    evidence: normalizeEvidence(record?.evidence),
  };
};

const normalizePolicy = (value: unknown): NormalizedSectorPolicy | null => {
  const record = parseJsonObjectLike(value);
  const policyName = normalizeBlankString(record?.policy_name);
  if (!policyName) return null;
  return {
    policyName,
    status: normalizeBlankString(record?.status),
    timeline: normalizeBlankString(record?.timeline),
    sectorEffect: normalizeBlankString(record?.sector_effect),
    whoBenefits: normalizeBlankString(record?.who_benefits),
    whoIsAtRisk: normalizeBlankString(record?.who_is_at_risk),
    evidence: normalizeEvidence(record?.evidence),
  };
};

const normalizeCoveredCompany = (value: unknown): NormalizedSectorCoveredCompany | null => {
  const record = parseJsonObjectLike(value);
  const companyCode = normalizeBlankString(record?.company_code);
  const companyName = normalizeBlankString(record?.company_name);
  if (!companyCode || !companyName) return null;
  return {
    companyCode,
    companyName,
    subSector: normalizeBlankString(record?.sub_sector),
    latestGrowthScore: toNumberOrNull(record?.latest_growth_score),
    latestSentimentScore: toNumberOrNull(record?.latest_sentiment_score),
    businessModelQuality: normalizeBlankString(record?.business_model_quality),
    strategyStrengthProxy: normalizeBlankString(record?.strategy_strength_proxy),
    positioningSummary: normalizeBlankString(record?.positioning_summary),
  };
};

const normalizeSources = (value: unknown): string[] =>
  parseJsonArrayLike(value)
    .map((item) => {
      if (typeof item === "string") return normalizeBlankString(item);
      const record = parseJsonObjectLike(item);
      return normalizeBlankString(record?.url);
    })
    .filter((item): item is string => Boolean(item));

export function normalizeSectorIntelligence(
  row: SectorIntelligenceRow | null | undefined,
): NormalizedSectorIntelligence | null {
  if (!row) return null;

  const schemaHints = new Set<string>();
  const detailsRoot = parseJsonObjectLike(row.details);
  const detailsNested = parseJsonObjectLike(detailsRoot?.details);
  const overview = parseJsonObjectLike(row.sector_overview);
  const cycleView = parseJsonObjectLike(row.cycle_view);
  const whatMatters = parseJsonObjectLike(row.what_matters_now);

  if (overview) schemaHints.add("sector_overview_column");
  if (parseJsonArrayLike(row.tailwinds).length > 0) schemaHints.add("tailwinds_column");
  if (parseJsonArrayLike(row.headwinds).length > 0) schemaHints.add("headwinds_column");
  if (cycleView) schemaHints.add("cycle_view_column");
  if (parseJsonArrayLike(row.growth_catalysts).length > 0) schemaHints.add("growth_catalysts_column");
  if (parseJsonArrayLike(row.policy_watch).length > 0) schemaHints.add("policy_watch_column");
  if (parseJsonArrayLike(row.covered_companies).length > 0) schemaHints.add("covered_companies_column");
  if (whatMatters) schemaHints.add("what_matters_now_column");
  if (normalizeSources(row.sources).length > 0) schemaHints.add("sources_column");

  const sourcesUsed = toNumberOrNull(detailsNested?.sources_used);
  if (sourcesUsed != null) schemaHints.add(`sources_used:${sourcesUsed}`);
  const coveredCompaniesCount = toNumberOrNull(detailsNested?.covered_companies_count);
  if (coveredCompaniesCount != null) schemaHints.add(`covered_companies_count:${coveredCompaniesCount}`);

  return {
    sector: normalizeBlankString(row.sector) ?? "",
    subSector: normalizeBlankString(row.sub_sector),
    generatedAtRaw: normalizeBlankString(row.generated_at),
    generatedAtLabel: formatDateLabel(normalizeBlankString(row.generated_at)),
    sourceMode: normalizeBlankString(row.source_mode),
    sourceUrls: normalizeSources(row.sources),
    sectorDefinition: normalizeBlankString(overview?.sector_definition),
    sectorSummaryShort: normalizeBlankString(overview?.sector_summary_short),
    sectorSummaryLong: normalizeBlankString(overview?.sector_summary_long),
    whatDrivesEarnings: toStringArray(overview?.what_drives_earnings),
    valueChainMap: toStringArray(overview?.value_chain_map),
    tailwinds: parseJsonArrayLike(row.tailwinds)
      .map((item) => normalizeTheme(item))
      .filter((item): item is NormalizedSectorTheme => Boolean(item)),
    headwinds: parseJsonArrayLike(row.headwinds)
      .map((item) => normalizeTheme(item))
      .filter((item): item is NormalizedSectorTheme => Boolean(item)),
    cycleSummary: normalizeBlankString(cycleView?.cycle_summary),
    cyclePosition: normalizeBlankString(cycleView?.cycle_position),
    cycleEvidence: toStringArray(cycleView?.cycle_evidence),
    whatImprovesNext: toStringArray(cycleView?.what_improves_next),
    whatBreaksTheSetup: toStringArray(cycleView?.what_breaks_the_setup),
    growthCatalysts: parseJsonArrayLike(row.growth_catalysts)
      .map((item) => normalizeCatalyst(item))
      .filter((item): item is NormalizedSectorCatalyst => Boolean(item)),
    policyWatch: parseJsonArrayLike(row.policy_watch)
      .map((item) => normalizePolicy(item))
      .filter((item): item is NormalizedSectorPolicy => Boolean(item)),
    coveredCompanies: parseJsonArrayLike(row.covered_companies)
      .map((item) => normalizeCoveredCompany(item))
      .filter((item): item is NormalizedSectorCoveredCompany => Boolean(item)),
    whatMattersNow: toStringArray(whatMatters?.what_matters_now),
    next12mWatchlist: toStringArray(whatMatters?.next_12m_watchlist),
    schemaHints: Array.from(schemaHints),
  };
}
