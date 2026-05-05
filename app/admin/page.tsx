import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AdminAnalyticsTabs } from "@/components/admin/admin-analytics-tabs";
import {
  AdminDailyVisitorsChart,
  type ActiveVisitorPoint,
} from "@/components/admin/admin-daily-visitors-chart";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { AdminMetricGrid } from "@/components/admin/admin-metric-grid";
import { AdminSection } from "@/components/admin/admin-section";
import {
  RecentAccountsTable,
  type RecentAccountRow,
} from "@/components/admin/recent-accounts-table";
import {
  LatestWatchlistActivityTable,
  type LatestWatchlistActivityRow,
} from "@/components/admin/latest-watchlist-activity-table";
import {
  RecentWatchlistsTable,
  type RecentWatchlistRow,
} from "@/components/admin/recent-watchlists-table";
import {
  TopSavedCompaniesTable,
  type TopSavedCompanyRow,
} from "@/components/admin/top-saved-companies-table";
import {
  FeedbackRequestsTable,
  type FeedbackRequestRow,
} from "@/components/admin/feedback-requests-table";
import {
  CompanyCommentsTable,
  type AdminCommentRow,
  type AdminReportedRow,
} from "@/components/admin/company-comments-table";
import {
  ADMIN_ACCESS_COOKIE,
  hasAdminAccess,
} from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Admin – Story of a Stock",
  description: "Internal admin analytics dashboard.",
  robots: { index: false, follow: false },
};

type RangeKey = "7d" | "30d" | "90d" | "all";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "all", label: "All" },
];

type VisitorEventRow = {
  visitor_id: string | null;
  created_at: string | null;
};

type CompanyNameRow = {
  code: string | null;
  name: string | null;
};

type WatchlistItemRow = {
  id: number;
  watchlist_id: number | null;
  company_code: string | null;
  created_at: string | null;
};

type WatchlistLookupRow = {
  id: number;
  user_id: string | null;
  name: string | null;
  created_at: string | null;
};

type AdminUserSummary = {
  id: string;
  email: string | null;
  displayName: string | null;
};

const ADMIN_CHART_MAX_DAYS = 90;
const ACTIVE_VISITOR_LOOKBACK_DAYS = 29;
const EVENT_PAGE_SIZE = 1000;
const EVENT_CHART_MAX_ROWS = 20000;
const WATCHLIST_ITEMS_PAGE_SIZE = 1000;
const WATCHLIST_ITEMS_MAX_ROWS = 20000;
const WATCHLIST_ACTIVITY_LIMIT = 100;
const INDIA_TIME_ZONE = "Asia/Kolkata";
const localDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: INDIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getStartIso(range: RangeKey): string | null {
  if (range === "all") return null;
  const now = Date.now();
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

function getChartStartIso(range: RangeKey): string {
  if (range === "all") {
    return new Date(
      Date.now() - ADMIN_CHART_MAX_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
  }
  return getStartIso(range) ?? new Date(0).toISOString();
}

function getChartFetchStartIso(chartStartIso: string): string {
  const start = new Date(chartStartIso);
  start.setUTCDate(start.getUTCDate() - ACTIVE_VISITOR_LOOKBACK_DAYS);
  return start.toISOString();
}

function parseRange(value: string | undefined): RangeKey {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all") {
    return value;
  }
  return "7d";
}

function normalizeCompanyCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized || normalized.length > 24) return null;
  return /^[A-Z0-9._-]+$/.test(normalized) ? normalized : null;
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
  const trimmed = name?.trim();
  return trimmed || null;
}

