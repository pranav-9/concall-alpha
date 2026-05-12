import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export type RangeKey = "7d" | "30d" | "90d" | "all";

const PAGE_SIZE = 1000;
const ADMIN_CHART_MAX_DAYS = 90;
const ACTIVE_VISITOR_LOOKBACK_DAYS = 29;
const INDIA_TIME_ZONE = "Asia/Kolkata";

const istDateOnlyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: INDIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const istTimestampFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: INDIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function parseRange(value: string | undefined | null): RangeKey {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all") {
    return value;
  }
  return "7d";
}

function getStartIso(range: RangeKey): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
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

function rangeLabel(range: RangeKey): string {
  switch (range) {
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    case "all":
      return "All time";
  }
}

function istDateOnly(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return istDateOnlyFormatter.format(date);
}

function istTimestamp(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${istTimestampFormatter.format(date)} IST`;
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateKeysBetween(startIso: string, end: Date): string[] {
  const startKey = istDateOnly(startIso);
  const endKey = istDateOnly(end);
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

function escapeTableCell(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function blockquote(value: string | null | undefined): string {
  if (!value) return "> _(empty)_";
  const lines = String(value).replace(/\r\n/g, "\n").split("\n");
  return lines.map((line) => `> ${line}`).join("\n");
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-IN");
}

type PageViewEventRow = {
  visitor_id: string | null;
  created_at: string | null;
};

type AuthUserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  created_at: string;
};

type WatchlistRow = {
  id: number;
  user_id: string | null;
  name: string | null;
  created_at: string | null;
};

type WatchlistItemRow = {
  id: number;
  watchlist_id: number | null;
  company_code: string | null;
  created_at: string | null;
};

type UserRequestRow = {
  id: number;
  request_type:
    | "feedback"
    | "stock_addition"
    | "bug_report"
    | "missing_section"
    | "section_improvement";
  subject_target: string | null;
  message: string | null;
  source_path: string | null;
  user_agent: string | null;
  created_at: string | null;
};

type CommentRow = {
  id: number;
  company_code: string | null;
  comment_text: string | null;
  visitor_id: string | null;
  status: string | null;
  likes_count: number | null;
  reports_count: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type CommentReportRow = {
  id: number;
  comment_id: number | null;
  reason: string | null;
  created_at: string | null;
  comment: CommentRow[] | CommentRow | null;
};

type CompanyRow = {
  code: string | null;
  name: string | null;
};

async function paginate<T>(
  loadPage: (from: number, to: number) => Promise<T[]>,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const pageRows = await loadPage(from, from + PAGE_SIZE - 1);
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchPageViewEvents(
  supabase: SupabaseClient,
  sinceIso: string,
): Promise<PageViewEventRow[]> {
  return paginate(async (from, to) => {
    const { data, error } = await supabase
      .from("page_view_events")
      .select("visitor_id, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as PageViewEventRow[];
  });
}

async function fetchAuthUsers(supabase: SupabaseClient): Promise<AuthUserRow[]> {
  const perPage = 100;
  let page = 1;
  const rows: AuthUserRow[] = [];
  while (true) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });
    if (result.error) throw result.error;
    result.data.users.forEach((user) => {
      rows.push({
        id: user.id,
        email: user.email ?? null,
        displayName: getUserDisplayName(user.user_metadata),
        created_at: user.created_at,
      });
    });
    if (!result.data.nextPage || result.data.users.length === 0) break;
    page = result.data.nextPage;
  }
  return rows;
}

async function fetchWatchlists(
  supabase: SupabaseClient,
  startIso: string | null,
): Promise<WatchlistRow[]> {
  return paginate(async (from, to) => {
    let query = supabase
      .from("watchlists")
      .select("id, user_id, name, created_at")
      .not("created_at", "is", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (startIso) query = query.gte("created_at", startIso);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as WatchlistRow[];
  });
}

async function fetchWatchlistItems(
  supabase: SupabaseClient,
  startIso: string | null,
): Promise<WatchlistItemRow[]> {
  return paginate(async (from, to) => {
    let query = supabase
      .from("watchlist_items")
      .select("id, watchlist_id, company_code, created_at")
      .not("company_code", "is", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (startIso) query = query.gte("created_at", startIso);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as WatchlistItemRow[];
  });
}

async function fetchUserRequests(
  supabase: SupabaseClient,
  startIso: string | null,
): Promise<UserRequestRow[]> {
  return paginate(async (from, to) => {
    let query = supabase
      .from("user_requests")
      .select(
        "id, request_type, subject_target, message, source_path, user_agent, created_at",
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (startIso) query = query.gte("created_at", startIso);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as UserRequestRow[];
  });
}

async function fetchComments(
  supabase: SupabaseClient,
  startIso: string | null,
): Promise<CommentRow[]> {
  return paginate(async (from, to) => {
    let query = supabase
      .from("company_comments")
      .select(
        "id, company_code, comment_text, visitor_id, status, likes_count, reports_count, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (startIso) query = query.gte("created_at", startIso);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CommentRow[];
  });
}

async function fetchCommentReports(
  supabase: SupabaseClient,
  startIso: string | null,
): Promise<CommentReportRow[]> {
  return paginate(async (from, to) => {
    let query = supabase
      .from("company_comment_reports")
      .select(
        "id, comment_id, reason, created_at, comment:company_comments(id, company_code, comment_text, visitor_id, status, likes_count, reports_count, created_at, updated_at)",
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (startIso) query = query.gte("created_at", startIso);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CommentReportRow[];
  });
}

async function fetchCompanies(supabase: SupabaseClient): Promise<CompanyRow[]> {
  return paginate(async (from, to) => {
    const { data, error } = await supabase
      .from("company")
      .select("code, name")
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as CompanyRow[];
  });
}

async function fetchUniqueVisitors(
  supabase: SupabaseClient,
  startIso: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc("count_unique_visitors", {
    start_ts: startIso ?? "1970-01-01T00:00:00.000Z",
  });
  if (error) throw error;
  return Number(data ?? 0);
}

type ActiveVisitorPoint = {
  date: string;
  dau: number;
  wau: number;
  mau: number;
};

function buildActiveVisitors(
  rows: PageViewEventRow[],
  chartStartIso: string,
): ActiveVisitorPoint[] {
  const visitorsByDate = new Map<string, Set<string>>();
  rows.forEach((row) => {
    if (!row.visitor_id || !row.created_at) return;
    const key = istDateOnly(row.created_at);
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

function countRequestsByType(
  rows: UserRequestRow[],
): Record<UserRequestRow["request_type"], number> {
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
    } as Record<UserRequestRow["request_type"], number>,
  );
}

function buildTopSavedCompanies(
  items: WatchlistItemRow[],
  companyNames: Map<string, string>,
): Array<{ code: string; name: string | null; saves: number }> {
  const savedCounts = new Map<string, number>();
  items.forEach((row) => {
    const code = normalizeCompanyCode(row.company_code);
    if (!code) return;
    savedCounts.set(code, (savedCounts.get(code) ?? 0) + 1);
  });
  return Array.from(savedCounts.entries())
    .map(([code, saves]) => ({
      code,
      name: companyNames.get(code) ?? null,
      saves,
    }))
    .sort(
      (a, b) =>
        b.saves - a.saves ||
        (a.name ?? a.code).localeCompare(b.name ?? b.code),
    );
}

type ActivityEvent =
  | {
      kind: "watchlist_created";
      occurredAt: string;
      watchlistName: string | null;
      user: AuthUserRow | null;
    }
  | {
      kind: "company_added";
      occurredAt: string;
      watchlistName: string | null;
      companyCode: string | null;
      companyName: string | null;
      user: AuthUserRow | null;
    };

function buildActivity({
  watchlists,
  items,
  watchlistsById,
  usersById,
  companyNames,
}: {
  watchlists: WatchlistRow[];
  items: WatchlistItemRow[];
  watchlistsById: Map<number, WatchlistRow>;
  usersById: Map<string, AuthUserRow>;
  companyNames: Map<string, string>;
}): ActivityEvent[] {
  const created: ActivityEvent[] = watchlists
    .filter((row) => row.created_at)
    .map((row) => ({
      kind: "watchlist_created" as const,
      occurredAt: row.created_at as string,
      watchlistName: row.name,
      user: row.user_id ? usersById.get(row.user_id) ?? null : null,
    }));
  const added: ActivityEvent[] = items
    .filter((row) => row.created_at)
    .map((row) => {
      const watchlist = row.watchlist_id
        ? watchlistsById.get(row.watchlist_id) ?? null
        : null;
      const user = watchlist?.user_id
        ? usersById.get(watchlist.user_id) ?? null
        : null;
      const code = normalizeCompanyCode(row.company_code);
      return {
        kind: "company_added" as const,
        occurredAt: row.created_at as string,
        watchlistName: watchlist?.name ?? null,
        companyCode: code,
        companyName: code ? companyNames.get(code) ?? null : null,
        user,
      };
    });
  return [...created, ...added].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

function userLabel(user: AuthUserRow | null): string {
  if (!user) return "—";
  if (user.displayName && user.email) return `${user.displayName} <${user.email}>`;
  return user.displayName ?? user.email ?? user.id;
}

function renderHeader(range: RangeKey, startIso: string | null): string {
  const sinceLabel = startIso
    ? `${istTimestamp(startIso)} → now`
    : "all available history → now";
  return [
    "# Story of a Stock — Admin Analytics Report",
    "",
    `**Generated:** ${istTimestamp(new Date())}`,
    `**Range:** ${rangeLabel(range)} (${sinceLabel})`,
    "",
    "---",
    "",
  ].join("\n");
}

function renderUsageSection(args: {
  uniqueVisitors: number;
  accountsInRange: AuthUserRow[];
  commentsInRange: number;
  requestsInRange: number;
  activeVisitors: ActiveVisitorPoint[];
  range: RangeKey;
}): string {
  const {
    uniqueVisitors,
    accountsInRange,
    commentsInRange,
    requestsInRange,
    activeVisitors,
    range,
  } = args;
  const lines: string[] = [];
  lines.push("## 1. User Usage", "");
  lines.push("### Summary", "");
  lines.push("| Metric | Value |", "| --- | --- |");
  lines.push(`| Unique Visitors | ${formatNumber(uniqueVisitors)} |`);
  lines.push(`| Accounts Created | ${formatNumber(accountsInRange.length)} |`);
  lines.push(`| Comments Created | ${formatNumber(commentsInRange)} |`);
  lines.push(`| Requests Submitted | ${formatNumber(requestsInRange)} |`);
  lines.push("");
  const chartWindowNote =
    range === "all" ? " (last 90 days)" : ` (${rangeLabel(range).toLowerCase()})`;
  lines.push(`### Daily Active Visitors${chartWindowNote}`, "");
  if (activeVisitors.length === 0) {
    lines.push("_No data in window._", "");
  } else {
    lines.push("| Date | DAU | WAU | MAU |", "| --- | ---: | ---: | ---: |");
    activeVisitors.forEach((point) => {
      lines.push(
        `| ${point.date} | ${formatNumber(point.dau)} | ${formatNumber(point.wau)} | ${formatNumber(point.mau)} |`,
      );
    });
    lines.push("");
  }
  lines.push(`### Accounts Created (${formatNumber(accountsInRange.length)})`, "");
  if (accountsInRange.length === 0) {
    lines.push("_No data in range._", "");
  } else {
    lines.push(
      "| Email | Display Name | Created |",
      "| --- | --- | --- |",
    );
    accountsInRange
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .forEach((user) => {
        lines.push(
          `| ${escapeTableCell(user.email ?? "—")} | ${escapeTableCell(user.displayName ?? "—")} | ${escapeTableCell(istTimestamp(user.created_at))} |`,
        );
      });
    lines.push("");
  }
  return lines.join("\n");
}

