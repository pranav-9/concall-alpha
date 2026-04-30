import { logger } from "@/lib/logger";

const NSE_HOME_URL = "https://www.nseindia.com/";
const NSE_EVENT_CALENDAR_URL = "https://www.nseindia.com/api/event-calendar?index=equities";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://www.nseindia.com/companies-listing/corporate-filings-event-calendar",
  Connection: "keep-alive",
};

type NseEventRaw = {
  symbol?: string | null;
  company?: string | null;
  purpose?: string | null;
  bm_desc?: string | null;
  bm_date?: string | null;
  [key: string]: unknown;
};

export type NseEventNormalized = {
  symbol: string;
  companyName: string | null;
  purpose: string | null;
  description: string | null;
  eventDate: string; // ISO YYYY-MM-DD
  inferredFy: number;
  inferredQtr: number;
  raw: NseEventRaw;
};

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const parseNseDate = (input: string): Date | null => {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  // NSE format: "31-Jul-2025" or "31-Jul-2025 16:30:00"
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})/.exec(trimmed);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const monthIdx = MONTH_INDEX[match[2].toLowerCase()];
  const year = parseInt(match[3], 10);
  if (!Number.isFinite(day) || monthIdx == null || !Number.isFinite(year)) return null;
  const d = new Date(Date.UTC(year, monthIdx, day));
  return Number.isNaN(d.getTime()) ? null : d;
};

const toISODate = (d: Date): string => d.toISOString().slice(0, 10);

export const inferFyQtrFromEventDate = (
  date: Date,
): { fy: number; qtr: number } => {
  // Indian FY = April–March. Companies report a quarter's results
  // ~30–60 days after that quarter ends. Map event-date month → quarter
  // whose results are being announced. fy is the 4-digit year matching
  // concall_analysis.fy (e.g. 2026 for Q4 FY26 results announced Apr 2026).
  const m = date.getUTCMonth(); // 0..11
  const y = date.getUTCFullYear();
  if (m >= 3 && m <= 5) return { fy: y, qtr: 4 };       // Apr–Jun → Q4 of FY ending this Mar
  if (m >= 6 && m <= 8) return { fy: y + 1, qtr: 1 };   // Jul–Sep → Q1 of FY started this Apr
  if (m >= 9 && m <= 11) return { fy: y + 1, qtr: 2 };  // Oct–Dec → Q2 of FY started this Apr
  return { fy: y, qtr: 3 };                              // Jan–Mar → Q3 of FY started prev Apr
};

const isResultsEvent = (raw: NseEventRaw): boolean => {
  const bag = `${raw.purpose ?? ""} ${raw.bm_desc ?? ""}`.toLowerCase();
  if (!bag.trim()) return false;
  return (
    bag.includes("financial result") ||
    bag.includes("quarterly result") ||
    bag.includes("audited result") ||
    bag.includes("unaudited result")
  );
};

const collectCookies = (response: Response): string => {
  // Node fetch exposes Set-Cookie via getSetCookie() (Undici) when available.
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const list = headers.getSetCookie?.() ?? [];
  if (!list.length) {
    const single = response.headers.get("set-cookie");
    if (single) return single.split(",").map((c) => c.split(";")[0].trim()).join("; ");
    return "";
  }
  return list.map((c) => c.split(";")[0].trim()).join("; ");
};

export type FetchNseEventsOptions = {
  /** Override fetch (useful in tests). */
  fetchImpl?: typeof fetch;
};

export type FetchNseEventsResult = {
  events: NseEventNormalized[];
  rawCount: number;
};

export async function fetchNseEvents(
  opts: FetchNseEventsOptions = {},
): Promise<FetchNseEventsResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;

  // Step 1: warm up cookies by hitting the homepage.
  const home = await fetchImpl(NSE_HOME_URL, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
  });
  if (!home.ok) {
    throw new Error(`NSE warmup failed: ${home.status} ${home.statusText}`);
  }
  const cookieHeader = collectCookies(home);
  if (!cookieHeader) {
    logger.warn("nse-event-calendar: warmup returned no cookies; NSE likely to 401");
  }

  // Step 2: fetch the event calendar JSON with the cookies.
  const apiResp = await fetchImpl(NSE_EVENT_CALENDAR_URL, {
    headers: {
      ...BROWSER_HEADERS,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    redirect: "follow",
  });
  if (!apiResp.ok) {
    throw new Error(
      `NSE event-calendar fetch failed: ${apiResp.status} ${apiResp.statusText}`,
    );
  }
  const payload = (await apiResp.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("NSE event-calendar payload was not an array");
  }
  const rawRows = payload as NseEventRaw[];

  const events: NseEventNormalized[] = [];
  for (const raw of rawRows) {
    if (!isResultsEvent(raw)) continue;
    const symbol = (raw.symbol ?? "").toString().trim().toUpperCase();
    if (!symbol) continue;
    const date = raw.bm_date ? parseNseDate(raw.bm_date) : null;
    if (!date) continue;
    const { fy, qtr } = inferFyQtrFromEventDate(date);
    events.push({
      symbol,
      companyName: raw.company?.toString().trim() ?? null,
      purpose: raw.purpose?.toString().trim() ?? null,
      description: raw.bm_desc?.toString().trim() ?? null,
      eventDate: toISODate(date),
      inferredFy: fy,
      inferredQtr: qtr,
      raw,
    });
  }

  return { events, rawCount: rawRows.length };
}
