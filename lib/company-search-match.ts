/**
 * Company search matching, shared by the navbar search (client, over the list
 * the root layout ships), `/api/company-search` (server fallback) and the
 * removed-from-coverage lookup — one ranking, so the three never disagree.
 */

export type CompanySearchCandidate = {
  code: string;
  name: string | null;
};

export const COMPANY_SEARCH_LIMIT = 8;

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
