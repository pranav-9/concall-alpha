import "server-only";

import { createPublicReadClient } from "@/lib/supabase/public-read";

/** The story engine's one-liner for a company (company_story). */
export type CompanyStoryLine = {
  /** Short label for what drives the story, e.g. "400 kV grid transformers". */
  engine: string;
  /** One sentence on the story so far. */
  line: string;
};

/**
 * company_story rows for a handful of companies, keyed by UPPERCASE code. One
 * read for the whole set (never per company). Best-effort like the company
 * page's own read (lib/company-overview-cache.ts fetchCompanyStory): a missing
 * table, an RLS refusal or a half-written row leaves that company out, and the
 * caller falls back to what it already has.
 */
export async function getCompanyStoryLines(codes: readonly string[]): Promise<Record<string, CompanyStoryLine>> {
  const keys = [...new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean))];
  if (keys.length === 0) return {};
  try {
    const { data, error } = await createPublicReadClient()
      .from("company_story")
      .select("company_code, engine_tag, story_line")
      .in("company_code", keys);
    if (error || !data) return {};
    const out: Record<string, CompanyStoryLine> = {};
    for (const row of data as { company_code: string | null; engine_tag: unknown; story_line: unknown }[]) {
      const engine = typeof row.engine_tag === "string" ? row.engine_tag.trim() : "";
      const line = typeof row.story_line === "string" ? row.story_line.trim() : "";
      if (row.company_code && engine && line) out[row.company_code.toUpperCase()] = { engine, line };
    }
    return out;
  } catch {
    return {};
  }
}