function renderWatchlistsSection(args: {
  watchlists: WatchlistRow[];
  items: WatchlistItemRow[];
  activity: ActivityEvent[];
  topSaved: Array<{ code: string; name: string | null; saves: number }>;
  usersById: Map<string, AuthUserRow>;
}): string {
  const { watchlists, items, activity, topSaved, usersById } = args;
  const lines: string[] = [];
  lines.push("## 2. Watchlists", "");

  const watchlistsCount = watchlists.length;
  const savedCount = items.length;
  const avg =
    watchlistsCount === 0
      ? "0"
      : Number.isInteger(savedCount / watchlistsCount)
        ? String(savedCount / watchlistsCount)
        : (savedCount / watchlistsCount).toFixed(1);

  lines.push("### Summary", "");
  lines.push("| Metric | Value |", "| --- | --- |");
  lines.push(`| Watchlists Created | ${formatNumber(watchlistsCount)} |`);
  lines.push(`| Saved Companies | ${formatNumber(savedCount)} |`);
  lines.push(`| Avg Saves / Watchlist | ${avg} |`);
  lines.push("");

  lines.push(`### Latest Activity (${formatNumber(activity.length)} events)`, "");
  if (activity.length === 0) {
    lines.push("_No data in range._", "");
  } else {
    lines.push(
      "| Time | Action | User | Watchlist | Company |",
      "| --- | --- | --- | --- | --- |",
    );
    activity.forEach((event) => {
      const action =
        event.kind === "watchlist_created"
          ? "watchlist created"
          : "company added";
      const company =
        event.kind === "company_added"
          ? event.companyName
            ? `${event.companyName} (${event.companyCode ?? "—"})`
            : event.companyCode ?? "—"
          : "—";
      lines.push(
        `| ${escapeTableCell(istTimestamp(event.occurredAt))} | ${escapeTableCell(action)} | ${escapeTableCell(userLabel(event.user))} | ${escapeTableCell(event.watchlistName ?? "—")} | ${escapeTableCell(company)} |`,
      );
    });
    lines.push("");
  }

  lines.push(`### Watchlists Created (${formatNumber(watchlistsCount)})`, "");
  if (watchlistsCount === 0) {
    lines.push("_No data in range._", "");
  } else {
    lines.push(
      "| Name | Owner | Created |",
      "| --- | --- | --- |",
    );
    watchlists.forEach((row) => {
      const owner = row.user_id ? usersById.get(row.user_id) ?? null : null;
      lines.push(
        `| ${escapeTableCell(row.name ?? "—")} | ${escapeTableCell(userLabel(owner))} | ${escapeTableCell(istTimestamp(row.created_at))} |`,
      );
    });
    lines.push("");
  }

  lines.push(`### Top Saved Companies (${formatNumber(topSaved.length)})`, "");
  if (topSaved.length === 0) {
    lines.push("_No data in range._", "");
  } else {
    lines.push("| Company | Code | Saves |", "| --- | --- | ---: |");
    topSaved.forEach((row) => {
      lines.push(
        `| ${escapeTableCell(row.name ?? "—")} | ${escapeTableCell(row.code)} | ${formatNumber(row.saves)} |`,
      );
    });
    lines.push("");
  }

  return lines.join("\n");
}

