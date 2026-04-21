import type {
  MoatAnalysisRow,
  MoatRatingKey,
  NormalizedMoatAnalysis,
  NormalizedMoatDurabilityBlock,
  NormalizedMoatIndustryStructure,
  NormalizedMoatPillar,
  NormalizedMoatRisk,
  NormalizedMoatSourceStability,
  NormalizedMoatThreatAttacker,
  NormalizedMoatThreatIntensity,
  NormalizedMoatTrajectoryEvidence,
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

const asOptionalLabel = (value: unknown): string | null => {
  const raw = asString(value);
  if (!raw) return null;
  return raw.toUpperCase() === "N/A" ? null : raw;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
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
  // Attempt partial match
  for (const [pattern, result] of Object.entries(RATING_MAP)) {
    if (raw.includes(pattern) || pattern.includes(raw)) return result;
  }
  // Return the raw label with unknown key
  return { key: "unknown", label: asString(value) ?? "Unknown" };
};

const collectAssessmentLayers = (value: unknown): JsonRecord[] => {
  const layers: JsonRecord[] = [];
  const seen = new Set<JsonRecord>();
  let current = parseJsonObject(value);

  while (current && !seen.has(current)) {
    seen.add(current);
    layers.push(current);
    current = parseJsonObject(current.source_payload);
  }

  return layers;
};

const mergeAssessmentPayload = (value: unknown): JsonRecord | null => {
  const layers = collectAssessmentLayers(value);
  if (layers.length === 0) return null;
  return layers.reduceRight<JsonRecord>((acc, layer) => ({ ...acc, ...layer }), {});
};

const normalizeMoatPillar = (value: unknown): NormalizedMoatPillar | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const sourceType = asOptionalLabel(obj.source_type ?? obj.sourceType);
  const subcategory = asOptionalLabel(obj.subcategory);
  const legacyType = asOptionalLabel(obj.type);
  const type = subcategory ?? sourceType ?? legacyType;
  if (!type) return null;
  const statusRaw = asString(obj.status)?.toUpperCase();
  const score = asNumber(obj.score);
  const present = statusRaw === "PRESENT" || (statusRaw == null && score != null && score > 0);
  const evidence = asString(obj.evidence);
  const greenwaldLabel = asOptionalLabel(obj.greenwald);
  const status = statusRaw ?? (present ? "PRESENT" : null);
  return { type, sourceType, subcategory, status, present, score, evidence, greenwaldLabel };
};

const normalizeQuantitativeCheck = (value: unknown): NormalizedQuantitativeCheck | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const basis = asString(obj.basis);
  const roic = asString(obj.roic_trend ?? obj.roicTrend ?? obj.roic);
  const margins = asString(obj.margins);
  const marketShare = asString(obj.marketShare ?? obj.market_share);
  const pricingPower = asString(obj.pricingPower ?? obj.pricing_power);
  const overallVerdict = asString(obj.overall_verdict ?? obj.overallVerdict);
  const marginCharacter = asString(obj.margin_character ?? obj.marginCharacter);
  if (
    !basis &&
    !roic &&
    !margins &&
    !marketShare &&
    !pricingPower &&
    !overallVerdict &&
    !marginCharacter
  ) {
    return null;
  }
  return { basis, roic, margins, marketShare, pricingPower, overallVerdict, marginCharacter };
};

const normalizeIndustryStructure = (value: unknown): NormalizedMoatIndustryStructure | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const summary = asString(obj.summary);
  const verdict = asString(obj.verdict);
  const included = asBoolean(obj.included);
  if (!summary && !verdict && included == null) return null;
  return { summary, verdict, included };
};

const normalizeSourceStability = (value: unknown): NormalizedMoatSourceStability | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const stability = asString(obj.stability);
  const assessment = asString(obj.assessment);
  const compounding = asString(obj.compounding);
  const sourceType = asOptionalLabel(obj.source_type ?? obj.sourceType);
  if (!stability && !assessment && !compounding && !sourceType) return null;
  return { stability, assessment, compounding, sourceType };
};

