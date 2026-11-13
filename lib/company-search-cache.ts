import { unstable_cache } from "next/cache";
import { createPublicReadClient } from "@/lib/supabase/public-read";

export type CompanySearchRow = {
  code: string;
  name: string | null;
  /** Raw listing column, e.g. "BSE,NSE" — the dropdown shows one tag (see listingExchange). */
  exchange?: string | null;
  sector?: string | null;
};

const PAGE_SIZE = 1000;
const MAX_ROWS = 10000;

function dedupeCompanyRows(rows: CompanySearchRow[]) {
  const seen = new Set<string>();
  const out: CompanySearchRow[] = [];

  rows.forEach((row) => {
    const code = row.code?.trim();
    if (!code) return;
    const key = code.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      code,
      name: row.name?.trim() || null,
      exchange: row.exchange?.trim() || null,
      sector: row.sector?.trim() || null,
    });
  });

  return out;
}

async function fetchCompanySearchRows() {
  const supabase = createPublicReadClient();
  const rows: CompanySearchRow[] = [];
  let from = 0;

  while (rows.length < MAX_ROWS) {
    const to = Math.min(from + PAGE_SIZE - 1, MAX_ROWS - 1);
    const { data, error } = await supabase
      .from("company")
      .select("code,name,exchange,sector")
      .order("code", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const pageRows = ((data ?? []) as CompanySearchRow[]).filter((row) => row.code);
    rows.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return dedupeCompanyRows(rows);
}

export const getCachedCompanySearchRows = unstable_cache(
  fetchCompanySearchRows,
  // v2 (2026-11-13): rows gained exchange + sector for the dropdown.
  ["company-search-rows-v2"],
  { revalidate: 600 },
);
