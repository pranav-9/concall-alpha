export type NormalizedGrowthEvidenceLine = {
  meta: string;
  text: string;
};

export type NormalizedGrowthSourceFile = {
  fy: string | null;
  kind: string | null;
  quarter: string | null;
  sourceUrl: string | null;
};

export type NormalizedGrowthTimelineItem = {
  stage: string | null;
  period: string | null;
  source: string | null;
  quote: string | null;
  delta: string | null;
};

export type NormalizedGrowthCatalyst = {
  type: string | null;
  timing: string | null;
  catalyst: string | null;
  expectedImpact: string | null;
  quantified: {
    unit: string | null;
    value: string | number | null;
  } | null;
  timelineItems: NormalizedGrowthTimelineItem[];
  evidenceLines: NormalizedGrowthEvidenceLine[];
  priority: {
    impactScore: number | null;
    timeRelevance: number | null;
    certaintyScore: number | null;
    progressionDepth: number | null;
    weightedPriority: number | null;
  } | null;
  investibilityChecks: {
    adoption: string | null;
    feasibility: string | null;
    entryTiming: string | null;
    unitEconomics: string | null;
  } | null;
};

export type NormalizedGrowthVariantPerception = {
  consensus: string | null;
  upside: string[];
  downside: string[];
};

export type NormalizedGrowthScenario = {
  confidence: number | null;
  growth: string | null;
  ebitdaMargin: string | null;
  summary: string | null;
  riskWatch: string | null;
  drivers: string[];
  risks: string[];
};

export type NormalizedGrowthOutlook = {
  companyName: string | null;
  schemaVersion: string | null;
  fiscalYear: string | null;
  horizonQuarters: number | null;
  horizonYears: number | null;
  growthScore: number | null;
  visibilityPercent: number | null;
  baseGrowthPct: string | null;
  upsideGrowthPct: string | null;
  downsideGrowthPct: string | null;
  summaryBullets: string[];
  growthScoreFormula: string | null;
  growthScoreSteps: string[];
  visibilityRationale: string | null;
  updatedAtRaw: string | null;
  factBase: NormalizedGrowthEvidenceLine[];
  sourceFiles: NormalizedGrowthSourceFile[];
  catalysts: NormalizedGrowthCatalyst[];
  variantPerception: NormalizedGrowthVariantPerception | null;
  scenarios: {
    base: NormalizedGrowthScenario | null;
    upside: NormalizedGrowthScenario | null;
    downside: NormalizedGrowthScenario | null;
  } | null;
};
