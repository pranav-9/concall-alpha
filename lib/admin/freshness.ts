// Pipeline freshness for the admin Overview: when each feed the portal reads
// last moved, against the cadence it is supposed to move at. The rules are
// pure (tests/admin-metrics.test.ts); `getPipelineFreshness` does the reads,
// one feed at a time, so a missing table never blanks the whole board.

import type { SupabaseClient } from "@supabase/supabase-js";

import { VALUATION_STALE_AFTER_DAYS } from "@/lib/valuation-check/normalize";

export type FreshnessTone = "fresh" | "warn" | "alarm" | "unknown";

export type FreshnessFeed = {
  key: string;
  label: string;
  /** What the timestamp is: "newest BSE filing on the tape". */
  detail: string;
  /** How often it is supposed to move. */
  cadence: string;
  /** The newest row's timestamp. */
  latestIso: string | null;
  /** For fleet feeds, the OLDEST company's timestamp — that is what goes stale. */
  oldestIso: string | null;
  warnAfterHours: number | null;
  alarmAfterHours: number | null;
  /** Where to act when it is stale (an Ops action), if the panel has one. */
  action: { label: string; href: string } | null;
  error: string | null;
};

const HOUR_MS = 60 * 60 * 1000;

export function ageHours(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, (now.getTime() - ms) / HOUR_MS);
}

/** "just now" · "35m ago" · "3h ago" · "2d ago" · "3w ago". */
export function describeAge(iso: string | null, now: Date = new Date()): string {
  const hours = ageHours(iso, now);
  if (hours == null) return "never";
  if (hours < 1 / 60) return "just now";
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  if (days < 21) return `${Math.round(days)}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

/**
 * The tone is read off the OLDEST timestamp when the feed has one (a fleet
 * feed is as stale as its most neglected company), else the newest.
 */
export function freshnessTone(feed: FreshnessFeed, now: Date = new Date()): FreshnessTone {
  if (feed.error) return "unknown";
  const pivot = feed.oldestIso ?? feed.latestIso;
  const hours = ageHours(pivot, now);
  if (hours == null) return "unknown";
  if (feed.alarmAfterHours != null && hours >= feed.alarmAfterHours) return "alarm";
  if (feed.warnAfterHours != null && hours >= feed.warnAfterHours) return "warn";
  return "fresh";
}

type Edge = { value: string | null; error: string | null };
type EdgeResult = { data: unknown; error: { message: string } | null };

/** One row's `key` off a query already ordered + limited to 1. */
async function readEdge(key: string, run: () => PromiseLike<EdgeResult>): Promise<Edge> {
  try {
    const { data, error } = await run();
    if (error) return { value: null, error: error.message };
    const first = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
    const raw = first?.[key];
    return { value: typeof raw === "string" ? raw : null, error: null };
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : String(err) };
  }
}

const DAY = 24;

/**
 * Every feed, in the order the board shows them. Each read is independent;
 * a feed whose table is missing reports its error and the rest still render.
 */
export async function getPipelineFreshness(supabase: SupabaseClient): Promise<FreshnessFeed[]> {
  const edge = (table: string, column: string, ascending: boolean) =>
    readEdge(column, () =>
      supabase.from(table).select(column).order(column, { ascending, nullsFirst: false }).limit(1),
    );
  const publishedValuation = (ascending: boolean) =>
    readEdge("priced_as_of", () =>
      supabase
        .from("valuation_check")
        .select("priced_as_of")
        .eq("valuation_published", true)
        .order("priced_as_of", { ascending, nullsFirst: false })
        .limit(1),
    );

  const [desk, scores, valuationNewest, valuationOldest, overviewNewest, overviewOldest, homeFeed, calendar] =
    await Promise.all([
      edge("bse_announcements", "filed_at", false),
      // scored_at lives inside the JSON; select it under an alias and order by the path.
      readEdge("scored_at", () =>
        supabase
          .from("concall_analysis")
          .select("scored_at:details->scoring_meta->>scored_at")
          .not("details->scoring_meta", "is", null)
          .order("details->scoring_meta->>scored_at", { ascending: false, nullsFirst: false })
          .limit(1),
      ),
      publishedValuation(false),
      publishedValuation(true),
      edge("company_page_overview_cache", "refreshed_at", false),
      edge("company_page_overview_cache", "refreshed_at", true),
      edge("homepage_activity_feed", "updated_at", false),
      edge("earnings_calendar", "fetched_at", false),
    ]);

  return [
    {
      key: "desk",
      label: "Exchange desk",
      detail: "newest BSE filing on the tape",
      cadence: "hourly",
      latestIso: desk.value,
      oldestIso: null,
      warnAfterHours: 6,
      alarmAfterHours: DAY,
      action: null,
      error: desk.error,
    },
    {
      key: "scores",
      label: "Concall scores",
      detail: "last quarter scored",
      cadence: "results season: daily · off-season: as calls land",
      latestIso: scores.value,
      oldestIso: null,
      warnAfterHours: null,
      alarmAfterHours: null,
      action: null,
      error: scores.error,
    },
    {
      key: "valuation",
      label: "Valuation checks",
      detail: "oldest published pricing across the fleet",
      cadence: `re-priced every ${VALUATION_STALE_AFTER_DAYS} days (/valuation-refresh)`,
      latestIso: valuationNewest.value,
      oldestIso: valuationOldest.value,
      warnAfterHours: VALUATION_STALE_AFTER_DAYS * DAY,
      alarmAfterHours: (VALUATION_STALE_AFTER_DAYS + 4) * DAY,
      action: null,
      error: valuationNewest.error ?? valuationOldest.error,
    },
    {
      key: "overview",
      label: "Overview cache",
      detail: "oldest company overview row",
      cadence: "refresh-overview-cache (4-day stale mark)",
      latestIso: overviewNewest.value,
      oldestIso: overviewOldest.value,
      // Mirrors STALE_AFTER_DAYS in scripts/refresh-overview-cache.mjs.
      warnAfterHours: 4 * DAY,
      alarmAfterHours: 7 * DAY,
      action: { label: "Refresh one company", href: "/admin/ops#overview" },
      error: overviewNewest.error ?? overviewOldest.error,
    },
    {
      key: "home-feed",
      label: "Latest updates feed",
      detail: "homepage activity feed last rebuilt",
      cadence: "after every promote",
      latestIso: homeFeed.value,
      oldestIso: null,
      warnAfterHours: DAY,
      alarmAfterHours: 3 * DAY,
      action: { label: "Refresh now", href: "/admin/ops#home-feed" },
      error: homeFeed.error,
    },
    {
      key: "calendar",
      label: "Earnings calendar",
      detail: "last NSE event sync",
      cadence: "weekly, daily in results season",
      latestIso: calendar.value,
      oldestIso: null,
      warnAfterHours: 7 * DAY,
      alarmAfterHours: 14 * DAY,
      action: { label: "Sync now", href: "/admin/ops#calendar" },
      error: calendar.error,
    },
  ];
}
