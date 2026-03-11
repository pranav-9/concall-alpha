import type {
  GuidanceStatusKey,
  GuidanceTrackingRow,
  NormalizedGuidanceItem,
  NormalizedGuidanceMention,
  NormalizedGuidanceStatusKey,
} from "@/lib/guidance-tracking/types";

type JsonRecord = Record<string, unknown>;
type SortSignal = {
  sourceRank: number;
  value: number;
};

const GUIDANCE_STATUS_META: Record<GuidanceStatusKey, { label: string; priority: number }> = {
  revised: { label: "Revised", priority: 0 },
  delayed: { label: "Delayed", priority: 1 },
  active: { label: "Active", priority: 2 },
  not_yet_clear: { label: "Not Yet Clear", priority: 3 },
  met: { label: "Met", priority: 4 },
  dropped: { label: "Dropped", priority: 5 },
};

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

const toTitleCase = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) return null;
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeYearToken = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;
  return digits.length >= 2 ? digits.slice(-2) : digits.padStart(2, "0");
};

const normalizeYearForSort = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return Number.NEGATIVE_INFINITY;
  const parsed = parseInt(digits, 10);
  if (!Number.isFinite(parsed)) return Number.NEGATIVE_INFINITY;
  return digits.length <= 2 ? 2000 + parsed : parsed;
};