function getLocalDateKey(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = localDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : null;
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateKeysBetween(startIso: string, end: Date): string[] {
  const startKey = getLocalDateKey(startIso);
  const endKey = getLocalDateKey(end);
  if (!startKey || !endKey) return [];

  const keys: string[] = [];
  let cursor = startKey;
  while (cursor <= endKey) {
    keys.push(cursor);
    cursor = shiftDateKey(cursor, 1);
  }
  return keys;
}

function countRollingVisitors(
  visitorsByDate: Map<string, Set<string>>,
  dateKey: string,
  days: number,
): number {
  const visitors = new Set<string>();
  for (let offset = 0; offset < days; offset += 1) {
    const bucket = visitorsByDate.get(shiftDateKey(dateKey, -offset));
    bucket?.forEach((visitorId) => visitors.add(visitorId));
  }
  return visitors.size;
}

function buildActiveVisitors(
  rows: VisitorEventRow[],
  chartStartIso: string,
): ActiveVisitorPoint[] {
  const visitorsByDate = new Map<string, Set<string>>();

  rows.forEach((row) => {
    if (!row.visitor_id || !row.created_at) return;
    const key = getLocalDateKey(row.created_at);
    if (!key) return;
    const bucket = visitorsByDate.get(key) ?? new Set<string>();
    bucket.add(row.visitor_id);
    visitorsByDate.set(key, bucket);
  });

  return getDateKeysBetween(chartStartIso, new Date()).map((date) => ({
    date,
    dau: countRollingVisitors(visitorsByDate, date, 1),
    wau: countRollingVisitors(visitorsByDate, date, 7),
    mau: countRollingVisitors(visitorsByDate, date, 30),
  }));
}

async function getActiveVisitors(
  chartStartIso: string,
): Promise<ActiveVisitorPoint[]> {
  const supabase = createAdminClient();
  const rows: VisitorEventRow[] = [];
  const fetchStartIso = getChartFetchStartIso(chartStartIso);
  let from = 0;

  while (rows.length < EVENT_CHART_MAX_ROWS) {
    const to = Math.min(from + EVENT_PAGE_SIZE - 1, EVENT_CHART_MAX_ROWS - 1);
    const { data, error } = await supabase
      .from("page_view_events")
      .select("visitor_id, created_at")
      .gte("created_at", fetchStartIso)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const pageRows = (data ?? []) as VisitorEventRow[];
    rows.push(...pageRows);

    if (pageRows.length < EVENT_PAGE_SIZE) {
      break;
    }

    from += EVENT_PAGE_SIZE;
  }

  return buildActiveVisitors(rows, chartStartIso);
}

async function getWatchlistItems(
  startIso: string | null,
): Promise<WatchlistItemRow[]> {
  const supabase = createAdminClient();
  const rows: WatchlistItemRow[] = [];
  let from = 0;

  while (rows.length < WATCHLIST_ITEMS_MAX_ROWS) {
    const to = Math.min(
      from + WATCHLIST_ITEMS_PAGE_SIZE - 1,
      WATCHLIST_ITEMS_MAX_ROWS - 1,
    );
    let query = supabase
      .from("watchlist_items")
      .select("id, watchlist_id, company_code, created_at")
      .not("company_code", "is", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (startIso) {
      query = query.gte("created_at", startIso);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const pageRows = (data ?? []) as WatchlistItemRow[];
    rows.push(...pageRows);

    if (pageRows.length < WATCHLIST_ITEMS_PAGE_SIZE) {
      break;
    }

    from += WATCHLIST_ITEMS_PAGE_SIZE;
  }

  return rows;
}

async function getWatchlistsByIds(ids: number[]): Promise<WatchlistLookupRow[]> {
  if (ids.length === 0) return [];

  const supabase = createAdminClient();
  const uniqueIds = Array.from(new Set(ids));
  const rows: WatchlistLookupRow[] = [];
  const chunkSize = 500;

  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("watchlists")
      .select("id, user_id, name, created_at")
      .in("id", chunk);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as WatchlistLookupRow[]));
  }

  return rows;
}

function buildTopSavedCompanies(
  items: WatchlistItemRow[],
  companyRows: CompanyNameRow[],
): TopSavedCompanyRow[] {
  const companyNames = new Map<string, string>();
  companyRows.forEach((row) => {
    const code = normalizeCompanyCode(row.code);
    if (code && row.name) {
      companyNames.set(code, row.name);
    }
  });

  const savedCounts = new Map<string, number>();
  items.forEach((row) => {
    const code = normalizeCompanyCode(row.company_code);
    if (!code) return;
    savedCounts.set(code, (savedCounts.get(code) ?? 0) + 1);
  });

  return Array.from(savedCounts.entries())
    .map(([companyCode, savedCount]) => ({
      companyCode,
      companyName: companyNames.get(companyCode) ?? null,
      savedCount,
    }))
    .sort(
      (a, b) =>
        b.savedCount - a.savedCount ||
        (a.companyName ?? a.companyCode).localeCompare(b.companyName ?? b.companyCode),
    )
    .slice(0, 50);
}

