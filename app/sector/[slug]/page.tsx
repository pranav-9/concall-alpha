import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConcallData } from "@/app/company/get-concall-data";
import { isCompanyNew } from "@/lib/company-freshness";
import {
  CHIP_BASE,
  CHIP_NEUTRAL,
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_SKY,
  TABLE_CARD_SKY,
} from "@/lib/design/shell";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { MoatAnalysisRow, MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";
import { createClient } from "@/lib/supabase/server";
import { findSectorBySlug, slugifySector } from "@/app/sector/utils";
import { SectorTable, type SectorTableRow } from "./sector-table";
import { SubSectorSelect } from "./sub-sector-select";

type CompanyRow = {
  code: string;
  name: string | null;
  sector: string | null;
  sub_sector: string | null;
  created_at?: string | null;
};

type GrowthOutlookRow = {
  company: string;
  growth_score?: string | number | null;
  run_timestamp?: string | null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const computeAverage = (values: Array<number | null>) => {
  const valid = values.filter((value): value is number => value != null);
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const normalizeFilterKey = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

const PAGE_BACKGROUND_CLASS = `h-[24rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

const TABLE_CARD_CLASS = TABLE_CARD_SKY;

type MoatSummary = {
  moatLabel: string | null;
  moatRating: MoatRatingKey | null;
  moatTier: MoatTier | null;
};

type SectorPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    subSector?: string;
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
    .select("code, name, sector, sub_sector, created_at")
    .eq("sector", sectorName);

  const companies = (companyRows ?? []) as CompanyRow[];
  if (!companies.length) {
    return (
      <main className="relative isolate overflow-hidden">
        <div className={PAGE_BACKGROUND_CLASS} />
        <div className={PAGE_SHELL}>
          <section className={HERO_CARD}>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-200">
                Sector detail
              </p>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                {sectorName}
              </h1>
            </div>
          </section>
          <div className={PANEL_CARD_SKY}>
            <p className="text-sm text-muted-foreground">
              No companies found for this sector yet.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const companyCodes = companies.map((company) => company.code.toUpperCase()).filter(Boolean);

  const [{ rows: concallRows, latestLabel }, { data: growthRows }, { data: moatRows }] =
    await Promise.all([
      getConcallData(),
      supabase
        .from("growth_outlook")
        .select("company, growth_score, run_timestamp")
        .order("run_timestamp", { ascending: false }),
      supabase
        .from("moat_analysis")
        .select(
          "id, company_code, company_name, industry, rating, tier, gatekeeper_answer, cycle_tested, assessment_payload, assessment_version, created_at, updated_at",
        )
        .in("company_code", companyCodes.length ? companyCodes : [""])
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
    ]);

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
  ((growthRows ?? []) as GrowthOutlookRow[]).forEach((row) => {
    const key = row.company?.trim().toUpperCase();
    if (!key || latestGrowthByKey.has(key)) return;
    latestGrowthByKey.set(key, toNumberOrNull(row.growth_score));
  });

  const latestMoatByCode = new Map<string, MoatSummary>();
  ((moatRows ?? []) as MoatAnalysisRow[]).forEach((row) => {
    const normalized = normalizeMoatAnalysis(row);
    if (!normalized) return;
    const key = normalized.companyCode.trim().toUpperCase();
    if (!key || latestMoatByCode.has(key)) return;
    latestMoatByCode.set(key, {
      moatLabel: normalized.moatRatingLabel,
      moatRating: normalized.moatRating,
      moatTier: normalized.moatTier,
    });
  });

  const allRows: SectorTableRow[] = companies.map((company) => {
    const codeKey = company.code.toUpperCase();
    const name = company.name?.trim() || company.code;
    const nameKey = name.toUpperCase();
    const concallScore = concallScoreByCode.get(codeKey);
    const latestQuarterScore = concallScore?.latestScore ?? null;
    const growthScore = latestGrowthByKey.get(codeKey) ?? latestGrowthByKey.get(nameKey) ?? null;
    const avg4QuarterScore = concallScore?.avg4QuarterScore ?? null;
    const blendedScore = computeAverage([latestQuarterScore, growthScore, avg4QuarterScore]);
    const moat = latestMoatByCode.get(codeKey) ?? null;

    return {
      companyCode: company.code,
      companyName: name,
      subSector: company.sub_sector ?? null,
      isNew: isCompanyNew(company.created_at ?? null),
      latestQuarterScore,
      growthScore,
      avg4QuarterScore,
      blendedScore,
      moatLabel: moat?.moatLabel ?? null,
      moatRating: moat?.moatRating ?? null,
      moatTier: moat?.moatTier ?? null,
    };
  });

  const subSectorCounts = allRows.reduce<Map<string, number>>((acc, row) => {
    const key = row.subSector?.trim();
    if (!key) return acc;
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map());
  const sortedSubSectorEntries = Array.from(subSectorCounts.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const activeSubSectorRaw = resolvedSearchParams?.subSector?.trim() || null;
  const activeSubSectorDisplay =
    sortedSubSectorEntries.find(
      ([name]) => normalizeFilterKey(name) === normalizeFilterKey(activeSubSectorRaw),
    )?.[0] ?? activeSubSectorRaw;

  const filteredRows = activeSubSectorRaw
    ? allRows.filter(
        (row) =>
          normalizeFilterKey(row.subSector) === normalizeFilterKey(activeSubSectorRaw),
      )
    : allRows;

  const latestQuarterLabel = latestLabel ?? null;

  const cohortAvgLatestQuarter = computeAverage(filteredRows.map((row) => row.latestQuarterScore));
  const cohortAvgGrowth = computeAverage(filteredRows.map((row) => row.growthScore));
  const cohortAvg4Quarter = computeAverage(filteredRows.map((row) => row.avg4QuarterScore));
  const cohortAvgBlended = computeAverage(filteredRows.map((row) => row.blendedScore));

  const sectorSlug = slugifySector(sectorName);

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
            {sectorName}
          </h1>
        </section>

      <div className={`${TABLE_CARD_CLASS} mt-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {filteredRows.length} {filteredRows.length === 1 ? "company" : "companies"}
              {activeSubSectorDisplay ? ` in ${activeSubSectorDisplay}` : ""}
              {latestQuarterLabel ? ` · ${latestQuarterLabel}` : ""}
            </p>
            {sortedSubSectorEntries.length > 0 && (
              <SubSectorSelect
                sectorSlug={sectorSlug}
                entries={sortedSubSectorEntries}
                totalCount={allRows.length}
                value={activeSubSectorRaw}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`${CHIP_BASE} ${CHIP_NEUTRAL}`}>
              Blend {cohortAvgBlended != null ? cohortAvgBlended.toFixed(1) : "—"}
            </span>
            <span className={`${CHIP_BASE} ${CHIP_NEUTRAL}`}>
              Qtr {cohortAvgLatestQuarter != null ? cohortAvgLatestQuarter.toFixed(1) : "—"}
            </span>
            <span className={`${CHIP_BASE} ${CHIP_NEUTRAL}`}>
              Growth {cohortAvgGrowth != null ? cohortAvgGrowth.toFixed(1) : "—"}
            </span>
            <span className={`${CHIP_BASE} ${CHIP_NEUTRAL}`}>
              4Q {cohortAvg4Quarter != null ? cohortAvg4Quarter.toFixed(1) : "—"}
            </span>
          </div>
        </div>

        <SectorTable rows={filteredRows} />
      </div>
      </div>
    </main>
  );
}
