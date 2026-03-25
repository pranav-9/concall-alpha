import type {
  MoatAnalysisRow,
  MoatRatingKey,
  NormalizedMoatAnalysis,
  NormalizedMoatPillar,
  NormalizedQuantitativeCheck,
} from "./types";

type JsonRecord = Record<string, unknown>;

const parseJsonValue = (value: unknown): unknown => {
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

const parseJsonObject = (value: unknown): JsonRecord | null => {
  const parsed = parseJsonValue(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as JsonRecord)
    : null;
};

const parseJsonArray = (value: unknown): unknown[] => {
  const parsed = parseJsonValue(value);
  return Array.isArray(parsed) ? parsed : [];
};

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toStringArray = (value: unknown): string[] =>
  parseJsonArray(value)
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));

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
  // Attempt partial match
  for (const [pattern, result] of Object.entries(RATING_MAP)) {
    if (raw.includes(pattern) || pattern.includes(raw)) return result;
  }
  // Return the raw label with unknown key
  return { key: "unknown", label: asString(value) ?? "Unknown" };
};

const normalizeMoatPillar = (value: unknown): NormalizedMoatPillar | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const type = asString(obj.type);
  if (!type) return null;
  const statusRaw = asString(obj.status)?.toUpperCase();
  const present = statusRaw === "PRESENT";
  const evidence = asString(obj.evidence);
  const greenwaldRaw = asString(obj.greenwald);
  const greenwaldLabel =
    !greenwaldRaw || greenwaldRaw.toUpperCase() === "N/A" ? null : greenwaldRaw;
  return { type, present, evidence, greenwaldLabel };
};

const normalizeQuantitativeCheck = (value: unknown): NormalizedQuantitativeCheck | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const roic = asString(obj.roic);
  const margins = asString(obj.margins);
  const marketShare = asString(obj.marketShare ?? obj.market_share);
  const pricingPower = asString(obj.pricingPower ?? obj.pricing_power);
  if (!roic && !margins && !marketShare && !pricingPower) return null;
  return { roic, margins, marketShare, pricingPower };
};

export function normalizeMoatAnalysis(
  row: MoatAnalysisRow | null | undefined,
): NormalizedMoatAnalysis | null {
  if (!row) return null;

  const { key: moatRating, label: moatRatingLabel } = asMoatRating(row.rating);
  const moatPillars = parseJsonArray(row.moats)
    .map(normalizeMoatPillar)
    .filter((p): p is NormalizedMoatPillar => p !== null);
  const quantitativeCheck = normalizeQuantitativeCheck(row.quantitative);
  const risks = toStringArray(row.risks);

  const hasContent =
    row.rating ||
    row.porter_summary ||
    row.porter_verdict ||
    moatPillars.length > 0 ||
    quantitativeCheck ||
    row.durability ||
    risks.length > 0;

  if (!hasContent) return null;

  return {
    companyCode: row.company_code,
    companyName: asString(row.company_name),
    industry: asString(row.industry),
    updatedAtRaw: asString(row.updated_at ?? row.created_at),
    moatRating,
    moatRatingLabel,
    trajectory: asString(row.trajectory),
    trajectoryDirection: asString(row.trajectory_direction),
    porterSummary: asString(row.porter_summary),
    porterVerdict: asString(row.porter_verdict),
    moatPillars,
    quantitativeCheck,
    durability: asString(row.durability),
    risks,
  };
}
