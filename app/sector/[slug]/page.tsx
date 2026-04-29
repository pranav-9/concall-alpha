import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ConcallScore from "@/components/concall-score";
import { getConcallData } from "@/app/company/get-concall-data";
import { isCompanyNew } from "@/lib/company-freshness";
import {
  CHIP_BASE,
  CHIP_NEUTRAL,
  CHIP_PRIMARY,
  HERO_CARD,
  PAGE_SHELL,
  PANEL_CARD_SKY,
} from "@/lib/design/shell";
import { normalizeSectorIntelligence } from "@/lib/sector-intelligence/normalize";
import type {
  NormalizedSectorCatalyst,
  NormalizedSectorEvidence,
  NormalizedSectorPolicy,
  NormalizedSectorTheme,
  SectorIntelligenceRow,
} from "@/lib/sector-intelligence/types";
import { createClient } from "@/lib/supabase/server";
import { findSectorBySlug, slugifySector } from "@/app/sector/utils";

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

type SectorCompanyRow = {
  code: string;
  name: string;
  sector: string;
  subSector: string | null;
  isNew: boolean;
  latestQuarterScore: number | null;
  growthScore: number | null;
  avg4QuarterScore: number | null;
  avgScore: number | null;
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

const normalizeFilterKey = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

const timestampValue = (value: string | null | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

const pickLatestSectorRow = (rows: SectorIntelligenceRow[]) =>
  [...rows].sort((a, b) => timestampValue(b.generated_at) - timestampValue(a.generated_at))[0] ?? null;

const renderEvidenceLine = (evidence: NormalizedSectorEvidence | undefined) => {
  if (!evidence?.note) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {evidence.note}
      {evidence.source ? <span className="text-foreground/70"> ({evidence.source})</span> : null}
    </p>
  );
};

const PAGE_BACKGROUND_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.11),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.09),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.78),_transparent_62%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.34),_transparent_62%)]";

const TABLE_CARD_CLASS =
  "overflow-hidden rounded-[1.45rem] border border-sky-200/25 bg-gradient-to-br from-background/97 via-background/93 to-sky-50/10 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.24)] backdrop-blur-sm dark:border-sky-700/20 dark:from-background/90 dark:via-background/84 dark:to-sky-950/10";

const INLINE_SUBCARD_CLASS =
  "rounded-xl border border-border/25 bg-gradient-to-br from-background/96 via-background/92 to-muted/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm";

const SMALL_SUBCARD_CLASS =
  "rounded-lg border border-border/20 bg-background/55 p-3";

const SORT_PILL_ACTIVE_CLASS =
  "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200";

const SORT_PILL_INACTIVE_CLASS =
  "border-border/60 bg-background/80 text-muted-foreground";

