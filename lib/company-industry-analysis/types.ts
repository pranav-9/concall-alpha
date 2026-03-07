export type CompanyIndustryAnalysisRow = {
  company: string;
  generated_at?: string | null;
  sector?: string | null;
  sub_sector?: string | null;
  industry_positioning?: unknown;
  value_chain?: unknown;
  profit_pools?: unknown;
  company_fit?: unknown;
  competition?: unknown;
  tailwinds?: unknown;
  headwinds?: unknown;
  sources?: unknown;
  details?: unknown;
};

export type NormalizedIndustryPositioning = {
  industrySummary: string | null;
  whereThisCompanyFits: string | null;
  whyThisIndustryExists: string | null;
};

export type NormalizedIndustryValueChain = {
  stages: string[];
  companyRole: string | null;
  companyStage: string | null;
};

export type NormalizedIndustryProfitPool = {
  pool: string;
  whoCapturesIt: string | null;
  companyExposure: string | null;
  whyItIsProfitable: string | null;
};

export type NormalizedIndustryCompanyFit = {
  businessModelPosition: string | null;
  advantagesInContext: string[];
  constraintsInContext: string[];
};

export type NormalizedIndustryCompetition = {
  name: string;
  type: string | null;
  whyItMatters: string | null;
  comparisonBasis: string | null;
};

export type NormalizedIndustryTheme = {
  theme: string;
  timeHorizon: string | null;
  whyItMattersForCompany: string | null;
};

export type NormalizedCompanyIndustryAnalysis = {
  company: string;
  sector: string | null;
  subSector: string | null;
  generatedAtRaw: string | null;
  generatedAtLabel: string | null;
  sourceUrls: string[];
  industryPositioning: NormalizedIndustryPositioning | null;
  valueChain: NormalizedIndustryValueChain | null;
  profitPools: NormalizedIndustryProfitPool[];
  companyFit: NormalizedIndustryCompanyFit | null;
  competition: NormalizedIndustryCompetition[];
  tailwinds: NormalizedIndustryTheme[];
  headwinds: NormalizedIndustryTheme[];
  schemaHints: string[];
};
