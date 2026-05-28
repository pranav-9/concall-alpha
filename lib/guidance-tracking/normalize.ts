import type {
  GuidanceFamily,
  GuidanceMetricSubtype,
  GuidanceStatusKey,
  GuidanceTrackingRow,
  NormalizedGuidanceItem,
  NormalizedGuidanceMention,
  NormalizedGuidanceStatusKey,
  NormalizedGuidanceTrailItem,
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

// Extract the 4-digit FY end-year from a horizon string like "FY26",
// "FY'27", "Q3 FY26", or a bare current-FY token. Distinct from
// `normalizeYearForSort` because that helper concatenates ALL digits
// (so "Q3 FY26" becomes 2326, not 2026). This one anchors on the FY
// token specifically.
export const extractFyYear = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const match = value.match(/FY\s*'?\s*(\d{2,4})/i);
  if (!match) return null;
  const digits = match[1];
  const parsed = parseInt(digits, 10);
  if (!Number.isFinite(parsed)) return null;
  return digits.length <= 2 ? 2000 + parsed : parsed;
};

// Reasoning-prose hints in `value_text` — when the LLM had nothing
// concrete to quote, it sometimes stuffs meta-commentary into the value
// field instead of leaving it null. We treat those as "no value" rather
// than badging the prose.
const REASONING_PROSE_HINTS: RegExp[] = [
  /not explicitly (quantified|stated)/i,
  /no firm.*commit/i,
  /no specific.*guidance/i,
  /operational leverage mentioned/i,
  /management indicated/i,
];

export const isReasoningProse = (text: string | null | undefined): boolean => {
  if (!text) return false;
  return REASONING_PROSE_HINTS.some((re) => re.test(text));
};

// Extract a financial-amount headline (rupee crores, dollar billions, etc.)
// from a `value_text` like:
//   "INR 1,500 crores, later revised to INR 1,800 crores"  →  "₹1,800cr+"
//   "INR 60-70 crores per year for five years"              →  "₹60-70cr"
//   "over INR 2,000 crores, then INR 2,200-plus crores"     →  "₹2,200cr+"
//   "$1 billion kitchen business"                           →  "$1B"
//
// Strategy: find all "<number>[ to <number>] <unit>" occurrences and pick
// the LAST one (revision sequences end with the current target). Append
// "+" when "over"/"above"/"plus"/"surpass"/"cross" is in the immediate
// vicinity AND the match isn't a range.
export const formatAbsoluteAmount = (text: string | null | undefined): string | null => {
  if (!text) return null;
  const pattern =
    /(\d+(?:,\d+)*(?:\.\d+)?)(?:\s*(?:to|-|–)\s*(\d+(?:,\d+)*(?:\.\d+)?))?(?:[^\d\n]{0,15}?)(crore|cr\b|bn\b|billion|mn\b|million)/gi;
  const matches = [...text.matchAll(pattern)];
  if (matches.length === 0) return null;
  const m = matches[matches.length - 1];
  const num1 = m[1].replace(/,/g, "");
  const num2 = m[2]?.replace(/,/g, "");
  const unitToken = m[3].toLowerCase();
  const unit = unitToken.startsWith("cr")
    ? "cr"
    : /bn|billion/.test(unitToken)
      ? "B"
      : "M";
  const symbol =
    /(INR|Rs\.?|₹)/i.test(text)
      ? "₹"
      : /\$|USD|dollar/i.test(text)
        ? "$"
        : unit === "cr"
          ? "₹"
          : "$";
  const matchStart = m.index ?? 0;
  const matchEnd = matchStart + m[0].length;
  const around = text.slice(Math.max(0, matchStart - 12), Math.min(text.length, matchEnd + 12));
  const hasPlus = /\+|\bplus\b|\bover\b|\babove\b|\bsurpass|\bcross/i.test(around);
  if (num2) return `${symbol}${num1}-${num2}${unit}`;
  return `${symbol}${num1}${unit}${hasPlus ? "+" : ""}`;
};

// Compute the current Indian fiscal year (April–March cycle) as an
// FY-suffixed string ("FY27"). FY label uses the calendar year in which
// the fiscal year ends, so April 2026 → "FY27" and February 2027 →
// "FY27" too. Optional `today` for deterministic tests.
export const currentFiscalYear = (today: Date = new Date()): string => {
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const fyEndYear = month >= 4 ? year + 1 : year;
  return `FY${String(fyEndYear).slice(-2)}`;
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

const normalizeTrailItem = (value: unknown): NormalizedGuidanceTrailItem | null => {
  const row = parseJsonObjectLike(value);
  if (!row) return null;

  const quarter = formatGuidancePeriodLabel(asString(row.quarter));
  const summary = asString(row.summary);
  const excerpt = asString(row.excerpt);
  const mentionType = toTitleCase(asString(row.mention_type));
  const documentType = toTitleCase(asString(row.document_type));
  const documentLabel = asString(row.document_label);
  const sourceReference = asString(row.source_reference);
  const confidence = asNumber(row.confidence);
  const positionInStory = asNumber(row.position_in_story);

  if (
    !quarter &&
    !summary &&
    !excerpt &&
    !mentionType &&
    !documentType &&
    !documentLabel &&
    !sourceReference &&
    confidence == null &&
    positionInStory == null
  ) {
    return null;
  }

  return {
    quarter,
    summary,
    excerpt,
    mentionType,
    documentType,
    documentLabel,
    sourceReference,
    confidence,
    positionInStory,
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

const compareTrailItemsAscending = (
  a: NormalizedGuidanceTrailItem,
  b: NormalizedGuidanceTrailItem,
) => {
  const aPosition = a.positionInStory;
  const bPosition = b.positionInStory;
  const aHasPosition = typeof aPosition === "number" && Number.isFinite(aPosition);
  const bHasPosition = typeof bPosition === "number" && Number.isFinite(bPosition);

  if (aHasPosition && bHasPosition && aPosition !== bPosition) {
    return aPosition - bPosition;
  }
  if (aHasPosition && !bHasPosition) return -1;
  if (!aHasPosition && bHasPosition) return 1;

  if (a.quarter && b.quarter) {
    const quarterCompare = comparePeriodsAscending(a.quarter, b.quarter);
    if (quarterCompare !== 0) return quarterCompare;
  } else if (a.quarter && !b.quarter) {
    return -1;
  } else if (!a.quarter && b.quarter) {
    return 1;
  }

  return (a.summary ?? a.excerpt ?? "").localeCompare(b.summary ?? b.excerpt ?? "");
};

const buildTrailFromSourceMentions = (
  sourceMentions: NormalizedGuidanceMention[],
): NormalizedGuidanceTrailItem[] =>
  sourceMentions
    .map((mention): NormalizedGuidanceTrailItem | null => {
      const summary = mention.interpretation ?? mention.mentionText;
      const excerpt =
        comparableText(mention.mentionText) === comparableText(summary)
          ? null
          : mention.mentionText;

      if (!mention.period && !summary && !excerpt && !mention.documentType) {
        return null;
      }

      return {
        quarter: mention.period,
        summary,
        excerpt,
        mentionType: null,
        documentType: mention.documentType,
        documentLabel: null,
        sourceReference: null,
        confidence: null,
        positionInStory: null,
      };
    })
    .filter((item): item is NormalizedGuidanceTrailItem => Boolean(item))
    .sort(compareTrailItemsAscending);

export const formatGuidanceTypeLabel = (value: string | null | undefined) => toTitleCase(value);

const ALLOWED_FAMILIES: ReadonlySet<GuidanceFamily> = new Set(["growth", "margin"]);
const ALLOWED_SUBTYPES: ReadonlySet<GuidanceMetricSubtype> = new Set([
  "revenue",
  "ebitda",
  "pat",
  "gross",
]);
const SUBTYPE_DISPLAY: Record<GuidanceMetricSubtype, string> = {
  revenue: "Revenue",
  ebitda: "EBITDA",
  pat: "PAT",
  gross: "Gross",
};

const normalizeFamily = (value: unknown): GuidanceFamily | null => {
  const s = asString(value)?.toLowerCase();
  return s && ALLOWED_FAMILIES.has(s as GuidanceFamily) ? (s as GuidanceFamily) : null;
};

const normalizeSubtype = (value: unknown): GuidanceMetricSubtype | null => {
  const s = asString(value)?.toLowerCase();
  return s && ALLOWED_SUBTYPES.has(s as GuidanceMetricSubtype)
    ? (s as GuidanceMetricSubtype)
    : null;
};

export const formatMetricLabel = (
  family: GuidanceFamily | null,
  subtype: GuidanceMetricSubtype | null,
): string | null => {
  if (!family || !subtype) return null;
  const metric = SUBTYPE_DISPLAY[subtype];
  if (!metric) return null;
  if (family === "growth") return `${metric} Growth`;
  if (family === "margin") return `${metric} Margin`;
  return null;
};

export const formatHorizonLabel = (
  horizonType: string | null,
  appliesFrom: string | null,
  appliesTo: string | null,
  horizonText: string | null,
): string | null => {
  const from = appliesFrom && appliesFrom.toLowerCase() === "ongoing" ? null : appliesFrom;
  const to = appliesTo && appliesTo.toLowerCase() === "ongoing" ? null : appliesTo;
  const labelFrom = from ? formatGuidancePeriodLabel(from) ?? from : null;
  const labelTo = to ? formatGuidancePeriodLabel(to) ?? to : null;

  switch (horizonType) {
    case "single_quarter":
    case "single_fy":
      return labelFrom ?? labelTo;
    case "multi_quarter":
    case "multi_fy":
      if (labelFrom && labelTo && labelFrom !== labelTo) return `${labelFrom}–${labelTo}`;
      return labelFrom ?? labelTo;
    case "rolling":
      return horizonText ?? "Rolling";
    case "unspecified":
      return "Ongoing";
    default:
      if (labelFrom && labelTo && labelFrom !== labelTo) return `${labelFrom}–${labelTo}`;
      return labelFrom ?? labelTo ?? horizonText;
  }
};

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

// A thread is historical when its time window is fully behind today's FY.
// Ongoing / unspecified horizons (e.g. "Maintain X% margin") are never
// historical — they're standing commitments. Multi-year threads whose
// applies_to lands in the current FY or beyond are also not historical
// because they remain in scope.
export const isHistoricalGuidanceItem = (
  item: NormalizedGuidanceItem,
  currentFy: string,
): boolean => {
  if (item.horizonType === "unspecified") return false;
  const appliesTo = item.appliesTo ?? "";
  if (!appliesTo || appliesTo.toLowerCase() === "ongoing") return false;
  const itemYear = extractFyYear(appliesTo);
  const currentYear = extractFyYear(currentFy);
  if (itemYear == null || currentYear == null) return false;
  return itemYear < currentYear;
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
  const parsedTrail = parseJsonArrayLike(row.trail)
    .map((entry) => normalizeTrailItem(entry))
    .filter((entry): entry is NormalizedGuidanceTrailItem => Boolean(entry))
    .sort(compareTrailItemsAscending);
  const trail =
    parsedTrail.length > 0 ? parsedTrail : buildTrailFromSourceMentions(sourceMentions);

  const firstMention = parseJsonObjectLike(row.first_mentioned_in);
  const firstMentionPeriodFromField = formatGuidancePeriodLabel(asString(firstMention?.period));
  const trailPeriods = trail
    .map((item) => item.quarter)
    .filter((period): period is string => Boolean(period));
  const earliestMentionPeriod =
    [...trailPeriods].sort(comparePeriodsAscending)[0] ?? null;
  const firstMentionPeriod = firstMentionPeriodFromField ?? earliestMentionPeriod;

  const latestMentionPeriod =
    [...trailPeriods].sort(comparePeriodsDescending)[0] ?? firstMentionPeriod;

  const mentionedPeriods = Array.from(
    new Set(
      [firstMentionPeriodFromField, ...trailPeriods].filter(
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

  const guidanceFamily = normalizeFamily(row.guidance_family);
  const metricSubtype = normalizeSubtype(row.metric_subtype);
  const metricLabel = formatMetricLabel(guidanceFamily, metricSubtype);

  const horizonObj = parseJsonObjectLike(row.horizon);
  const horizonType = asString(horizonObj?.horizon_type)?.toLowerCase() ?? null;
  const appliesFrom = asString(horizonObj?.applies_from);
  const appliesTo = asString(horizonObj?.applies_to);
  const horizonText = asString(horizonObj?.horizon_text);
  const horizonLabel = formatHorizonLabel(horizonType, appliesFrom, appliesTo, horizonText);

  const valueObj = parseJsonObjectLike(row.value);
  const valuePercent = asNumber(valueObj?.magnitude_percent);
  const valueText = asString(valueObj?.value_text);

  return {
    id: row.id,
    companyCode: row.company_code,
    guidanceKey: row.guidance_key,
    guidanceText,
    guidanceFamily,
    metricSubtype,
    metricLabel,
    horizonType,
    appliesFrom,
    appliesTo,
    horizonLabel,
    valuePercent,
    valueText,
    firstMentionPeriod,
    latestMentionPeriod,
    mentionedPeriods,
    statusKey: normalizedStatus.key,
    statusLabel: normalizedStatus.label,
    latestView,
    statusReason,
    confidence: asNumber(row.confidence),
    generatedAtRaw: asString(row.generated_at),
    sourceMentions,
    trail,
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
