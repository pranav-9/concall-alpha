export type CompanyIndustryAnalysisDetailsPayload = {
  industry_overview?: unknown;
  sub_sector_identification?: unknown;
  types_of_players?: unknown;
  sub_sector_cards?: unknown;
  value_chain_map?: unknown;
  classification_map?: unknown;
  sources_used?: unknown;
  context_source?: unknown;
  details?: unknown;
  [key: string]: unknown;
};

export type CompanyIndustryAnalysisRow = {
  company: string;
  generated_at?: string | null;
  sector?: string | null;
  sub_sector?: string | null;
  industry_positioning?: unknown;
  value_chain?: unknown;
  sub_sector_identification?: unknown;
  types_of_players?: unknown;
  sub_sector_cards?: unknown;
  profit_pools?: unknown;
  company_fit?: unknown;
  competition?: unknown;
  regulatory_changes?: unknown;
  tailwinds?: unknown;
  headwinds?: unknown;
  sources?: unknown;
  details?: CompanyIndustryAnalysisDetailsPayload | string | null;
};

export type NormalizedIndustryPositioning = {
  customerNeed: string | null;
  industryEconomicsForCompany: string | null;
  whereThisCompanyFits: string | null;
};

export type NormalizedIndustryValueChainEvidence = {
  note: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourceDate: string | null;
  retrievalType: string | null;
};

export type NormalizedIndustryValueChainTopParticipant = {
  name: string;
  listedStatus: string | null;
  identifierClause: string | null;
};

export type NormalizedIndustryValueChainMarginProfile = {
  basis: string | null;
  rangeOrLabel: string | null;
  dispersionNote: string | null;
  sourcingRationale: string | null;
};

export type NormalizedIndustryValueChainLayer = {
  layerName: string;
  revenueModel: string | null;
  topParticipants: NormalizedIndustryValueChainTopParticipant[];
  marginReturnProfile: NormalizedIndustryValueChainMarginProfile | null;
  evidence: NormalizedIndustryValueChainEvidence[];
  layerDescription: string | null;
  connectionToCompany: string | null;
  structuralCharacteristic: string | null;
};

export type NormalizedIndustryValueChainPinchPoint = {
  name: string;
  mechanism: string | null;
};

export type NormalizedIndustryValueChainMap = {
  structureType: string | null;
  chainTypeRationale: string | null;
  synthesis: string | null;
  pinchPoints: NormalizedIndustryValueChainPinchPoint[];
  layers: NormalizedIndustryValueChainLayer[];
};

export type NormalizedIndustryClassificationCategory = {
  category: string;
  description: string | null;
  isCompanyPosition: boolean;
};

export type NormalizedIndustryClassificationDimension = {
  dimensionName: string;
  dimensionExplanation: string | null;
  implication: string | null;
  categories: NormalizedIndustryClassificationCategory[];
};

export type NormalizedIndustryClassificationMap = {
  dimensions: NormalizedIndustryClassificationDimension[];
};

export type NormalizedIndustryPlayerTypePlayer = {
  playerName: string;
  category: string | null;
  playerStatus: string | null;
  shareValue: string | null;
  shareIsEstimated: boolean;
};

export type NormalizedIndustryPlayerTypeCategory = {
  categoryName: string;
  categoryDescription: string | null;
  playerExamples: string[];
};

export type NormalizedIndustryPlayerTypeDimension = {
  dimensionName: string;
  dimensionExplanation: string | null;
  categories: NormalizedIndustryPlayerTypeCategory[];
  players: NormalizedIndustryPlayerTypePlayer[];
};

export type NormalizedIndustryTypesOfPlayers = {
  dimensions: NormalizedIndustryPlayerTypeDimension[];
};

export type NormalizedIndustryRegulatoryChange = {
  change: string;
  period: string | null;
  whatChanged: string | null;
  companyImpactMechanism: string | null;
  industrySubSectorImpact: string | null;
  impactDirection: string | null;
  subSectorScope: string | null;
};

export type NormalizedIndustryTheme = {
  theme: string;
  companyMechanism: string | null;
  timeHorizon: string | null;
  horizonBasis: string | null;
};

export type NormalizedIndustryCompanyFitSubSector = {
  subSector: string;
  description: string | null;
  relevanceRationale: string | null;
};

export type NormalizedIndustryCompanyFit = {
  nonQualifyingNote: string | null;
  qualifyingSubSectors: NormalizedIndustryCompanyFitSubSector[];
};

export type NormalizedIndustryCapitalCycle = {
  stage: string | null;
  direction: string | null;
  supplySideRead: string | null;
};

export type NormalizedIndustryMarketSharePlayer = {
  playerName: string;
  shareValue: string | null;
  playerStatus: string | null;
  shareIsEstimated: boolean;
};

export type NormalizedIndustryMarketShareSnapshot = {
  shareBasis: string | null;
  dataVintage: string | null;
  players: NormalizedIndustryMarketSharePlayer[];
};

export type NormalizedIndustrySupplySideEvidenceItem = {
  note: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourceDate: string | null;
  retrievalType: string | null;
};

export type NormalizedIndustrySupplySideEvidencePackRow = {
  category: string | null;
  summary: string | null;
  proxyLabel: string | null;
  evidence: NormalizedIndustrySupplySideEvidenceItem[];
};

export type NormalizedIndustrySupplySideEvidencePack = {
  interpretation: string | null;
  evidenceConfidence: string | null;
  evidenceWindowYears: number | null;
  rows: NormalizedIndustrySupplySideEvidencePackRow[];
};

export type NormalizedIndustrySubSectorCard = {
  subSector: string;
  subSectorDescription: string | null;
  relevanceRationale: string | null;
  capitalCycle: NormalizedIndustryCapitalCycle | null;
  marketShareSnapshot: NormalizedIndustryMarketShareSnapshot | null;
  tailwinds: NormalizedIndustryTheme[];
  headwinds: NormalizedIndustryTheme[];
  supplySideEvidencePack: NormalizedIndustrySupplySideEvidencePack | null;
};

export type NormalizedCompanyIndustryAnalysis = {
  company: string;
  sector: string | null;
  subSector: string | null;
  generatedAtRaw: string | null;
  generatedAtLabel: string | null;
  sourceUrls: string[];
  industryPositioning: NormalizedIndustryPositioning | null;
  valueChainMap: NormalizedIndustryValueChainMap | null;
  typesOfPlayers: NormalizedIndustryTypesOfPlayers | null;
  companyFit: NormalizedIndustryCompanyFit | null;
  regulatoryChanges: NormalizedIndustryRegulatoryChange[];
  subSectorCards: NormalizedIndustrySubSectorCard[];
  tailwinds: NormalizedIndustryTheme[];
  headwinds: NormalizedIndustryTheme[];
  schemaHints: string[];
};
