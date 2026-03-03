import type {
  NormalizedGrowthCatalyst,
  NormalizedGrowthEvidenceLine,
  NormalizedGrowthOutlook,
  NormalizedGrowthScenario,
  NormalizedGrowthTimelineItem,
  NormalizedGrowthVariantPerception,
} from "@/lib/growth-outlook/types";

type JsonRecord = Record<string, unknown>;

const parseJsonValue = (val: unknown): unknown => {
  if (!val) return null;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return val;
};

const parseJsonObject = (val: unknown): JsonRecord | null => {
  const parsed = parseJsonValue(val);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonRecord) : null;
};

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asRecord = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
};

const asArray = (value: unknown) => {
  const parsed = parseJsonValue(value);
  return Array.isArray(parsed) ? parsed : [];
};

const asStringArray = (value: unknown) =>
  asArray(value)
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));

const isUnknownLike = (value: unknown) => {
  const normalized = asString(value)?.toLowerCase();
  return !normalized || normalized === "unknown" || normalized === "n/a" || normalized === "na";
};

const normalizeVisibilityPercent = (value: unknown) => {
  const numeric = asNumber(value);
  if (numeric == null) return null;
  if (numeric <= 1) return Math.round(numeric * 100);
  if (numeric <= 5) return Math.round((numeric / 5) * 100);
  return Math.round(numeric);
};

const normalizeEvidenceLine = (value: unknown): NormalizedGrowthEvidenceLine | null => {
  const textOnly = asString(value);
  if (textOnly) {
    return {
      meta: "",
      text: textOnly,
    };
  }

  const item = asRecord(value);
  if (!item) return null;

  const period = asString(item.period) ?? asString(item.doc_date_or_period);
  const source = asString(item.source) ?? asString(item.doc_type);
  const text =
    asString(item.quote_or_fact) ??
    asString(item.fact) ??
    asString(item.snippet) ??
    "Evidence available";

  return {
    meta: [period, source].filter(Boolean).join(" · "),
    text,
  };
};

const normalizeTimelineItem = (value: unknown): NormalizedGrowthTimelineItem | null => {
  const item = asRecord(value);
  if (!item) return null;

  const stage = isUnknownLike(item.stage) ? null : asString(item.stage);
  const period = isUnknownLike(item.period) ? null : asString(item.period);
  const source = isUnknownLike(item.source) ? null : asString(item.source);
  const quote = asString(item.quote_or_fact);
  const delta = asString(item.delta_vs_prev);

  if (!stage && !period && !source && !quote && !delta) {
    return null;
  }

  return { stage, period, source, quote, delta };
};

const normalizeCatalyst = (value: unknown): NormalizedGrowthCatalyst | null => {
  const item = asRecord(value);
  if (!item) return null;

  const quantified = asRecord(item.quantified);
  const normalized: NormalizedGrowthCatalyst = {
    type: asString(item.type),
    timing: asString(item.timing),
    catalyst: asString(item.catalyst),
    expectedImpact: asString(item.expected_impact),
    quantified: quantified
      ? {
          unit: asString(quantified.unit),
          value:
            typeof quantified.value === "string" || typeof quantified.value === "number"
              ? (quantified.value as string | number)
              : null,
        }
      : null,
    timelineItems: asArray(item.timeline_evidence)
      .map((entry) => normalizeTimelineItem(entry))
      .filter((entry): entry is NormalizedGrowthTimelineItem => Boolean(entry)),
    evidenceLines: asArray(item.evidence)
      .map((entry) => normalizeEvidenceLine(entry))
      .filter((entry): entry is NormalizedGrowthEvidenceLine => Boolean(entry)),
  };

  if (
    !normalized.type &&
    !normalized.timing &&
    !normalized.catalyst &&
    !normalized.expectedImpact &&
    !normalized.quantified &&
    normalized.timelineItems.length === 0 &&
    normalized.evidenceLines.length === 0
  ) {
    return null;
  }

  return normalized;
};

const normalizeVariantPerception = (value: unknown): NormalizedGrowthVariantPerception | null => {
  const item = parseJsonObject(value);
  if (!item) return null;

  const consensus =
    asString(item.consensus_vs_company) ??
    asString(item.low) ??
    asString(item.guided_de_risked);
  const upside = [
    ...asStringArray(item.upside_nonconsensus),
    ...(asString(item.high) ? [asString(item.high) as string] : []),
    ...(asString(item.execution_trajectory) ? [asString(item.execution_trajectory) as string] : []),
  ];
  const downside = [
    ...asStringArray(item.downside_nonconsensus),
    ...(asString(item.catalyst_to_variant_delta)
      ? [asString(item.catalyst_to_variant_delta) as string]
      : []),
  ];

  if (!consensus && upside.length === 0 && downside.length === 0) {
    return null;
  }

  return { consensus, upside, downside };
};

const normalizeScenario = (value: unknown): NormalizedGrowthScenario | null => {
  const item = parseJsonObject(value);
  if (!item) return null;

  const drivers = asStringArray(item.key_drivers);
  const risks = asStringArray(item.key_risks);
  const summary = asString(item.description);
  const growthRaw = item.revenue_growth_pct ?? item.revenue_growth ?? item.revenue_impact;
  const growth =
    typeof growthRaw === "string" || typeof growthRaw === "number" ? String(growthRaw) : null;
  const ebitdaRaw = item.ebitda_margin ?? item.margin_impact;
  const ebitdaMargin =
    typeof ebitdaRaw === "string" || typeof ebitdaRaw === "number" ? String(ebitdaRaw) : null;
  const confidence = asNumber(item.confidence);

  if (!summary && !growth && !ebitdaMargin && confidence == null && drivers.length === 0 && risks.length === 0) {
    return null;
  }

  return {
    confidence,
    growth,
    ebitdaMargin,
    summary,
    drivers,
    risks,
  };
};

export function normalizeGrowthOutlook(input: {
  details: unknown;
  growthScore: unknown;
  runTimestamp: unknown;
  visibilityScore?: unknown;
  catalysts?: unknown;
  scenarios?: unknown;
  variantPerception?: unknown;
}): NormalizedGrowthOutlook | null {
  const details = parseJsonObject(input.details);
  const directGrowthScore = asNumber(input.growthScore);
  const detailsGrowthScore = details ? asNumber(details.growth_score) : null;
  const growthScore = directGrowthScore ?? detailsGrowthScore;
  const updatedAtRaw = asString(input.runTimestamp) ?? (details ? asString(details.run_timestamp) : null);

  if (!details && growthScore == null && !updatedAtRaw) {
    return null;
  }

  const catalystSource = input.catalysts ?? details?.catalysts ?? details?.catalysts_next_12_24m;
  const catalysts = asArray(catalystSource)
    .map((entry) => normalizeCatalyst(entry))
    .filter((entry): entry is NormalizedGrowthCatalyst => Boolean(entry));

  const variantPerception =
    normalizeVariantPerception(input.variantPerception) ??
    (details ? normalizeVariantPerception(details.variant_perception) : null);
  const scenariosRecord =
    parseJsonObject(input.scenarios) ?? (details ? parseJsonObject(details.scenarios) : null);
  const scenarios = scenariosRecord
    ? {
        base: normalizeScenario(scenariosRecord.base),
        upside: normalizeScenario(scenariosRecord.upside),
        downside: normalizeScenario(scenariosRecord.downside),
      }
    : null;

  return {
    growthScore,
    visibilityPercent: normalizeVisibilityPercent(input.visibilityScore ?? details?.visibility_score),
    updatedAtRaw,
    catalysts,
    variantPerception,
    scenarios,
  };
}
