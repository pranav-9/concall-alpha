import "server-only";

import { unstable_cache } from "next/cache";

import { currentReportingQuarter } from "@/lib/current-quarter";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import type { GuidanceSnapshotRow } from "@/lib/guidance-snapshot/types";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import { buildGuidanceVerdict } from "@/lib/guidance-tracking/verdict";
import { logger } from "@/lib/logger";
import { createPublicReadClient } from "@/lib/supabase/public-read";

import { DESK_FEATURED_READ_TAG } from "./data";
import { buildGuidanceRecord, type GuidanceRecord } from "./guidance-record";

// Only what the verdict needs — guidance_items is the payload; details and
// source_files are not read by buildGuidanceVerdict.
const SNAPSHOT_COLUMNS = "company_code, generated_at, credibility_verdict, guidance_items, updated_at";
const TRACKING_COLUMNS =
  "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details";

type SnapshotRow = GuidanceSnapshotRow & { credibility_verdict?: unknown };

// Same item source, quarter anchor and stored verdict as the company page's
// Guidance section and the overview cache (lib/company-overview-cache.ts): the
// latest guidance_snapshot's items when a snapshot exists, else the legacy
// guidance_tracking rows.
const readGuidanceRecords = async (codes: string[]): Promise<Record<string, GuidanceRecord>> => {
  if (codes.length === 0) return {};
  try {
    const supabase = createPublicReadClient();
    const { data: snapshotData, error: snapshotError } = await supabase
      .from("guidance_snapshot")
      .select(SNAPSHOT_COLUMNS)
      .in("company_code", codes)
      .order("generated_at", { ascending: false });
    if (snapshotError) throw snapshotError;

    const latestSnapshot = new Map<string, SnapshotRow>();
    for (const row of (snapshotData ?? []) as SnapshotRow[]) {
      const code = row.company_code?.toUpperCase();
      if (code && !latestSnapshot.has(code)) latestSnapshot.set(code, row);
    }

    const legacyCodes = codes.filter((code) => !latestSnapshot.has(code));
    const legacyRows = new Map<string, GuidanceTrackingRow[]>();
    if (legacyCodes.length > 0) {
      const { data: trackingData, error: trackingError } = await supabase
        .from("guidance_tracking")
        .select(TRACKING_COLUMNS)
        .in("company_code", legacyCodes)
        .order("generated_at", { ascending: false })
        .order("id", { ascending: false });
      if (trackingError) throw trackingError;
      for (const row of (trackingData ?? []) as GuidanceTrackingRow[]) {
        const code = row.company_code?.toUpperCase();
        if (!code) continue;
        const bucket = legacyRows.get(code);
        if (bucket) bucket.push(row);
        else legacyRows.set(code, [row]);
      }
    }

    const current = currentReportingQuarter();
    const records: Record<string, GuidanceRecord> = {};
    for (const code of codes) {
      const snapshot = latestSnapshot.get(code);
      const items = snapshot
        ? (normalizeGuidanceSnapshot(snapshot)?.guidanceItems ?? [])
        : normalizeGuidanceTrackingRows(legacyRows.get(code) ?? []);
      if (items.length === 0) continue;
      const record = buildGuidanceRecord(
        buildGuidanceVerdict(items, current, snapshot?.credibility_verdict),
      );
      if (record) records[code] = record;
    }
    return records;
  } catch (error) {
    // The record is garnish on the card: a failed read drops it, never the card.
    logger.warn("desk-featured-read: guidance record read failed; cards render without it", { error });
    return {};
  }
};

const getCachedRecordsForCodes = unstable_cache(readGuidanceRecords, ["desk-featured-guidance-record-v1"], {
  revalidate: 300,
  tags: [DESK_FEATURED_READ_TAG],
});

/** Guidance records keyed by upper-case company code; missing codes have none. */
export function getCachedGuidanceRecords(codes: string[]): Promise<Record<string, GuidanceRecord>> {
  // Normalised before the cache boundary so the same three cards share one entry.
  const normalized = [...new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean))].sort();
  return getCachedRecordsForCodes(normalized);
}
