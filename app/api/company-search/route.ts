import { after, NextResponse } from "next/server";
import { recordApiRouteMetric } from "@/lib/api-metrics";
import {
  getCachedCompanySearchRows,
  type CompanySearchRow,
} from "@/lib/company-search-cache";
import { dedupeCompanies, searchCompanies } from "@/lib/company-search-match";
import { logger } from "@/lib/logger";

function searchCompanyRows(rows: CompanySearchRow[], q: string): CompanySearchRow[] {
  return searchCompanies(
    dedupeCompanies(rows).map((row) => ({ ...row, code: row.code.trim() })),
    q,
  );
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
