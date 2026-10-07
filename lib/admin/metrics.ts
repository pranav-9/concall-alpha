// Pure shaping for the admin panel: raw Supabase rows → the numbers and lists
// each section renders. No Next.js / Supabase imports so tests/admin-metrics.test.ts
// can exercise every branch under the tsx runner. Fetching lives in queries.ts.

import { normalizeCompanyCode, buildCompanyNameMap, type CompanyNameRow } from "@/lib/admin-company-views";

// ── Period-over-period ───────────────────────────────────────────────────────

export type Delta = {
  current: number;
  /** null = no comparison window (All time) or the prior count is unknown. */
  prior: number | null;
  /** Percent change, null when there is no prior or the prior is zero. */
  pct: number | null;
  direction: "up" | "down" | "flat" | "none";
};

export function computeDelta(current: number, prior: number | null): Delta {
  if (prior == null) return { current, prior: null, pct: null, direction: "none" };
  if (prior === 0) {
    return {
      current,
      prior,
      pct: null,
      direction: current > 0 ? "up" : "flat",
    };
  }
  const pct = ((current - prior) / prior) * 100;
  const direction = pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  return { current, prior, pct, direction };
}

/** "+12% vs prior 7d" · "new vs prior 7d" (prior was 0) · "no change vs prior 7d". */
export function formatDelta(delta: Delta, priorLabel: string | null): string | null {
  if (delta.direction === "none" || !priorLabel) return null;
  if (delta.pct == null) {
    return delta.current > 0 ? `new ${priorLabel}` : `none ${priorLabel}`;
  }
  if (delta.direction === "flat") return `no change ${priorLabel}`;
  const rounded = Math.round(delta.pct);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}% ${priorLabel}`;
}

// ── Active visitors ──────────────────────────────────────────────────────────

export type VisitorEventRow = {
  visitor_id: string | null;
  created_at: string | null;
};

export type ActiveVisitorPoint = {
  date: string;
  dau: number;
  wau: number;
  mau: number;
};

const INDIA_TIME_ZONE = "Asia/Kolkata";
const localDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: INDIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getLocalDateKey(value: string | Date): string | null {
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
    visitorsByDate.get(shiftDateKey(dateKey, -offset))?.forEach((id) => visitors.add(id));
  }
  return visitors.size;
}

export function buildActiveVisitors(
  rows: VisitorEventRow[],
  chartStartIso: string,
  now: Date = new Date(),
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

  return getDateKeysBetween(chartStartIso, now).map((date) => ({
    date,
    dau: countRollingVisitors(visitorsByDate, date, 1),
    wau: countRollingVisitors(visitorsByDate, date, 7),
    mau: countRollingVisitors(visitorsByDate, date, 30),
  }));
}

/** Distinct visitors with an event in [startIso, endIso). */
export function countUniqueVisitorsBetween(
  rows: VisitorEventRow[],
  startIso: string,
  endIso: string,
): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.visitor_id || !row.created_at) continue;
    const ts = Date.parse(row.created_at);
    if (!Number.isFinite(ts) || ts < start || ts >= end) continue;
    ids.add(row.visitor_id);
  }
  return ids.size;
}

// ── Watchlists ───────────────────────────────────────────────────────────────

export type WatchlistItemRow = {
  id: number;
  watchlist_id: number | null;
  company_code: string | null;
  created_at: string | null;
};

export type WatchlistLookupRow = {
  id: number;
  user_id: string | null;
  name: string | null;
  created_at: string | null;
};

export type AdminUserSummary = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export type TopSavedCompanyRow = {
  companyCode: string;
  companyName: string | null;
  savedCount: number;
};

export type LatestWatchlistActivityRow = {
  id: string;
  action: "watchlist_created" | "company_added";
  occurredAt: string;
  watchlistName: string | null;
  companyCode: string | null;
  companyName: string | null;
  userId: string | null;
  userDisplayName: string | null;
  userEmail: string | null;
};

export function buildTopSavedCompanies(
  items: WatchlistItemRow[],
  companyRows: CompanyNameRow[],
  limit = 50,
): TopSavedCompanyRow[] {
  const names = buildCompanyNameMap(companyRows);
  const counts = new Map<string, number>();
  items.forEach((row) => {
    const code = normalizeCompanyCode(row.company_code);
    if (!code) return;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([companyCode, savedCount]) => ({
      companyCode,
      companyName: names.get(companyCode) ?? null,
      savedCount,
    }))
    .sort(
      (a, b) =>
        b.savedCount - a.savedCount ||
        (a.companyName ?? a.companyCode).localeCompare(b.companyName ?? b.companyCode),
    )
    .slice(0, limit);
}

export function formatAverageSavesPerWatchlist(saved: number, watchlists: number): string {
  if (watchlists === 0) return "0";
  const average = saved / watchlists;
  return Number.isInteger(average) ? String(average) : average.toFixed(1);
}

export function buildLatestWatchlistActivity({
  watchlistRows,
  itemRows,
  watchlistsById,
  companyRows,
  usersById,
  limit = 100,
}: {
  watchlistRows: WatchlistLookupRow[];
  itemRows: WatchlistItemRow[];
  watchlistsById: Map<number, WatchlistLookupRow>;
  companyRows: CompanyNameRow[];
  usersById: Map<string, AdminUserSummary>;
  limit?: number;
}): LatestWatchlistActivityRow[] {
  const names = buildCompanyNameMap(companyRows);

  const created: LatestWatchlistActivityRow[] = watchlistRows
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

  const added: LatestWatchlistActivityRow[] = itemRows
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
        companyName: code ? (names.get(code) ?? null) : null,
        userId: watchlist?.user_id ?? null,
        userDisplayName: user?.displayName ?? null,
        userEmail: user?.email ?? null,
      };
    });

  return [...created, ...added]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, limit);
}

// ── Requests ─────────────────────────────────────────────────────────────────

export const REQUEST_TYPES = [
  "feedback",
  "stock_addition",
  "bug_report",
  "missing_section",
  "section_improvement",
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  feedback: "Feedback",
  stock_addition: "Stock additions",
  bug_report: "Bug reports",
  missing_section: "Missing sections",
  section_improvement: "Section improvements",
};

export type FeedbackRequestRow = {
  id: string;
  request_type: RequestType;
  subject_target: string;
  message: string | null;
  source_path: string | null;
  user_agent: string | null;
  created_at: string;
};

export function countRequestsByType(rows: FeedbackRequestRow[]): Record<RequestType, number> {
  const counts = Object.fromEntries(REQUEST_TYPES.map((t) => [t, 0])) as Record<RequestType, number>;
  for (const row of rows) {
    if (row.request_type in counts) counts[row.request_type] += 1;
  }
  return counts;
}

// ── API performance ──────────────────────────────────────────────────────────

export type ApiMetricRawRow = {
  id: string;
  route: string | null;
  method: string | null;
  status_code: number | null;
  duration_ms: number | null;
  result_count: number | null;
  query_length: number | null;
  error_code: string | null;
  created_at: string | null;
};

export type ApiPerformanceRow = {
  id: string;
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  resultCount: number | null;
  queryLength: number | null;
  errorCode: string | null;
  createdAt: string | null;
};

export type ApiRouteAggregateRow = {
  route: string;
  calls: number;
  // serverErrors = 5xx (real failures); clientErrors = 4xx (validation
  // rejections, auth-required) — kept apart so bot/junk traffic doesn't bury
  // a real server failure.
  serverErrorCount: number;
  clientErrorCount: number;
  avgMs: number | null;
  p95Ms: number | null;
};

export type ApiPerformanceData = {
  available: boolean;
  // totalCalls is the exact count over the whole window; the latency/error
  // stats are computed over the most recent `sampledCalls` rows. When `sampled`
  // is true the two differ.
  totalCalls: number;
  sampledCalls: number;
  sampled: boolean;
  serverErrorCount: number;
  clientErrorCount: number;
  avgMs: number | null;
  p50Ms: number | null;
  p90Ms: number | null;
  p95Ms: number | null;
  perRoute: ApiRouteAggregateRow[];
  slowRows: ApiPerformanceRow[];
};

export function emptyApiPerformance(available = true): ApiPerformanceData {
  return {
    available,
    totalCalls: 0,
    sampledCalls: 0,
    sampled: false,
    serverErrorCount: 0,
    clientErrorCount: 0,
    avgMs: null,
    p50Ms: null,
    p90Ms: null,
    p95Ms: null,
    perRoute: [],
    slowRows: [],
  };
}

export function percentile(sortedValues: number[], percentileValue: number): number | null {
  if (sortedValues.length === 0) return null;
  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(sortedValues.length - 1, index))];
}

export function aggregateApiMetrics(
  rawRows: ApiMetricRawRow[],
  totalCount: number | null,
  slowRowLimit = 50,
): ApiPerformanceData {
  const rows: ApiPerformanceRow[] = rawRows.map((row) => ({
    id: row.id,
    route: row.route ?? "unknown",
    method: row.method ?? "GET",
    statusCode: Number(row.status_code ?? 0),
    durationMs: Number(row.duration_ms ?? 0),
    resultCount: row.result_count,
    queryLength: row.query_length,
    errorCode: row.error_code,
    createdAt: row.created_at,
  }));

  const durations = rows
    .map((row) => row.durationMs)
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);
  const slowRows = [...rows].sort((a, b) => b.durationMs - a.durationMs).slice(0, slowRowLimit);

  // Per-route aggregates so heterogeneous routes are not blended into one
  // meaningless average (a fast page-view write would otherwise drag search P95
  // down). Computed over the same sample as the headline stats.
  const byRoute = new Map<
    string,
    { calls: number; durations: number[]; serverErrors: number; clientErrors: number }
  >();
  for (const row of rows) {
    const bucket = byRoute.get(row.route) ?? {
      calls: 0,
      durations: [],
      serverErrors: 0,
      clientErrors: 0,
    };
    bucket.calls += 1;
    if (Number.isFinite(row.durationMs) && row.durationMs >= 0) bucket.durations.push(row.durationMs);
    if (row.statusCode >= 500) bucket.serverErrors += 1;
    else if (row.statusCode >= 400) bucket.clientErrors += 1;
    byRoute.set(row.route, bucket);
  }
  const perRoute: ApiRouteAggregateRow[] = [...byRoute.entries()]
    .map(([route, bucket]) => {
      const sorted = [...bucket.durations].sort((a, b) => a - b);
      const sum = sorted.reduce((acc, value) => acc + value, 0);
      return {
        route,
        calls: bucket.calls,
        serverErrorCount: bucket.serverErrors,
        clientErrorCount: bucket.clientErrors,
        avgMs: sorted.length > 0 ? sum / sorted.length : null,
        p95Ms: percentile(sorted, 95),
      };
    })
    .sort((a, b) => b.calls - a.calls);

  const totalCalls = Number(totalCount ?? rows.length);

  return {
    available: true,
    totalCalls,
    sampledCalls: rows.length,
    sampled: totalCalls > rows.length,
    serverErrorCount: rows.filter((row) => row.statusCode >= 500).length,
    clientErrorCount: rows.filter((row) => row.statusCode >= 400 && row.statusCode < 500).length,
    avgMs: durations.length > 0 ? totalDuration / durations.length : null,
    p50Ms: percentile(durations, 50),
    p90Ms: percentile(durations, 90),
    p95Ms: percentile(durations, 95),
    perRoute,
    slowRows,
  };
}

export function formatMs(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "–";
  return `${Math.round(value).toLocaleString("en-IN")}ms`;
}

// ── Formatting ───────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "3 Aug, 17:28" in IST — deterministic, so a server render and a client
 * hydration agree (toLocaleString reads the renderer's timezone, which differs
 * between Vercel and the reader). Year is added only when it is not this year.
 */
export function formatIst(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return "–";
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;
  const ist = new Date(ms + 5.5 * 60 * 60 * 1000);
  const nowIst = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const hh = String(ist.getUTCHours()).padStart(2, "0");
  const mm = String(ist.getUTCMinutes()).padStart(2, "0");
  const year = ist.getUTCFullYear() === nowIst.getUTCFullYear() ? "" : ` ${ist.getUTCFullYear()}`;
  return `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]}${year}, ${hh}:${mm}`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}
