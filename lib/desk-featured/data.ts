import "server-only";

import { unstable_cache } from "next/cache";

import { logger } from "@/lib/logger";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import { RESEARCH_SLOTS, SELECTION_ORDER } from "./select";
import { parseFeaturedRead, type DeskFeaturedReadRow, type FeaturedRead } from "./types";

export const DESK_FEATURED_READ_TAG = "desk-featured-read";

// Only genuinely notable upgrades earn a place on the desk — routine quarter /
// valuation refreshes score below this and stay in the /activity tape only.
const MIN_FEATURE_WEIGHT = 40;

// Over-fetch the list several times over so rows that fail parseFeaturedRead (a
// bad enum, a missing headline), a company's older cards (one row per company),
// Journal cards (their own block) and cards on companies off discovery (the
// desk drops them; producers write cards for every deep-track) can't starve the
// list. Derived, not a bare number: the headroom is the point, not the number.
const ROW_HEADROOM = 6;
const READ_LIMIT = RESEARCH_SLOTS * ROW_HEADROOM;
// Live pins are rare (one editorial pick at a time); this only bounds the read.
const PIN_LIMIT = 3;

const BASE_COLUMNS =
  "id,company_code,company_name,sector,section,tag_label,change_kind,headline,summary,section_href,feature_weight,published_at,status";
// Added by a manual DDL step (lib/supabase/desk_featured_read.sql, 2026-09-14).
// Until it is applied, selecting them fails with Postgres 42703 (undefined
// column), so the read falls back to BASE_COLUMNS — shipping the portal before
// the DDL must not hide the whole strip.
const IMAGE_COLUMNS = "image_url,image_alt";
// Added by a manual DDL step too (2026-10-11): the editorial pin. Same 42703
// fallback, tried first because it is the newest column.
const PIN_COLUMNS = "pinned_until";
const UNDEFINED_COLUMN = "42703";

const readFeaturedReads = async (): Promise<FeaturedRead[]> => {
  try {
    const supabase = createPublicReadClient();
    // Captured once at cache fill, so a card surfaces within one revalidate window.
    const now = new Date().toISOString();
    const pool = (columns: string) =>
      supabase
        .from("desk_featured_read")
        .select(columns)
        .eq("status", "eligible")
        .gte("feature_weight", MIN_FEATURE_WEIGHT)
        // Recency now decides every slot, so a future-dated row (a typo'd year, an
        // IST time stored without its offset) would pin the strip until that date
        // arrives. published_at is producer-written; hide rows until it's real.
        .lte("published_at", now);
    const runQuery = (columns: string) => {
      let query = pool(columns);

      // Driven from SELECTION_ORDER rather than hand-written keys, so the fetch
      // and selectResearchUpdates cannot drift apart. The leading key
      // (published_at desc) is what puts the freshest eligible rows inside
      // READ_LIMIT — filters apply before the limit, so a different lead key
      // could drop the newest read before selection ever sees it. The trailing
      // key only makes exact ties resolve the same way in SQL and in memory.
      for (const { column, ascending } of SELECTION_ORDER) {
        query = query.order(column, { ascending, nullsFirst: false });
      }
      return query.limit(READ_LIMIT);
    };

    // Column fallbacks, newest DDL first: pin (2026-10-11), then image
    // (2026-09-14), then the original list.
    let { data, error } = await runQuery(`${BASE_COLUMNS},${IMAGE_COLUMNS},${PIN_COLUMNS}`);
    const hasPinColumn = error?.code !== UNDEFINED_COLUMN;
    if (!hasPinColumn) {
      ({ data, error } = await runQuery(`${BASE_COLUMNS},${IMAGE_COLUMNS}`));
    }
    if (error?.code === UNDEFINED_COLUMN) {
      ({ data, error } = await runQuery(BASE_COLUMNS));
    }

    if (error) throw error;

    const rows = (data ?? []) as unknown as DeskFeaturedReadRow[];

    // A live pin can be older than the recency window (a week-old deep dive
    // behind a dozen fresher reads), so fetch live pins on their own and union
    // them in; selectResearchUpdates (and the Journal block, for a pinned post)
    // puts them first.
    if (hasPinColumn) {
      const pinned = await pool(`${BASE_COLUMNS},${IMAGE_COLUMNS},${PIN_COLUMNS}`)
        .gt("pinned_until", now)
        .order("published_at", { ascending: false })
        .limit(PIN_LIMIT);
      if (pinned.error) throw pinned.error;
      const seen = new Set(rows.map((r) => r.id));
      for (const r of (pinned.data ?? []) as unknown as DeskFeaturedReadRow[]) {
        if (!seen.has(r.id)) rows.push(r);
      }
    }

    return rows
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