function renderOperationsSection(args: {
  requests: UserRequestRow[];
  comments: CommentRow[];
  reports: CommentReportRow[];
  companyNames: Map<string, string>;
}): string {
  const { requests, comments, reports, companyNames } = args;
  const lines: string[] = [];
  lines.push("## 3. Requests & Moderation", "");

  const requestCounts = countRequestsByType(requests);
  const reportedCommentsCount = new Set(
    reports.map((row) => row.comment_id).filter((id): id is number => id != null),
  ).size;

  lines.push("### Summary", "");
  lines.push("| Metric | Value |", "| --- | --- |");
  lines.push(`| Total Requests | ${formatNumber(requests.length)} |`);
  lines.push(`| Bug Reports | ${formatNumber(requestCounts.bug_report)} |`);
  lines.push(`| Missing Section Requests | ${formatNumber(requestCounts.missing_section)} |`);
  lines.push(`| Section Improvements | ${formatNumber(requestCounts.section_improvement)} |`);
  lines.push(`| Stock Addition Requests | ${formatNumber(requestCounts.stock_addition)} |`);
  lines.push(`| General Feedback | ${formatNumber(requestCounts.feedback)} |`);
  lines.push(`| Total Comments | ${formatNumber(comments.length)} |`);
  lines.push(`| Total Reports | ${formatNumber(reports.length)} |`);
  lines.push(`| Distinct Reported Comments | ${formatNumber(reportedCommentsCount)} |`);
  lines.push("");

  lines.push(`### Feedback Requests (${formatNumber(requests.length)})`, "");
  if (requests.length === 0) {
    lines.push("_No data in range._", "");
  } else {
    requests.forEach((row) => {
      const company = row.subject_target
        ? companyNames.get(row.subject_target) ?? null
        : null;
      const subject = company
        ? `${company} (${row.subject_target})`
        : row.subject_target ?? "—";
      lines.push(
        `- **${row.request_type}** • ${istTimestamp(row.created_at)} • subject: ${subject}`,
      );
      if (row.source_path) lines.push(`  - source: \`${row.source_path}\``);
      if (row.user_agent) lines.push(`  - user-agent: \`${row.user_agent}\``);
      lines.push(blockquote(row.message));
      lines.push("");
    });
  }

  lines.push(`### Comments (${formatNumber(comments.length)})`, "");
  if (comments.length === 0) {
    lines.push("_No data in range._", "");
  } else {
    comments.forEach((row) => {
      const company = row.company_code
        ? companyNames.get(row.company_code) ?? null
        : null;
      const companyLabel = company
        ? `${company} (${row.company_code})`
        : row.company_code ?? "—";
      lines.push(
        `- **${companyLabel}** • visitor \`${row.visitor_id ?? "—"}\` • ${istTimestamp(row.created_at)} • status=${row.status ?? "—"} • likes=${row.likes_count ?? 0} reports=${row.reports_count ?? 0}`,
      );
      lines.push(blockquote(row.comment_text));
      lines.push("");
    });
  }

  lines.push(`### Reported Comments (${formatNumber(reports.length)})`, "");
  if (reports.length === 0) {
    lines.push("_No data in range._", "");
  } else {
    reports.forEach((row) => {
      const comment = Array.isArray(row.comment)
        ? row.comment[0] ?? null
        : row.comment;
      const company = comment?.company_code
        ? companyNames.get(comment.company_code) ?? null
        : null;
      const companyLabel = comment?.company_code
        ? company
          ? `${company} (${comment.company_code})`
          : comment.company_code
        : "—";
      lines.push(
        `- **Report #${row.id}** • ${istTimestamp(row.created_at)} • reason: ${row.reason ?? "—"}`,
      );
      lines.push(
        `  - comment: ${companyLabel} • visitor \`${comment?.visitor_id ?? "—"}\` • status=${comment?.status ?? "—"} • likes=${comment?.likes_count ?? 0} reports=${comment?.reports_count ?? 0}`,
      );
      lines.push(blockquote(comment?.comment_text ?? null));
      lines.push("");
    });
  }

  return lines.join("\n");
}

