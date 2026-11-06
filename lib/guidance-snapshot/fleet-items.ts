import "server-only";

// Guidance items for MANY companies at once — the fleet read behind the
// scanners' Guidance upgrades scan and the quarter tracker's Guidance column.
// Same item source as the company page's Guidance section and the watchlist
// signals: the latest snapshot's items when one exists, else the legacy
// guidance_tracking rows.
//
// Sized for the whole fleet (2026-10-06 prod incident): one read of every
// snapshot WITH `details` was 17.8MB / ~13s and hit Postgres' statement
// timeout on every request. `details` (forward strength, strategy narrative —
// ~13MB of it) is never read here, so it is not selected, and both tables are
// read in batches of BATCH companies so each statement stays short. A failed
// read THROWS, so a caller's unstable_cache never stores an empty fleet.

import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import type { GuidanceSnapshotRow } from "@/lib/guidance-snapshot/types";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow, NormalizedGuidanceItem } from "@/lib/guidance-tracking/types";
import { createPublicReadClient } from "@/lib/supabase/public-read";

const SNAPSHOT_COLUMNS = "company_code, generated_at, credibility_verdict, guidance_items";
const TRACKING_COLUMNS =
  "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details";

type SnapshotRow = GuidanceSnapshotRow & { credibility_verdict?: unknown };

export type FleetGuidance = {
  items: NormalizedGuidanceItem[];
  /** Raw guidance_snapshot.credibility_verdict; undefined on the legacy path. */
  credibility: unknown;
};

const BATCH = 12;

const upper = (code: string | null | undefined) => (code ?? "").trim().toUpperCase();

const chunk = <T>(xs: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, (i + 1) * size));

/** Every company in `codes` with guidance on record (upper-cased code → items). Throws on a failed read. */
export async function readFleetGuidance(codes: readonly string[]): Promise<Map<string, FleetGuidance>> {
  const supabase = createPublicReadClient();
  const wanted = [...new Set(codes.map(upper).filter(Boolean))];

  const snapshotBatches = await Promise.all(
    chunk(wanted, BATCH).map(async (batch) => {
      const { data, error } = await supabase
        .from("guidance_snapshot")
        .select(SNAPSHOT_COLUMNS)
        .in("company_code", batch)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SnapshotRow[];
    }),
  );

  const latestSnapshot = new Map<string, SnapshotRow>();
  for (const row of snapshotBatches.flat()) {
    const code = upper(row.company_code);
    const seen = latestSnapshot.get(code);
    if (code && (!seen || String(row.generated_at ?? "") > String(seen.generated_at ?? ""))) {
      latestSnapshot.set(code, row);
    }
  }

  const legacyCodes = wanted.filter((code) => !latestSnapshot.has(code));
  const legacyRows = new Map<string, GuidanceTrackingRow[]>();
  const trackingBatches = await Promise.all(
    chunk(legacyCodes, BATCH).map(async (batch) => {
      const { data, error } = await supabase
        .from("guidance_tracking")
        .select(TRACKING_COLUMNS)
        .in("company_code", batch)
        .order("generated_at", { ascending: false })
        .order("id", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GuidanceTrackingRow[];
    }),
  );
  for (const row of trackingBatches.flat()) {
    const code = upper(row.company_code);
    if (!code) continue;
    const bucket = legacyRows.get(code);
    if (bucket) bucket.push(row);
    else legacyRows.set(code, [row]);
  }

  const out = new Map<string, FleetGuidance>();
  for (const code of wanted) {
    const snapshot = latestSnapshot.get(code);
    const items = snapshot
      ? (normalizeGuidanceSnapshot(snapshot)?.guidanceItems ?? [])
      : normalizeGuidanceTrackingRows(legacyRows.get(code) ?? []);
    if (items.length === 0) continue;
    out.set(code, { items, credibility: snapshot?.credibility_verdict });
  }
  return out;
}
