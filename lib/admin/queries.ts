// Section fetchers for the admin panel. Each section's page calls ONE of these,
// so opening /admin/companies never pays for the watchlist or API scans. Every
// function takes the resolved range window and returns display-ready data;
// shaping is in metrics.ts (pure, tested).
//
// Service-role reads (createAdminClient) — this is one of the two sanctioned
// cross-user paths (see CLAUDE.md). Don't widen what these select.

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildCompanyViewRows,
  buildRecentCompanyOpens,
  summarizeCompanyViews,
  type CompanyNameRow,
  type CompanyViewRow,
  type CompanyViewRpcRow,
  type RawCompanyOpenRow,
  type RecentCompanyOpenRow,
} from "@/lib/admin-company-views";
import { getOwnHosts } from "@/lib/attribution";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  activeSince,
  aggregateApiMetrics,
  buildAccountActivity,
  buildActiveVisitors,
  buildLatestWatchlistActivity,
  buildTopSavedCompanies,
  computeDelta,
  countRequestsByType,
  countUniqueVisitorsBetween,
  emptyApiPerformance,
  formatAverageSavesPerWatchlist,
  type AccountActivityUser,
  type ActiveAccountRow,
  type ActiveVisitorPoint,
  type AdminUserSummary,
  type ApiMetricRawRow,
  type ApiPerformanceData,
  type Delta,
  type FeedbackRequestRow,
  type LatestWatchlistActivityRow,
  type RequestType,
  type SessionActivityRow,
  type TopSavedCompanyRow,
  type VisitorEventRow,
  type WatchlistItemRow,
  type WatchlistLookupRow,
} from "./metrics";
import type { RangeWindow } from "./range";

const PAGE_SIZE = 1000;
const VISITOR_ROWS_MAX = 20000;
const WATCHLIST_ITEMS_MAX = 20000;
const WATCHLIST_ACTIVITY_LIMIT = 100;
const API_METRICS_MAX_ROWS = 5000;
const API_METRICS_SLOW_ROWS = 50;
const EPOCH_ISO = "1970-01-01T00:00:00.000Z";

type Client = SupabaseClient;

// ── shared helpers ───────────────────────────────────────────────────────────

/** Exact row count in [start, end) — `start` null means unbounded. */
async function countRows(
  supabase: Client,
  table: string,
  opts: { start: string | null; end?: string | null; column?: string; notNull?: string },
): Promise<number> {
  let query = supabase.from(table).select(opts.column ?? "id", { head: true, count: "exact" });
  if (opts.notNull) query = query.not(opts.notNull, "is", null);
  if (opts.start) query = query.gte("created_at", opts.start);
  if (opts.end) query = query.lt("created_at", opts.end);
  const { count, error } = await query;
  if (error) throw error;
  return Number(count ?? 0);
}

/** The same count over the prior window, or null when the range has none. */
async function countPrior(
  supabase: Client,
  table: string,
  window: RangeWindow,
  opts: { column?: string; notNull?: string } = {},
): Promise<number | null> {
  if (!window.priorStartIso || !window.startIso) return null;
  return countRows(supabase, table, {
    start: window.priorStartIso,
    end: window.startIso,
    ...opts,
  });
}

/**
 * Visitor events from `fetchStartIso` on, newest first, capped. Newest-first so
 * a cap drops the OLDEST days (the chart's left edge thins out) rather than
 * silently losing this week.
 */
async function fetchVisitorRows(
  supabase: Client,
  fetchStartIso: string,
): Promise<{ rows: VisitorEventRow[]; capped: boolean }> {
  const rows: VisitorEventRow[] = [];
  let from = 0;
  while (rows.length < VISITOR_ROWS_MAX) {
    const to = Math.min(from + PAGE_SIZE - 1, VISITOR_ROWS_MAX - 1);
    const { data, error } = await supabase
      .from("page_view_events")
      .select("visitor_id, created_at")
      .gte("created_at", fetchStartIso)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    const page = (data ?? []) as VisitorEventRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows, capped: false };
    from += PAGE_SIZE;
  }
  return { rows, capped: true };
}

function getUserDisplayName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const values = metadata as Record<string, unknown>;
  const name =
    typeof values.full_name === "string"
      ? values.full_name
      : typeof values.name === "string"
        ? values.name
        : typeof values.display_name === "string"
          ? values.display_name
          : null;
  return name?.trim() || null;
}

export type AccountRow = { id: string; email: string | null; created_at: string };

