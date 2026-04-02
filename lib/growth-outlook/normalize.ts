import type {
  NormalizedGrowthCatalyst,
  NormalizedGrowthEvidenceLine,
  NormalizedGrowthOutlook,
  NormalizedGrowthScenario,
  NormalizedGrowthSourceFile,
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

const normalizeScenarioConfidence = (value: unknown) => {
  const numeric = asNumber(value);
  if (numeric == null) return null;
  if (numeric <= 1) return numeric;
  if (numeric <= 100) return numeric / 100;
  return null;
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

const normalizeSourceFile = (value: unknown): NormalizedGrowthSourceFile | null => {
  const item = asRecord(value);
  if (!item) return null;
  return {
    fy: asString(item.fy),
    kind: asString(item.kind),
    quarter: asString(item.quarter),
    sourceUrl: asString(item.source_url),
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
  const priority = asRecord(item.priority);
  const investibilityChecks = asRecord(item.investibility_checks);
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
    priority: priority
      ? {
          impactScore: asNumber(priority.impact_score),
          timeRelevance: asNumber(priority.time_relevance),
          certaintyScore: asNumber(priority.certainty_score),
          progressionDepth: asNumber(priority.progression_depth),
          weightedPriority: asNumber(priority.weighted_priority),
        }
      : null,
    investibilityChecks: investibilityChecks
      ? {
          adoption: asString(investibilityChecks.adoption),
          feasibility: asString(investibilityChecks.feasibility),
          entryTiming: asString(investibilityChecks.entry_timing),
          unitEconomics: asString(investibilityChecks.unit_economics),
        }
      : null,
  };

  if (
    !normalized.type &&
    !normalized.timing &&
    !normalized.catalyst &&
    !normalized.expectedImpact &&
    !normalized.quantified &&
    !normalized.priority &&
    !normalized.investibilityChecks &&
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

  const consensusView = parseJsonObject(item.consensus_view);
  const upsideView = parseJsonObject(item.upside_view);
  const downsideView = parseJsonObject(item.downside_view);

  const nestedConsensus = asString(consensusView?.summary);
  const nestedUpside = asStringArray(upsideView?.points);
  const nestedDownside = asStringArray(downsideView?.points);

  const consensus =
    nestedConsensus ??
    asString(item.consensus_vs_company) ??
    asString(item.low) ??
    asString(item.guided_de_risked);
  const upside =
    nestedUpside.length > 0
      ? nestedUpside
      : [
          ...asStringArray(item.upside_nonconsensus),
          ...(asString(item.high) ? [asString(item.high) as string] : []),
          ...(asString(item.execution_trajectory)
            ? [asString(item.execution_trajectory) as string]
            : []),
        ];
  const downside =
    nestedDownside.length > 0
      ? nestedDownside
      : [
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

  const driversPrimary = asStringArray(item.drivers);
  const driversFallback = asStringArray(item.key_drivers);
  const drivers = driversPrimary.length > 0 ? driversPrimary : driversFallback;

  const risksPrimary = asStringArray(item.risks);
  const risksFallback = asStringArray(item.key_risks);
  const risks = risksPrimary.length > 0 ? risksPrimary : risksFallback;

  const summary = asString(item.quick_takeaway) ?? asString(item.description);
  const riskWatch =
    asString(item.risk_watch) ??
    asString(item.risk_watch_summary) ??
    asString(item.risk_watchpoint) ??
    asString(item.watchpoint);
  const growthRaw =
    item.growth_pct ?? item.revenue_growth_pct ?? item.revenue_growth ?? item.revenue_impact;
  const growth =
    typeof growthRaw === "string" || typeof growthRaw === "number" ? String(growthRaw) : null;
  const ebitdaRaw = item.ebitda_margin ?? item.margin_impact;
  const ebitdaMargin =
    typeof ebitdaRaw === "string" || typeof ebitdaRaw === "number" ? String(ebitdaRaw) : null;
  const confidence = normalizeScenarioConfidence(item.confidence_pct ?? item.confidence);

  if (
    !summary &&
    !riskWatch &&
    !growth &&
    !ebitdaMargin &&
    confidence == null &&
    drivers.length === 0 &&
    risks.length === 0
  ) {
    return null;
  }

  return {
    confidence,
    growth,
    ebitdaMargin,
    summary,
    riskWatch,
    drivers,
    risks,
  };
};

export function normalizeGrowthOutlook(input: {
  details: unknown;
  growthScore: unknown;
  runTimestamp: unknown;
  companyName?: unknown;
  schemaVersion?: unknown;
  fiscalYear?: unknown;
  horizonQuarters?: unknown;
  horizonYears?: unknown;
  visibilityScore?: unknown;
  baseGrowthPct?: unknown;
  upsideGrowthPct?: unknown;
  downsideGrowthPct?: unknown;
  summaryBullets?: unknown;
  growthScoreFormula?: unknown;
  growthScoreSteps?: unknown;
  visibilityRationale?: unknown;
  factBase?: unknown;
  sourceFiles?: unknown;
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

  const factBaseSource = input.factBase ?? details?.fact_base;
  const factBase = asArray(factBaseSource)
    .map((entry) => normalizeEvidenceLine(entry))
    .filter((entry): entry is NormalizedGrowthEvidenceLine => Boolean(entry));

  const growthScoreStepsSource = input.growthScoreSteps ?? details?.growth_score_steps;
  const growthScoreSteps = asArray(growthScoreStepsSource)
    .map((entry) => {
      const textOnly = asString(entry);
      if (textOnly) return textOnly;
      const item = asRecord(entry);
      if (!item) return null;
      const catalyst = asString(item.catalyst);
      const weightedPriorityNorm = asNumber(item.weighted_priority_norm);
      const certainty = asNumber(item.certainty);
      const progression = asNumber(item.progression);
      const timeRelevance = asNumber(item.time_relevance);
      const parts = [
        catalyst,
        weightedPriorityNorm != null ? `Priority ${weightedPriorityNorm}` : null,
        certainty != null ? `Certainty ${certainty}` : null,
        progression != null ? `Progression ${progression}` : null,
        timeRelevance != null ? `Time relevance ${timeRelevance}` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : null;
    })
    .filter((entry): entry is string => Boolean(entry));

  const sourceFilesSource = input.sourceFiles ?? details?.source_files;
  const sourceFiles = asArray(sourceFilesSource)
    .map((entry) => normalizeSourceFile(entry))
    .filter((entry): entry is NormalizedGrowthSourceFile => Boolean(entry));

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
    companyName: asString(input.companyName) ?? (details ? asString(details.company_name) : null),
    schemaVersion: asString(input.schemaVersion) ?? (details ? asString(details.schema_version) : null),
    fiscalYear: asString(input.fiscalYear) ?? (details ? asString(details.fiscal_year) : null),
    horizonQuarters: asNumber(input.horizonQuarters) ?? (details ? asNumber(details.horizon_quarters) : null),
    horizonYears: asNumber(input.horizonYears) ?? (details ? asNumber(details.horizon_years) : null),
    growthScore,
    visibilityPercent: normalizeVisibilityPercent(input.visibilityScore ?? details?.visibility_score),
    baseGrowthPct:
      (input.baseGrowthPct != null ? String(input.baseGrowthPct) : null) ??
      (details?.base_growth_pct != null ? String(details.base_growth_pct) : null),
    upsideGrowthPct:
      (input.upsideGrowthPct != null ? String(input.upsideGrowthPct) : null) ??
      (details?.upside_growth_pct != null ? String(details.upside_growth_pct) : null),
    downsideGrowthPct:
      (input.downsideGrowthPct != null ? String(input.downsideGrowthPct) : null) ??
      (details?.downside_growth_pct != null ? String(details.downside_growth_pct) : null),
    summaryBullets: asStringArray(input.summaryBullets ?? details?.summary_bullets),
    growthScoreFormula:
      asString(input.growthScoreFormula) ?? (details ? asString(details.growth_score_formula) : null),
    growthScoreSteps,
    visibilityRationale:
      asString(input.visibilityRationale) ?? (details ? asString(details.visibility_rationale) : null),
    updatedAtRaw,
    factBase,
    sourceFiles,
    catalysts,
    variantPerception,
    scenarios,
  };
}
