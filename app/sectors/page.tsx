import Link from "next/link";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import ConcallScore from "@/components/concall-score";
import { slugifySector } from "@/app/sector/utils";
import { HERO_CARD, PAGE_SHELL } from "@/lib/design/shell";

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

type SectorOverviewRow = {
  sector: string;
  slug: string;
  companyCount: number;
  subSectorCount: number;
  avgLatestQuarterScore: number | null;
  latestQuarterEligibleCount: number;
  avgGrowthScore: number | null;
  growthEligibleCount: number;
};

type SectorSortKey =
  | "sector"
  | "companies"
  | "subsectors"
  | "latest_qtr"
  | "growth";

export const metadata: Metadata = {
  title: "Sectors – Story of a Stock",
  description: "Sector overview with company count, latest quarter score and growth score averages.",
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const avg = (values: number[]) => {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

const PAGE_BACKGROUND_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.78),_transparent_62%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.34),_transparent_62%)]";

const METRIC_CARD_CLASS =
  "rounded-2xl border border-border/35 bg-background/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]";

const PANEL_CARD_CLASS =
  "rounded-[1.45rem] border border-border/25 bg-gradient-to-br from-background/96 via-background/92 to-muted/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_28px_-26px_rgba(15,23,42,0.18)] backdrop-blur-sm";

const TABLE_CARD_CLASS =
  "overflow-hidden rounded-[1.45rem] border border-sky-200/25 bg-gradient-to-br from-background/97 via-background/93 to-sky-50/10 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.24)] backdrop-blur-sm dark:border-sky-700/20 dark:from-background/90 dark:via-background/84 dark:to-sky-950/10";

