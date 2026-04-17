import type {
  CompanyIndustryAnalysisRow,
  NormalizedCompanyIndustryAnalysis,
  NormalizedIndustryCapitalCycle,
  NormalizedIndustryCompanyFit,
  NormalizedIndustryCompanyFitSubSector,
  NormalizedIndustryPlayerTypeCategory,
  NormalizedIndustryMarketSharePlayer,
  NormalizedIndustryMarketShareSnapshot,
  NormalizedIndustryPlayerTypeDimension,
  NormalizedIndustryPlayerTypePlayer,
  NormalizedIndustryPositioning,
  NormalizedIndustryRegulatoryChange,
  NormalizedIndustrySubSectorCard,
  NormalizedIndustryTheme,
  NormalizedIndustryTypesOfPlayers,
  NormalizedIndustryValueChainLayer,
  NormalizedIndustryValueChainMap,
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

const normalizeKey = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const toStringArray = (value: unknown) =>
  parseJsonArrayLike(value)
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));

const normalizePlayerTypeExamples = (value: unknown): string[] =>
  parseJsonArrayLike(value)
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));

const normalizePlayerTypeCategory = (
  value: unknown,
): NormalizedIndustryPlayerTypeCategory | null => {
  const record = parseJsonObjectLike(value);
  if (record) {
    const categoryName =
      asString(record.category_name) ??
      asString(record.category);
    if (!categoryName) return null;

    return {
      categoryName,
      categoryDescription:
        asString(record.category_description) ??
        asString(record.description) ??
        asString(record.category_detail),
      playerExamples: normalizePlayerTypeExamples(record.player_examples),
    };
  }

  const categoryName = asString(value);
  if (!categoryName) return null;

  return {
    categoryName,
    categoryDescription: null,
    playerExamples: [],
  };
};

const normalizeValueChainLayer = (value: unknown): NormalizedIndustryValueChainLayer | null => {
  const record = parseJsonObjectLike(value);
  const layerName = asString(record?.layer_name);
  if (!layerName) return null;

  return {
    layerName,
    layerDescription: asString(record?.layer_description),
    connectionToCompany:
      asString(record?.connection_to_company) ?? asString(record?.sub_sector_linkage),
    structuralCharacteristic: asString(record?.structural_characteristic),
  };
};

const buildIndustryEconomicsSummary = (
  positioningRecord: JsonRecord | null,
  valueChainRecord: JsonRecord | null,
) => {
  const synthesis = asString(valueChainRecord?.synthesis);
  const structureType =
    asString(positioningRecord?.value_chain_structure_type) ??
    asString(valueChainRecord?.structure_type);
  const classificationDimensions =
    toStringArray(positioningRecord?.classification_dimensions).length > 0
      ? toStringArray(positioningRecord?.classification_dimensions)
      : toStringArray(positioningRecord?.player_dimensions);

  const detailParts: string[] = [];
  if (structureType) {
    detailParts.push(`Value chain structure: ${formatCompactLabel(structureType)}.`);
  }
  if (classificationDimensions.length > 0) {
    detailParts.push(`Key player dimensions: ${formatList(classificationDimensions)}.`);
  }

  return [synthesis, detailParts.join(" ")]
    .filter((item): item is string => Boolean(item))
    .join(" ");
};

const normalizeValueChainMap = (
  rawValueChain: unknown,
  detailsRoot: JsonRecord | null,
  positioningRecord: JsonRecord | null,
  fallbackSummary: string | null,
): NormalizedIndustryValueChainMap | null => {
  const record =
    parseJsonObjectLike(rawValueChain) ?? parseJsonObjectLike(detailsRoot?.value_chain_map);
  const layers = parseJsonArrayLike(record?.layers)
    .map((item) => normalizeValueChainLayer(item))
    .filter((item): item is NormalizedIndustryValueChainLayer => Boolean(item));
  const structureType =
    asString(record?.structure_type) ??
    asString(positioningRecord?.value_chain_structure_type);
  const synthesis = asString(record?.synthesis) ?? fallbackSummary;

  if (!structureType && !synthesis && layers.length === 0) {
    return null;
  }

  return {
    structureType,
    synthesis,
    layers,
  };
};

