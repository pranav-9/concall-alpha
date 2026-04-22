export type MoatAnalysisRow = {
  id?: number;
  company_code: string;
  company_name?: string | null;
  industry?: string | null;
  rating?: string | null;
  gatekeeper_answer?: string | null;
  cycle_tested?: boolean | null;
  assessment_payload?: unknown;
  assessment_version?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MoatRatingKey =
  | "wide_moat"
  | "narrow_moat"
  | "no_moat"
  | "moat_at_risk"
  | "unknown";

export type NormalizedMoatSource = {
  sourceType: string;
  subcategory: string | null;
  applies: boolean;
  presenceStrength: string | null;
  durability: string | null;
  doesNotApplyReason: string | null;
};

export type NormalizedMoatGatekeeper = {
  answer: string | null;
  answerLabel: string | null;
  note: string | null;
};

export type NormalizedMoatFinancialCheck = {
  cycleTested: boolean | null;
  roicVsWacc: string | null;
  note: string | null;
};

export type NormalizedMoatAnalysis = {
  companyCode: string;
  companyName: string | null;
  industry: string | null;
  updatedAtRaw: string | null;
  assessmentVersion: string | null;
  schemaVersion: string | null;
  moatRating: MoatRatingKey;
  moatRatingLabel: string;
  call: string | null;
  reasoning: string | null;
  sources: NormalizedMoatSource[];
  gatekeeper: NormalizedMoatGatekeeper | null;
  financialCheck: NormalizedMoatFinancialCheck | null;
  whatWouldChangeTheCall: string[];
  cycleTested: boolean | null;
};
