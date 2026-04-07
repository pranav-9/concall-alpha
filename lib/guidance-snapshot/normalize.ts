import { formatGuidancePeriodLabel, normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import type {
  GuidanceSnapshotGuidanceItemRow,
  NormalizedGuidanceCredibilityVerdict,
  GuidanceSnapshotRow,
  NormalizedBigPictureGrowthGuidance,
  NormalizedCurrentYearRevenueGuidance,
  NormalizedCurrentYearRevenueGuidanceTimelineRow,
  NormalizedGuidanceSnapshot,
  NormalizedGuidanceStyleClassification,
  NormalizedPriorTwoYearAccuracyRow,
} from "@/lib/guidance-snapshot/types";

type JsonRecord = Record<string, unknown>;

const parseJsonValue = (value: unknown): unknown => {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
};

const parseJsonObjectLike = (value: unknown): JsonRecord | null => {
  const parsed = parseJsonValue(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as JsonRecord)
    : null;
};

const parseJsonArrayLike = (value: unknown): unknown[] => {
  const parsed = parseJsonValue(value);
  return Array.isArray(parsed) ? parsed : [];
};

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  if (typeof value === "number") return value !== 0;
  return false;
};

const asFormattedPeriodArray = (value: unknown) =>
  parseJsonArrayLike(value)
    .map((entry) => formatGuidancePeriodLabel(asString(entry)))
    .filter((entry): entry is string => Boolean(entry));

const normalizeCurrentYearRevenueGuidanceTimeline = (
  value: unknown,
): NormalizedCurrentYearRevenueGuidanceTimelineRow[] =>
  parseJsonArrayLike(value)
    .map((entry) => {
      const row = parseJsonObjectLike(entry);
      if (!row) return null;

      const normalized: NormalizedCurrentYearRevenueGuidanceTimelineRow = {
        quarter: formatGuidancePeriodLabel(asString(row.quarter)) ?? asString(row.quarter),
        guidanceType: asString(row.guidance_type),
        whatWasSaid: asString(row.what_was_said),
        guidancePercent: asNumber(row.guidance_percent),
        sourceReference: asString(row.source_reference),
      };

      if (
        !normalized.quarter &&
        !normalized.guidanceType &&
        !normalized.whatWasSaid &&
        normalized.guidancePercent == null &&
        !normalized.sourceReference
      ) {
        return null;
      }

      return normalized;
    })
    .filter((entry): entry is NormalizedCurrentYearRevenueGuidanceTimelineRow => Boolean(entry));

const normalizeGuidanceStyleClassification = (
  value: unknown,
): NormalizedGuidanceStyleClassification | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const normalized: NormalizedGuidanceStyleClassification = {
    style: asString(row.style),
    rationale: asString(row.rationale),
    evidenceQuarters: asFormattedPeriodArray(row.evidence_quarters),
  };

  if (!normalized.style && !normalized.rationale && normalized.evidenceQuarters.length === 0) {
    return null;
  }

  return normalized;
};

const normalizeBigPictureGrowthGuidance = (
  value: unknown,
): NormalizedBigPictureGrowthGuidance | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const normalized: NormalizedBigPictureGrowthGuidance = {
    source: asString(row.source),
    currentStatement: asString(row.current_statement),
    headlineStatement: asString(row.headline_statement),
    statusSinceFirst: asString(row.status_since_first),
  };

  if (
    !normalized.source &&
    !normalized.currentStatement &&
    !normalized.headlineStatement &&
    !normalized.statusSinceFirst
  ) {
    return null;
  }

  return normalized;
};

const normalizeCurrentYearRevenueGuidance = (
  value: unknown,
): NormalizedCurrentYearRevenueGuidance | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const normalized: NormalizedCurrentYearRevenueGuidance = {
    fiscalYear: formatGuidancePeriodLabel(asString(row.fiscal_year)) ?? asString(row.fiscal_year),
    signalTrend: asString(row.signal_trend),
    sourceQuarters: asFormattedPeriodArray(row.source_quarters),
    inYearRevisionFlag: asBoolean(row.in_year_revision_flag),
    inYearRevisionNote: asString(row.in_year_revision_note),
    consolidatedStatement: asString(row.consolidated_statement),
    officialCurrentGuidanceText: asString(row.official_current_guidance_text),
    officialCurrentGuidancePercent: asNumber(row.official_current_guidance_percent),
    officialCurrentGuidanceSourceQuarter:
      formatGuidancePeriodLabel(asString(row.official_current_guidance_source_quarter)) ??
      asString(row.official_current_guidance_source_quarter),
    sourceQuarterTimeline: normalizeCurrentYearRevenueGuidanceTimeline(
      row.source_quarter_timeline,
    ),
  };

  if (
    !normalized.fiscalYear &&
    !normalized.signalTrend &&
    normalized.sourceQuarters.length === 0 &&
    !normalized.inYearRevisionFlag &&
    !normalized.inYearRevisionNote &&
    !normalized.consolidatedStatement &&
    !normalized.officialCurrentGuidanceText &&
    normalized.officialCurrentGuidancePercent == null &&
    !normalized.officialCurrentGuidanceSourceQuarter &&
    normalized.sourceQuarterTimeline.length === 0
  ) {
    return null;
  }

  return normalized;
};