const normalizeLegacyTypesOfPlayers = (detailsRoot: JsonRecord | null) => {
  const record = parseJsonObjectLike(detailsRoot?.classification_map);
  const dimensions = parseJsonArrayLike(record?.dimensions)
    .map((item) => parseJsonObjectLike(item))
    .filter((item): item is JsonRecord => Boolean(item))
    .map((dimensionRecord) => {
      const dimensionName = asString(dimensionRecord.dimension_name);
      if (!dimensionName) return null;

      return {
        dimensionName,
        dimensionExplanation: asString(dimensionRecord.dimension_explanation),
        categories: parseJsonArrayLike(dimensionRecord.categories)
          .map((item) => normalizePlayerTypeCategory(item))
          .filter((item): item is NormalizedIndustryPlayerTypeCategory => Boolean(item)),
        players: [] as NormalizedIndustryPlayerTypePlayer[],
      };
    })
    .filter((item): item is NormalizedIndustryPlayerTypeDimension => Boolean(item));

  return dimensions.length > 0 ? { dimensions } : null;
};

const normalizePlayerTypePlayer = (
  value: unknown,
): NormalizedIndustryPlayerTypePlayer | null => {
  const record = parseJsonObjectLike(value);
  const playerName = asString(record?.player_name);
  if (!playerName) return null;

  return {
    playerName,
    category: asString(record?.category),
    playerStatus: asString(record?.player_status),
    shareValue: asString(record?.share_value),
    shareIsEstimated: record?.share_is_estimated === true,
  };
};

const normalizePlayerTypeDimension = (
  value: unknown,
): NormalizedIndustryPlayerTypeDimension | null => {
  const record = parseJsonObjectLike(value);
  const dimensionName = asString(record?.dimension_name);
  if (!dimensionName) return null;

  return {
    dimensionName,
    dimensionExplanation: asString(record?.dimension_explanation),
    categories: parseJsonArrayLike(record?.categories)
      .map((item) => normalizePlayerTypeCategory(item))
      .filter((item): item is NormalizedIndustryPlayerTypeCategory => Boolean(item)),
    players: parseJsonArrayLike(record?.players)
      .map((item) => normalizePlayerTypePlayer(item))
      .filter((item): item is NormalizedIndustryPlayerTypePlayer => Boolean(item)),
  };
};

const normalizeTypesOfPlayers = (
  rawTypesOfPlayers: unknown,
  rawCompetition: unknown,
  detailsRoot: JsonRecord | null,
): NormalizedIndustryTypesOfPlayers | null => {
  const record =
    parseJsonObjectLike(rawTypesOfPlayers) ??
    parseJsonObjectLike(rawCompetition) ??
    parseJsonObjectLike(detailsRoot?.types_of_players);
  const dimensions = parseJsonArrayLike(record?.dimensions)
    .map((item) => normalizePlayerTypeDimension(item))
    .filter((item): item is NormalizedIndustryPlayerTypeDimension => Boolean(item));

  if (dimensions.length > 0) {
    return { dimensions };
  }

  return normalizeLegacyTypesOfPlayers(detailsRoot);
};

const normalizeCompanyFitSubSector = (
  value: unknown,
): NormalizedIndustryCompanyFitSubSector | null => {
  const record = parseJsonObjectLike(value);
  const subSector = asString(record?.sub_sector);
  if (!subSector) return null;

  return {
    subSector,
    description: asString(record?.description),
    relevanceRationale: asString(record?.relevance_rationale),
  };
};

const normalizeCompanyFit = (
  rawSubSectorIdentification: unknown,
  rawCompanyFit: unknown,
  detailsRoot: JsonRecord | null,
): NormalizedIndustryCompanyFit | null => {
  const record =
    parseJsonObjectLike(rawSubSectorIdentification) ??
    parseJsonObjectLike(rawCompanyFit) ??
    parseJsonObjectLike(detailsRoot?.sub_sector_identification);
  if (!record) return null;

  const qualifyingSubSectors = parseJsonArrayLike(record.qualifying_sub_sectors)
    .map((item) => normalizeCompanyFitSubSector(item))
    .filter((item): item is NormalizedIndustryCompanyFitSubSector => Boolean(item));
  const nonQualifyingNote = asString(record.non_qualifying_note);

  if (!nonQualifyingNote && qualifyingSubSectors.length === 0) {
    return null;
  }

  return {
    nonQualifyingNote,
    qualifyingSubSectors,
  };
};

const buildCompanyFitSummary = (
  companyFit: NormalizedIndustryCompanyFit | null,
  detailsRoot: JsonRecord | null,
) => {
  if (companyFit?.qualifyingSubSectors.length) {
    const summaries = companyFit.qualifyingSubSectors
      .map((item) => {
        const rationale = item.relevanceRationale ? `: ${item.relevanceRationale}` : "";
        return `${item.subSector}${rationale}`;
      })
      .slice(0, 3);

    return summaries.join(" ");
  }

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

  return summaries.join(" ");
};