export const formatGuidancePeriodLabel = (value: string | null | undefined) => {
  if (!value) return null;

  const normalized = value
    .trim()
    .replace(/’/g, "'")
    .replace(/\s+/g, " ");

  const quarterMatch = normalized.match(/^Q\s*([1-4])\s*FY\s*'?\s*(\d{2,4})$/i);
  if (quarterMatch) {
    return `Q${quarterMatch[1]} FY${normalizeYearToken(quarterMatch[2])}`;
  }

  const halfMatch = normalized.match(/^H\s*([12])\s*FY\s*'?\s*(\d{2,4})$/i);
  if (halfMatch) {
    return `H${halfMatch[1]} FY${normalizeYearToken(halfMatch[2])}`;
  }

  const fiscalYearMatch = normalized.match(/^FY\s*'?\s*(\d{2,4})$/i);
  if (fiscalYearMatch) {
    return `FY${normalizeYearToken(fiscalYearMatch[1])}`;
  }

  return normalized;
};

const periodToSortSignal = (value: string | null | undefined): SortSignal | null => {
  const formatted = formatGuidancePeriodLabel(value);
  if (!formatted) return null;

  const quarterMatch = formatted.match(/^Q([1-4]) FY(\d{2,4})$/i);
  if (quarterMatch) {
    return {
      sourceRank: 2,
      value: normalizeYearForSort(quarterMatch[2]) * 10 + parseInt(quarterMatch[1], 10),
    };
  }

  const halfMatch = formatted.match(/^H([12]) FY(\d{2,4})$/i);
  if (halfMatch) {
    return {
      sourceRank: 2,
      value: normalizeYearForSort(halfMatch[2]) * 10 + (halfMatch[1] === "1" ? 2 : 4),
    };
  }

  const fiscalYearMatch = formatted.match(/^FY(\d{2,4})$/i);
  if (fiscalYearMatch) {
    return {
      sourceRank: 2,
      value: normalizeYearForSort(fiscalYearMatch[1]) * 10 + 5,
    };
  }

  return null;
};

const dateToSortSignal = (value: string | null | undefined): SortSignal | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return { sourceRank: 1, value: timestamp };
};

const normalizeStatus = (
  value: string | null | undefined,
): { key: NormalizedGuidanceStatusKey; label: string; priority: number } => {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  let key: NormalizedGuidanceStatusKey = "unknown";
  if (normalized) {
    if (normalized in GUIDANCE_STATUS_META) {
      key = normalized as GuidanceStatusKey;
    } else if (
      normalized === "notclear" ||
      normalized === "unclear" ||
      normalized === "not_clear"
    ) {
      key = "not_yet_clear";
    } else if (
      normalized === "ongoing" ||
      normalized === "in_progress" ||
      normalized === "open" ||
      normalized === "on_track"
    ) {
      key = "active";
    } else if (
      normalized === "achieved" ||
      normalized === "complete" ||
      normalized === "completed" ||
      normalized === "fulfilled"
    ) {
      key = "met";
    } else if (
      normalized === "withdrawn" ||
      normalized === "cancelled" ||
      normalized === "canceled"
    ) {
      key = "dropped";
    } else if (normalized.startsWith("revised")) {
      key = "revised";
    } else if (normalized === "postponed") {
      key = "delayed";
    }
  }

  if (key !== "unknown") {
    const meta = GUIDANCE_STATUS_META[key];
    return { key, label: meta.label, priority: meta.priority };
  }

  return {
    key,
    label: toTitleCase(value) ?? "Unknown",
    priority: 6,
  };
};

const comparableText = (value: string | null | undefined) =>
  value?.trim().replace(/\s+/g, " ").toLowerCase() ?? null;

const normalizeMention = (value: unknown): NormalizedGuidanceMention | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const period = formatGuidancePeriodLabel(asString(row.period));
  const sourceUrl = asString(row.source_url);
  const mentionText = asString(row.mention_text) ?? asString(row.note);
  const documentType = toTitleCase(asString(row.document_type));
  const interpretation = toTitleCase(asString(row.interpretation));

  if (!period && !sourceUrl && !mentionText && !documentType && !interpretation) {
    return null;
  }

  return {
    period,
    sourceUrl,
    mentionText,
    documentType,
    interpretation,
  };
};

const comparePeriodsAscending = (a: string, b: string) => {
  const aSort = periodToSortSignal(a);
  const bSort = periodToSortSignal(b);

  if (aSort && bSort && aSort.value !== bSort.value) {
    return aSort.value - bSort.value;
  }
  if (aSort && !bSort) return -1;
  if (!aSort && bSort) return 1;
  return a.localeCompare(b);
};

const comparePeriodsDescending = (a: string, b: string) => comparePeriodsAscending(b, a);

export const formatGuidanceTypeLabel = (value: string | null | undefined) => toTitleCase(value);

const getLatestMentionSortSignal = (item: NormalizedGuidanceItem): SortSignal => {
  const periodSignal = periodToSortSignal(item.latestMentionPeriod);
  if (periodSignal) return periodSignal;

  const dateSignal = dateToSortSignal(item.generatedAtRaw);
  if (dateSignal) return dateSignal;

  return { sourceRank: 0, value: Number.NEGATIVE_INFINITY };
};

const getStatusPriority = (statusKey: NormalizedGuidanceStatusKey) => {
  return statusKey === "unknown" ? 6 : GUIDANCE_STATUS_META[statusKey].priority;
};

export const compareGuidanceItems = (
  a: NormalizedGuidanceItem,
  b: NormalizedGuidanceItem,
) => {
  const aSignal = getLatestMentionSortSignal(a);
  const bSignal = getLatestMentionSortSignal(b);

  if (bSignal.sourceRank !== aSignal.sourceRank) {
    return bSignal.sourceRank - aSignal.sourceRank;
  }

  if (bSignal.value !== aSignal.value) {
    return bSignal.value - aSignal.value;
  }

  const statusDiff = getStatusPriority(a.statusKey) - getStatusPriority(b.statusKey);
  if (statusDiff !== 0) {
    return statusDiff;
  }

  const aConfidence = a.confidence ?? Number.NEGATIVE_INFINITY;
  const bConfidence = b.confidence ?? Number.NEGATIVE_INFINITY;
  if (bConfidence !== aConfidence) {
    return bConfidence - aConfidence;
  }

  return b.id - a.id;
};

const normalizeGuidanceTrackingRow = (
  row: GuidanceTrackingRow,
): NormalizedGuidanceItem | null => {
  const sourceMentions = parseJsonArrayLike(row.source_mentions)
    .map((entry) => normalizeMention(entry))
    .filter((entry): entry is NormalizedGuidanceMention => Boolean(entry));

  const firstMention = parseJsonObjectLike(row.first_mentioned_in);
  const firstMentionPeriodFromField = formatGuidancePeriodLabel(asString(firstMention?.period));
  const earliestMentionPeriod =
    sourceMentions
      .map((mention) => mention.period)
      .filter((period): period is string => Boolean(period))
      .sort(comparePeriodsAscending)[0] ?? null;
  const firstMentionPeriod = firstMentionPeriodFromField ?? earliestMentionPeriod;

  const latestMentionPeriod =
    sourceMentions
      .map((mention) => mention.period)
      .filter((period): period is string => Boolean(period))
      .sort(comparePeriodsDescending)[0] ?? firstMentionPeriod;

  const mentionedPeriods = Array.from(
    new Set(
      [firstMentionPeriodFromField, ...sourceMentions.map((mention) => mention.period)].filter(
        (period): period is string => Boolean(period),
      ),
    ),
  ).sort(comparePeriodsAscending);

  const guidanceText =
    asString(row.guidance_text) ??
    asString(row.latest_view) ??
    asString(row.status_reason);

  if (!guidanceText) return null;

  const latestViewRaw = asString(row.latest_view);
  const statusReasonRaw = asString(row.status_reason);
  const latestView =
    comparableText(latestViewRaw) === comparableText(guidanceText) ? null : latestViewRaw;
  const statusReason =
    comparableText(statusReasonRaw) === comparableText(guidanceText) ||
    comparableText(statusReasonRaw) === comparableText(latestView)
      ? null
      : statusReasonRaw;

  const normalizedStatus = normalizeStatus(asString(row.status));

  return {
    id: row.id,
    companyCode: row.company_code,
    guidanceKey: row.guidance_key,
    guidanceText,
    guidanceType: asString(row.guidance_type),
    guidanceTypeLabel: formatGuidanceTypeLabel(asString(row.guidance_type)),
    firstMentionPeriod,
    latestMentionPeriod,
    targetPeriod: formatGuidancePeriodLabel(asString(row.target_period)),
    mentionedPeriods,
    statusKey: normalizedStatus.key,
    statusLabel: normalizedStatus.label,
    latestView,
    statusReason,
    confidence: asNumber(row.confidence),
    generatedAtRaw: asString(row.generated_at),
    sourceMentions,
  };
};

export function normalizeGuidanceTrackingRows(
  rows: GuidanceTrackingRow[] | null | undefined,
): NormalizedGuidanceItem[] {
  return (rows ?? [])
    .map((row) => normalizeGuidanceTrackingRow(row))
    .filter((item): item is NormalizedGuidanceItem => Boolean(item))
    .sort(compareGuidanceItems);
}
