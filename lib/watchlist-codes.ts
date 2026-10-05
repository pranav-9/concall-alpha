import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Every company code on any of the reader's watchlists, UPPERCASE and deduped —
 * the substrate of the leaderboards' Watchlist filter. Reads through the
 * reader's own session (RLS), scoped to their lists by the join. Any failure
 * reads as "no watchlist companies": a filter chip never takes the page down.
 */
export async function getWatchlistCompanyCodes(userId: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("watchlist_items")
      .select("company_code, watchlists!inner(user_id)")
      .eq("watchlists.user_id", userId);
    if (error) {
      logger.warn("supabase: failed to load watchlist codes", { userId, error });
      return [];
    }
    return Array.from(
      new Set((data ?? []).map((row) => String(row.company_code).toUpperCase())),
    );
  } catch {
    return [];
  }
}