const normalizeTrajectoryEvidence = (value: unknown): NormalizedMoatTrajectoryEvidence | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const signal = asString(obj.signal);
  const dateHint = asString(obj.date_hint ?? obj.dateHint);
  const direction = asString(obj.direction);
  if (!signal && !dateHint && !direction) return null;
  return { signal, dateHint, direction };
};

const normalizeThreatAttacker = (value: unknown): NormalizedMoatThreatAttacker | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const name = asString(obj.name);
  const capability = asString(obj.capability);
  const motivation = asString(obj.motivation);
  const credibility = asString(obj.credibility);
  const capitalPosition = asString(obj.capital_position ?? obj.capitalPosition);
  if (!name && !capability && !motivation && !credibility && !capitalPosition) return null;
  return { name, capability, motivation, credibility, capitalPosition };
};

const normalizeThreatIntensity = (value: unknown): NormalizedMoatThreatIntensity | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const level = asString(obj.level);
  const paragraph = asString(obj.paragraph);
  const attackers = parseJsonArray(obj.attackers)
    .map(normalizeThreatAttacker)
    .filter((item): item is NormalizedMoatThreatAttacker => item !== null);
  if (!level && !paragraph && attackers.length === 0) return null;
  return { level, paragraph, attackers };
};

const normalizeDurabilityBlock = (value: unknown): NormalizedMoatDurabilityBlock | null => {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const synthesis = asString(obj.synthesis);
  const sourceStability = parseJsonArray(obj.source_stability)
    .map(normalizeSourceStability)
    .filter((item): item is NormalizedMoatSourceStability => item !== null);
  const trajectoryEvidence = parseJsonArray(obj.trajectory_evidence)
    .map(normalizeTrajectoryEvidence)
    .filter((item): item is NormalizedMoatTrajectoryEvidence => item !== null);
  const competitiveThreatIntensity = normalizeThreatIntensity(obj.competitive_threat_intensity);
  if (!synthesis && sourceStability.length === 0 && trajectoryEvidence.length === 0 && !competitiveThreatIntensity) {
    return null;
  }
  return { synthesis, sourceStability, trajectoryEvidence, competitiveThreatIntensity };
};

const normalizeRisk = (value: unknown): NormalizedMoatRisk | null => {
  const obj = parseJsonObject(value);
  if (!obj) {
    const trigger = asString(value);
    return trigger ? { trigger, mechanism: null, sourceType: null } : null;
  }
  const trigger = asString(obj.trigger);
  const mechanism = asString(obj.mechanism);
  const sourceType = asOptionalLabel(obj.source_type ?? obj.sourceType);
  if (!trigger && !mechanism && !sourceType) return null;
  return { trigger, mechanism, sourceType };
};

const summarizeRisk = (risk: NormalizedMoatRisk) => {
  const parts = [risk.trigger, risk.mechanism].filter((item): item is string => Boolean(item));
  if (parts.length > 0) return parts.join(" · ");
  return risk.sourceType;
};

