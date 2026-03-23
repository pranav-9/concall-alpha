export type CompanyIndustryAnalysisRow = {
  company: string;
  generated_at?: string | null;
  sector?: string | null;
  sub_sector?: string | null;
  industry_positioning?: unknown;
  regulatory_changes?: unknown;
  tailwinds?: unknown;
  headwinds?: unknown;
  sources?: unknown;
  details?: unknown;
};

export type NormalizedIndustryPositioning = {
  customerNeed: string | null;
  industryEconomicsForCompany: string | null;
  whereThisCompanyFits: string | null;
};

export type NormalizedIndustryRegulatoryChange = {
  change: string;
  period: string | null;
  whatChanged: string | null;
  companyImpactMechanism: string | null;
  impactDirection: string | null;
};

export type NormalizedIndustryTheme = {
  theme: string;
  companyMechanism: string | null;
  timeHorizon: string | null;
  horizonBasis: string | null;
};

export type NormalizedCompanyIndustryAnalysis = {
  company: string;
  sector: string | null;
  subSector: string | null;
  generatedAtRaw: string | null;
  generatedAtLabel: string | null;
  sourceUrls: string[];
  industryPositioning: NormalizedIndustryPositioning | null;
  regulatoryChanges: NormalizedIndustryRegulatoryChange[];
  tailwinds: NormalizedIndustryTheme[];
  headwinds: NormalizedIndustryTheme[];
  schemaHints: string[];
};
