import type {
  MoatAnalysisRow,
  MoatRatingKey,
  MoatTier,
  NormalizedMoatAnalysis,
  NormalizedMoatSchemaStatus,
  V15MoatAnalysis,
} from "./types";
import { v15MoatAnalysisSchema } from "./types";

// ---------------------------------------------------------------------------
// Promoted-column normalizers (rating, tier — used by leaderboard / sector /
// watchlist / hero-rail / company-page badges, regardless of payload validity)
// ---------------------------------------------------------------------------

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const RATING_MAP: Record<string, { key: MoatRatingKey; label: string }> = {
  "wide moat": { key: "wide_moat", label: "Wide Moat" },
  "narrow moat": { key: "narrow_moat", label: "Narrow Moat" },
  "no moat": { key: "no_moat", label: "No Moat" },
  "moat at risk": { key: "moat_at_risk", label: "Moat at Risk" },
};

const asMoatRating = (value: unknown): { key: MoatRatingKey; label: string } => {
  const raw = asString(value)?.toLowerCase().trim();
  if (!raw) return { key: "unknown", label: "Unknown" };
  const mapped = RATING_MAP[raw];
  if (mapped) return mapped;
  for (const [pattern, result] of Object.entries(RATING_MAP)) {
    if (raw.includes(pattern) || pattern.includes(raw)) return result;
  }
  return { key: "unknown", label: asString(value) ?? "Unknown" };
};

const TIER_MAP: Record<string, MoatTier> = {
  strong: "strong",
  mid: "mid",
  medium: "mid",
  weak: "weak",
};

const asMoatTier = (value: unknown): MoatTier | null => {
  const raw = asString(value)?.toLowerCase().trim();
  if (!raw) return null;
  return TIER_MAP[raw] ?? null;
};

// ---------------------------------------------------------------------------
// Payload validation — runtime-validate assessment_payload against v15
// schema. JSONB columns can arrive as either parsed objects or stringified
// JSON depending on the Supabase client; handle both.
// ---------------------------------------------------------------------------

const parsePayloadValue = (value: unknown): unknown => {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

const validateV15Payload = (
  raw: unknown,
): { payload: V15MoatAnalysis | null; status: NormalizedMoatSchemaStatus } => {
  const parsed = parsePayloadValue(raw);
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { payload: null, status: "missing" };
  }
  const result = v15MoatAnalysisSchema.safeParse(parsed);
  if (result.success) {
    return { payload: result.data, status: "v15" };
  }
  return { payload: null, status: "deprecated" };
};

// ---------------------------------------------------------------------------
// Public normalizer
// ---------------------------------------------------------------------------

export function normalizeMoatAnalysis(
  row: MoatAnalysisRow | null | undefined,
): NormalizedMoatAnalysis | null {
  if (!row) return null;

  const ratingSource = row.rating ?? null;
  const { key: moatRating, label: moatRatingLabel } = asMoatRating(ratingSource);
  const moatTier = asMoatTier(row.tier ?? null);
  const cycleTestedRow =
    typeof row.cycle_tested === "boolean" ? row.cycle_tested : null;

  const { payload, status } = validateV15Payload(row.assessment_payload);

  // Take cycle_tested from the v15 payload's financial_check when present
  // (it's the canonical source); fall back to the promoted column when the
  // payload is deprecated.
  const cycleTested = payload?.financial_check.cycle_tested ?? cycleTestedRow;

  // Use payload-side industry/name/ticker when available; fall back to
  // promoted columns for deprecated payloads.
  const industry = payload?.industry ?? asString(row.industry);
  const companyName = payload?.name ?? asString(row.company_name);

  // Derived source counts — summarise the four moat sources for leaderboard
  // / hero-rail display without forcing those consumers to walk the payload.
  // For v15 payloads this is exact; for deprecated payloads we don't know
  // and report 0 (the consumer treats it as missing data).
  const appliesSourceCount = payload
    ? payload.sources.filter((s) => s.applies).length
    : 0;
  const totalSourceCount = payload ? payload.sources.length : 0;

  // hasContent: row exists with at least a rating or a payload — used by
  // the company page to decide whether to render the moat section at all.
  const hasContent =
    payload != null || row.rating != null || row.tier != null;
  if (!hasContent) return null;

  return {
    companyCode: row.company_code,
    companyName,
    industry,
    updatedAtRaw: asString(row.updated_at ?? row.created_at),
    assessmentVersion: asString(row.assessment_version),
    moatRating,
    moatRatingLabel,
    moatTier,
    cycleTested,
    payload,
    schemaStatus: status,
    appliesSourceCount,
    totalSourceCount,
  };
}