export function normalizeMoatAnalysis(
  row: MoatAnalysisRow | null | undefined,
): NormalizedMoatAnalysis | null {
  if (!row) return null;

  const assessmentPayload = mergeAssessmentPayload(row.assessment_payload);
  const derivedScores = parseJsonObject(
    assessmentPayload?.derived_scores ?? row.derived_scores ?? null,
  );
  const ratingCard = parseJsonObject(
    assessmentPayload?.block_1_rating_card ?? row.block_1_rating_card ?? null,
  );
  const industryStructure = normalizeIndustryStructure(
    assessmentPayload?.block_2_industry_structure ?? row.block_2_industry_structure ?? null,
  );
  const moatPillars = parseJsonArray(
    assessmentPayload?.block_3_moat_sources ??
      row.block_3_moat_sources ??
      row.moats ??
      null,
  )
    .map(normalizeMoatPillar)
    .filter((p): p is NormalizedMoatPillar => p !== null);
  const quantitativeCheck = normalizeQuantitativeCheck(
    assessmentPayload?.block_4_quantitative_test ??
      row.block_4_quantitative_test ??
      row.quantitative ??
      null,
  );
  const durabilityDetails = normalizeDurabilityBlock(
    assessmentPayload?.block_5_durability ?? row.block_5_durability ?? null,
  );
  const moatRisks = parseJsonArray(
    assessmentPayload?.block_6_moat_erosion_risks ??
      row.block_6_moat_erosion_risks ??
      row.risks ??
      null,
  )
    .map(normalizeRisk)
    .filter((item): item is NormalizedMoatRisk => item !== null);
  const risks = moatRisks.length > 0 ? moatRisks.map((risk) => summarizeRisk(risk) ?? "").filter(Boolean) : toStringArray(row.risks);
  const ratingSource = row.rating ?? assessmentPayload?.rating ?? ratingCard?.rating ?? null;
  const { key: moatRating, label: moatRatingLabel } = asMoatRating(ratingSource);
  const moatScore =
    asNumber(row.moat_score) ??
    asNumber(ratingCard?.moat_score ?? ratingCard?.moatScore) ??
    asNumber(derivedScores?.moat_score ?? derivedScores?.moatScore) ??
    asNumber(assessmentPayload?.moat_score ?? assessmentPayload?.moatScore);
  const strengthScore =
    asNumber(row.strength_score) ??
    asNumber(ratingCard?.strength_score ?? ratingCard?.strengthScore) ??
    asNumber(derivedScores?.strength_score ?? derivedScores?.strengthScore) ??
    asNumber(assessmentPayload?.strength_score ?? assessmentPayload?.strengthScore);
  const durabilityScore =
    asNumber(row.durability_score) ??
    asNumber(ratingCard?.durability_score ?? ratingCard?.durabilityScore) ??
    asNumber(derivedScores?.durability_score ?? derivedScores?.durabilityScore) ??
    asNumber(assessmentPayload?.durability_score ?? assessmentPayload?.durabilityScore);
  const assessmentVersion =
    asString(row.assessment_version) ??
    asString(assessmentPayload?.assessment_version ?? assessmentPayload?.assessmentVersion) ??
    asString(derivedScores?.assessment_version ?? derivedScores?.assessmentVersion);
  const schemaVersion =
    asString(assessmentPayload?.schema_version ?? assessmentPayload?.schemaVersion) ??
    asString(derivedScores?.schema_version ?? derivedScores?.schemaVersion);
  const companyName = asString(row.company_name) ?? asString(assessmentPayload?.name);
  const industry = asString(row.industry) ?? asString(assessmentPayload?.industry);
  const trajectory = asString(row.trajectory) ?? asString(assessmentPayload?.trajectory);
  const trajectoryDirection =
    asString(row.trajectory_direction) ??
    asString(assessmentPayload?.trajectoryDirection) ??
    asString(derivedScores?.trajectory_direction ?? derivedScores?.trajectoryDirection);
  const porterSummary = industryStructure?.summary ?? asString(row.porter_summary);
  const porterVerdict = industryStructure?.verdict ?? asString(row.porter_verdict);
  const assessmentSummary =
    asString(ratingCard?.summary) ??
    durabilityDetails?.synthesis ??
    porterSummary ??
    porterVerdict ??
    asString(row.durability);
  const durability = durabilityDetails?.synthesis ?? asString(row.durability);

  const hasContent =
    assessmentPayload ||
    row.rating ||
    row.porter_summary ||
    row.porter_verdict ||
    assessmentSummary ||
    moatPillars.length > 0 ||
    quantitativeCheck ||
    durabilityDetails ||
    durability ||
    moatRisks.length > 0 ||
    risks.length > 0 ||
    moatScore != null ||
    strengthScore != null ||
    durabilityScore != null ||
    assessmentVersion ||
    schemaVersion;

  if (!hasContent) return null;

  return {
    companyCode: row.company_code,
    companyName,
    industry,
    updatedAtRaw: asString(row.updated_at ?? row.created_at),
    assessmentVersion,
    schemaVersion,
    moatScore,
    strengthScore,
    durabilityScore,
    moatRating,
    moatRatingLabel,
    trajectory,
    trajectoryDirection,
    assessmentSummary,
    porterSummary,
    porterVerdict,
    industryStructure,
    moatPillars,
    quantitativeCheck,
    durability,
    durabilityDetails,
    moatRisks,
    risks,
  };
}