function formatAverageSavesPerWatchlist(
  savedCompaniesCount: number,
  watchlistsCreatedCount: number,
): string {
  if (watchlistsCreatedCount === 0) return "0";
  const average = savedCompaniesCount / watchlistsCreatedCount;
  return Number.isInteger(average) ? String(average) : average.toFixed(1);
}

function buildLatestWatchlistActivity({
  watchlistRows,
  itemRows,
  watchlistsById,
  companyRows,
  usersById,
}: {
  watchlistRows: WatchlistLookupRow[];
  itemRows: WatchlistItemRow[];
  watchlistsById: Map<number, WatchlistLookupRow>;
  companyRows: CompanyNameRow[];
  usersById: Map<string, AdminUserSummary>;
}): LatestWatchlistActivityRow[] {
  const companyNames = new Map<string, string>();
  companyRows.forEach((row) => {
    const code = normalizeCompanyCode(row.code);
    if (code && row.name) {
      companyNames.set(code, row.name);
    }
  });

  const createdRows: LatestWatchlistActivityRow[] = watchlistRows
    .filter((row) => row.created_at)
    .map((row) => {
      const user = row.user_id ? usersById.get(row.user_id) : null;
      return {
        id: `watchlist-created-${row.id}`,
        action: "watchlist_created",
        occurredAt: row.created_at as string,
        watchlistName: row.name,
        companyCode: null,
        companyName: null,
        userId: row.user_id,
        userDisplayName: user?.displayName ?? null,
        userEmail: user?.email ?? null,
      };
    });

  const addedRows: LatestWatchlistActivityRow[] = itemRows
    .filter((row) => row.created_at)
    .map((row) => {
      const code = normalizeCompanyCode(row.company_code);
      const watchlist = row.watchlist_id ? watchlistsById.get(row.watchlist_id) : null;
      const user = watchlist?.user_id ? usersById.get(watchlist.user_id) : null;
      return {
        id: `company-added-${row.id}`,
        action: "company_added",
        occurredAt: row.created_at as string,
        watchlistName: watchlist?.name ?? null,
        companyCode: code,
        companyName: code ? companyNames.get(code) ?? null : null,
        userId: watchlist?.user_id ?? null,
        userDisplayName: user?.displayName ?? null,
        userEmail: user?.email ?? null,
      };
    });

  return [...createdRows, ...addedRows]
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, WATCHLIST_ACTIVITY_LIMIT);
}

function countRequestsByType(rows: FeedbackRequestRow[]) {
  return rows.reduce(
    (counts, row) => {
      counts[row.request_type] = (counts[row.request_type] ?? 0) + 1;
      return counts;
    },
    {
      feedback: 0,
      stock_addition: 0,
      bug_report: 0,
      missing_section: 0,
      section_improvement: 0,
    } as Record<FeedbackRequestRow["request_type"], number>,
  );
}

async function getRecentAccounts(
  startIso: string | null,
): Promise<{
  count: number;
  rows: RecentAccountRow[];
  usersById: Map<string, AdminUserSummary>;
}> {
  const supabase = createAdminClient();
  const perPage = 100;
  let page = 1;
  const users: RecentAccountRow[] = [];
  const usersById = new Map<string, AdminUserSummary>();

  while (true) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });

    if (result.error) {
      throw result.error;
    }

    result.data.users.forEach((user) => {
      usersById.set(user.id, {
        id: user.id,
        email: user.email ?? null,
        displayName: getUserDisplayName(user.user_metadata),
      });
    });

    const pageRows = result.data.users
      .filter((user) => {
        if (!startIso) return true;
        return new Date(user.created_at).getTime() >= new Date(startIso).getTime();
      })
      .map((user) => ({
        id: user.id,
        email: user.email ?? null,
        created_at: user.created_at,
      }));

    users.push(...pageRows);

    if (!result.data.nextPage || result.data.users.length === 0) {
      break;
    }

    page = result.data.nextPage;
  }

  users.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return {
    count: users.length,
    rows: users.slice(0, 50),
    usersById,
  };
}