export default async function SectorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: SectorSortKey; order?: "asc" | "desc" }>;
}) {
  const resolvedSearchParams = await searchParams;
  const sortBy: SectorSortKey =
    resolvedSearchParams?.sort === "sector" ||
    resolvedSearchParams?.sort === "companies" ||
    resolvedSearchParams?.sort === "subsectors" ||
    resolvedSearchParams?.sort === "growth"
      ? resolvedSearchParams.sort
      : "latest_qtr";
  const sortOrder: "asc" | "desc" = resolvedSearchParams?.order === "asc" ? "asc" : "desc";
  const supabase = await createClient();

  const [{ data: companiesData }, { data: latestQuarterKey }, { data: growthRowsData }] =
    await Promise.all([
      supabase
        .from("company")
        .select("code, name, sector, sub_sector")
        .not("sector", "is", null),
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

  const companies = (companiesData ?? []) as CompanyRow[];
  if (!companies.length) {
    return (
      <main className="relative isolate overflow-hidden">
        <div className={PAGE_BACKGROUND_CLASS} />
        <div className={PAGE_SHELL}>
          <section className={HERO_CARD}>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-200">
                Sector overview
              </p>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                Sector Overview
              </h1>
            </div>
          </section>
          <div className={PANEL_CARD_CLASS}>
            <p className="text-sm text-muted-foreground">No sector data available yet.</p>
          </div>
        </div>
      </main>
    );
  }

  const companyCodes = companies
    .map((company) => company.code)
    .filter((code): code is string => Boolean(code))
    .map((code) => code.toUpperCase());

  let latestQuarterScoreMap = new Map<string, number | null>();
  if (latestQuarterKey?.fy != null && latestQuarterKey?.qtr != null && companyCodes.length > 0) {
    const { data: latestQuarterScoresData } = await supabase
      .from("concall_analysis")
      .select("company_code, score")
      .eq("fy", latestQuarterKey.fy)
      .eq("qtr", latestQuarterKey.qtr)
      .in("company_code", companyCodes);

    latestQuarterScoreMap = new Map(
      ((latestQuarterScoresData ?? []) as QuarterScoreRow[]).map((row) => [
        row.company_code.toUpperCase(),
        toNumberOrNull(row.score),
      ]),
    );
  }

  const latestGrowthByKey = new Map<string, number | null>();
  ((growthRowsData ?? []) as GrowthOutlookRow[]).forEach((row) => {
    const key = row.company?.trim().toUpperCase();
    if (!key || latestGrowthByKey.has(key)) return;
    latestGrowthByKey.set(key, toNumberOrNull(row.growth_score));
  });

  const sectorMap = new Map<
    string,
    {
      companyCount: number;
      subSectors: Set<string>;
      latestQuarterScores: number[];
      growthScores: number[];
    }
  >();

  companies.forEach((company) => {
    const sector = company.sector?.trim();
    if (!sector) return;

    const codeKey = company.code.toUpperCase();
    const nameKey = (company.name ?? "").trim().toUpperCase();
    const quarterScore = latestQuarterScoreMap.get(codeKey) ?? null;
    const growthScore = latestGrowthByKey.get(codeKey) ?? latestGrowthByKey.get(nameKey) ?? null;

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, {
        companyCount: 0,
        subSectors: new Set<string>(),
        latestQuarterScores: [],
        growthScores: [],
      });
    }

    const bucket = sectorMap.get(sector)!;
    bucket.companyCount += 1;
    if (company.sub_sector?.trim()) bucket.subSectors.add(company.sub_sector.trim());
    if (quarterScore != null) bucket.latestQuarterScores.push(quarterScore);
    if (growthScore != null) bucket.growthScores.push(growthScore);
  });

  const rows: SectorOverviewRow[] = Array.from(sectorMap.entries())
    .map(([sector, bucket]) => ({
      sector,
      slug: slugifySector(sector),
      companyCount: bucket.companyCount,
      subSectorCount: bucket.subSectors.size,
      avgLatestQuarterScore: avg(bucket.latestQuarterScores),
      latestQuarterEligibleCount: bucket.latestQuarterScores.length,
      avgGrowthScore: avg(bucket.growthScores),
      growthEligibleCount: bucket.growthScores.length,
    }))
    .filter((row) => row.companyCount > 1);

  const compareNullLast = (
    a: number | null,
    b: number | null,
    order: "asc" | "desc",
  ) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return order === "asc" ? a - b : b - a;
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === "sector") {
      const primary = sortOrder === "asc"
        ? a.sector.localeCompare(b.sector)
        : b.sector.localeCompare(a.sector);
      if (primary !== 0) return primary;
    } else if (sortBy === "companies") {
      const primary = sortOrder === "asc"
        ? a.companyCount - b.companyCount
        : b.companyCount - a.companyCount;
      if (primary !== 0) return primary;
    } else if (sortBy === "subsectors") {
      const primary = sortOrder === "asc"
        ? a.subSectorCount - b.subSectorCount
        : b.subSectorCount - a.subSectorCount;
      if (primary !== 0) return primary;
    } else if (sortBy === "growth") {
      const primary = compareNullLast(a.avgGrowthScore, b.avgGrowthScore, sortOrder);
      if (primary !== 0) return primary;
    } else {
      const primary = compareNullLast(a.avgLatestQuarterScore, b.avgLatestQuarterScore, sortOrder);
      if (primary !== 0) return primary;
    }

    const tieQ = compareNullLast(a.avgLatestQuarterScore, b.avgLatestQuarterScore, "desc");
    if (tieQ !== 0) return tieQ;
    const tieG = compareNullLast(a.avgGrowthScore, b.avgGrowthScore, "desc");
    if (tieG !== 0) return tieG;
    if (b.companyCount !== a.companyCount) return b.companyCount - a.companyCount;
    return a.sector.localeCompare(b.sector);
  });

  const latestQuarterLabel = latestQuarterKey?.quarter_label
    ? String(latestQuarterKey.quarter_label)
    : latestQuarterKey?.fy != null && latestQuarterKey?.qtr != null
      ? `Q${latestQuarterKey.qtr} FY${latestQuarterKey.fy}`
      : null;

  const averageLatestQuarterScore = avg(
    rows
      .map((row) => row.avgLatestQuarterScore)
      .filter((value): value is number => value != null),
  );
  const averageGrowthScore = avg(
    rows.map((row) => row.avgGrowthScore).filter((value): value is number => value != null),
  );
  const overviewMetrics = [
    {
      label: "Sectors covered",
      value: rows.length.toString(),
      note: "With more than 1 company",
    },
    {
      label: "Companies covered",
      value: companies.length.toString(),
      note: "In current sector universe",
    },
    {
      label: "Avg latest qtr",
      value:
        averageLatestQuarterScore != null ? averageLatestQuarterScore.toFixed(1) : "—",
      note: "Across visible sectors",
    },
    {
      label: "Avg growth",
      value: averageGrowthScore != null ? averageGrowthScore.toFixed(1) : "—",
      note: "Across visible sectors",
    },
  ];

  const headerHref = (key: SectorSortKey) => {
    const nextOrder = sortBy === key && sortOrder === "desc" ? "asc" : "desc";
    const query = new URLSearchParams();
    if (key !== "latest_qtr") query.set("sort", key);
    if (nextOrder !== "desc") query.set("order", nextOrder);
    const qs = query.toString();
    return qs ? `/sectors?${qs}` : "/sectors";
  };

  const headerLabel = (key: SectorSortKey, text: string) => {
    const active = sortBy === key || (key === "latest_qtr" && !resolvedSearchParams?.sort);
    const arrow = active ? (sortOrder === "desc" ? "↓" : "↑") : "↕";
    return `${text} ${arrow}`;
  };

  const sortLabel =
    sortBy === "sector"
      ? "Sector"
      : sortBy === "companies"
        ? "Companies"
        : sortBy === "subsectors"
          ? "Sub-sectors"
          : sortBy === "growth"
            ? "Growth score"
            : "Latest qtr";

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-sky-200/70 bg-sky-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
                    Sector overview
                  </span>
                  {latestQuarterLabel && (
                    <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                      Latest quarter: {latestQuarterLabel}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                  Sector Overview
                </h1>
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Compare sectors by company breadth, latest quarter strength, and growth score
                  averages. This view is designed as a research map, not a raw table dump.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {overviewMetrics.map((metric) => (
                <div key={metric.label} className={METRIC_CARD_CLASS}>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-2xl font-black leading-none text-foreground">
                      {metric.value}
                    </p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {metric.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {sortedRows.length === 0 ? (
          <div className={PANEL_CARD_CLASS}>
            <p className="text-sm text-muted-foreground">
              No sectors with more than 1 company available.
            </p>
          </div>
        ) : (
          <section className={TABLE_CARD_CLASS}>
            <div className="flex flex-col gap-3 border-b border-border/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Sector rankings
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Sort by company breadth, latest quarter score, or growth score.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 font-medium text-muted-foreground">
                  Current: {sortLabel} {sortOrder}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border/30 px-4 py-3 text-xs">
              <span className="text-muted-foreground">Sort:</span>
              <Link
                href={headerHref("sector")}
                className={`rounded-full border px-2.5 py-1 transition-colors hover:bg-accent ${
                  sortBy === "sector"
                    ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200"
                    : "border-border/60 bg-background/80 text-muted-foreground"
                }`}
                prefetch={false}
              >
                {headerLabel("sector", "Sector")}
              </Link>
              <Link
                href={headerHref("companies")}
                className={`rounded-full border px-2.5 py-1 transition-colors hover:bg-accent ${
                  sortBy === "companies"
                    ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200"
                    : "border-border/60 bg-background/80 text-muted-foreground"
                }`}
                prefetch={false}
              >
                {headerLabel("companies", "Companies")}
              </Link>
              <Link
                href={headerHref("subsectors")}
                className={`rounded-full border px-2.5 py-1 transition-colors hover:bg-accent ${
                  sortBy === "subsectors"
                    ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200"
                    : "border-border/60 bg-background/80 text-muted-foreground"
                }`}
                prefetch={false}
              >
                {headerLabel("subsectors", "Sub-sectors")}
              </Link>
              <Link
                href={headerHref("latest_qtr")}
                className={`rounded-full border px-2.5 py-1 transition-colors hover:bg-accent ${
                  sortBy === "latest_qtr"
                    ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200"
                    : "border-border/60 bg-background/80 text-muted-foreground"
                }`}
                prefetch={false}
              >
                {headerLabel("latest_qtr", "Avg latest qtr score")}
              </Link>
              <Link
                href={headerHref("growth")}
                className={`rounded-full border px-2.5 py-1 transition-colors hover:bg-accent ${
                  sortBy === "growth"
                    ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200"
                    : "border-border/60 bg-background/80 text-muted-foreground"
                }`}
                prefetch={false}
              >
                {headerLabel("growth", "Avg growth score")}
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/35 bg-background/70">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold text-foreground">
                      <Link href={headerHref("sector")} className="hover:underline" prefetch={false}>
                        {headerLabel("sector", "Sector")}
                      </Link>
                    </th>
                    <th className="px-4 py-3 font-semibold text-foreground">
                      <Link href={headerHref("companies")} className="hover:underline" prefetch={false}>
                        {headerLabel("companies", "Companies")}
                      </Link>
                    </th>
                    <th className="px-4 py-3 font-semibold text-foreground">
                      <Link href={headerHref("subsectors")} className="hover:underline" prefetch={false}>
                        {headerLabel("subsectors", "Sub-sectors")}
                      </Link>
                    </th>
                    <th className="px-4 py-3 font-semibold text-foreground">
                      <Link href={headerHref("latest_qtr")} className="hover:underline" prefetch={false}>
                        {headerLabel("latest_qtr", "Avg latest qtr score")}
                      </Link>
                    </th>
                    <th className="px-4 py-3 font-semibold text-foreground">
                      <Link href={headerHref("growth")} className="hover:underline" prefetch={false}>
                        {headerLabel("growth", "Avg growth score")}
                      </Link>
                    </th>
                  </tr>
                </thead>
                <tbody>
                {sortedRows.map((row) => (
                    <tr
                      key={row.slug}
                      className="border-b border-border/45 transition-colors last:border-b-0 hover:bg-sky-50/25 dark:hover:bg-sky-950/10"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/sector/${row.slug}`}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                          prefetch={false}
                        >
                          {row.sector}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-foreground">{row.companyCount}</td>
                      <td className="px-4 py-3 text-foreground">{row.subSectorCount}</td>
                      <td className="px-4 py-3">
                        {row.avgLatestQuarterScore != null ? (
                          <div className="flex items-center gap-2">
                            <ConcallScore score={row.avgLatestQuarterScore} size="sm" />
                            <span className="text-xs text-muted-foreground">
                              ({row.latestQuarterEligibleCount}/{row.companyCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.avgGrowthScore != null ? (
                          <div className="flex items-center gap-2">
                            <ConcallScore score={row.avgGrowthScore} size="sm" />
                            <span className="text-xs text-muted-foreground">
                              ({row.growthEligibleCount}/{row.companyCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
