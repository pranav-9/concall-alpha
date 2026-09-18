import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import type { GuidanceSnapshotRow } from "./types";

// The ONE raw guidance_snapshot read for the company page. The Guidance panel
// renders the whole row; the Growth panel reads only details.strategy_narrative
// off it for its "Growth engine" card. Going through one `cache()`d fetch means
// the two panels agree on which row is current and, when they render in the
// same request, share a single query (same reasoning as
// lib/walk-the-talk/get.ts).

const COLUMNS =
  "company_code, generated_at, analysis_window_quarters, credibility_verdict, guidance_items, source_files, details, updated_at";

export const getGuidanceSnapshotRow = cache(async (code: string): Promise<GuidanceSnapshotRow | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guidance_snapshot")
    .select(COLUMNS)
    .eq("company_code", code)
    .order("generated_at", { ascending: false })
    .limit(1);
  if (error) return null;
  return (data?.[0] as GuidanceSnapshotRow | undefined) ?? null;
});
