import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  parseStoryReads,
  STORY_WINDOW_DAYS,
} from "@/lib/announcement-story-read/select";
import type {
  AnnouncementStoryRead,
  AnnouncementStoryReadRow,
} from "@/lib/announcement-story-read/types";

/**
 * The judged story reads of the trailing seven days (announcement_story_read,
 * one row per filing — see lib/announcement-story-read/types.ts). The page sorts
 * them into "What moved a story this week" with selectTopStoryReads.
 *
 * Best-effort: a missing table (pre-DDL), an RLS refusal or a transient failure
 * returns no reads and no error, so /announcements keeps its tape; a
 * present-but-invalid payload is dropped and named in a warning. Never throws.
 */
export async function getRecentStoryReads(now: Date = new Date()): Promise<AnnouncementStoryRead[]> {
  try {
    const supabase = await createClient();
    const since = new Date(now.getTime() - STORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from("announcement_story_read")
      .select("announcement_id, score, payload")
      .eq("status", "judged")
      .gte("filed_at", since.toISOString())
      .order("filed_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const { reads, invalid } = parseStoryReads((data ?? []) as AnnouncementStoryReadRow[]);
    if (invalid.length > 0) {
      console.warn(`[announcement-story-read] ${invalid.length} payload(s) fail the v1 schema: ${invalid.join(", ")}`);
    }
    return reads;
  } catch (err) {
    console.warn("[announcement-story-read] unavailable:", (err as Error)?.message ?? err);
    return [];
  }
}
