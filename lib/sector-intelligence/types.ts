export type SectorIntelligenceRow = {
  sector: string;
  sub_sector?: string | null;
  generated_at?: string | null;
  source_mode?: string | null;
  sources?: unknown;
  sector_overview?: unknown;
  tailwinds?: unknown;
  headwinds?: unknown;
  cycle_view?: unknown;
  growth_catalysts?: unknown;
  policy_watch?: unknown;
  covered_companies?: unknown;
  what_matters_now?: unknown;
  details?: unknown;
};

export type NormalizedSectorEvidence = {
  note: string;
  source: string | null;
};

export type NormalizedSectorTheme = {
  theme: string;
  confidence: number | null;
  impactArea: string | null;
  timeHorizon: string | null;
  whyItMatters: string | null;
  evidence: NormalizedSectorEvidence[];
};

export type NormalizedSectorCatalyst = {
  type: string | null;
  catalyst: string;
  confidence: number | null;
  timeHorizon: string | null;
  whyItMatters: string | null;
  expectedImpact: string | null;
  evidence: NormalizedSectorEvidence[];
};

export type NormalizedSectorPolicy = {
  policyName: string;
  status: string | null;
  timeline: string | null;
  sectorEffect: string | null;
  whoBenefits: string | null;
  whoIsAtRisk: string | null;
  evidence: NormalizedSectorEvidence[];
};

export type NormalizedSectorCoveredCompany = {
  companyCode: string;
  companyName: string;
  subSector: string | null;
  latestGrowthScore: number | null;
  latestSentimentScore: number | null;
  businessModelQuality: string | null;
  strategyStrengthProxy: string | null;
  positioningSummary: string | null;
};

export type NormalizedSectorIntelligence = {
  sector: string;
  subSector: string | null;
  generatedAtRaw: string | null;
  generatedAtLabel: string | null;
  sourceMode: string | null;
  sourceUrls: string[];
  sectorDefinition: string | null;
  sectorSummaryShort: string | null;
  sectorSummaryLong: string | null;
  whatDrivesEarnings: string[];
  valueChainMap: string[];
  tailwinds: NormalizedSectorTheme[];
  headwinds: NormalizedSectorTheme[];
  cycleSummary: string | null;
  cyclePosition: string | null;
  cycleEvidence: string[];
  whatImprovesNext: string[];
  whatBreaksTheSetup: string[];
  growthCatalysts: NormalizedSectorCatalyst[];
  policyWatch: NormalizedSectorPolicy[];
  coveredCompanies: NormalizedSectorCoveredCompany[];
  whatMattersNow: string[];
  next12mWatchlist: string[];
  schemaHints: string[];
};
