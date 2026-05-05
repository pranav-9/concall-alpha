import { z } from "zod";

// ---------------------------------------------------------------------------
// Database row shape — unchanged from v14, since the moat_analysis table
// schema didn't change. v15 is a payload-shape change inside assessment_payload.
// ---------------------------------------------------------------------------

export type MoatAnalysisRow = {
  id?: number;
  company_code: string;
  company_name?: string | null;
  industry?: string | null;
  rating?: string | null;
  tier?: string | null;
  gatekeeper_answer?: string | null;
  cycle_tested?: boolean | null;
  assessment_payload?: unknown;
  assessment_version?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// ---------------------------------------------------------------------------
// Display enums consumed by rank.ts, tier-class.ts, leaderboards, etc.
// These are derived from the promoted DB columns (rating, tier) and don't
// change between v14 and v15.
// ---------------------------------------------------------------------------

export type MoatRatingKey =
  | "wide_moat"
  | "narrow_moat"
  | "no_moat"
  | "moat_at_risk"
  | "unknown";

export type MoatTier = "strong" | "mid" | "weak";

// ---------------------------------------------------------------------------
// v15 schema — zod validators that double as TypeScript type sources.
// Mirrors schemas/moat_analysis_v15.json. The runtime validator at
// normalize.ts uses these to parse the assessment_payload JSONB.
// ---------------------------------------------------------------------------

const TIER_ANCHOR_PHRASES = [
  "at the very best end",
  "at the strong end",
  "at the better end",
  "at the highest end",
  "at the moderate-to-strong end",
  "at the moderate-to-high end",
  "at the moderate end",
  "at the middle of the bracket",
  "at the moderate-to-low end",
  "at the low end",
  "at the weakest end",
] as const;

const SOURCE_TYPES = [
  "Intangible Assets",
  "Switching Costs",
  "Network Effects",
  "Cost Advantages",
] as const;

const SUBCATEGORIES = [
  "Brand",
  "Patent",
  "Regulatory licence",
  "Workflow integration",
  "Retraining costs",
  "Financial or contractual exit costs",
  "Relationship lock-in",
  "Same-side",
  "Cross-side / two-sided",
  "Local vs global",
  "Process-based",
  "Location-based",
  "Scale-based",
  "Unique asset",
] as const;

export const v15Step0Schema = z.object({
  posture: z.enum([
    "Confirmed excess returns",
    "Mediocre excess returns",
    "Untested excess returns",
  ]),
  tier_anchor_phrase: z.enum(TIER_ANCHOR_PHRASES),
  headline: z.string().min(1).max(140),
  evidence: z.array(z.string().min(1).max(200)).min(2).max(3),
});

export const v15SourceSchema = z.object({
  source_type: z.enum(SOURCE_TYPES),
  subcategory: z.enum(SUBCATEGORIES).nullable(),
  applies: z.boolean(),
  does_not_apply_reason: z.string().max(200).nullable(),
  presence: z.array(z.string().min(1).max(200)).max(3).nullable(),
  durability: z.array(z.string().min(1).max(200)).max(2).nullable(),
});

export const v15GatekeeperSchema = z.object({
  answer: z.enum(["clearly_no", "probably_not_situational", "yes"]),
  barrier_strength: z.enum(["strong", "moderate", "weak", "none"]),
  attackers: z.array(z.string().min(1).max(60)).min(1).max(4),
  rationale: z.string().min(1).max(200),
});

export const v15FinancialCheckSchema = z.object({
  cycle_tested: z.boolean(),
  data_limitations: z.array(z.string().min(1).max(200)).max(3),
});

export const v15MoatAnalysisSchema = z.object({
  version: z.literal("v15"),
  name: z.string().min(1).max(255),
  ticker: z.string().min(1).max(50),
  industry: z.string().min(1).max(255),
  call: z.enum(["WIDE MOAT", "NARROW MOAT", "NO MOAT"]),
  tier: z.enum(["STRONG", "MID", "WEAK"]),
  headline: z.string().min(1).max(140),
  step_0: v15Step0Schema,
  sources: z.array(v15SourceSchema).length(4),
  why_this_tier: z.array(z.string().min(1).max(200)).min(2).max(4),
  gatekeeper: v15GatekeeperSchema,
  what_would_change_the_call: z.array(z.string().min(1).max(250)).min(2).max(3),
  financial_check: v15FinancialCheckSchema,
});

// Inferred TypeScript types (single source of truth — derived from zod).
export type V15Step0 = z.infer<typeof v15Step0Schema>;
export type V15Source = z.infer<typeof v15SourceSchema>;
export type V15Gatekeeper = z.infer<typeof v15GatekeeperSchema>;
export type V15FinancialCheck = z.infer<typeof v15FinancialCheckSchema>;
export type V15MoatAnalysis = z.infer<typeof v15MoatAnalysisSchema>;

// ---------------------------------------------------------------------------
// Normalized moat analysis — what the portal renderer consumes.
//
// Shape contract:
//   - The `moatRating`, `moatTier`, `moatRatingLabel`, `industry`,
//     `companyCode`, `companyName`, `updatedAtRaw`, `cycleTested`,
//     `assessmentVersion` fields are derived from the promoted DB columns
//     and exist regardless of payload validity. Leaderboard / sector /
//     watchlist / hero-rail consumers use only these fields and don't care
//     whether the assessment_payload is well-formed.
//
//   - `payload` carries the v15-validated assessment when available, or
//     `null` when the assessment_payload doesn't conform to v15. The
//     renderer reads `payload` for the detailed moat block, and shows a
//     "deprecated v14 schema — regenerate to view" notice when it's null.
//
//   - `schemaStatus` tells the renderer which path to take: 'v15' for
//     well-formed v15, 'deprecated' for payloads that exist but don't
//     conform (e.g. v14 prose-shaped legacy entries), 'missing' when no
//     assessment_payload exists at all.
// ---------------------------------------------------------------------------

export type NormalizedMoatSchemaStatus = "v15" | "deprecated" | "missing";

export type NormalizedMoatAnalysis = {
  // DB-column-derived fields (always present, regardless of payload validity)
  companyCode: string;
  companyName: string | null;
  industry: string | null;
  updatedAtRaw: string | null;
  assessmentVersion: string | null;
  moatRating: MoatRatingKey;
  moatRatingLabel: string;
  moatTier: MoatTier | null;
  cycleTested: boolean | null;

  // v15-payload-derived fields (null when payload is deprecated/missing)
  payload: V15MoatAnalysis | null;
  schemaStatus: NormalizedMoatSchemaStatus;

  // Derived counts — used by leaderboard / hero-rail to summarise the moat
  // sources without needing the full payload. Available even when payload
  // is deprecated by reading from the row directly.
  appliesSourceCount: number;
  totalSourceCount: number;
};
