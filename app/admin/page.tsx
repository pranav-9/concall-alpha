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
  RecentWatchlistsTable,
  type RecentWatchlistRow,
} from "@/components/admin/recent-watchlists-table";
import {
  TopCompaniesTable,
  type TopCompanyView,
} from "@/components/admin/top-companies-table";
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
  CompanyInterestTable,
  type CompanyInterestRow,
  TopSectorsTable,
  type TopSectorInterestRow,
} from "@/components/admin/company-interest-table";
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

type CompanyMetaRow = {
  code: string;
  name: string | null;
  sector: string | null;
  sub_sector: string | null;
};

type WatchlistItemRow = {
  id: number;
  company_code: string | null;
  created_at: string;
};

type VisitorEventRow = {
  visitor_id: string | null;
  created_at: string | null;
};

const ADMIN_CHART_MAX_DAYS = 90;
const ACTIVE_VISITOR_LOOKBACK_DAYS = 29;
const EVENT_PAGE_SIZE = 1000;
const EVENT_CHART_MAX_ROWS = 20000;
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

function extractCompanyCodeFromPath(path: string | null | undefined): string | null {
  const match = path?.match(/\/company\/([^/?#]+)/i);
  return normalizeCompanyCode(match?.[1]);
}

function incrementMap(map: Map<string, number>, key: string | null, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + amount);
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
}> {
  const supabase = createAdminClient();
  const perPage = 100;
  let page = 1;
  const users: RecentAccountRow[] = [];

  while (true) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });

    if (result.error) {
      throw result.error;
    }

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
  };
}

