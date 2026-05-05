import Link from "next/link";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import ConcallScore from "@/components/concall-score";
import { slugifySector } from "@/app/sector/utils";
import { getConcallData } from "@/app/company/get-concall-data";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import {
  HERO_CARD,
  INNER_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_NEUTRAL,
  TABLE_CARD_SKY,
} from "@/lib/design/shell";

type CompanyRow = {
  code: string;
  name: string | null;
  sector: string | null;
  sub_sector: string | null;
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
  avgAvg4QuarterScore: number | null;
  avg4QuarterEligibleCount: number;
  avgBlendedScore: number | null;
  blendedEligibleCount: number;
  rank: number | null;
};

type SectorSortKey =
  | "rank"
  | "sector"
  | "companies"
  | "subsectors"
  | "blended"
  | "latest_qtr"
  | "growth"
  | "avg_4q";

const defaultDirectionForKey = (key: SectorSortKey): "asc" | "desc" =>
  key === "sector" || key === "rank" ? "asc" : "desc";

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

const PAGE_BACKGROUND_CLASS = `h-[30rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

const METRIC_CARD_CLASS = `${INNER_CARD} px-4 py-3`;

const PANEL_CARD_CLASS = PANEL_CARD_NEUTRAL;

const TABLE_CARD_CLASS = TABLE_CARD_SKY;

export default async function SectorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: SectorSortKey; order?: "asc" | "desc" }>;
}) {
  const resolvedSearchParams = await searchParams;
  const sortBy: SectorSortKey =
    resolvedSearchParams?.sort === "rank" ||
    resolvedSearchParams?.sort === "sector" ||
    resolvedSearchParams?.sort === "companies" ||
    resolvedSearchParams?.sort === "subsectors" ||
    resolvedSearchParams?.sort === "growth" ||
    resolvedSearchParams?.sort === "latest_qtr" ||
    resolvedSearchParams?.sort === "avg_4q"
      ? resolvedSearchParams.sort
      : "blended";
  const sortOrder: "asc" | "desc" =
    resolvedSearchParams?.order === "asc" || resolvedSearchParams?.order === "desc"
      ? resolvedSearchParams.order
      : defaultDirectionForKey(sortBy);
  const supabase = await createClient();

  const [
    { data: companiesData },
    { rows: concallRows, latestLabel },
    { data: growthRowsData },
  ] = await Promise.all([
    supabase
      .from("company")
      .select("code, name, sector, sub_sector")
      .not("sector", "is", null),
    getConcallData(),
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

  const concallScoreByCode = new Map<
    string,
    { latestScore: number | null; avg4QuarterScore: number | null }
  >();
  concallRows.forEach((row) => {
    concallScoreByCode.set(row.company.toUpperCase(), {
      latestScore: latestLabel ? toNumberOrNull(row[latestLabel]) : null,
      avg4QuarterScore: toNumberOrNull(row["Latest 4Q Avg"]),
    });
  });

  const latestGrowthByKey = new Map<string, number | null>();
  ((growthRowsData ?? []) as GrowthOutlookRow[]).forEach((row) => {
    const key = row.company?.trim().toUpperCase();
    if (!key || latestGrowthByKey.has(key)) return;
    latestGrowthByKey.set(key, toNumberOrNull(row.growth_score));
  });

  const blendCompany = (values: Array<number | null>) => {
    const valid = values.filter((value): value is number => value != null);
    if (valid.length === 0) return null;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
  };

  const sectorMap = new Map<
    string,
    {
      companyCount: number;
      subSectors: Set<string>;
      latestQuarterScores: number[];
      growthScores: number[];
      avg4QuarterScores: number[];
      blendedScores: number[];
    }
  >();

  companies.forEach((company) => {
    const sector = company.sector?.trim();
    if (!sector) return;

    const codeKey = company.code.toUpperCase();
    const nameKey = (company.name ?? "").trim().toUpperCase();
    const concallScore = concallScoreByCode.get(codeKey);
    const quarterScore = concallScore?.latestScore ?? null;
    const avg4QuarterScore = concallScore?.avg4QuarterScore ?? null;
    const growthScore = latestGrowthByKey.get(codeKey) ?? latestGrowthByKey.get(nameKey) ?? null;
    const blendedScore = blendCompany([quarterScore, growthScore, avg4QuarterScore]);

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, {
        companyCount: 0,
        subSectors: new Set<string>(),
        latestQuarterScores: [],
        growthScores: [],
        avg4QuarterScores: [],
        blendedScores: [],
      });
    }

    const bucket = sectorMap.get(sector)!;
    bucket.companyCount += 1;
    if (company.sub_sector?.trim()) bucket.subSectors.add(company.sub_sector.trim());
    if (quarterScore != null) bucket.latestQuarterScores.push(quarterScore);
    if (growthScore != null) bucket.growthScores.push(growthScore);
    if (avg4QuarterScore != null) bucket.avg4QuarterScores.push(avg4QuarterScore);
    if (blendedScore != null) bucket.blendedScores.push(blendedScore);
  });

  const unrankedRows = Array.from(sectorMap.entries())
    .map(([sector, bucket]) => ({
      sector,
      slug: slugifySector(sector),
      companyCount: bucket.companyCount,
      subSectorCount: bucket.subSectors.size,
      avgLatestQuarterScore: avg(bucket.latestQuarterScores),
      latestQuarterEligibleCount: bucket.latestQuarterScores.length,
      avgGrowthScore: avg(bucket.growthScores),
      growthEligibleCount: bucket.growthScores.length,
      avgAvg4QuarterScore: avg(bucket.avg4QuarterScores),
      avg4QuarterEligibleCount: bucket.avg4QuarterScores.length,
      avgBlendedScore: avg(bucket.blendedScores),
      blendedEligibleCount: bucket.blendedScores.length,
    }))
    .filter((row) => row.companyCount > 1);

  const rankSorted = [...unrankedRows].sort((a, b) => {
    const blendDiff =
      (b.avgBlendedScore ?? Number.NEGATIVE_INFINITY) -
      (a.avgBlendedScore ?? Number.NEGATIVE_INFINITY);
    if (blendDiff !== 0) return blendDiff;
    const qtrDiff =
      (b.avgLatestQuarterScore ?? Number.NEGATIVE_INFINITY) -
      (a.avgLatestQuarterScore ?? Number.NEGATIVE_INFINITY);
    if (qtrDiff !== 0) return qtrDiff;
    const growthDiff =
      (b.avgGrowthScore ?? Number.NEGATIVE_INFINITY) -
      (a.avgGrowthScore ?? Number.NEGATIVE_INFINITY);
    if (growthDiff !== 0) return growthDiff;
    return a.sector.localeCompare(b.sector);
  });
  const ranked = assignCompetitionRanks(rankSorted, (row) => row.avgBlendedScore);
  const rankBySector = new Map<string, number>();
  ranked.forEach((row) => {
    if (row.avgBlendedScore != null) rankBySector.set(row.sector, row.leaderboardRank);
  });

  const rows: SectorOverviewRow[] = unrankedRows.map((row) => ({
    ...row,
    rank: rankBySector.get(row.sector) ?? null,
  }));

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
    if (sortBy === "rank") {
      const primary = compareNullLast(a.rank, b.rank, sortOrder);
      if (primary !== 0) return primary;
    } else if (sortBy === "sector") {
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
    } else if (sortBy === "latest_qtr") {
      const primary = compareNullLast(a.avgLatestQuarterScore, b.avgLatestQuarterScore, sortOrder);
      if (primary !== 0) return primary;
    } else if (sortBy === "avg_4q") {
      const primary = compareNullLast(a.avgAvg4QuarterScore, b.avgAvg4QuarterScore, sortOrder);
      if (primary !== 0) return primary;
    } else {
      const primary = compareNullLast(a.avgBlendedScore, b.avgBlendedScore, sortOrder);
      if (primary !== 0) return primary;
    }

    const tieB = compareNullLast(a.avgBlendedScore, b.avgBlendedScore, "desc");
    if (tieB !== 0) return tieB;
    const tieQ = compareNullLast(a.avgLatestQuarterScore, b.avgLatestQuarterScore, "desc");
    if (tieQ !== 0) return tieQ;
    const tieG = compareNullLast(a.avgGrowthScore, b.avgGrowthScore, "desc");
    if (tieG !== 0) return tieG;
    if (b.companyCount !== a.companyCount) return b.companyCount - a.companyCount;
    return a.sector.localeCompare(b.sector);
  });

  const latestQuarterLabel = latestLabel ?? null;

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
    const keyDefault = defaultDirectionForKey(key);
    const nextOrder: "asc" | "desc" =
      sortBy === key
        ? sortOrder === "desc"
          ? "asc"
          : "desc"
        : keyDefault;
    const query = new URLSearchParams();
    if (key !== "blended") query.set("sort", key);
    if (nextOrder !== keyDefault) query.set("order", nextOrder);
    const qs = query.toString();
    return qs ? `/sectors?${qs}` : "/sectors";
  };

  const headerLabel = (key: SectorSortKey, text: string) => {
    const active = sortBy === key || (key === "blended" && !resolvedSearchParams?.sort);
    const arrow = active ? (sortOrder === "desc" ? "↓" : "↑") : "↕";
    return `${text} ${arrow}`;
  };

  const sortLabel =
    sortBy === "rank"
      ? "Rank"
      : sortBy === "sector"
        ? "Sector"
        : sortBy === "companies"
          ? "Companies"
          : sortBy === "subsectors"
            ? "Sub-sectors"
            : sortBy === "growth"
              ? "Growth score"
              : sortBy === "latest_qtr"
                ? "Latest qtr"
                : sortBy === "avg_4q"
                  ? "4Q avg"
                  : "Blended";

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
                  Ranked by blended score (latest quarter, growth, and 4Q average). Click any column to re-sort.
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
              {(
                [
                  ["rank", "#"],
                  ["sector", "Sector"],
                  ["companies", "Companies"],
                  ["subsectors", "Sub-sectors"],
                  ["latest_qtr", "Avg latest qtr score"],
                  ["growth", "Avg growth score"],
                  ["avg_4q", "Avg 4Q score"],
                  ["blended", "Avg blended score"],
                ] as Array<[SectorSortKey, string]>
              ).map(([key, label]) => (
                <Link
                  key={key}
                  href={headerHref(key)}
                  className={`rounded-full border px-2.5 py-1 transition-colors hover:bg-accent ${
                    sortBy === key
                      ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200"
                      : "border-border/60 bg-background/80 text-muted-foreground"
                  }`}
                  prefetch={false}
                >
                  {headerLabel(key, label)}
                </Link>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/35 bg-background/70">
                  <tr className="text-left">
                    <th className="w-12 px-4 py-3 font-semibold text-foreground">
                      <Link href={headerHref("rank")} className="hover:underline" prefetch={false}>
                        {headerLabel("rank", "#")}
                      </Link>
                    </th>
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
                    <th className="px-4 py-3 font-semibold text-foreground">
                      <Link href={headerHref("avg_4q")} className="hover:underline" prefetch={false}>
                        {headerLabel("avg_4q", "Avg 4Q score")}
                      </Link>
                    </th>
                    <th className="border-l border-border/70 px-4 py-3 font-semibold text-foreground">
                      <Link href={headerHref("blended")} className="hover:underline" prefetch={false}>
                        {headerLabel("blended", "Avg blended score")}
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
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {row.rank ?? "—"}
                        </span>
                      </td>
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
                      <td className="px-4 py-3">
                        {row.avgAvg4QuarterScore != null ? (
                          <div className="flex items-center gap-2">
                            <ConcallScore score={row.avgAvg4QuarterScore} size="sm" />
                            <span className="text-xs text-muted-foreground">
                              ({row.avg4QuarterEligibleCount}/{row.companyCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="border-l border-border/70 px-4 py-3">
                        {row.avgBlendedScore != null ? (
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-700/40 dark:bg-emerald-950/20">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                                Blend
                              </span>
                              <ConcallScore score={row.avgBlendedScore} size="sm" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              ({row.blendedEligibleCount}/{row.companyCount})
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
