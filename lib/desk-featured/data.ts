import "server-only";

import { unstable_cache } from "next/cache";

import { logger } from "@/lib/logger";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import { parseFeaturedRead, type DeskFeaturedReadRow, type FeaturedRead } from "./types";

export const DESK_FEATURED_READ_TAG = "desk-featured-read";

// Only genuinely notable upgrades earn the front page — routine quarter /
// valuation refreshes score below this and stay in the recency ledger only.
const MIN_FEATURE_WEIGHT = 40;

// Over-fetch past the rotation pool so malformed rows that fail parseFeaturedRead
// don't starve the pool (selectFeaturedReads caps at POOL_SIZE anyway).
const READ_LIMIT = 24;

const readFeaturedReads = async (): Promise<FeaturedRead[]> => {
  try {
    const supabase = createPublicReadClient();
    const { data, error } = await supabase
      .from("desk_featured_read")
      .select(
        "id,company_code,company_name,sector,section,tag_label,change_kind,headline,summary,section_href,feature_weight,published_at,status",
      )
      .eq("status", "eligible")
      .gte("feature_weight", MIN_FEATURE_WEIGHT)
      .order("published_at", { ascending: false })
      .order("feature_weight", { ascending: false })
      .limit(READ_LIMIT);

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