/** Every auth user (paged), newest first, plus the window's counts. */
async function listAccounts(
  supabase: Client,
  window: RangeWindow,
): Promise<{
  count: number;
  prior: number | null;
  total: number;
  rows: AccountRow[];
  usersById: Map<string, AdminUserSummary>;
  /** Every account, for the activity read. */
  users: AccountActivityUser[];
}> {
  const perPage = 100;
  let page = 1;
  const all: AccountRow[] = [];
  const users: AccountActivityUser[] = [];
  const usersById = new Map<string, AdminUserSummary>();

  while (true) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });
    if (result.error) throw result.error;
    for (const user of result.data.users) {
      usersById.set(user.id, {
        id: user.id,
        email: user.email ?? null,
        displayName: getUserDisplayName(user.user_metadata),
      });
      all.push({ id: user.id, email: user.email ?? null, created_at: user.created_at });
      users.push({
        id: user.id,
        email: user.email ?? null,
        displayName: getUserDisplayName(user.user_metadata),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
      });
    }
    if (!result.data.nextPage || result.data.users.length === 0) break;
    page = result.data.nextPage;
  }

  all.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  const startMs = window.startIso ? Date.parse(window.startIso) : null;
  const priorMs = window.priorStartIso ? Date.parse(window.priorStartIso) : null;
  const inWindow = all.filter((u) => startMs == null || Date.parse(u.created_at) >= startMs);
  const prior =
    startMs == null || priorMs == null
      ? null
      : all.filter((u) => {
          const t = Date.parse(u.created_at);
          return t >= priorMs && t < startMs;
        }).length;

  return { count: inWindow.length, prior, total: all.length, rows: inWindow, usersById, users };
}

async function fetchCompanyNames(supabase: Client): Promise<CompanyNameRow[]> {
  const { data, error } = await supabase.from("company").select("code, name");
  if (error) throw error;
  return (data ?? []) as CompanyNameRow[];
}

// ── Overview ─────────────────────────────────────────────────────────────────

export type OverviewData = {
  visitors: Delta;
  accounts: Delta;
  accountsTotal: number;
  companyOpens: Delta;
  watchlists: Delta;
  requests: Delta;
  series: ActiveVisitorPoint[];
  seriesCapped: boolean;
};

