import { after, NextResponse } from "next/server";
import { recordApiRouteMetric } from "@/lib/api-metrics";
import {
  getCachedCompanySearchRows,
  type CompanySearchRow,
} from "@/lib/company-search-cache";
import { logger } from "@/lib/logger";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function scoreResult(row: CompanySearchRow, query: string) {
  const q = query.toLowerCase();
  const code = normalize(row.code);
  const name = normalize(row.name);

  if (code === q) return 0;
  if (code.startsWith(q)) return 1;
  if (name.startsWith(q)) return 2;
  if (code.includes(q)) return 3;
  if (name.includes(q)) return 4;
  return Number.POSITIVE_INFINITY;
}

function dedupeResults(rows: CompanySearchRow[]) {
  const seen = new Set<string>();
  const deduped: CompanySearchRow[] = [];

  rows.forEach((row) => {
    const code = row.code?.trim();
    if (!code) return;
    const key = code.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push({ code, name: row.name });
  });

  return deduped;
}

function searchCompanyRows(rows: CompanySearchRow[], q: string) {
  return dedupeResults(rows)
    .map((row) => ({ row, rank: scoreResult(row, q) }))
    .filter((item) => Number.isFinite(item.rank))
    .sort((a, b) => {
      const rank = a.rank - b.rank;
      if (rank !== 0) return rank;

      const aName = normalize(a.row.name || a.row.code);
      const bName = normalize(b.row.name || b.row.code);
      return aName.localeCompare(bName);
    })
    .map((item) => item.row)
    .slice(0, 8);
}

export async function GET(request: Request) {
  const startedAt = performance.now();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const recordMetric = ({
    statusCode,
    resultCount,
    errorCode,
  }: {
    statusCode: number;
    resultCount: number;
    errorCode?: string | null;
  }) => {
    const durationMs = performance.now() - startedAt;
    after(() =>
      recordApiRouteMetric({
        route: "/api/company-search",
        method: "GET",
        statusCode,
        durationMs,
        resultCount,
        queryLength: q.length,
        errorCode,
      }),
    );
  };

  if (!q || q.length > 80) {
    recordMetric({ statusCode: 200, resultCount: 0 });
    return NextResponse.json({ ok: true, results: [] as CompanySearchRow[] });
  }

  try {
    const companyRows = await getCachedCompanySearchRows();
    const rows = searchCompanyRows(companyRows, q);
    recordMetric({ statusCode: 200, resultCount: rows.length });
    return NextResponse.json({ ok: true, results: rows });
  } catch (error) {
    logger.error("supabase: company search failed", { q, error });
    recordMetric({
      statusCode: 500,
      resultCount: 0,
      errorCode: "company_search_cache_failed",
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to fetch company search results.",
        results: [] as CompanySearchRow[],
      },
      { status: 500 },
    );
  }
}
