import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import type {
  GuidanceSnapshotRow,
  NormalizedGuidanceSnapshot,
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

const normalizeSnapshotGuidanceItems = (
  companyCode: string,
  generatedAtRaw: string | null,
  value: unknown,
) => {
  const trackingRows: GuidanceTrackingRow[] = [];

  parseJsonArrayLike(value).forEach((entry, index) => {
    const row = parseJsonObjectLike(entry);
    if (!row) return;
    const guidanceKey = asString(row.guidance_key);
    if (!guidanceKey) return;

    trackingRows.push({
      id: index + 1,
      company_code: companyCode,
      guidance_key: guidanceKey,
      guidance_text: asString(row.guidance_text),
      guidance_family: asString(row.guidance_family),
      metric_subtype: asString(row.metric_subtype),
      value: row.value,
      horizon: row.horizon,
      first_mentioned_in: row.first_mentioned_in,
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
  const guidanceItems = normalizeSnapshotGuidanceItems(
    row.company_code,
    generatedAtRaw,
    row.guidance_items,
  );
  const details = parseJsonObjectLike(row.details);
  const sourceFiles = parseJsonArrayLike(row.source_files);

  if (guidanceItems.length === 0) {
    return null;
  }

  return {
    companyCode: row.company_code,
    generatedAtRaw,
    updatedAtRaw,
    analysisWindowQuarters: asNumber(row.analysis_window_quarters),
    guidanceItems,
    sourceFiles,
    details,
  };
}
