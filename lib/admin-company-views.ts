// Admin "Companies" tab — pure shaping helpers for which covered companies were
// opened. Fed by the get_top_company_views RPC (SQL-side count over the full
// window) plus a bounded recent-opens query on page_view_events. Pure functions
// only (no Next.js / Supabase imports) so tests/admin-company-views.test.ts can
// exercise every branch under the tsx runner.
//
// CORRECTNESS: the headline metrics (Companies Opened, Total Opens) MUST be
// derived from the FULL RPC result set, not a display-truncated slice. The RPC
// is called with limit_n large enough to exceed the ~100-company universe
// (see app/admin/page.tsx), so rows.length and sum(views) are the true totals.
// Deriving them from a top-N slice silently undercounts the long tail.

import { extractReferrerHost, normalizeExternalReferrer } from "./attribution";

export type CompanyViewRpcRow = {
  company_code: string | null;
  views: number | null;
  last_viewed: string | null;
};

export type CompanyNameRow = {
  code: string | null;
  name: string | null;
};

export type RawCompanyOpenRow = {
  id: string;
  company_code: string | null;
  referrer: string | null;
  created_at: string | null;
};

export type CompanyViewRow = {
  companyCode: string;
  companyName: string | null;
  opens: number;
  lastViewed: string | null;
};

export type RecentCompanyOpenRow = {
  id: string;
  companyCode: string;
  companyName: string | null;
  source: string;
  occurredAt: string;
};

// Mirrors app/admin/page.tsx's normalizer: uppercase, bounded length, and a
// conservative charset so a junk code can't poison the name-join map.
export function normalizeCompanyCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized || normalized.length > 24) return null;
  return /^[A-Z0-9._-]+$/.test(normalized) ? normalized : null;
}

export function buildCompanyNameMap(companyRows: CompanyNameRow[]): Map<string, string> {
  const names = new Map<string, string>();
  companyRows.forEach((row) => {
    const code = normalizeCompanyCode(row.code);
    if (code && row.name) {
      names.set(code, row.name);
    }
  });
  return names;
}

// RPC rows → display rows. Preserves the RPC's popularity order, drops null/junk
// codes, and de-dupes defensively (the RPC groups by code, but never trust it to
// list a company twice). Name falls back to the code at render time.
export function buildCompanyViewRows(
  rpcRows: CompanyViewRpcRow[],
  companyRows: CompanyNameRow[],
): CompanyViewRow[] {
  const names = buildCompanyNameMap(companyRows);
  const seen = new Set<string>();
  const rows: CompanyViewRow[] = [];

  for (const row of rpcRows) {
    const code = normalizeCompanyCode(row.company_code);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    rows.push({
      companyCode: code,
      companyName: names.get(code) ?? null,
      opens: Number.isFinite(row.views) ? Number(row.views) : 0,
      lastViewed: row.last_viewed,
    });
  }

  return rows;
}

// Headline metrics — derived from the FULL row set (see file header). Never call
// this on a display-truncated slice.
export function summarizeCompanyViews(rows: CompanyViewRow[]): {
  companiesOpened: number;
  totalOpens: number;
} {
  return {
    companiesOpened: rows.length,
    totalOpens: rows.reduce((sum, row) => sum + row.opens, 0),
  };
}

// Raw page_view_events rows → recent-opens feed. `source` classifies the
// referrer: an external host label when there is a genuine external referrer,
// otherwise "Direct" (covers null referrers, internal/self hosts, and the
// pre-2026-07-17 rows whose referrer is an internal self-referrer, NOT
// acquisition data). Rows without a usable code or timestamp are dropped.
export function buildRecentCompanyOpens(
  rawRows: RawCompanyOpenRow[],
  companyRows: CompanyNameRow[],
  ownHosts: readonly string[],
  limit = 100,
): RecentCompanyOpenRow[] {
  const names = buildCompanyNameMap(companyRows);
  const rows: RecentCompanyOpenRow[] = [];

  for (const row of rawRows) {
    const code = normalizeCompanyCode(row.company_code);
    if (!code || !row.created_at) continue;
    const external = normalizeExternalReferrer(row.referrer, ownHosts);
    const host = external ? extractReferrerHost(external) : null;
    rows.push({
      id: row.id,
      companyCode: code,
      companyName: names.get(code) ?? null,
      source: host ?? "Direct",
      occurredAt: row.created_at,
    });
    if (rows.length >= limit) break;
  }

  return rows;
}
