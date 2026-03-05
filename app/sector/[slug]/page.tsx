import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ConcallScore from "@/components/concall-score";
import { isCompanyNew } from "@/lib/company-freshness";
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
  isNew: boolean;
  latestQuarterScore: number | null;
  growthScore: number | null;
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
            <span className="rounded-full border border-border bg-muted px-2 py-0.5">
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
    <div className="rounded-lg border border-border/40 bg-muted/15 p-3 space-y-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="space-y-3">
        {visible.map((item, index) => renderItem(item, index))}
      </div>
      {hidden.length > 0 && (
        <details className="rounded-md border border-border/30 bg-background/50 p-2.5">
          <summary className="cursor-pointer text-[11px] font-medium text-foreground">
            Show all {title.toLowerCase()} ({hidden.length})
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
      <div key={key} className="space-y-2 rounded-md border border-border/30 bg-background/60 p-2.5">
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
    <div className="rounded-lg border border-border/40 bg-muted/15 p-3 space-y-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="space-y-3">
        {visible.map((item, index) => renderItem(item, index))}
      </div>
      {hidden.length > 0 && (
        <details className="rounded-md border border-border/30 bg-background/50 p-2.5">
          <summary className="cursor-pointer text-[11px] font-medium text-foreground">
            Show more ({hidden.length})
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

  const [{ data: latestQuarterKey }, { data: growthRows }, { data: sectorIntelligenceRowsData }] = await Promise.all([
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
    supabase
      .from("sector_intelligence")
      .select(
        "sector, sub_sector, generated_at, source_mode, sources, sector_overview, tailwinds, headwinds, cycle_view, growth_catalysts, policy_watch, covered_companies, what_matters_now, details",
      )
      .eq("sector", sectorName),
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
      isNew: isCompanyNew(company.created_at ?? null),
      latestQuarterScore: quarterScoreMap.get(codeKey) ?? null,
      growthScore: latestGrowthByKey.get(codeKey) ?? latestGrowthByKey.get(nameKey) ?? null,
      avgScore:
        quarterScoreMap.get(codeKey) != null &&
        (latestGrowthByKey.get(codeKey) ?? latestGrowthByKey.get(nameKey) ?? null) != null
          ? ((quarterScoreMap.get(codeKey) as number) +
              (latestGrowthByKey.get(codeKey) ?? latestGrowthByKey.get(nameKey) ?? 0)) /
            2
          : null,
    };
  });
  const subSectorCounts = allRows.reduce<Map<string, number>>((acc, row) => {
    const key = row.subSector?.trim();
    if (!key) return acc;
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map());

  const sortedRows = [...allRows].sort((a, b) => {
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

  const latestQuarterLabel = latestQuarterKey?.quarter_label
    ? String(latestQuarterKey.quarter_label)
    : latestQuarterKey?.fy != null && latestQuarterKey?.qtr != null
    ? `Q${latestQuarterKey.qtr} FY${latestQuarterKey.fy}`
    : null;

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
    const qs = query.toString();
    return qs ? `/sector/${slugifySector(sectorName)}?${qs}` : `/sector/${slugifySector(sectorName)}`;
  };

  const sortLabel =
    sortBy === "growth" ? "Growth score" : sortBy === "latest_qtr" ? "Latest qtr" : "Avg score";

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

      <div className="rounded-lg border border-border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Sector Intelligence</h2>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-foreground">
                {usingSubSectorView ? "Sub-sector view" : "Sector view"}
              </span>
              {usingSubSectorView && normalizedSectorIntelligence?.subSector && (
                <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
                  Sub-sector: {normalizedSectorIntelligence.subSector}
                </span>
              )}
              {usingSectorFallback && (
                <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200">
                  Using sector-level view
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

        {!normalizedSectorIntelligence ? (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
            Sector intelligence data not available yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
              <div className="xl:col-span-3 rounded-lg border border-border/40 bg-muted/15 p-4 space-y-3">
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
                <div className="xl:col-span-2 rounded-lg border border-border/40 bg-muted/15 p-4 space-y-3">
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
                  <div className="rounded-lg border border-border/40 bg-muted/15 p-3 space-y-3">
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
              <details className="rounded-lg border border-border/40 bg-muted/15 p-3">
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
              <div className="rounded-lg border border-border/40 bg-muted/15 p-3 space-y-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Internal Coverage Snapshot
                </p>
                <div className="space-y-2">
                  {visibleCoveredCompanies.map((company) => (
                    <div
                      key={company.companyCode}
                      className="rounded-md border border-border/30 bg-background/60 px-3 py-2"
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
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground">
                            S {company.latestSentimentScore.toFixed(1)}
                          </span>
                        )}
                        {company.latestGrowthScore != null && (
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground">
                            G {company.latestGrowthScore.toFixed(1)}
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
                  <details className="rounded-md border border-border/30 bg-background/50 p-2.5">
                    <summary className="cursor-pointer text-[11px] font-medium text-foreground">
                      Show all covered companies ({hiddenCoveredCompanies.length})
                    </summary>
                    <div className="mt-3 space-y-2">
                      {hiddenCoveredCompanies.map((company) => (
                        <div
                          key={company.companyCode}
                          className="rounded-md border border-border/30 bg-background/60 px-3 py-2"
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
              <details className="rounded-md border border-border/30 bg-background/40 p-2.5">
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
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Sort:</span>
          <Link
            href={buildSortHref("avg", sortBy === "avg" && sortOrder === "desc" ? "asc" : "desc")}
            className={`underline-offset-2 hover:underline ${
              sortBy === "avg" ? "font-semibold text-foreground" : "text-muted-foreground"
            }`}
            prefetch={false}
          >
            Avg ({sortBy === "avg" ? sortOrder : "desc"})
          </Link>
          <Link
            href={buildSortHref("latest_qtr", sortBy === "latest_qtr" && sortOrder === "desc" ? "asc" : "desc")}
            className={`underline-offset-2 hover:underline ${
              sortBy === "latest_qtr" ? "font-semibold text-foreground" : "text-muted-foreground"
            }`}
            prefetch={false}
          >
            Latest qtr ({sortBy === "latest_qtr" ? sortOrder : "desc"})
          </Link>
          <Link
            href={buildSortHref("growth", sortBy === "growth" && sortOrder === "desc" ? "asc" : "desc")}
            className={`underline-offset-2 hover:underline ${
              sortBy === "growth" ? "font-semibold text-foreground" : "text-muted-foreground"
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
            No companies available for this sector.
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
                  <th className="border-l border-border/70 px-3 py-2 font-semibold text-foreground">
                    Avg score
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.code} className="border-b border-border/60 last:border-b-0">
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
                    <td className="border-l border-border/70 px-3 py-2">
                      {row.avgScore != null ? (
                        <ConcallScore score={row.avgScore} />
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