export async function getOverviewData(window: RangeWindow): Promise<OverviewData> {
  const supabase = createAdminClient();
  const start = window.startIso ?? EPOCH_ISO;

  const [uniqueNow, visitorRows, accounts, opensNow, opensPrior, wlNow, wlPrior, reqNow, reqPrior] =
    await Promise.all([
      supabase.rpc("count_unique_visitors", { start_ts: start }),
      fetchVisitorRows(supabase, window.fetchStartIso),
      listAccounts(supabase, window),
      countRows(supabase, "page_view_events", { start: window.startIso, notNull: "company_code" }),
      countPrior(supabase, "page_view_events", window, { notNull: "company_code" }),
      countRows(supabase, "watchlists", { start: window.startIso }),
      countPrior(supabase, "watchlists", window),
      countRows(supabase, "user_requests", { start: window.startIso }),
      countPrior(supabase, "user_requests", window),
    ]);
  if (uniqueNow.error) throw uniqueNow.error;

  // Prior-window uniques come out of the chart's own rows; unknowable if the
  // fetch was capped before reaching the prior window.
  const priorUnique =
    window.priorStartIso && window.startIso && !visitorRows.capped
      ? countUniqueVisitorsBetween(visitorRows.rows, window.priorStartIso, window.startIso)
      : null;

  return {
    visitors: computeDelta(Number(uniqueNow.data ?? 0), priorUnique),
    accounts: computeDelta(accounts.count, accounts.prior),
    accountsTotal: accounts.total,
    companyOpens: computeDelta(opensNow, opensPrior),
    watchlists: computeDelta(wlNow, wlPrior),
    requests: computeDelta(reqNow, reqPrior),
    series: buildActiveVisitors(visitorRows.rows, window.chartStartIso),
    seriesCapped: visitorRows.capped,
  };
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export type AccountsData = {
  created: Delta;
  total: number;
  rows: AccountRow[];
  /** Accounts whose last activity falls in the range, newest first. */
  active: ActiveAccountRow[];
  /** Accounts with any recorded activity at all. */
  everActive: number;
  /**
   * Whether the session signal was read. `missing` = the
   * admin_account_activity function is not applied; `error` carries any
   * other failure. Either way "last active" falls back to sign-ins and
   * watchlist writes.
   */
  sessionSignal: { state: "ok" } | { state: "missing" } | { state: "error"; message: string };
};

/**
 * Latest session activity per account, via the service-role-only RPC in
 * lib/supabase/admin_account_activity.sql. Never throws: a missing function
 * degrades the page to the weaker signals instead of blanking it.
 */
async function fetchSessionActivity(
  supabase: Client,
): Promise<{ rows: SessionActivityRow[] | null; signal: AccountsData["sessionSignal"] }> {
  const { data, error } = await supabase.rpc("admin_account_activity");
  if (!error) return { rows: (data ?? []) as SessionActivityRow[], signal: { state: "ok" } };
  // PGRST202 = function not found in the schema cache (not applied, or no reload).
  if (error.code === "PGRST202") return { rows: null, signal: { state: "missing" } };
  return { rows: null, signal: { state: "error", message: error.message } };
}

export async function getAccountsData(window: RangeWindow): Promise<AccountsData> {
  const supabase = createAdminClient();
  const [accounts, sessions, watchlists, items] = await Promise.all([
    listAccounts(supabase, window),
    fetchSessionActivity(supabase),
    supabase.from("watchlists").select("id, user_id, created_at"),
    fetchWatchlistItems(supabase, null),
  ]);
  if (watchlists.error) throw watchlists.error;

  const activity = buildAccountActivity({
    users: accounts.users,
    sessions: sessions.rows,
    watchlists: (watchlists.data ?? []) as { id: number; user_id: string | null; created_at: string | null }[],
    items,
  });

  return {
    created: computeDelta(accounts.count, accounts.prior),
    total: accounts.total,
    rows: accounts.rows.slice(0, 100),
    active: activeSince(activity, window.startIso).slice(0, 200),
    everActive: activity.length,
    sessionSignal: sessions.signal,
  };
}

// ── Companies ────────────────────────────────────────────────────────────────

export type CompaniesData = {
  companiesOpened: number;
  totalOpens: Delta;
  top: CompanyViewRow[];
  recent: RecentCompanyOpenRow[];
};

export async function getCompaniesData(window: RangeWindow): Promise<CompaniesData> {
  const supabase = createAdminClient();
  const start = window.startIso ?? EPOCH_ISO;

  // The RPC counts opens SQL-side over the whole window; limit_n sits well
  // above the ~100-company universe so the headline totals are true totals.
  const recentBase = supabase
    .from("page_view_events")
    .select("id, company_code, referrer, created_at")
    .not("company_code", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const [names, views, recent, priorOpens] = await Promise.all([
    fetchCompanyNames(supabase),
    supabase.rpc("get_top_company_views", { start_ts: start, limit_n: 500 }),
    window.startIso ? recentBase.gte("created_at", window.startIso) : recentBase,
    countPrior(supabase, "page_view_events", window, { notNull: "company_code" }),
  ]);
  if (views.error) throw views.error;
  if (recent.error) throw recent.error;

  const rows = buildCompanyViewRows((views.data ?? []) as CompanyViewRpcRow[], names);
  const { companiesOpened, totalOpens } = summarizeCompanyViews(rows);

  return {
    companiesOpened,
    totalOpens: computeDelta(totalOpens, priorOpens),
    top: rows.slice(0, 100),
    recent: buildRecentCompanyOpens(
      (recent.data ?? []) as RawCompanyOpenRow[],
      names,
      getOwnHosts(process.env),
    ),
  };
}

// ── Watchlists ───────────────────────────────────────────────────────────────

export type RecentWatchlistRow = {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
  user_display_name: string | null;
  user_email: string | null;
};

export type WatchlistsData = {
  created: Delta;
  saved: Delta;
  averageSaves: string;
  recent: RecentWatchlistRow[];
  topSaved: TopSavedCompanyRow[];
  activity: LatestWatchlistActivityRow[];
};

async function fetchWatchlistItems(supabase: Client, startIso: string | null): Promise<WatchlistItemRow[]> {
  const rows: WatchlistItemRow[] = [];
  let from = 0;
  while (rows.length < WATCHLIST_ITEMS_MAX) {
    const to = Math.min(from + PAGE_SIZE - 1, WATCHLIST_ITEMS_MAX - 1);
    let query = supabase
      .from("watchlist_items")
      .select("id, watchlist_id, company_code, created_at")
      .not("company_code", "is", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (startIso) query = query.gte("created_at", startIso);
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as WatchlistItemRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchWatchlistsByIds(supabase: Client, ids: number[]): Promise<WatchlistLookupRow[]> {
  const unique = Array.from(new Set(ids));
  const rows: WatchlistLookupRow[] = [];
  for (let i = 0; i < unique.length; i += 500) {
    const { data, error } = await supabase
      .from("watchlists")
      .select("id, user_id, name, created_at")
      .in("id", unique.slice(i, i + 500));
    if (error) throw error;
    rows.push(...((data ?? []) as WatchlistLookupRow[]));
  }
  return rows;
}

export async function getWatchlistsData(window: RangeWindow): Promise<WatchlistsData> {
  const supabase = createAdminClient();

  const recentBase = supabase
    .from("watchlists")
    .select("id, user_id, name, created_at")
    .not("created_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(WATCHLIST_ACTIVITY_LIMIT);

  const [names, accounts, recent, createdNow, createdPrior, items, savedNow, savedPrior] =
    await Promise.all([
      fetchCompanyNames(supabase),
      listAccounts(supabase, window),
      window.startIso ? recentBase.gte("created_at", window.startIso) : recentBase,
      countRows(supabase, "watchlists", { start: window.startIso }),
      countPrior(supabase, "watchlists", window),
      fetchWatchlistItems(supabase, window.startIso),
      countRows(supabase, "watchlist_items", { start: window.startIso, notNull: "company_code" }),
      countPrior(supabase, "watchlist_items", window, { notNull: "company_code" }),
    ]);
  if (recent.error) throw recent.error;

  const recentRows = (recent.data ?? []) as WatchlistLookupRow[];
  const watchlistsById = new Map<number, WatchlistLookupRow>(recentRows.map((r) => [r.id, r]));
  const missing = items
    .map((r) => r.watchlist_id)
    .filter((id): id is number => typeof id === "number" && !watchlistsById.has(id));
  (await fetchWatchlistsByIds(supabase, missing)).forEach((r) => watchlistsById.set(r.id, r));

  return {
    created: computeDelta(createdNow, createdPrior),
    saved: computeDelta(savedNow, savedPrior),
    averageSaves: formatAverageSavesPerWatchlist(savedNow, createdNow),
    recent: recentRows.slice(0, 50).map((row) => {
      const user = row.user_id ? accounts.usersById.get(row.user_id) : null;
      return {
        id: row.id,
        user_id: row.user_id ?? "",
        name: row.name ?? "",
        created_at: row.created_at ?? "",
        user_display_name: user?.displayName ?? null,
        user_email: user?.email ?? null,
      };
    }),
    topSaved: buildTopSavedCompanies(items, names),
    activity: buildLatestWatchlistActivity({
      watchlistRows: recentRows,
      itemRows: items,
      watchlistsById,
      companyRows: names,
      usersById: accounts.usersById,
      limit: WATCHLIST_ACTIVITY_LIMIT,
    }),
  };
}

// ── Requests ─────────────────────────────────────────────────────────────────

export type RequestsData = {
  submitted: Delta;
  byType: Record<RequestType, number>;
  rows: FeedbackRequestRow[];
};

export async function getRequestsData(window: RangeWindow): Promise<RequestsData> {
  const supabase = createAdminClient();
  const base = supabase
    .from("user_requests")
    .select("id, request_type, subject_target, message, source_path, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const [rows, now, prior] = await Promise.all([
    window.startIso ? base.gte("created_at", window.startIso) : base,
    countRows(supabase, "user_requests", { start: window.startIso }),
    countPrior(supabase, "user_requests", window),
  ]);
  if (rows.error) throw rows.error;

  const list = (rows.data ?? []) as FeedbackRequestRow[];
  return {
    submitted: computeDelta(now, prior),
    byType: countRequestsByType(list),
    rows: list,
  };
}

// ── API performance ──────────────────────────────────────────────────────────

export async function getApiPerformanceData(window: RangeWindow): Promise<ApiPerformanceData> {
  const supabase = createAdminClient();
  let query = supabase
    .from("api_route_metrics")
    .select(
      "id, route, method, status_code, duration_ms, result_count, query_length, error_code, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .limit(API_METRICS_MAX_ROWS);
  if (window.startIso) query = query.gte("created_at", window.startIso);

  const { data, error, count } = await query;
  if (error) return emptyApiPerformance(false);
  return aggregateApiMetrics((data ?? []) as ApiMetricRawRow[], count, API_METRICS_SLOW_ROWS);
}
