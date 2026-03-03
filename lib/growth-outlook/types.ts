export type NormalizedGrowthEvidenceLine = {
  meta: string;
  text: string;
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
  drivers: string[];
  risks: string[];
};

export type NormalizedGrowthOutlook = {
  growthScore: number | null;
  visibilityPercent: number | null;
  updatedAtRaw: string | null;
  catalysts: NormalizedGrowthCatalyst[];
  variantPerception: NormalizedGrowthVariantPerception | null;
  scenarios: {
    base: NormalizedGrowthScenario | null;
    upside: NormalizedGrowthScenario | null;
    downside: NormalizedGrowthScenario | null;
  } | null;
};