export async function generateAdminReport(
  range: RangeKey,
): Promise<{ markdown: string; filename: string }> {
  const supabase = createAdminClient();
  const startIso = getStartIso(range);
  const chartStartIso = getChartStartIso(range);
  const chartFetchStartIso = getChartFetchStartIso(chartStartIso);

  const [
    uniqueVisitors,
    pageViewEvents,
    authUsers,
    watchlists,
    items,
    requests,
    comments,
    reports,
    companies,
  ] = await Promise.all([
    fetchUniqueVisitors(supabase, startIso),
    fetchPageViewEvents(supabase, chartFetchStartIso),
    fetchAuthUsers(supabase),
    fetchWatchlists(supabase, startIso),
    fetchWatchlistItems(supabase, startIso),
    fetchUserRequests(supabase, startIso),
    fetchComments(supabase, startIso),
    fetchCommentReports(supabase, startIso),
    fetchCompanies(supabase),
  ]);

  const usersById = new Map<string, AuthUserRow>();
  authUsers.forEach((user) => usersById.set(user.id, user));

  const accountsInRange = startIso
    ? authUsers.filter(
        (user) =>
          new Date(user.created_at).getTime() >= new Date(startIso).getTime(),
      )
    : authUsers;

  const companyNames = new Map<string, string>();
  companies.forEach((row) => {
    const code = normalizeCompanyCode(row.code);
    if (code && row.name) companyNames.set(code, row.name);
  });

  const watchlistsById = new Map<number, WatchlistRow>();
  watchlists.forEach((row) => watchlistsById.set(row.id, row));
  const missingWatchlistIds = items
    .map((row) => row.watchlist_id)
    .filter(
      (id): id is number => typeof id === "number" && !watchlistsById.has(id),
    );
  if (missingWatchlistIds.length > 0) {
    const uniqueIds = Array.from(new Set(missingWatchlistIds));
    const chunkSize = 500;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from("watchlists")
        .select("id, user_id, name, created_at")
        .in("id", chunk);
      if (error) throw error;
      ((data ?? []) as WatchlistRow[]).forEach((row) =>
        watchlistsById.set(row.id, row),
      );
    }
  }

  const activeVisitors = buildActiveVisitors(pageViewEvents, chartStartIso);
  const topSaved = buildTopSavedCompanies(items, companyNames);
  const activity = buildActivity({
    watchlists,
    items,
    watchlistsById,
    usersById,
    companyNames,
  });

  const markdown = [
    renderHeader(range, startIso),
    renderUsageSection({
      uniqueVisitors,
      accountsInRange,
      commentsInRange: comments.length,
      requestsInRange: requests.length,
      activeVisitors,
      range,
    }),
    "",
    "---",
    "",
    renderWatchlistsSection({
      watchlists,
      items,
      activity,
      topSaved,
      usersById,
    }),
    "",
    "---",
    "",
    renderOperationsSection({
      requests,
      comments,
      reports,
      companyNames,
    }),
    "",
  ].join("\n");

  const filename = `story-of-a-stock-admin-report-${istDateOnly(new Date())}-${range}.md`;

  return { markdown, filename };
}