const normalizeIndustryPositioning = (
  value: unknown,
  detailsRoot: JsonRecord | null,
  valueChainRecord: JsonRecord | null,
  valueChainMap: NormalizedIndustryValueChainMap | null,
  companyFitSummary: string | null,
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
    buildIndustryEconomicsSummary(record, valueChainRecord) ??
    valueChainMap?.synthesis ??
    null;
  const whereThisCompanyFits =
    asString(record?.where_this_company_fits) ?? companyFitSummary ?? null;

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
    industrySubSectorImpact: asString(record?.industry_sub_sector_impact),
    impactDirection: asLowerString(record?.impact_direction),
    subSectorScope: asString(record?.sub_sector_scope),
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
      asString(record?.why_it_matters_for_company) ??
      asString(record?.sub_sector_mechanism),
    timeHorizon: asString(record?.time_horizon),
    horizonBasis: asString(record?.horizon_basis),
  };
};

const normalizeCapitalCycle = (value: unknown): NormalizedIndustryCapitalCycle | null => {
  const record = parseJsonObjectLike(value);
  if (!record) return null;

  const stage = asString(record.stage);
  const direction = asString(record.direction);
  const supplySideRead = asString(record.supply_side_read);

  if (!stage && !direction && !supplySideRead) {
    return null;
  }

  return {
    stage,
    direction,
    supplySideRead,
  };
};

const normalizeMarketSharePlayer = (
  value: unknown,
): NormalizedIndustryMarketSharePlayer | null => {
  const record = parseJsonObjectLike(value);
  const playerName = asString(record?.player_name);
  if (!playerName) return null;

  return {
    playerName,
    shareValue: asString(record?.share_value),
    playerStatus: asString(record?.player_status),
    shareIsEstimated: record?.share_is_estimated === true,
  };
};

const normalizeMarketShareSnapshot = (
  value: unknown,
): NormalizedIndustryMarketShareSnapshot | null => {
  const record = parseJsonObjectLike(value);
  if (!record) return null;

  const players = parseJsonArrayLike(record.players)
    .map((item) => normalizeMarketSharePlayer(item))
    .filter((item): item is NormalizedIndustryMarketSharePlayer => Boolean(item));
  const shareBasis = asString(record.share_basis);
  const dataVintage = asString(record.data_vintage);

  if (!shareBasis && !dataVintage && players.length === 0) {
    return null;
  }

  return {
    shareBasis,
    dataVintage,
    players,
  };
};

const normalizeSubSectorCard = (
  value: unknown,
  relevanceMap: Map<string, NormalizedIndustryCompanyFitSubSector>,
): NormalizedIndustrySubSectorCard | null => {
  const record = parseJsonObjectLike(value);
  const subSector = asString(record?.sub_sector);
  if (!subSector) return null;

  const fitEntry = relevanceMap.get(normalizeKey(subSector)) ?? null;

  return {
    subSector,
    subSectorDescription: asString(record?.sub_sector_description),
    relevanceRationale: fitEntry?.relevanceRationale ?? null,
    capitalCycle: normalizeCapitalCycle(record?.capital_cycle),
    marketShareSnapshot: normalizeMarketShareSnapshot(record?.market_share_snapshot),
    tailwinds: parseJsonArrayLike(record?.tailwinds)
      .map((item) => normalizeTheme(item))
      .filter((item): item is NormalizedIndustryTheme => Boolean(item)),
    headwinds: parseJsonArrayLike(record?.headwinds)
      .map((item) => normalizeTheme(item))
      .filter((item): item is NormalizedIndustryTheme => Boolean(item)),
  };
};

