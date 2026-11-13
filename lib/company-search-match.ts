/**
 * Company search matching, shared by the navbar search (client, over the list
 * the root layout ships), `/api/company-search` (server fallback) and the
 * removed-from-coverage lookup — one ranking, so the three never disagree.
 */

export type CompanySearchCandidate = {
  code: string;
  name: string | null;
};

/** What the dropdown paints for a row: the match fields plus listing context. */
export type CompanySearchItem = CompanySearchCandidate & {
  exchange?: string | null;
  sector?: string | null;
};

export const COMPANY_SEARCH_LIMIT = 8;

/**
 * One tag for the `company.exchange` column ("BSE,NSE", "BSE, NSE", "NSE",
 * "BSE", null): NSE when listed there, else BSE, else nothing. Most covered
 * companies are dual-listed, and their code is the NSE symbol.
 */
export function listingExchange(raw: string | null | undefined): "NSE" | "BSE" | null {
  const value = (raw ?? "").toUpperCase();
  if (/\bNSE\b/.test(value)) return "NSE";
  if (/\bBSE\b/.test(value)) return "BSE";
  return null;
}

/** "Laurus Labs Limited" -> "Laurus Labs" for the dropdown row; blank -> the code. Matching still uses the full name. */
export function displayCompanyName(name: string | null | undefined, code: string): string {
  return (name ?? "").trim().replace(/\s+(?:limited|ltd\.?)$/i, "").trim() || code;
}

/**
 * Where the normalized query sits in `text`, for bolding the match in a row.
 * Null when it doesn't appear (a code match leaves the name plain).
 */
export function matchRange(text: string | null | undefined, rawQuery: string): [number, number] | null {
  const query = normalizeSearchQuery(rawQuery);
  if (!text || !query) return null;
  const at = text.toLowerCase().indexOf(query);
  return at < 0 ? null : [at, at + query.length];
}

/**
 * The query with the exchange decoration people paste from brokers and charting
 * sites stripped, case kept: "NSE:BLUESTARCO", ":BLUESTARCO", "BLUESTARCO.NS",
 * "BLUESTARCO-EQ" all become "BLUESTARCO". A bare "bse" stays a query (BSE Ltd
 * is a company); only a prefix followed by a colon is decoration.
 */
export function stripExchangeDecoration(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .replace(/^(?:nse|bse)\s*:\s*/i, "")
    .replace(/^:+\s*/, "")
    .replace(/\.(?:ns|bo)$/i, "")
    .replace(/-eq$/i, "")
    .trim();
}

/** Match key: decoration stripped, lower-cased. */
export function normalizeSearchQuery(raw: string | null | undefined): string {
  return stripExchangeDecoration(raw).toLowerCase();
}

function lower(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

/** 0 = exact code … 4 = name contains; Infinity = no match. `query` is already normalized. */
export function scoreCompanyMatch(row: CompanySearchCandidate, query: string): number {
  if (!query) return Number.POSITIVE_INFINITY;
  const code = lower(row.code);
  const name = lower(row.name);

  if (code === query) return 0;
  if (code.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (code.includes(query)) return 3;
  if (name.includes(query)) return 4;
  return Number.POSITIVE_INFINITY;
}

/** Best matches first (rank, then name A→Z), capped at `limit`. Takes the raw query. */
export function searchCompanies<T extends CompanySearchCandidate>(
  rows: readonly T[],
  rawQuery: string,
  limit = COMPANY_SEARCH_LIMIT,
): T[] {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return [];
  return rows
    .map((row) => ({ row, rank: scoreCompanyMatch(row, query) }))
    .filter((item) => Number.isFinite(item.rank))
    .sort((a, b) => {
      const rank = a.rank - b.rank;
      if (rank !== 0) return rank;
      return lower(a.row.name || a.row.code).localeCompare(lower(b.row.name || b.row.code));
    })
    .map((item) => item.row)
    .slice(0, limit);
}

/** One row per code (case-insensitive), first wins, blank codes dropped. */
export function dedupeCompanies<T extends CompanySearchCandidate>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const code = row.code?.trim();
    if (!code) continue;
    const key = code.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