function ThemeColumn({
  title,
  items,
}: {
  title: string;
  items: NormalizedSectorTheme[];
}) {
  if (!items.length) return null;

  const visible = items.slice(0, 2);
  const hidden = items.slice(2);

  const renderItem = (item: NormalizedSectorTheme, index: number) => (
    <div key={`${item.theme}-${index}`} className="space-y-1.5 border-l border-border/40 pl-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{item.theme}</p>
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
          {item.confidence != null && (
            <span
              title="Confidence in this signal (1 = weak, 5 = strong)"
              className="rounded-full border border-border bg-muted px-2 py-0.5"
            >
              Confidence {item.confidence}/5
            </span>
          )}
          {item.impactArea && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 capitalize">
              {item.impactArea.replace(/_/g, " ")}
            </span>
          )}
          {item.timeHorizon && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 capitalize">
              {item.timeHorizon.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>
      {item.whyItMatters && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.whyItMatters}
        </p>
      )}
      {item.evidence[0] && (
        <details className="text-[10px] text-muted-foreground">
          <summary className="cursor-pointer">Show evidence</summary>
          <div className="mt-1 space-y-1">
            {item.evidence.slice(0, 2).map((evidence, evidenceIndex) => (
              <div key={evidenceIndex}>{renderEvidenceLine(evidence)}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );

  return (
    <div className={INLINE_SUBCARD_CLASS + " space-y-3"}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="space-y-3">
        {visible.map((item, index) => renderItem(item, index))}
      </div>
      {hidden.length > 0 && (
        <details className="rounded-md border border-border/30 bg-background/45 p-2.5">
          <summary className="cursor-pointer text-[11px] font-medium text-foreground">
            Show {hidden.length} more
          </summary>
          <div className="mt-3 space-y-3">
            {hidden.map((item, index) => renderItem(item, index + visible.length))}
          </div>
        </details>
      )}
    </div>
  );
}

function CatalystPolicyColumn({
  title,
  items,
  kind,
}: {
  title: string;
  items: NormalizedSectorCatalyst[] | NormalizedSectorPolicy[];
  kind: "catalyst" | "policy";
}) {
  if (!items.length) return null;

  const visible = items.slice(0, 2);
  const hidden = items.slice(2);

  const renderItem = (
    item: NormalizedSectorCatalyst | NormalizedSectorPolicy,
    index: number,
  ) => {
    const key =
      kind === "catalyst"
        ? `${(item as NormalizedSectorCatalyst).catalyst}-${index}`
        : `${(item as NormalizedSectorPolicy).policyName}-${index}`;
    const titleText =
      kind === "catalyst"
        ? (item as NormalizedSectorCatalyst).catalyst
        : (item as NormalizedSectorPolicy).policyName;

    return (
      <div key={key} className="space-y-2 rounded-md border border-border/30 bg-background/60 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
        <p className="text-sm font-medium text-foreground">{titleText}</p>
        {kind === "catalyst" ? (
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
            {(item as NormalizedSectorCatalyst).type && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 capitalize">
                {(item as NormalizedSectorCatalyst).type!.replace(/_/g, " ")}
              </span>
            )}
            {(item as NormalizedSectorCatalyst).expectedImpact && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 capitalize">
                {(item as NormalizedSectorCatalyst).expectedImpact!}
              </span>
            )}
            {(item as NormalizedSectorCatalyst).timeHorizon && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 capitalize">
                {(item as NormalizedSectorCatalyst).timeHorizon!.replace(/_/g, " ")}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {(item as NormalizedSectorPolicy).status && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 capitalize">
                {(item as NormalizedSectorPolicy).status!.replace(/_/g, " ")}
              </span>
            )}
            {(item as NormalizedSectorPolicy).sectorEffect && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 capitalize">
                {(item as NormalizedSectorPolicy).sectorEffect!.replace(/_/g, " ")}
              </span>
            )}
            {(item as NormalizedSectorPolicy).timeline && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5">
                {(item as NormalizedSectorPolicy).timeline}
              </span>
            )}
          </div>
        )}
        {kind === "catalyst" ? (
          (item as NormalizedSectorCatalyst).whyItMatters && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {(item as NormalizedSectorCatalyst).whyItMatters}
            </p>
          )
        ) : (
          <div className="space-y-1 text-xs text-muted-foreground">
            {(item as NormalizedSectorPolicy).whoBenefits && (
              <p>
                <span className="font-medium text-foreground">Who benefits:</span>{" "}
                {(item as NormalizedSectorPolicy).whoBenefits}
              </p>
            )}
            {(item as NormalizedSectorPolicy).whoIsAtRisk && (
              <p>
                <span className="font-medium text-foreground">Who is at risk:</span>{" "}
                {(item as NormalizedSectorPolicy).whoIsAtRisk}
              </p>
            )}
          </div>
        )}
        {"evidence" in item && item.evidence[0] ? renderEvidenceLine(item.evidence[0]) : null}
      </div>
    );
  };

  return (
    <div className={INLINE_SUBCARD_CLASS + " space-y-3"}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="space-y-3">
        {visible.map((item, index) => renderItem(item, index))}
      </div>
      {hidden.length > 0 && (
        <details className="rounded-md border border-border/30 bg-background/45 p-2.5">
          <summary className="cursor-pointer text-[11px] font-medium text-foreground">
            Show {hidden.length} more
          </summary>
          <div className="mt-3 space-y-3">
            {hidden.map((item, index) => renderItem(item, index + visible.length))}
          </div>
        </details>
      )}
    </div>
  );
}

type SectorPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    subSector?: string;
    sort?: "avg" | "latest_qtr" | "growth";
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
  const sortBy =
    resolvedSearchParams?.sort === "latest_qtr" || resolvedSearchParams?.sort === "growth"
      ? resolvedSearchParams.sort
      : "avg";
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

  const [{ rows: concallRows, latestLabel }, { data: growthRows }, { data: sectorIntelligenceRowsData }] = await Promise.all([
    getConcallData(),
    supabase
      .from("growth_outlook")
      .select("company, growth_score, run_timestamp")
      .order("run_timestamp", { ascending: false }),
    supabase
      .from("sector_intelligence")
      .select(
        "sector, sub_sector, generated_at, source_mode, sources, sector_overview, tailwinds, headwinds, cycle_view, growth_catalysts, policy_watch, covered_companies, what_matters_now, details",
      )
      .eq("sector", sectorName),
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

  const allRows: SectorCompanyRow[] = companies.map((company) => {
    const codeKey = company.code.toUpperCase();
    const name = company.name?.trim() || company.code;
    const nameKey = name.toUpperCase();
    const concallScore = concallScoreByCode.get(codeKey);
    const latestQuarterScore = concallScore?.latestScore ?? null;
    const growthScore = latestGrowthByKey.get(codeKey) ?? latestGrowthByKey.get(nameKey) ?? null;
    const avg4QuarterScore = concallScore?.avg4QuarterScore ?? null;
    const validValues = [latestQuarterScore, growthScore, avg4QuarterScore].filter(
      (value): value is number => value != null,
    );

    return {
      code: company.code,
      name,
      sector: company.sector ?? sectorName,
      subSector: company.sub_sector ?? null,
      isNew: isCompanyNew(company.created_at ?? null),
      latestQuarterScore,
      growthScore,
      avg4QuarterScore,
      avgScore:
        validValues.length > 0
          ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length
          : null,
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

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (sortBy === "growth") {
      const primary = compareNullableNumbers(a.growthScore, b.growthScore, sortOrder);
      if (primary !== 0) return primary;
      const tieQuarter = compareNullableNumbers(a.latestQuarterScore, b.latestQuarterScore, "desc");
      if (tieQuarter !== 0) return tieQuarter;
      const tieAvg = compareNullableNumbers(a.avgScore, b.avgScore, "desc");
      if (tieAvg !== 0) return tieAvg;
      return a.name.localeCompare(b.name);
    }

    if (sortBy === "latest_qtr") {
      const primary = compareNullableNumbers(a.latestQuarterScore, b.latestQuarterScore, sortOrder);
      if (primary !== 0) return primary;
      const tieGrowth = compareNullableNumbers(a.growthScore, b.growthScore, "desc");
      if (tieGrowth !== 0) return tieGrowth;
      const tieAvg = compareNullableNumbers(a.avgScore, b.avgScore, "desc");
      if (tieAvg !== 0) return tieAvg;
      return a.name.localeCompare(b.name);
    }

    const primary = compareNullableNumbers(a.avgScore, b.avgScore, sortOrder);
    if (primary !== 0) return primary;
    const tieQuarter = compareNullableNumbers(a.latestQuarterScore, b.latestQuarterScore, "desc");
    if (tieQuarter !== 0) return tieQuarter;
    const tieGrowth = compareNullableNumbers(a.growthScore, b.growthScore, "desc");
    if (tieGrowth !== 0) return tieGrowth;
    return a.name.localeCompare(b.name);
  });

  const latestQuarterLabel = latestLabel ?? null;

  const sectorIntelligenceRows = (sectorIntelligenceRowsData ?? []) as SectorIntelligenceRow[];
  const activeSubSectorKey = normalizeFilterKey(resolvedSearchParams?.subSector?.trim());
  const exactRows = activeSubSectorKey
    ? sectorIntelligenceRows.filter(
        (row) => normalizeFilterKey(row.sub_sector) === activeSubSectorKey,
      )
    : [];
  const sectorLevelRows = sectorIntelligenceRows.filter(
    (row) => normalizeFilterKey(row.sub_sector) == null,
  );
  const exactMatchRow = pickLatestSectorRow(exactRows);
  const sectorLevelRow = pickLatestSectorRow(sectorLevelRows);
  const selectedSectorIntelligenceRow = activeSubSectorKey
    ? exactMatchRow ?? sectorLevelRow
    : sectorLevelRow;
  const normalizedSectorIntelligence = normalizeSectorIntelligence(selectedSectorIntelligenceRow);
  const usingSubSectorView =
    Boolean(activeSubSectorKey) &&
    normalizeFilterKey(selectedSectorIntelligenceRow?.sub_sector) === activeSubSectorKey;
  const usingSectorFallback = Boolean(activeSubSectorKey) && !exactMatchRow && Boolean(sectorLevelRow);
  const sectorSummaryMissing =
    !normalizedSectorIntelligence?.sectorSummaryShort &&
    !normalizedSectorIntelligence?.sectorSummaryLong &&
    !normalizedSectorIntelligence?.sectorDefinition;
  const hasCycleData = Boolean(
    normalizedSectorIntelligence?.cycleSummary ||
      normalizedSectorIntelligence?.cyclePosition ||
      normalizedSectorIntelligence?.cycleEvidence.length ||
      normalizedSectorIntelligence?.whatImprovesNext.length ||
      normalizedSectorIntelligence?.whatBreaksTheSetup.length,
  );
  const topWhatMatters = normalizedSectorIntelligence?.whatMattersNow.slice(0, 3) ?? [];
  const nextWatchlist = normalizedSectorIntelligence?.next12mWatchlist.slice(0, 2) ?? [];
  const visibleCoveredCompanies = normalizedSectorIntelligence?.coveredCompanies.slice(0, 3) ?? [];
  const hiddenCoveredCompanies = normalizedSectorIntelligence?.coveredCompanies.slice(3) ?? [];
  const driversPolicySummary = normalizedSectorIntelligence
    ? `${normalizedSectorIntelligence.growthCatalysts.length} growth catalysts and ${normalizedSectorIntelligence.policyWatch.length} policy items tracked`
    : null;

  const buildSortHref = (nextSort: "avg" | "latest_qtr" | "growth", nextOrder: "asc" | "desc") => {
    const query = new URLSearchParams();
    if (nextSort !== "avg") query.set("sort", nextSort);
    if (nextOrder !== "desc") query.set("order", nextOrder);
    if (activeSubSectorRaw) query.set("subSector", activeSubSectorRaw);
    const qs = query.toString();
    return qs ? `/sector/${slugifySector(sectorName)}?${qs}` : `/sector/${slugifySector(sectorName)}`;
  };

  const buildSubSectorHref = (nextSubSector: string | null) => {
    const query = new URLSearchParams();
    if (sortBy !== "avg") query.set("sort", sortBy);
    if (sortOrder !== "desc") query.set("order", sortOrder);
    if (nextSubSector) query.set("subSector", nextSubSector);
    const qs = query.toString();
    return qs ? `/sector/${slugifySector(sectorName)}?${qs}` : `/sector/${slugifySector(sectorName)}`;
  };

  const sortLabel =
    sortBy === "growth" ? "Growth score" : sortBy === "latest_qtr" ? "Latest qtr" : "Avg score";

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                {sectorName}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                A sector intelligence view that combines coverage breadth, latest quarter strength,
                and growth context inside one research shell.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`${CHIP_BASE} ${CHIP_PRIMARY}`}>Companies: {allRows.length}</span>
              <span className={`${CHIP_BASE} ${CHIP_NEUTRAL}`}>
                Sub-sectors: {subSectorCounts.size}
              </span>
              {latestQuarterLabel && (
                <span className={`${CHIP_BASE} ${CHIP_NEUTRAL}`}>
                  Latest quarter: {latestQuarterLabel}
                </span>
              )}
            </div>
          </div>
        </section>

        <section className={PANEL_CARD_SKY}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Sector Intelligence</h2>
              <span className={`${CHIP_BASE} border-border/60 bg-background/75 text-foreground`}>
                {usingSubSectorView ? "Sub-sector view" : "Sector view"}
              </span>
              {usingSubSectorView && normalizedSectorIntelligence?.subSector && (
                <span className={`${CHIP_BASE} ${CHIP_PRIMARY}`}>
                  Sub-sector: {normalizedSectorIntelligence.subSector}
                </span>
              )}
              {usingSectorFallback && (
                <span className={`${CHIP_BASE} border-amber-200/70 bg-amber-100/80 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200`}>
                  No sub-sector data yet — showing the full sector instead
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {normalizedSectorIntelligence?.generatedAtLabel && (
                <span>Generated: {normalizedSectorIntelligence.generatedAtLabel}</span>
              )}
              {normalizedSectorIntelligence?.sourceMode && (
                <span>Source: {normalizedSectorIntelligence.sourceMode.replace(/_/g, " ")}</span>
              )}
            </div>
          </div>
        </div>

        {sortedSubSectorEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/30 pt-3 text-xs">
            <span className="text-muted-foreground">Filter by sub-sector:</span>
            <Link
              href={buildSubSectorHref(null)}
              className={`${CHIP_BASE} ${
                activeSubSectorRaw ? SORT_PILL_INACTIVE_CLASS : SORT_PILL_ACTIVE_CLASS
              }`}
              prefetch={false}
            >
              All ({allRows.length})
            </Link>
            {sortedSubSectorEntries.map(([name, count]) => {
              const isActive =
                normalizeFilterKey(name) === normalizeFilterKey(activeSubSectorRaw);
              return (
                <Link
                  key={name}
                  href={buildSubSectorHref(isActive ? null : name)}
                  className={`${CHIP_BASE} ${
                    isActive ? SORT_PILL_ACTIVE_CLASS : SORT_PILL_INACTIVE_CLASS
                  }`}
                  prefetch={false}
                >
                  {name} ({count})
                </Link>
              );
            })}
          </div>
        )}

        {!normalizedSectorIntelligence ? (
          <div className={`${SMALL_SUBCARD_CLASS} text-sm text-muted-foreground`}>
            Sector intelligence data not available yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
              <div className="xl:col-span-3 rounded-[1.35rem] border border-border/25 bg-gradient-to-br from-background/96 via-background/92 to-sky-50/10 p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                {sectorSummaryMissing ? (
                  <p className="text-sm text-muted-foreground">Sector intelligence data not available yet.</p>
                ) : (
                  <>
                    {normalizedSectorIntelligence.sectorSummaryShort && (
                      <p className="text-sm sm:text-base font-medium text-foreground">
                        {normalizedSectorIntelligence.sectorSummaryShort}
                      </p>
                    )}
                    {normalizedSectorIntelligence.sectorSummaryLong && (
                      <p className="text-sm leading-relaxed text-muted-foreground sm:line-clamp-4 xl:line-clamp-3">
                        {normalizedSectorIntelligence.sectorSummaryLong}
                      </p>
                    )}
                    {normalizedSectorIntelligence.sectorDefinition && (
                      <p className="text-xs text-muted-foreground">
                        {normalizedSectorIntelligence.sectorDefinition}
                      </p>
                    )}
                  </>
                )}

                {normalizedSectorIntelligence.whatDrivesEarnings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      What drives earnings
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {normalizedSectorIntelligence.whatDrivesEarnings.slice(0, 3).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {normalizedSectorIntelligence.valueChainMap.filter(Boolean).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Value chain
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-foreground">
                      {normalizedSectorIntelligence.valueChainMap
                        .filter(Boolean)
                        .map((item, index, arr) => (
                          <span key={`${item}-${index}`} className="flex items-center gap-1.5">
                            <span className="rounded-full border border-border bg-background px-2 py-0.5">
                              {item}
                            </span>
                            {index < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {(topWhatMatters.length > 0 || nextWatchlist.length > 0) && (
                <div className="xl:col-span-2 rounded-[1.35rem] border border-border/25 bg-gradient-to-br from-background/96 via-background/92 to-muted/12 p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    What Matters Now
                  </p>
                  {topWhatMatters.length > 0 && (
                    <div className="space-y-2">
                      {topWhatMatters.map((item) => (
                        <p key={item} className="text-sm text-foreground">
                          • {item}
                        </p>
                      ))}
                    </div>
                  )}
                  {nextWatchlist.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Next 12M
                      </p>
                      <div className="space-y-1">
                        {nextWatchlist.map((item) => (
                          <p key={item} className="text-xs text-muted-foreground">
                            • {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {(normalizedSectorIntelligence.tailwinds.length > 0 ||
              normalizedSectorIntelligence.headwinds.length > 0 ||
              hasCycleData) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <ThemeColumn title="Tailwinds" items={normalizedSectorIntelligence.tailwinds} />
                <ThemeColumn title="Headwinds" items={normalizedSectorIntelligence.headwinds} />
                {hasCycleData && (
                  <div className={INLINE_SUBCARD_CLASS + " space-y-3"}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cycle</p>
                      {normalizedSectorIntelligence.cyclePosition && (
                        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-foreground capitalize">
                          {normalizedSectorIntelligence.cyclePosition.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    {normalizedSectorIntelligence.cycleSummary && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {normalizedSectorIntelligence.cycleSummary}
                      </p>
                    )}
                    {(normalizedSectorIntelligence.whatImprovesNext.length > 0 ||
                      normalizedSectorIntelligence.whatBreaksTheSetup.length > 0) && (
                      <div className="grid grid-cols-1 gap-3">
                        {normalizedSectorIntelligence.whatImprovesNext.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                              Improves next
                            </p>
                            {normalizedSectorIntelligence.whatImprovesNext.slice(0, 2).map((item) => (
                              <p key={item} className="text-xs text-foreground">
                                • {item}
                              </p>
                            ))}
                          </div>
                        )}
                        {normalizedSectorIntelligence.whatBreaksTheSetup.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                              Breaks setup
                            </p>
                            {normalizedSectorIntelligence.whatBreaksTheSetup.slice(0, 2).map((item) => (
                              <p key={item} className="text-xs text-foreground">
                                • {item}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(normalizedSectorIntelligence.growthCatalysts.length > 0 ||
              normalizedSectorIntelligence.policyWatch.length > 0) && (
              <details className={INLINE_SUBCARD_CLASS}>
                <summary className="cursor-pointer">
                  <span className="block space-y-1">
                    <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Drivers & Policy
                    </span>
                    {driversPolicySummary && (
                      <span className="block text-sm text-foreground">{driversPolicySummary}</span>
                    )}
                  </span>
                </summary>
                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <CatalystPolicyColumn
                    title="Growth Catalysts"
                    items={normalizedSectorIntelligence.growthCatalysts}
                    kind="catalyst"
                  />
                  <CatalystPolicyColumn
                    title="Policy Watch"
                    items={normalizedSectorIntelligence.policyWatch}
                    kind="policy"
                  />
                </div>
              </details>
            )}

            {visibleCoveredCompanies.length > 0 && (
              <div className={INLINE_SUBCARD_CLASS + " space-y-3"}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Companies we cover in this sub-sector
                </p>
                <div className="space-y-2">
                  {visibleCoveredCompanies.map((company) => (
                    <div
                      key={company.companyCode}
                      className={SMALL_SUBCARD_CLASS + " px-3 py-2"}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/company/${company.companyCode}`}
                          className="font-medium text-foreground underline"
                          prefetch={false}
                        >
                          {company.companyName}
                        </Link>
                        {company.subSector && (
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {company.subSector}
                          </span>
                        )}
                        {company.latestSentimentScore != null && (
                          <span
                            title="Latest quarterly sentiment score (1-10)"
                            className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground"
                          >
                            Sentiment {company.latestSentimentScore.toFixed(1)}
                          </span>
                        )}
                        {company.latestGrowthScore != null && (
                          <span
                            title="Forward growth score (1-10)"
                            className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground"
                          >
                            Growth {company.latestGrowthScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {company.positioningSummary && (
                        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                          {company.positioningSummary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {hiddenCoveredCompanies.length > 0 && (
                  <details className="rounded-md border border-border/30 bg-background/45 p-2.5">
                    <summary className="cursor-pointer text-[11px] font-medium text-foreground">
                      Show {hiddenCoveredCompanies.length} more
                    </summary>
                    <div className="mt-3 space-y-2">
                      {hiddenCoveredCompanies.map((company) => (
                        <div key={company.companyCode} className={SMALL_SUBCARD_CLASS + " px-3 py-2"}>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/company/${company.companyCode}`}
                              className="font-medium text-foreground underline"
                              prefetch={false}
                            >
                              {company.companyName}
                            </Link>
                            {company.subSector && (
                              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                {company.subSector}
                              </span>
                            )}
                          </div>
                          {company.positioningSummary && (
                            <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                              {company.positioningSummary}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {normalizedSectorIntelligence.sourceUrls.length > 0 && (
              <details className={INLINE_SUBCARD_CLASS}>
                <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Sources
                </summary>
                <div className="mt-3 space-y-2">
                  {normalizedSectorIntelligence.sourceUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block break-all text-xs text-foreground underline"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
        </section>

      <div className={`${TABLE_CARD_CLASS} mt-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Sector table
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {activeSubSectorDisplay
                ? `Showing companies in ${activeSubSectorDisplay}.`
                : "Sort by the sector-level metrics most relevant to browsing."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {activeSubSectorDisplay && (
              <Link
                href={buildSubSectorHref(null)}
                className={`${CHIP_BASE} ${SORT_PILL_INACTIVE_CLASS} hover:bg-accent`}
                prefetch={false}
              >
                Clear sub-sector filter
              </Link>
            )}
            <span className={`${CHIP_BASE} ${CHIP_NEUTRAL}`}>
              Current: {sortLabel} {sortOrder}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/30 px-4 py-3 text-xs">
          <span className="text-muted-foreground">Sort:</span>
          <Link
            href={buildSortHref("avg", sortBy === "avg" && sortOrder === "desc" ? "asc" : "desc")}
            className={`${CHIP_BASE} ${
              sortBy === "avg" ? SORT_PILL_ACTIVE_CLASS : SORT_PILL_INACTIVE_CLASS
            }`}
            prefetch={false}
          >
            Avg ({sortBy === "avg" ? sortOrder : "desc"})
          </Link>
          <Link
            href={buildSortHref("latest_qtr", sortBy === "latest_qtr" && sortOrder === "desc" ? "asc" : "desc")}
            className={`${CHIP_BASE} ${
              sortBy === "latest_qtr" ? SORT_PILL_ACTIVE_CLASS : SORT_PILL_INACTIVE_CLASS
            }`}
            prefetch={false}
          >
            Latest qtr ({sortBy === "latest_qtr" ? sortOrder : "desc"})
          </Link>
          <Link
            href={buildSortHref("growth", sortBy === "growth" && sortOrder === "desc" ? "asc" : "desc")}
            className={`${CHIP_BASE} ${
              sortBy === "growth" ? SORT_PILL_ACTIVE_CLASS : SORT_PILL_INACTIVE_CLASS
            }`}
            prefetch={false}
          >
            Growth ({sortBy === "growth" ? sortOrder : "desc"})
          </Link>
        </div>

        {sortedRows.length === 0 ? (
          <div className={SMALL_SUBCARD_CLASS + " text-sm text-muted-foreground"}>
            {activeSubSectorDisplay
              ? `No companies in ${activeSubSectorDisplay} yet.`
              : "No companies available for this sector."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/70 border-b border-border/35">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-foreground">Company</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Sub-sector</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Latest qtr score</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Growth score</th>
                  <th className="px-3 py-2 font-semibold text-foreground">4Q Avg Score</th>
                  <th className="border-l border-border/70 px-3 py-2 font-semibold text-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span>Avg score</span>
                      <span className="text-[10px] font-medium text-muted-foreground normal-case">
                        Derived from first 3
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.code} className="border-b border-border/45 transition-colors last:border-b-0 hover:bg-sky-50/30 dark:hover:bg-sky-950/10">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/company/${row.code}`} className="underline text-foreground" prefetch={false}>
                          {row.name}
                        </Link>
                        {row.isNew && (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{row.code}</p>
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {row.subSector ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {row.latestQuarterScore != null ? (
                        <ConcallScore score={row.latestQuarterScore} size="sm" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.growthScore != null ? (
                        <ConcallScore score={row.growthScore} size="sm" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.avg4QuarterScore != null ? (
                        <ConcallScore score={row.avg4QuarterScore} size="sm" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="border-l border-border/70 px-3 py-2">
                      {row.avgScore != null ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-emerald-700/40 dark:bg-emerald-950/20">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Blend
                          </span>
                          <ConcallScore score={row.avgScore} size="sm" />
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
        )}
      </div>
      </div>
    </main>
  );
}
