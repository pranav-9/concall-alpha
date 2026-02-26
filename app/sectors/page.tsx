import Link from "next/link";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import ConcallScore from "@/components/concall-score";
import { slugifySector } from "@/app/sector/utils";

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

export default async function SectorsPage() {
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
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10 space-y-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Sector Overview</h1>
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          No sector data available yet.
        </div>
      </div>
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
    .sort((a, b) => {
      const aQ = a.avgLatestQuarterScore;
      const bQ = b.avgLatestQuarterScore;
      if (aQ == null && bQ != null) return 1;
      if (aQ != null && bQ == null) return -1;
      if (aQ != null && bQ != null && bQ !== aQ) return bQ - aQ;

      const aG = a.avgGrowthScore;
      const bG = b.avgGrowthScore;
      if (aG == null && bG != null) return 1;
      if (aG != null && bG == null) return -1;
      if (aG != null && bG != null && bG !== aG) return bG - aG;

      if (b.companyCount !== a.companyCount) return b.companyCount - a.companyCount;
      return a.sector.localeCompare(b.sector);
    });

  const latestQuarterLabel = latestQuarterKey?.quarter_label
    ? String(latestQuarterKey.quarter_label)
    : latestQuarterKey?.fy != null && latestQuarterKey?.qtr != null
      ? `Q${latestQuarterKey.qtr} FY${latestQuarterKey.fy}`
      : null;

  return (
    <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Sector Overview</h1>
        <p className="text-sm text-muted-foreground">
          Compare sectors by company breadth, latest quarter strength, and growth score averages.
        </p>
        {latestQuarterLabel && (
          <span className="inline-flex px-2 py-1 rounded-full border border-border bg-muted text-xs text-foreground">
            Latest quarter: {latestQuarterLabel}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold text-foreground">Sector</th>
              <th className="px-3 py-2 font-semibold text-foreground">Companies</th>
              <th className="px-3 py-2 font-semibold text-foreground">Sub-sectors</th>
              <th className="px-3 py-2 font-semibold text-foreground">Avg latest qtr score</th>
              <th className="px-3 py-2 font-semibold text-foreground">Avg growth score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug} className="border-b border-border/60 last:border-b-0">
                <td className="px-3 py-2">
                  <Link href={`/sector/${row.slug}`} className="underline text-foreground" prefetch={false}>
                    {row.sector}
                  </Link>
                </td>
                <td className="px-3 py-2 text-foreground">{row.companyCount}</td>
                <td className="px-3 py-2 text-foreground">{row.subSectorCount}</td>
                <td className="px-3 py-2">
                  {row.avgLatestQuarterScore != null ? (
                    <div className="flex items-center gap-2">
                      <ConcallScore score={row.avgLatestQuarterScore} />
                      <span className="text-xs text-muted-foreground">
                        ({row.latestQuarterEligibleCount}/{row.companyCount})
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.avgGrowthScore != null ? (
                    <div className="flex items-center gap-2">
                      <ConcallScore score={row.avgGrowthScore} />
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
    </div>
  );
}

