import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ConcallScore from "@/components/concall-score";
import { createClient } from "@/lib/supabase/server";
import { findSectorBySlug, slugifySector } from "@/app/sector/utils";

type CompanyRow = {
  code: string;
  name: string | null;
  sector: string | null;
  sub_sector: string | null;
};

type QuarterScoreRow = {
  company_code: string;
  score: number | null;
};

type GrowthOutlookRow = {
  company: string;
  growth_score?: string | number | null;
  run_timestamp?: string | null;
};

type SectorCompanyRow = {
  code: string;
  name: string;
  sector: string;
  subSector: string | null;
  latestQuarterScore: number | null;
  growthScore: number | null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const compareNullableNumbers = (
  a: number | null,
  b: number | null,
  order: "asc" | "desc",
) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return order === "asc" ? a - b : b - a;
};

type SectorPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    subSector?: string;
    sort?: "latest_qtr" | "growth";
    order?: "asc" | "desc";
  }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug.replace(/-/g, " ")} – Sector – Story of a Stock`,
    description: "Sector-level view with latest quarter and growth scores.",
  };
}

export default async function SectorPage({ params, searchParams }: SectorPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const subSectorFilter = resolvedSearchParams?.subSector?.trim() ?? "";
  const sortBy = resolvedSearchParams?.sort === "growth" ? "growth" : "latest_qtr";
  const sortOrder = resolvedSearchParams?.order === "asc" ? "asc" : "desc";

  const supabase = await createClient();

  const { data: sectorListRows } = await supabase
    .from("company")
    .select("sector")
    .not("sector", "is", null);

  const sectors = Array.from(
    new Set(
      (sectorListRows ?? [])
        .map((row) => (row as { sector?: string | null }).sector?.trim())
        .filter((sector): sector is string => Boolean(sector)),
    ),
  );

  const sectorName = findSectorBySlug(slug, sectors);
  if (!sectorName) {
    notFound();
  }

  const { data: companyRows } = await supabase
    .from("company")
    .select("code, name, sector, sub_sector")
    .eq("sector", sectorName);

  const companies = (companyRows ?? []) as CompanyRow[];
  if (!companies.length) {
    return (
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10 space-y-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{sectorName}</h1>
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          No companies found for this sector yet.
        </div>
      </div>
    );
  }

  const companyCodes = companies
    .map((c) => c.code)
    .filter((code): code is string => Boolean(code));

  const [{ data: latestQuarterKey }, { data: growthRows }] = await Promise.all([
    supabase
      .from("concall_analysis")
      .select("fy, qtr, quarter_label")
      .order("fy", { ascending: false })
      .order("qtr", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("growth_outlook")
      .select("company, growth_score, run_timestamp")
      .order("run_timestamp", { ascending: false }),
  ]);

  let quarterScoreMap = new Map<string, number | null>();
  if (latestQuarterKey?.fy != null && latestQuarterKey?.qtr != null && companyCodes.length > 0) {
    const { data: latestQuarterScores } = await supabase
      .from("concall_analysis")
      .select("company_code, score")
      .eq("fy", latestQuarterKey.fy)
      .eq("qtr", latestQuarterKey.qtr)
      .in("company_code", companyCodes);

    quarterScoreMap = new Map(
      ((latestQuarterScores ?? []) as QuarterScoreRow[]).map((row) => [
        row.company_code.toUpperCase(),
        toNumberOrNull(row.score),
      ]),
    );
  }

  const latestGrowthByKey = new Map<string, number | null>();
  ((growthRows ?? []) as GrowthOutlookRow[]).forEach((row) => {
    const key = row.company?.trim().toUpperCase();
    if (!key || latestGrowthByKey.has(key)) return;
    latestGrowthByKey.set(key, toNumberOrNull(row.growth_score));
  });

  const allRows: SectorCompanyRow[] = companies.map((company) => {
    const codeKey = company.code.toUpperCase();
    const name = company.name?.trim() || company.code;
    const nameKey = name.toUpperCase();
    return {
      code: company.code,
      name,
      sector: company.sector ?? sectorName,
      subSector: company.sub_sector ?? null,
      latestQuarterScore: quarterScoreMap.get(codeKey) ?? null,
      growthScore: latestGrowthByKey.get(codeKey) ?? latestGrowthByKey.get(nameKey) ?? null,
    };
  });

  const subSectorCounts = allRows.reduce<Map<string, number>>((acc, row) => {
    const key = row.subSector?.trim();
    if (!key) return acc;
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map());

  const subSectorFilters = Array.from(subSectorCounts.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const filteredRows = subSectorFilter
    ? allRows.filter((row) => (row.subSector ?? "").toLowerCase() === subSectorFilter.toLowerCase())
    : allRows;

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (sortBy === "growth") {
      const primary = compareNullableNumbers(a.growthScore, b.growthScore, sortOrder);
      if (primary !== 0) return primary;
      const tieQuarter = compareNullableNumbers(a.latestQuarterScore, b.latestQuarterScore, "desc");
      if (tieQuarter !== 0) return tieQuarter;
      return a.name.localeCompare(b.name);
    }

    const primary = compareNullableNumbers(a.latestQuarterScore, b.latestQuarterScore, sortOrder);
    if (primary !== 0) return primary;
    const tieGrowth = compareNullableNumbers(a.growthScore, b.growthScore, "desc");
    if (tieGrowth !== 0) return tieGrowth;
    return a.name.localeCompare(b.name);
  });

  const latestQuarterLabel = latestQuarterKey?.quarter_label
    ? String(latestQuarterKey.quarter_label)
    : latestQuarterKey?.fy != null && latestQuarterKey?.qtr != null
    ? `Q${latestQuarterKey.qtr} FY${latestQuarterKey.fy}`
    : null;

  const buildFilterHref = (subSector?: string) => {
    const query = new URLSearchParams();
    if (subSector) query.set("subSector", subSector);
    if (sortBy !== "latest_qtr") query.set("sort", sortBy);
    if (sortOrder !== "desc") query.set("order", sortOrder);
    const qs = query.toString();
    return qs ? `/sector/${slugifySector(sectorName)}?${qs}` : `/sector/${slugifySector(sectorName)}`;
  };

  const buildSortHref = (nextSort: "latest_qtr" | "growth", nextOrder: "asc" | "desc") => {
    const query = new URLSearchParams();
    if (subSectorFilter) query.set("subSector", subSectorFilter);
    if (nextSort !== "latest_qtr") query.set("sort", nextSort);
    if (nextOrder !== "desc") query.set("order", nextOrder);
    const qs = query.toString();
    return qs ? `/sector/${slugifySector(sectorName)}?${qs}` : `/sector/${slugifySector(sectorName)}`;
  };

  const sortLabel = sortBy === "growth" ? "Growth score" : "Latest qtr";

  return (
    <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{sectorName}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full border border-border bg-muted text-foreground">
            Companies: {allRows.length}
          </span>
          <span className="px-2 py-1 rounded-full border border-border bg-muted text-foreground">
            Sub-sectors: {subSectorCounts.size}
          </span>
          {latestQuarterLabel && (
            <span className="px-2 py-1 rounded-full border border-border bg-muted text-foreground">
              Latest quarter: {latestQuarterLabel}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buildFilterHref(undefined)}
            className={`px-2 py-1 rounded-full text-xs border ${
              !subSectorFilter
                ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200"
                : "border-border bg-muted text-foreground hover:bg-accent"
            }`}
            prefetch={false}
          >
            All ({allRows.length})
          </Link>
          {subSectorFilters.map(([subSectorName, count]) => (
            <Link
              key={subSectorName}
              href={buildFilterHref(subSectorName)}
              className={`px-2 py-1 rounded-full text-xs border ${
                subSectorFilter.toLowerCase() === subSectorName.toLowerCase()
                  ? "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200"
                  : "border-border bg-muted text-foreground hover:bg-accent"
              }`}
              prefetch={false}
            >
              {subSectorName} ({count})
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Sort:</span>
          <Link
            href={buildSortHref("latest_qtr", sortBy === "latest_qtr" && sortOrder === "desc" ? "asc" : "desc")}
            className={`px-2 py-1 rounded-full border ${
              sortBy === "latest_qtr"
                ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200"
                : "border-border bg-muted text-foreground hover:bg-accent"
            }`}
            prefetch={false}
          >
            Latest qtr ({sortBy === "latest_qtr" ? sortOrder : "desc"})
          </Link>
          <Link
            href={buildSortHref("growth", sortBy === "growth" && sortOrder === "desc" ? "asc" : "desc")}
            className={`px-2 py-1 rounded-full border ${
              sortBy === "growth"
                ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200"
                : "border-border bg-muted text-foreground hover:bg-accent"
            }`}
            prefetch={false}
          >
            Growth ({sortBy === "growth" ? sortOrder : "desc"})
          </Link>
          <span className="text-muted-foreground">
            Current: {sortLabel} {sortOrder}
          </span>
        </div>

        {sortedRows.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            No companies match this sub-sector filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-foreground">Company</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Sub-sector</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Latest qtr score</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Growth score</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.code} className="border-b border-border/60 last:border-b-0">
                    <td className="px-3 py-2">
                      <Link href={`/company/${row.code}`} className="underline text-foreground" prefetch={false}>
                        {row.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{row.code}</p>
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {row.subSector ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {row.latestQuarterScore != null ? (
                        <ConcallScore score={row.latestQuarterScore} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.growthScore != null ? (
                        <ConcallScore score={row.growthScore} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
