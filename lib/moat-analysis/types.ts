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
  present: boolean;
  evidence: string | null;
  greenwaldLabel: string | null;
};

export type NormalizedQuantitativeCheck = {
  roic: string | null;
  margins: string | null;
  marketShare: string | null;
  pricingPower: string | null;
};

export type NormalizedMoatAnalysis = {
  companyCode: string;
  companyName: string | null;
  industry: string | null;
  updatedAtRaw: string | null;
  moatRating: MoatRatingKey;
  moatRatingLabel: string;
  trajectory: string | null;
  trajectoryDirection: string | null;
  porterSummary: string | null;
  porterVerdict: string | null;
  moatPillars: NormalizedMoatPillar[];
  quantitativeCheck: NormalizedQuantitativeCheck | null;
  durability: string | null;
  risks: string[];
};
