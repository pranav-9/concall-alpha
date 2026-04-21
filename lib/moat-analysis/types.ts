export type MoatAnalysisRow = {
  id?: number;
  company_code: string;
  company_name?: string | null;
  industry?: string | null;
  rating?: string | null;
  trajectory?: string | null;
  trajectory_direction?: string | null;
  porter_summary?: string | null;
  porter_verdict?: string | null;
  moats?: unknown;
  quantitative?: unknown;
  durability?: string | null;
  risks?: unknown;
  assessment_payload?: unknown;
  assessment_version?: string | null;
  moat_score?: number | string | null;
  strength_score?: number | string | null;
  durability_score?: number | string | null;
  block_1_rating_card?: unknown;
  block_2_industry_structure?: unknown;
  block_3_moat_sources?: unknown;
  block_4_quantitative_test?: unknown;
  block_5_durability?: unknown;
  block_6_moat_erosion_risks?: unknown;
  derived_scores?: unknown;
  source_payload?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MoatRatingKey =
  | "wide_moat"
  | "narrow_moat"
  | "no_moat"
  | "moat_at_risk"
  | "unknown";

export type NormalizedMoatPillar = {
  type: string;
  sourceType: string | null;
  subcategory: string | null;
  status: string | null;
  present: boolean;
  score: number | null;
  evidence: string | null;
  greenwaldLabel: string | null;
};

export type NormalizedQuantitativeCheck = {
  basis: string | null;
  roic: string | null;
  margins: string | null;
  marketShare: string | null;
  pricingPower: string | null;
  overallVerdict: string | null;
  marginCharacter: string | null;
};

export type NormalizedMoatRisk = {
  trigger: string | null;
  mechanism: string | null;
  sourceType: string | null;
};

export type NormalizedMoatSourceStability = {
  stability: string | null;
  assessment: string | null;
  compounding: string | null;
  sourceType: string | null;
};

export type NormalizedMoatTrajectoryEvidence = {
  signal: string | null;
  dateHint: string | null;
  direction: string | null;
};

export type NormalizedMoatThreatAttacker = {
  name: string | null;
  capability: string | null;
  motivation: string | null;
  credibility: string | null;
  capitalPosition: string | null;
};

export type NormalizedMoatThreatIntensity = {
  level: string | null;
  paragraph: string | null;
  attackers: NormalizedMoatThreatAttacker[];
};

export type NormalizedMoatDurabilityBlock = {
  synthesis: string | null;
  sourceStability: NormalizedMoatSourceStability[];
  trajectoryEvidence: NormalizedMoatTrajectoryEvidence[];
  competitiveThreatIntensity: NormalizedMoatThreatIntensity | null;
};

export type NormalizedMoatIndustryStructure = {
  summary: string | null;
  verdict: string | null;
  included: boolean | null;
};

export type NormalizedMoatAnalysis = {
  companyCode: string;
  companyName: string | null;
  industry: string | null;
  updatedAtRaw: string | null;
  assessmentVersion: string | null;
  schemaVersion: string | null;
  moatScore: number | null;
  strengthScore: number | null;
  durabilityScore: number | null;
  moatRating: MoatRatingKey;
  moatRatingLabel: string;
  trajectory: string | null;
  trajectoryDirection: string | null;
  assessmentSummary: string | null;
  porterSummary: string | null;
  porterVerdict: string | null;
  industryStructure: NormalizedMoatIndustryStructure | null;
  moatPillars: NormalizedMoatPillar[];
  quantitativeCheck: NormalizedQuantitativeCheck | null;
  durability: string | null;
  durabilityDetails: NormalizedMoatDurabilityBlock | null;
  moatRisks: NormalizedMoatRisk[];
  risks: string[];
};
