import "server-only";

import { unstable_cache } from "next/cache";

import { logger } from "@/lib/logger";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import { FEATURED_SLOTS, SELECTION_ORDER } from "./select";
import { parseFeaturedRead, type DeskFeaturedReadRow, type FeaturedRead } from "./types";

export const DESK_FEATURED_READ_TAG = "desk-featured-read";

// Only genuinely notable upgrades earn the front page — routine quarter /
// valuation refreshes score below this and stay in the recency ledger only.
const MIN_FEATURE_WEIGHT = 40;

// Over-fetch the three slots several times over so rows that fail
// parseFeaturedRead (a bad enum, a missing headline) can't starve the strip.
// Derived, not a bare 12: the headroom is the point, not the number.
const MALFORMED_ROW_HEADROOM = 4;
const READ_LIMIT = FEATURED_SLOTS * MALFORMED_ROW_HEADROOM;

const readFeaturedReads = async (): Promise<FeaturedRead[]> => {
  try {
    const supabase = createPublicReadClient();
    let query = supabase
      .from("desk_featured_read")
      .select(
        "id,company_code,company_name,sector,section,tag_label,change_kind,headline,summary,section_href,feature_weight,published_at,status",
      )
      .eq("status", "eligible")
      .gte("feature_weight", MIN_FEATURE_WEIGHT)
      // Recency now decides every slot, so a future-dated row (a typo'd year, an
      // IST time stored without its offset) would pin the strip until that date
      // arrives. published_at is producer-written; hide rows until it's real.
      // Captured at cache fill, so a card surfaces within one revalidate window.
      .lte("published_at", new Date().toISOString());

    // Driven from SELECTION_ORDER rather than hand-written keys, so the fetch
    // and selectFeaturedReads cannot drift apart. The leading key
    // (published_at desc) is what puts the freshest eligible rows inside
    // READ_LIMIT — filters apply before the limit, so a different lead key
    // could drop the newest read before selection ever sees it. The trailing
    // key only makes exact ties resolve the same way in SQL and in memory.
    for (const { column, ascending } of SELECTION_ORDER) {
      query = query.order(column, { ascending, nullsFirst: false });
    }

    const { data, error } = await query.limit(READ_LIMIT);

    if (error) throw error;

    return ((data ?? []) as DeskFeaturedReadRow[])
      .map(parseFeaturedRead)
      .filter((r): r is FeaturedRead => r !== null);
  } catch (error) {
    // A missing table (pre-concallyser-landing) or a transient read error must
    // not break the desk — the strip just renders nothing.
    logger.warn("desk-featured-read: read failed; hiding the strip", { error });
    return [];
  }
};

export const getCachedDeskFeaturedReads = unstable_cache(
  readFeaturedReads,
  [DESK_FEATURED_READ_TAG],
  {
    revalidate: 300,
    tags: [DESK_FEATURED_READ_TAG],
  },
);