const normalizeSubSectorCards = (
  rawSubSectorCards: unknown,
  rawProfitPools: unknown,
  detailsRoot: JsonRecord | null,
  companyFit: NormalizedIndustryCompanyFit | null,
) => {
  const relevanceMap = new Map(
    (companyFit?.qualifyingSubSectors ?? []).map((item) => [normalizeKey(item.subSector), item]),
  );

  const rawCards =
    parseJsonArrayLike(rawSubSectorCards).length > 0
      ? parseJsonArrayLike(rawSubSectorCards)
      : parseJsonArrayLike(rawProfitPools).length > 0
        ? parseJsonArrayLike(rawProfitPools)
        : parseJsonArrayLike(detailsRoot?.sub_sector_cards);

  const cards = rawCards
    .map((item) => normalizeSubSectorCard(item, relevanceMap))
    .filter((item): item is NormalizedIndustrySubSectorCard => Boolean(item));

  if (cards.length === 0) return [];
  if (relevanceMap.size === 0) return cards;

  const matchedCards = cards.filter((card) => relevanceMap.has(normalizeKey(card.subSector)));
  return matchedCards.length > 0 ? matchedCards : cards;
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
  if (parseJsonObjectLike(row.sub_sector_identification)) {
    schemaHints.add("sub_sector_identification_column");
  }
  if (parseJsonObjectLike(row.types_of_players)) schemaHints.add("types_of_players_column");
  if (parseJsonArrayLike(row.sub_sector_cards).length > 0) schemaHints.add("sub_sector_cards_column");
  if (parseJsonArrayLike(row.profit_pools).length > 0) schemaHints.add("profit_pools_column");
  if (parseJsonObjectLike(row.company_fit)) schemaHints.add("company_fit_column");
  if (parseJsonObjectLike(row.competition)) schemaHints.add("competition_column");
  if (parseJsonArrayLike(row.regulatory_changes).length > 0) schemaHints.add("regulatory_changes_column");
  if (parseJsonArrayLike(row.tailwinds).length > 0) schemaHints.add("tailwinds_column");
  if (parseJsonArrayLike(row.headwinds).length > 0) schemaHints.add("headwinds_column");
  if (normalizeSources(row.sources).length > 0) schemaHints.add("sources_column");

  const detailsRoot = parseJsonObjectLike(row.details);
  if (parseJsonObjectLike(detailsRoot?.sub_sector_identification)) {
    schemaHints.add("sub_sector_identification_details");
  }
  if (parseJsonObjectLike(detailsRoot?.types_of_players)) {
    schemaHints.add("types_of_players_details");
  }
  if (parseJsonArrayLike(detailsRoot?.sub_sector_cards).length > 0) {
    schemaHints.add("sub_sector_cards_details");
  }

  const detailsMetadataRoot = parseJsonObjectLike(detailsRoot?.details) ?? detailsRoot;
  const sourcesUsed = asString(detailsMetadataRoot?.sources_used);
  if (sourcesUsed) schemaHints.add(`sources_used:${sourcesUsed}`);
  const contextSource = asString(detailsMetadataRoot?.context_source);
  if (contextSource) schemaHints.add(`context_source:${contextSource}`);

  const positioningRecord = parseJsonObjectLike(row.industry_positioning);
  const valueChainRecord =
    parseJsonObjectLike(row.value_chain) ?? parseJsonObjectLike(detailsRoot?.value_chain_map);
  const companyFit = normalizeCompanyFit(
    row.sub_sector_identification,
    row.company_fit,
    detailsRoot,
  );
  const companyFitSummary = buildCompanyFitSummary(companyFit, detailsRoot);
  const valueChainMap = normalizeValueChainMap(
    row.value_chain,
    detailsRoot,
    positioningRecord,
    null,
  );
  const industryPositioning = normalizeIndustryPositioning(
    row.industry_positioning,
    detailsRoot,
    valueChainRecord,
    valueChainMap,
    companyFitSummary,
  );
  const typesOfPlayers = normalizeTypesOfPlayers(
    row.types_of_players,
    row.competition,
    detailsRoot,
  );
  const regulatoryChanges = parseJsonArrayLike(row.regulatory_changes)
    .map((item) => normalizeRegulatoryChange(item))
    .filter((item): item is NormalizedIndustryRegulatoryChange => Boolean(item));
  const subSectorCards = normalizeSubSectorCards(
    row.sub_sector_cards,
    row.profit_pools,
    detailsRoot,
    companyFit,
  );
  const tailwinds = parseJsonArrayLike(row.tailwinds)
    .map((item) => normalizeTheme(item))
    .filter((item): item is NormalizedIndustryTheme => Boolean(item));
  const headwinds = parseJsonArrayLike(row.headwinds)
    .map((item) => normalizeTheme(item))
    .filter((item): item is NormalizedIndustryTheme => Boolean(item));

  if (
    !industryPositioning &&
    !valueChainMap &&
    !typesOfPlayers &&
    !companyFit &&
    regulatoryChanges.length === 0 &&
    subSectorCards.length === 0 &&
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
    valueChainMap,
    typesOfPlayers,
    companyFit,
    regulatoryChanges,
    subSectorCards,
    tailwinds,
    headwinds,
    schemaHints: Array.from(schemaHints),
  };
}
