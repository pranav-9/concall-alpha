import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/auth-state";
import { logger } from "@/lib/logger";
import { resolveReaderWatchlist, type ReaderWatchlist } from "@/lib/reader-identity";

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

/**
 * The reader and their watchlist codes, asked once per request. The Watchlist
 * filter pages (/leaderboards, /scanners, /quarter-tracker) start it inside the
 * same Promise.all as their data reads, so neither the auth check nor the
 * watchlist query sits in front of the page's own data. Failure semantics are
 * resolveReaderWatchlist's: a watchlist failure never signs the reader out.
 */
export const getReaderWatchlist = cache(
  (): Promise<ReaderWatchlist> =>
    resolveReaderWatchlist({
      getUserId: getAuthenticatedUserId,
      getCodes: getWatchlistCompanyCodes,
    }),
);
