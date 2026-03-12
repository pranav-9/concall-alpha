import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { AdminKpiCards } from "@/components/admin/admin-kpi-cards";
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

function getStartIso(range: RangeKey): string | null {
  if (range === "all") return null;
  const now = Date.now();
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

function parseRange(value: string | undefined): RangeKey {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all") {
    return value;
  }
  return "7d";
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

  const uniqueVisitorsPromise = startIso
    ? supabase.rpc("count_unique_visitors", { start_ts: startIso })
    : supabase.rpc("count_unique_visitors", { start_ts: "1970-01-01T00:00:00.000Z" });

  const topCompaniesPromise = startIso
    ? supabase.rpc("get_top_company_views", { start_ts: startIso, limit_n: 50 })
    : supabase.rpc("get_top_company_views", { start_ts: "1970-01-01T00:00:00.000Z", limit_n: 50 });

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

  const [
    uniqueVisitorsResult,
    topCompaniesResult,
    feedbackRowsResult,
    feedbackCountResult,
    companyViewsCountResult,
    commentsRowsResult,
    commentsCountResult,
    reportsRowsResult,
    reportsCountResult,
    recentAccountsResult,
    recentWatchlistsResult,
    watchlistsCountResult,
  ] =
    await Promise.all([
      uniqueVisitorsPromise,
      topCompaniesPromise,
      feedbackRowsPromise,
      feedbackCountPromise,
      companyViewsCountPromise,
      commentsRowsPromise,
      commentsCountPromise,
      reportsRowsPromise,
      reportsCountPromise,
      recentAccountsPromise,
      recentWatchlistsPromise,
      watchlistsCountPromise,
    ]);

  const uniqueUsers = Number(uniqueVisitorsResult.data ?? 0);
  const topCompanies = (topCompaniesResult.data ?? []) as TopCompanyView[];
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

  return {
    uniqueUsers,
    topCompanies,
    feedbackRows,
    feedbackCount,
    companyViews,
    commentsRows,
    commentsCount,
    reportsRows,
    reportsCount,
    accountsCreatedCount,
    recentAccountsRows,
    watchlistsCreatedCount,
    recentWatchlistsRows,
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
    uniqueUsers: 0,
    topCompanies: [] as TopCompanyView[],
    feedbackRows: [] as FeedbackRequestRow[],
    feedbackCount: 0,
    companyViews: 0,
    commentsRows: [] as AdminCommentRow[],
    commentsCount: 0,
    reportsRows: [] as AdminReportedRow[],
    reportsCount: 0,
    accountsCreatedCount: 0,
    recentAccountsRows: [] as RecentAccountRow[],
    watchlistsCreatedCount: 0,
    recentWatchlistsRows: [] as RecentWatchlistRow[],
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

      <AdminKpiCards
        uniqueUsers={data.uniqueUsers}
        accountsCreatedCount={data.accountsCreatedCount}
        watchlistsCreatedCount={data.watchlistsCreatedCount}
        companyViews={data.companyViews}
        feedbackCount={data.feedbackCount}
        commentsCount={data.commentsCount}
        reportsCount={data.reportsCount}
      />

      {dataLoadError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 p-3 text-sm text-red-700 dark:text-red-200">
          {dataLoadError}
        </div>
      ) : null}

      <RecentAccountsTable rows={data.recentAccountsRows} />
      <RecentWatchlistsTable rows={data.recentWatchlistsRows} />
      <TopCompaniesTable rows={data.topCompanies} />
      <FeedbackRequestsTable rows={data.feedbackRows} />
      <CompanyCommentsTable comments={data.commentsRows} reported={data.reportsRows} />
    </main>
  );
}
