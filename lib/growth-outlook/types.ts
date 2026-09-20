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
  statusTag: string | null;
  expectedImpact: string | null;
  whyItMatters: string | null;
  whatIsChanging: string | null;
  pillConfidence: string | null;
  pillDependency: string | null;
  pillMarginImpact: string | null;
  pillRevenueImpact: string | null;
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

export type NormalizedGrowthScenario = {
  confidence: number | null;
  /** Revenue growth over the horizon (issuer-guided read), e.g. "18-22%". */
  growth: string | null;
  /**
   * Earnings growth bridged from `growth` through the issuer's margin path
   * (Phase 5 v8, app/phase5_growth/earnings_ladder.py). Equals `growth` when
   * `earningsBasis` is "flat_margin". Under "derived_from_guidance" it is the
   * derived EPS growth and `growth` the derived revenue growth. Null on pre-v8 rows.
   */
  earningsGrowth: string | null;
  /**
   * guided_margin_<metric> | flat_margin | loss_making | implausible_margin_path
   * | derived_from_guidance (earnings derived from guided volume / unit economics
   * when the issuer guides no margin). Not whitelisted here: display decisions go
   * through lib/growth-outlook/earnings-display.ts, which shows nothing for a
   * basis it does not recognise.
   */
  earningsBasis: string | null;
  /** The margin-path metric's margin at the horizon under this scenario, e.g. "19-20%". Null under "derived_from_guidance". */
  marginAtHorizon: string | null;
  /**
   * The assumptions behind a derived earnings figure, one line (<=160 chars), e.g.
   * "Volume +15% a year; EBITDA per kg held; 17% tax". Written with
   * "derived_from_guidance" scenarios (null on the rest); only those print it.
   */
  earningsAssumption: string | null;
  summary: string | null;
  riskWatch: string | null;
  drivers: string[];
  risks: string[];
};

/** Issuer-reported current margin + own guided band for ONE metric (Phase 5 v8, details.margin_path). */
export type NormalizedGrowthMarginPath = {
  metric: string | null;
  currentPct: number | null;
  currentPeriod: string | null;
  currentSnippet: string | null;
  guidedPct: string | null;
  guidedPeriod: string | null;
  guidedSnippet: string | null;
  direction: "expanding" | "stable" | "compressing" | "unknown" | null;
};

/** Summary of the revenue -> earnings bridge (Phase 5 v8, details.earnings_ladder). */
export type NormalizedGrowthEarningsLadder = {
  basis: string | null;
  metric: string | null;
  currentMarginPct: number | null;
  horizonYearsUsed: number | null;
  note: string | null;
};

export type NormalizedGrowthScoreComponent = {
  key: string;
  score: number;
};

export type NormalizedGrowthDiscoverySummary = {
  selectedCount: number | null;
  totalCandidatesConsidered: number | null;
  selectionPriorityStack: string | null;
};

export type NormalizedGrowthAlsoConsidered = {
  catalyst: string | null;
  currentStage: string | null;
  whyNotTop3: string | null;
};

export type NormalizedGrowthOutlook = {
  companyName: string | null;
  schemaVersion: string | null;
  fiscalYear: string | null;
  horizonQuarters: number | null;
  horizonYears: number | null;
  growthScore: number | null;
  baseGrowthPct: string | null;
  upsideGrowthPct: string | null;
  downsideGrowthPct: string | null;
  summaryBullets: string[];
  growthScoreFormula: string | null;
  growthScoreSteps: string[];
  updatedAtRaw: string | null;
  growthScoreComponents: NormalizedGrowthScoreComponent[];
  discoverySummary: NormalizedGrowthDiscoverySummary | null;
  alsoConsideredNote: string | null;
  alsoConsidered: NormalizedGrowthAlsoConsidered[];
  factBase: NormalizedGrowthEvidenceLine[];
  sourceFiles: NormalizedGrowthSourceFile[];
  catalysts: NormalizedGrowthCatalyst[];
  scenarios: {
    base: NormalizedGrowthScenario | null;
    upside: NormalizedGrowthScenario | null;
    downside: NormalizedGrowthScenario | null;
  } | null;
  marginPath: NormalizedGrowthMarginPath | null;
  earningsLadder: NormalizedGrowthEarningsLadder | null;
};
