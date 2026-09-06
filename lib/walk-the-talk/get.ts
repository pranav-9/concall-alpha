import { cache } from "react";

import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import type { GuidanceSnapshotRow } from "@/lib/guidance-snapshot/types";
import { createClient } from "@/lib/supabase/server";

import { normalizeWalkTheTalk } from "./normalize";

// Server-side fetcher. Walk-the-talk reads the SAME row as GuidanceHistoryPanel
// (both consume guidance_snapshot). React's `cache()` dedupes within a single
// request — the actual Supabase query runs once per page load even when both
// panels are wired in parallel. A later refactor could centralise the fetch
// in lib/company-overview-cache.ts; for v1, separate cached fetches are fine.

const COLUMNS =
  "company_code, generated_at, analysis_window_quarters, guidance_style_classification, big_picture_growth_guidance, current_year_revenue_guidance, prior_two_year_accuracy, credibility_verdict, guidance_items, source_files, details, updated_at";

export const getWalkTheTalk = cache(async (code: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guidance_snapshot")
    .select(COLUMNS)
    .eq("company_code", code)
    // No company has more than one snapshot row today, but nothing enforces
    // that, and without an explicit order a second row would let this read
    // and GuidanceHistoryPanel's read disagree on which one is "current"
    // (/plan-eng-review outside-voice finding, 2026-09-06). Same ordering
    // as that panel's own guidance_snapshot query.
    .order("generated_at", { ascending: false })
    .limit(1);

  const row = (data?.[0] as GuidanceSnapshotRow | undefined) ?? null;
  const snapshot = normalizeGuidanceSnapshot(row);
  return normalizeWalkTheTalk(snapshot, code);
});