async function getAdminData(range: RangeKey) {
  const supabase = createAdminClient();
  const startIso = getStartIso(range);
  const chartStartIso = getChartStartIso(range);

  const uniqueVisitorsPromise = startIso
    ? supabase.rpc("count_unique_visitors", { start_ts: startIso })
    : supabase.rpc("count_unique_visitors", { start_ts: "1970-01-01T00:00:00.000Z" });

  const topCompaniesPromise = startIso
    ? supabase.rpc("get_top_company_views", { start_ts: startIso, limit_n: 50 })
    : supabase.rpc("get_top_company_views", { start_ts: "1970-01-01T00:00:00.000Z", limit_n: 50 });

  const companyRowsPromise = supabase
    .from("company")
    .select("code, name, sector, sub_sector");

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

  const companyViewsCountBase = supabase
    .from("page_view_events")
    .select("id", { head: true, count: "exact" })
    .not("company_code", "is", null);

  const companyViewsCountPromise = startIso
    ? companyViewsCountBase.gte("created_at", startIso)
    : companyViewsCountBase;

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

  const watchlistsCountBase = supabase
    .from("watchlists")
    .select("id", { head: true, count: "exact" })
    .not("created_at", "is", null);

  const watchlistsCountPromise = startIso
    ? watchlistsCountBase.gte("created_at", startIso)
    : watchlistsCountBase;

  const watchlistItemsBase = supabase
    .from("watchlist_items")
    .select("id, company_code, created_at")
    .not("company_code", "is", null)
    .order("created_at", { ascending: false })
    .limit(1000);

  const watchlistItemsPromise = startIso
    ? watchlistItemsBase.gte("created_at", startIso)
    : watchlistItemsBase;

  const watchlistItemsCountBase = supabase
    .from("watchlist_items")
    .select("id", { head: true, count: "exact" })
    .not("company_code", "is", null);

  const watchlistItemsCountPromise = startIso
    ? watchlistItemsCountBase.gte("created_at", startIso)
    : watchlistItemsCountBase;

  const [
    uniqueVisitorsResult,
    topCompaniesResult,
    companyRowsResult,
    feedbackRowsResult,
    feedbackCountResult,
    companyViewsCountResult,
    commentsRowsResult,
    commentsCountResult,
    reportsRowsResult,
    reportsCountResult,
    recentAccountsResult,
    activeVisitors,
    recentWatchlistsResult,
    watchlistsCountResult,
    watchlistItemsResult,
    watchlistItemsCountResult,
  ] =
    await Promise.all([
      uniqueVisitorsPromise,
      topCompaniesPromise,
      companyRowsPromise,
      feedbackRowsPromise,
      feedbackCountPromise,
      companyViewsCountPromise,
      commentsRowsPromise,
      commentsCountPromise,
      reportsRowsPromise,
      reportsCountPromise,
      recentAccountsPromise,
      activeVisitorsPromise,
      recentWatchlistsPromise,
      watchlistsCountPromise,
      watchlistItemsPromise,
      watchlistItemsCountPromise,
    ]);

  const uniqueUsers = Number(uniqueVisitorsResult.data ?? 0);
  const companyRows = (companyRowsResult.data ?? []) as CompanyMetaRow[];
  const companyByCode = new Map<string, CompanyMetaRow>();
  companyRows.forEach((row) => {
    const code = normalizeCompanyCode(row.code);
    if (code) companyByCode.set(code, row);
  });
  const topCompanies = ((topCompaniesResult.data ?? []) as TopCompanyView[]).map(
    (row) => {
      const code = normalizeCompanyCode(row.company_code);
      const company = code ? companyByCode.get(code) : null;
      return {
        ...row,
        company_code: code ?? row.company_code,
        company_name: company?.name ?? row.company_name,
      };
    },
  );
  const feedbackRows = (feedbackRowsResult.data ?? []) as FeedbackRequestRow[];
  const feedbackCount = Number(feedbackCountResult.count ?? 0);
  const companyViews = Number(companyViewsCountResult.count ?? 0);
  const commentsRows = (commentsRowsResult.data ?? []) as AdminCommentRow[];
  const commentsCount = Number(commentsCountResult.count ?? 0);
  const reportsRows = (reportsRowsResult.data ?? []) as AdminReportedRow[];
  const reportsCount = Number(reportsCountResult.count ?? 0);
  const accountsCreatedCount = recentAccountsResult.count;
  const recentAccountsRows = recentAccountsResult.rows;
  const recentWatchlistsRows = (recentWatchlistsResult.data ??
    []) as RecentWatchlistRow[];
  const watchlistsCreatedCount = Number(watchlistsCountResult.count ?? 0);
  const watchlistItemsRows = (watchlistItemsResult.data ?? []) as WatchlistItemRow[];
  const watchlistAddsCount = Number(watchlistItemsCountResult.count ?? 0);
  const requestTypeCounts = countRequestsByType(feedbackRows);
  const reportedCommentsCount = new Set(
    reportsRows.map((row) => row.comment_id).filter(Boolean),
  ).size;

  const viewsByCode = new Map<string, number>();
  topCompanies.forEach((row) => {
    incrementMap(viewsByCode, normalizeCompanyCode(row.company_code), Number(row.views) || 0);
  });

  const watchlistAddsByCode = new Map<string, number>();
  watchlistItemsRows.forEach((row) => {
    incrementMap(watchlistAddsByCode, normalizeCompanyCode(row.company_code));
  });

  const commentsByCode = new Map<string, number>();
  commentsRows.forEach((row) => {
    incrementMap(commentsByCode, normalizeCompanyCode(row.company_code));
  });

  const requestsByCode = new Map<string, number>();
  feedbackRows.forEach((row) => {
    const fromPath = extractCompanyCodeFromPath(row.source_path);
    const fromSubject = normalizeCompanyCode(row.subject_target);
    incrementMap(requestsByCode, fromPath ?? fromSubject);
  });

  const companyCodes = new Set([
    ...viewsByCode.keys(),
    ...watchlistAddsByCode.keys(),
    ...commentsByCode.keys(),
    ...requestsByCode.keys(),
  ]);

  const companyInterestRows: CompanyInterestRow[] = Array.from(companyCodes)
    .map((companyCode) => {
      const company = companyByCode.get(companyCode);
      const views = viewsByCode.get(companyCode) ?? 0;
      const watchlistAdds = watchlistAddsByCode.get(companyCode) ?? 0;
      const comments = commentsByCode.get(companyCode) ?? 0;
      const requests = requestsByCode.get(companyCode) ?? 0;
      return {
        companyCode,
        companyName: company?.name ?? null,
        sector: company?.sector ?? null,
        subSector: company?.sub_sector ?? null,
        views,
        watchlistAdds,
        comments,
        requests,
        interestScore: views + watchlistAdds * 5 + comments * 3 + requests * 8,
      };
    })
    .sort(
      (a, b) =>
        b.interestScore - a.interestScore ||
        b.views - a.views ||
        a.companyCode.localeCompare(b.companyCode),
    )
    .slice(0, 50);

  const sectorBuckets = new Map<string, { views: number; companies: Set<string> }>();
  topCompanies.forEach((row) => {
    const code = normalizeCompanyCode(row.company_code);
    if (!code) return;
    const sector = companyByCode.get(code)?.sector?.trim();
    if (!sector) return;
    const bucket = sectorBuckets.get(sector) ?? { views: 0, companies: new Set<string>() };
    bucket.views += Number(row.views) || 0;
    bucket.companies.add(code);
    sectorBuckets.set(sector, bucket);
  });

  const topSectors: TopSectorInterestRow[] = Array.from(sectorBuckets.entries())
    .map(([sector, bucket]) => ({
      sector,
      views: bucket.views,
      companies: bucket.companies.size,
    }))
    .sort((a, b) => b.views - a.views || a.sector.localeCompare(b.sector))
    .slice(0, 10);

  const mostViewedCompany = topCompanies[0]?.company_name ?? topCompanies[0]?.company_code ?? "—";

  return {
    usage: {
      uniqueUsers,
      accountsCreatedCount,
      watchlistsCreatedCount,
      commentsCount,
      feedbackCount,
      activeVisitors,
      recentAccountsRows,
      recentWatchlistsRows,
    },
    companyInterest: {
      companyViews,
      companiesViewedCount: topCompanies.length,
      watchlistAddsCount,
      mostViewedCompany,
      topCompanies,
      companyInterestRows,
      topSectors,
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
      watchlistsCreatedCount: 0,
      commentsCount: 0,
      feedbackCount: 0,
      activeVisitors: [] as ActiveVisitorPoint[],
      recentAccountsRows: [] as RecentAccountRow[],
      recentWatchlistsRows: [] as RecentWatchlistRow[],
    },
    companyInterest: {
      companyViews: 0,
      companiesViewedCount: 0,
      watchlistAddsCount: 0,
      mostViewedCompany: "—",
      topCompanies: [] as TopCompanyView[],
      companyInterestRows: [] as CompanyInterestRow[],
      topSectors: [] as TopSectorInterestRow[],
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
            description="Adoption and engagement signals across visitors, accounts, watchlists, comments, and requests."
          >
            <AdminMetricGrid
              metrics={[
                { label: "Unique Visitors", value: data.usage.uniqueUsers },
                { label: "Accounts Created", value: data.usage.accountsCreatedCount },
                { label: "Watchlists Created", value: data.usage.watchlistsCreatedCount },
                { label: "Comments Created", value: data.usage.commentsCount },
                { label: "Requests Submitted", value: data.usage.feedbackCount },
              ]}
            />
            <AdminDailyVisitorsChart data={data.usage.activeVisitors} />
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <RecentAccountsTable rows={data.usage.recentAccountsRows} />
              <RecentWatchlistsTable rows={data.usage.recentWatchlistsRows} />
            </div>
          </AdminSection>
        }
        companyInterest={
          <AdminSection
            title="Company Interest"
            description="Demand signals showing which companies and sectors are attracting attention."
          >
            <AdminMetricGrid
              metrics={[
                { label: "Company Page Views", value: data.companyInterest.companyViews },
                { label: "Companies Viewed", value: data.companyInterest.companiesViewedCount },
                { label: "Watchlist Adds", value: data.companyInterest.watchlistAddsCount },
                { label: "Most Viewed Company", value: data.companyInterest.mostViewedCompany },
              ]}
            />
            <CompanyInterestTable rows={data.companyInterest.companyInterestRows} />
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.65fr]">
              <TopCompaniesTable rows={data.companyInterest.topCompanies} />
              <TopSectorsTable rows={data.companyInterest.topSectors} />
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
