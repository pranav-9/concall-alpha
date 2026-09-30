import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  normalizeAnnouncementDigest,
  type NormalizeDigestResult,
} from "@/lib/announcement-digest/normalize";
import type { AnnouncementDigestRow } from "@/lib/announcement-digest/types";

/**
 * The synthesized Announcements-tab cards for one company
 * (company_announcement_digest, one row per code — see
 * lib/announcement-digest/types.ts).
 *
 * Read live per request, outside the overview cache, because the producer
 * regenerates on the desk's hourly cadence and a cached overview row must never
 * hide a fresh digest (same reasoning as company_story). Best-effort: a missing
 * table (pre-DDL), an RLS refusal or a transient failure returns no digest and
 * no error, so the tab keeps its plain cards; a present-but-invalid payload
 * returns an error the caller logs (and the dev preview prints).
 */
export async function getCompanyAnnouncementDigest(
  companyCode: string,
): Promise<NormalizeDigestResult> {
  const code = companyCode.trim().toUpperCase();
  if (!code) return { digest: null, error: null };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_announcement_digest")
      .select("company_code, payload, generated_at, substrate_hash, model, updated_at")
      .eq("company_code", code)
      .maybeSingle();
    if (error) throw error;
    return normalizeAnnouncementDigest((data as AnnouncementDigestRow | null) ?? null);
  } catch (err) {
    console.warn("[announcement-digest] unavailable:", (err as Error)?.message ?? err);
    return { digest: null, error: null };
  }
}
