import type {
  MoatAnalysisRow,
  MoatRatingKey,
  NormalizedMoatAnalysis,
  NormalizedMoatFinancialCheck,
  NormalizedMoatGatekeeper,
  NormalizedMoatSource,
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

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "t", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "f", "0", "no", "n"].includes(normalized)) return false;
  return null;
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
  for (const [pattern, result] of Object.entries(RATING_MAP)) {
    if (raw.includes(pattern) || pattern.includes(raw)) return result;
  }
  return { key: "unknown", label: asString(value) ?? "Unknown" };
};

const GATEKEEPER_LABELS: Record<string, string> = {
  clearly_no: "Clearly No",
  clearly_yes: "Clearly Yes",
  probably_not: "Probably Not",
  probably_yes: "Probably Yes",
  probably_not_situational: "Probably Not (situational)",
  probably_yes_situational: "Probably Yes (situational)",
  unclear: "Unclear",
};

const humanizeGatekeeper = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (GATEKEEPER_LABELS[normalized]) return GATEKEEPER_LABELS[normalized];
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const normalizeSource = (value: unknown): NormalizedMoatSource | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const sourceType = asString(obj.source_type ?? obj.sourceType);
  if (!sourceType) return null;
  const subcategory = asString(obj.subcategory);
  const applies = asBoolean(obj.applies) ?? false;
  const presenceStrength = asString(obj.presence_strength ?? obj.presenceStrength);
  const durability = asString(obj.durability);
  const doesNotApplyReason = asString(obj.does_not_apply_reason ?? obj.doesNotApplyReason);
  return { sourceType, subcategory, applies, presenceStrength, durability, doesNotApplyReason };
};

const normalizeGatekeeper = (value: unknown): NormalizedMoatGatekeeper | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const answer = asString(obj.answer);
  const note = asString(obj.note);
  if (!answer && !note) return null;
  return { answer, answerLabel: humanizeGatekeeper(answer), note };
};

const normalizeFinancialCheck = (value: unknown): NormalizedMoatFinancialCheck | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const cycleTested = asBoolean(obj.cycle_tested ?? obj.cycleTested);
  const roicVsWacc = asString(obj.roic_vs_wacc ?? obj.roicVsWacc);
  const note = asString(obj.note);
  if (cycleTested == null && !roicVsWacc && !note) return null;
  return { cycleTested, roicVsWacc, note };
};

export function normalizeMoatAnalysis(
  row: MoatAnalysisRow | null | undefined,
): NormalizedMoatAnalysis | null {
  if (!row) return null;

  const payload = parseJsonObject(row.assessment_payload);

  const ratingSource = row.rating ?? payload?.rating ?? payload?.call ?? null;
  const { key: moatRating, label: moatRatingLabel } = asMoatRating(ratingSource);

  const sources = parseJsonArray(payload?.sources)
    .map(normalizeSource)
    .filter((s): s is NormalizedMoatSource => s !== null);

  const gatekeeperFromPayload = normalizeGatekeeper(payload?.gatekeeper);
  const gatekeeperAnswerTop = asString(row.gatekeeper_answer);
  const gatekeeper: NormalizedMoatGatekeeper | null =
    gatekeeperFromPayload ??
    (gatekeeperAnswerTop
      ? {
          answer: gatekeeperAnswerTop,
          answerLabel: humanizeGatekeeper(gatekeeperAnswerTop),
          note: null,
        }
      : null);

  const financialCheckFromPayload = normalizeFinancialCheck(payload?.financial_check);
  const rowCycleTested = typeof row.cycle_tested === "boolean" ? row.cycle_tested : null;
  const financialCheck: NormalizedMoatFinancialCheck | null =
    financialCheckFromPayload ??
    (rowCycleTested != null
      ? { cycleTested: rowCycleTested, roicVsWacc: null, note: null }
      : null);

  const whatWouldChangeTheCall = toStringArray(payload?.what_would_change_the_call);

  const companyName = asString(row.company_name) ?? asString(payload?.name);
  const industry = asString(row.industry) ?? asString(payload?.industry);
  const call = asString(payload?.call);
  const reasoning = asString(payload?.reasoning);
  const assessmentVersion =
    asString(row.assessment_version) ?? asString(payload?.assessment_version);
  const schemaVersion = asString(payload?.schema_version);

  const cycleTested = rowCycleTested ?? financialCheck?.cycleTested ?? null;

  const hasContent =
    payload != null ||
    row.rating != null ||
    sources.length > 0 ||
    gatekeeper != null ||
    financialCheck != null ||
    whatWouldChangeTheCall.length > 0 ||
    call != null ||
    reasoning != null;

  if (!hasContent) return null;

  return {
    companyCode: row.company_code,
    companyName,
    industry,
    updatedAtRaw: asString(row.updated_at ?? row.created_at),
    assessmentVersion,
    schemaVersion,
    moatRating,
    moatRatingLabel,
    call,
    reasoning,
    sources,
    gatekeeper,
    financialCheck,
    whatWouldChangeTheCall,
    cycleTested,
  };
}