const normalizePriorTwoYearAccuracy = (
  value: unknown,
): NormalizedPriorTwoYearAccuracyRow[] =>
  parseJsonArrayLike(parseJsonObjectLike(value)?.rows ?? value)
    .map((entry) => {
      const row = parseJsonObjectLike(entry);
      if (!row) return null;

      const normalized: NormalizedPriorTwoYearAccuracyRow = {
        fiscalYear:
          formatGuidancePeriodLabel(asString(row.fiscal_year)) ?? asString(row.fiscal_year),
        verdict: asString(row.verdict),
        signalType: asString(row.signal_type),
        signalSummary: asString(row.signal_summary),
        inYearRevision: asString(row.in_year_revision),
        finalSignalAfterRevisions: asString(row.final_signal_after_revisions),
        actualOutcome: asString(row.actual_outcome),
        reason: asString(row.reason),
      };

      if (
        !normalized.fiscalYear &&
        !normalized.verdict &&
        !normalized.signalType &&
        !normalized.signalSummary &&
        !normalized.inYearRevision &&
        !normalized.finalSignalAfterRevisions &&
        !normalized.actualOutcome &&
        !normalized.reason
      ) {
        return null;
      }

      return normalized;
    })
    .filter((entry): entry is NormalizedPriorTwoYearAccuracyRow => Boolean(entry));

const normalizeGuidanceCredibilityVerdict = (
  value: unknown,
): NormalizedGuidanceCredibilityVerdict | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const normalized: NormalizedGuidanceCredibilityVerdict = {
    verdict: asString(row.verdict),
    supportingLine: asString(row.supporting_line),
  };

  if (!normalized.verdict && !normalized.supportingLine) {
    return null;
  }

  return normalized;
};

const normalizeSnapshotGuidanceItems = (
  companyCode: string,
  generatedAtRaw: string | null,
  value: unknown,
) => {
  const trackingRows: GuidanceTrackingRow[] = [];

  parseJsonArrayLike(value).forEach((entry, index) => {
    const row = parseJsonObjectLike(entry) as JsonRecord | null;
    if (!row) return;
    const guidanceKey = asString(row.guidance_key);
    if (!guidanceKey) return;

    const snapshotRow = row as GuidanceSnapshotGuidanceItemRow & JsonRecord;
    trackingRows.push({
      id: index + 1,
      company_code: companyCode,
      guidance_key: guidanceKey,
      guidance_text: asString(snapshotRow.guidance_text),
      guidance_type: asString(snapshotRow.guidance_type),
      first_mentioned_in: row.first_mentioned_in,
      target_period: asString(row.target_period),
      source_mentions: null,
      trail: row.trail,
      status: asString(row.status),
      status_reason: asString(row.status_reason),
      latest_view: asString(row.latest_view),
      confidence: asNumber(row.confidence),
      generated_at: generatedAtRaw,
      details: null,
    });
  });

  return normalizeGuidanceTrackingRows(trackingRows);
};

export function normalizeGuidanceSnapshot(
  row: GuidanceSnapshotRow | null | undefined,
): NormalizedGuidanceSnapshot | null {
  if (!row?.company_code) return null;

  const generatedAtRaw = asString(row.generated_at);
  const updatedAtRaw = asString(row.updated_at);
  const guidanceStyleClassification = normalizeGuidanceStyleClassification(
    row.guidance_style_classification,
  );
  const bigPictureGrowthGuidance = normalizeBigPictureGrowthGuidance(
    row.big_picture_growth_guidance,
  );
  const currentYearRevenueGuidance = normalizeCurrentYearRevenueGuidance(
    row.current_year_revenue_guidance,
  );
  const priorTwoYearAccuracy = normalizePriorTwoYearAccuracy(row.prior_two_year_accuracy);
  const credibilityVerdict = normalizeGuidanceCredibilityVerdict(row.credibility_verdict);
  const guidanceItems = normalizeSnapshotGuidanceItems(
    row.company_code,
    generatedAtRaw,
    row.guidance_items,
  );
  const details = parseJsonObjectLike(row.details);
  const sourceFiles = parseJsonArrayLike(row.source_files);

  if (
    !guidanceStyleClassification &&
    !bigPictureGrowthGuidance &&
    !currentYearRevenueGuidance &&
    priorTwoYearAccuracy.length === 0 &&
    !credibilityVerdict &&
    guidanceItems.length === 0
  ) {
    return null;
  }

  return {
    companyCode: row.company_code,
    generatedAtRaw,
    updatedAtRaw,
    analysisWindowQuarters: asNumber(row.analysis_window_quarters),
    guidanceStyleClassification,
    bigPictureGrowthGuidance,
    currentYearRevenueGuidance,
    priorTwoYearAccuracy,
    credibilityVerdict,
    guidanceItems,
    sourceFiles,
    details,
  };
}