async function getAdminData(range: RangeKey) {
  const supabase = createAdminClient();
  const startIso = getStartIso(range);
  const chartStartIso = getChartStartIso(range);

  const uniqueVisitorsPromise = startIso
    ? supabase.rpc("count_unique_visitors", { start_ts: startIso })
    : supabase.rpc("count_unique_visitors", { start_ts: "1970-01-01T00:00:00.000Z" });

  const feedbackBase = supabase
    .from("user_requests")
    .select("id, request_type, subject_target, message, source_path, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const feedbackRowsPromise = startIso
    ? feedbackBase.gte("created_at", startIso)
    : feedbackBase;

  const feedbackCountBase = supabase
    .from("user_requests")
    .select("id", { head: true, count: "exact" });

  const feedbackCountPromise = startIso
    ? feedbackCountBase.gte("created_at", startIso)
    : feedbackCountBase;

  const commentsBase = supabase
    .from("company_comments")
    .select("id, company_code, comment_text, visitor_id, status, likes_count, reports_count, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const commentsRowsPromise = startIso
    ? commentsBase.gte("created_at", startIso)
    : commentsBase;

  const commentsCountBase = supabase
    .from("company_comments")
    .select("id", { head: true, count: "exact" });

  const commentsCountPromise = startIso
    ? commentsCountBase.gte("created_at", startIso)
    : commentsCountBase;

  const reportsBase = supabase
    .from("company_comment_reports")
    .select("id, comment_id, reason, created_at, comment:company_comments(id, company_code, comment_text, visitor_id, status, likes_count, reports_count, created_at, updated_at)")
    .order("created_at", { ascending: false })
    .limit(200);

  const reportsRowsPromise = startIso
    ? reportsBase.gte("created_at", startIso)
    : reportsBase;

  const reportsCountBase = supabase
    .from("company_comment_reports")
    .select("id", { head: true, count: "exact" });

  const reportsCountPromise = startIso
    ? reportsCountBase.gte("created_at", startIso)
    : reportsCountBase;

  const recentAccountsPromise = getRecentAccounts(startIso);
  const activeVisitorsPromise = getActiveVisitors(chartStartIso);

  const recentWatchlistsBase = supabase
    .from("watchlists")
    .select("id, user_id, name, created_at")
    .not("created_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const recentWatchlistsPromise = startIso
    ? recentWatchlistsBase.gte("created_at", startIso)
    : recentWatchlistsBase;

  const activityWatchlistsBase = supabase
    .from("watchlists")
    .select("id, user_id, name, created_at")
    .not("created_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(WATCHLIST_ACTIVITY_LIMIT);

  const activityWatchlistsPromise = startIso
    ? activityWatchlistsBase.gte("created_at", startIso)
    : activityWatchlistsBase;

  const watchlistsCountBase = supabase
    .from("watchlists")
    .select("id", { head: true, count: "exact" })
    .not("created_at", "is", null);

  const watchlistsCountPromise = startIso
    ? watchlistsCountBase.gte("created_at", startIso)
    : watchlistsCountBase;

  const watchlistItemsPromise = getWatchlistItems(startIso);

  const watchlistItemsCountBase = supabase
    .from("watchlist_items")
    .select("id", { head: true, count: "exact" })
    .not("company_code", "is", null);

  const watchlistItemsCountPromise = startIso
    ? watchlistItemsCountBase.gte("created_at", startIso)
    : watchlistItemsCountBase;

  const companyRowsPromise = supabase
    .from("company")
    .select("code, name");

  const [
    uniqueVisitorsResult,
    feedbackRowsResult,
    feedbackCountResult,
    commentsRowsResult,
    commentsCountResult,
    reportsRowsResult,
    reportsCountResult,
    recentAccountsResult,
    activeVisitors,
    recentWatchlistsResult,
    activityWatchlistsResult,
    watchlistsCountResult,
    watchlistItemsRows,
    watchlistItemsCountResult,
    companyRowsResult,
  ] =
    await Promise.all([
      uniqueVisitorsPromise,
      feedbackRowsPromise,
      feedbackCountPromise,
      commentsRowsPromise,
      commentsCountPromise,
      reportsRowsPromise,
      reportsCountPromise,
      recentAccountsPromise,
      activeVisitorsPromise,
      recentWatchlistsPromise,
      activityWatchlistsPromise,
      watchlistsCountPromise,
      watchlistItemsPromise,
      watchlistItemsCountPromise,
      companyRowsPromise,
    ]);

  const uniqueUsers = Number(uniqueVisitorsResult.data ?? 0);
  const feedbackRows = (feedbackRowsResult.data ?? []) as FeedbackRequestRow[];
  const feedbackCount = Number(feedbackCountResult.count ?? 0);
  const commentsRows = (commentsRowsResult.data ?? []) as AdminCommentRow[];
  const commentsCount = Number(commentsCountResult.count ?? 0);
  const reportsRows = (reportsRowsResult.data ?? []) as AdminReportedRow[];
  const reportsCount = Number(reportsCountResult.count ?? 0);
  const accountsCreatedCount = recentAccountsResult.count;
  const recentAccountsRows = recentAccountsResult.rows;
  const usersById = recentAccountsResult.usersById;
  const recentWatchlistsRows = ((recentWatchlistsResult.data ??
    []) as RecentWatchlistRow[]).map((row) => {
    const user = usersById.get(row.user_id);
    return {
      ...row,
      user_display_name: user?.displayName ?? null,
      user_email: user?.email ?? null,
    };
  });
  const activityWatchlistsRows = (activityWatchlistsResult.data ??
    []) as WatchlistLookupRow[];
  const watchlistsCreatedCount = Number(watchlistsCountResult.count ?? 0);
  const savedCompaniesCount = Number(watchlistItemsCountResult.count ?? 0);
  const companyRows = (companyRowsResult.data ?? []) as CompanyNameRow[];
  const watchlistsById = new Map<number, WatchlistLookupRow>();
  [...recentWatchlistsRows, ...activityWatchlistsRows].forEach((row) => {
    watchlistsById.set(row.id, row);
  });
  const missingWatchlistIds = watchlistItemsRows
    .map((row) => row.watchlist_id)
    .filter((id): id is number => typeof id === "number" && !watchlistsById.has(id));
  const referencedWatchlists = await getWatchlistsByIds(missingWatchlistIds);
  referencedWatchlists.forEach((row) => {
    watchlistsById.set(row.id, row);
  });
  const topSavedCompanies = buildTopSavedCompanies(
    watchlistItemsRows,
    companyRows,
  );
  const latestActivityRows = buildLatestWatchlistActivity({
    watchlistRows: activityWatchlistsRows,
    itemRows: watchlistItemsRows,
    watchlistsById,
    companyRows,
    usersById,
  });
  const averageSavesPerWatchlist = formatAverageSavesPerWatchlist(
    savedCompaniesCount,
    watchlistsCreatedCount,
  );
  const requestTypeCounts = countRequestsByType(feedbackRows);
  const reportedCommentsCount = new Set(
    reportsRows.map((row) => row.comment_id).filter(Boolean),
  ).size;

  return {
    usage: {
      uniqueUsers,
      accountsCreatedCount,
      commentsCount,
      feedbackCount,
      activeVisitors,
      recentAccountsRows,
    },
    watchlists: {
      watchlistsCreatedCount,
      savedCompaniesCount,
      averageSavesPerWatchlist,
      recentWatchlistsRows,
      topSavedCompanies,
      latestActivityRows,
    },
    operations: {
      feedbackRows,
      feedbackCount,
      commentsRows,
      commentsCount,
      reportsRows,
      reportsCount,
      requestTypeCounts,
      reportedCommentsCount,
    },
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const cookieStore = await cookies();
  const hasAccess = hasAdminAccess(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value);
  const resolved = await searchParams;
  const range = parseRange(resolved?.range);

  if (!hasAccess) {
    return (
      <main className="container mx-auto px-4 py-10 min-h-[70vh] flex items-start justify-center">
        <AdminLoginForm />
      </main>
    );
  }

  let data = {
    usage: {
      uniqueUsers: 0,
      accountsCreatedCount: 0,
      commentsCount: 0,
      feedbackCount: 0,
      activeVisitors: [] as ActiveVisitorPoint[],
      recentAccountsRows: [] as RecentAccountRow[],
    },
    watchlists: {
      watchlistsCreatedCount: 0,
      savedCompaniesCount: 0,
      averageSavesPerWatchlist: "0",
      recentWatchlistsRows: [] as RecentWatchlistRow[],
      topSavedCompanies: [] as TopSavedCompanyRow[],
      latestActivityRows: [] as LatestWatchlistActivityRow[],
    },
    operations: {
      feedbackRows: [] as FeedbackRequestRow[],
      feedbackCount: 0,
      commentsRows: [] as AdminCommentRow[],
      commentsCount: 0,
      reportsRows: [] as AdminReportedRow[],
      reportsCount: 0,
      requestTypeCounts: {
        feedback: 0,
        stock_addition: 0,
        bug_report: 0,
        missing_section: 0,
        section_improvement: 0,
      } as Record<FeedbackRequestRow["request_type"], number>,
      reportedCommentsCount: 0,
    },
  };
  let dataLoadError: string | null = null;

  try {
    data = await getAdminData(range);
  } catch {
    dataLoadError = "Unable to load admin data. Check Supabase tables/functions and service role key.";
  }

  return (
    <main className="container mx-auto px-4 py-6 sm:py-10 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            User activity, traffic, and request analytics for Story of a Stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" prefetch={false} className="text-sm underline text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <AdminLogoutButton />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {RANGE_OPTIONS.map((option) => {
          const active = option.key === range;
          return (
            <Link
              key={option.key}
              href={`/admin?range=${option.key}`}
              prefetch={false}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {dataLoadError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 p-3 text-sm text-red-700 dark:text-red-200">
          {dataLoadError}
        </div>
      ) : null}

      <AdminAnalyticsTabs
        usage={
          <AdminSection
            title="User Usage"
            description="Adoption and engagement signals across visitors, accounts, comments, and requests."
          >
            <AdminMetricGrid
              metrics={[
                { label: "Unique Visitors", value: data.usage.uniqueUsers },
                { label: "Accounts Created", value: data.usage.accountsCreatedCount },
                { label: "Comments Created", value: data.usage.commentsCount },
                { label: "Requests Submitted", value: data.usage.feedbackCount },
              ]}
            />
            <AdminDailyVisitorsChart data={data.usage.activeVisitors} />
            <RecentAccountsTable rows={data.usage.recentAccountsRows} />
          </AdminSection>
        }
        watchlists={
          <AdminSection
            title="Watchlists"
            description="Saved-company adoption and current watchlist contents."
          >
            <AdminMetricGrid
              metrics={[
                { label: "Watchlists Created", value: data.watchlists.watchlistsCreatedCount },
                { label: "Saved Companies", value: data.watchlists.savedCompaniesCount },
                {
                  label: "Avg Saves / Watchlist",
                  value: data.watchlists.averageSavesPerWatchlist,
                },
              ]}
            />
            <LatestWatchlistActivityTable rows={data.watchlists.latestActivityRows} />
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <RecentWatchlistsTable rows={data.watchlists.recentWatchlistsRows} />
              <TopSavedCompaniesTable rows={data.watchlists.topSavedCompanies} />
            </div>
          </AdminSection>
        }
        operations={
          <AdminSection
            title="Requests & Moderation"
            description="Operational queue for user requests, comments, and reported community activity."
          >
            <AdminMetricGrid
              metrics={[
                { label: "Total Reports", value: data.operations.reportsCount },
                { label: "Reported Comments", value: data.operations.reportedCommentsCount },
                { label: "Bug Reports", value: data.operations.requestTypeCounts.bug_report },
                {
                  label: "Missing Section Requests",
                  value: data.operations.requestTypeCounts.missing_section,
                },
                {
                  label: "Section Improvements",
                  value: data.operations.requestTypeCounts.section_improvement,
                },
              ]}
            />
            <FeedbackRequestsTable rows={data.operations.feedbackRows} />
            <CompanyCommentsTable
              comments={data.operations.commentsRows}
              reported={data.operations.reportsRows}
            />
          </AdminSection>
        }
      />
    </main>
  );
}
