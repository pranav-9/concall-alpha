import React from "react";
import type { Metadata } from "next";
import { isCompanyNew } from "@/lib/company-freshness";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { createClient } from "@/lib/supabase/server";
import { SECTION_MAP } from "../constants";
import {
  QuarterData,
} from "../types";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { OverviewCard } from "../components/overview-card";
import { SectionCard } from "../components/section-card";
import { parseSummary, transformToChartData, calculateTrend } from "../utils";
import ConcallScore from "@/components/concall-score";
import { CompanyCommentsSection } from "@/components/company/company-comments-section";
import { WatchlistButton } from "@/components/watchlist-button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";
import type { NormalizedGrowthScenario } from "@/lib/growth-outlook/types";
import { normalizeBusinessSnapshot } from "@/lib/business-snapshot/normalize";
import { normalizeCompanyIndustryAnalysis } from "@/lib/company-industry-analysis/normalize";
import { GuidanceHistorySection } from "../components/guidance-history-section";
import { MissingSectionRequestButton } from "../components/missing-section-request-button";
import { QuarterlyScoreSection } from "../components/quarterly-score-section";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import type {
  CompanyIndustryAnalysisRow,
  NormalizedIndustryTheme,
} from "@/lib/company-industry-analysis/types";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";

type RankInfo = {
  quarter?: { rank: number; total: number; percentile: number } | null;
  growth?: { rank: number; total: number; percentile: number } | null;
};

type SectorRankInfo = { rank: number | null; total: number } | null;

const computeAvgScore = (latestQuarterScore: number | null, growthScore: number | null) => {
  if (latestQuarterScore == null || growthScore == null) return null;
  return (latestQuarterScore + growthScore) / 2;
};

const compareNullableNumbers = (a: number | null, b: number | null, order: "asc" | "desc") => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return order === "asc" ? a - b : b - a;
};

const pctFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const formatPctLabel = (value: number) => `${pctFormatter.format(value)}%`;

const timelineStageConfig: Record<string, { label: string; className: string }> = {
  announced: {
    label: "announced",
    className:
      "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/25 dark:text-amber-200 dark:border-amber-700/40",
  },
  in_progress: {
    label: "in progress",
    className:
      "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/25 dark:text-blue-200 dark:border-blue-700/40",
  },
  scaled: {
    label: "scaled",
    className:
      "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-200 dark:border-emerald-700/40",
  },
  commissioned: {
    label: "commissioned",
    className:
      "bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/25 dark:text-sky-200 dark:border-sky-700/40",
  },
  unknown: {
    label: "unknown",
    className: "bg-muted text-foreground border border-border",
  },
};

const getTimelineStageDisplay = (stage?: string | null) => {
  const raw = (stage ?? "").trim().toLowerCase();
  const key = raw.replace(/\s+/g, "_");
  const mapped = timelineStageConfig[key];
  if (mapped) {
    return mapped;
  }
  if (raw) {
    return {
      label: raw.replace(/_/g, " "),
      className: timelineStageConfig.unknown.className,
    };
  }
  return timelineStageConfig.unknown;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `${code} – Story of a Stock`,
    description: `Company detail for ${code} on Story of a Stock.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = await createClient();

  const { data: companyRow } = await supabase
    .from("company")
    .select("name, sector, sub_sector, exchange, country, code, website, created_at")
    .eq("code", code)
    .limit(1)
    .maybeSingle();
  const companyName = companyRow?.name as string | undefined;
  const companyIsNew = isCompanyNew(companyRow?.created_at ?? null);
  const companySector = companyRow?.sector?.trim() || undefined;
  const companySubSector = companyRow?.sub_sector?.trim() || undefined;
  const { data: authClaimsData } = await supabase.auth.getClaims();
  const authenticatedUserId =
    typeof authClaimsData?.claims?.sub === "string" ? authClaimsData.claims.sub : null;

  let firstWatchlist: { id: number; name: string } | null = null;
  let isInFirstWatchlist = false;

  if (authenticatedUserId) {
    const { data: watchlistRows } = await supabase
      .from("watchlists")
      .select("id, name")
      .eq("user_id", authenticatedUserId)
      .order("created_at", { ascending: true })
      .limit(1);

    firstWatchlist = (watchlistRows?.[0] as { id: number; name: string } | undefined) ?? null;

    if (firstWatchlist) {
      const { data: watchlistItemRows } = await supabase
        .from("watchlist_items")
        .select("id")
        .eq("watchlist_id", firstWatchlist.id)
        .eq("company_code", code)
        .limit(1);

      isInFirstWatchlist = (watchlistItemRows?.length ?? 0) > 0;
    }
  }

  // Fetch concall analysis data
  const { data, error } = await supabase
    .from("concall_analysis")
    .select()
    .eq("company_code", code)
    .order("fy", { ascending: false })
    .order("qtr", { ascending: false });

  // Fetch latest top strategies data
  const { data: businessSnapshotData } = await supabase
    .from("business_snapshot")
    .select(
      "company, generated_at, documents_processed, segment_profiles, business_snapshot, about_company, revenue_breakdown, revenue_engine, details, snapshot_phase, snapshot_source, source_urls",
    )
    .eq("company", code)
    .order("generated_at", { ascending: false })
    .limit(1);

  const { data: growthData } = await supabase
    .from("growth_outlook")
    .select("*")
    .or(
      [code ? `company.eq.${code}` : null, companyName ? `company.eq.${companyName}` : null]
        .filter(Boolean)
        .join(",") || `company.eq.${code}`,
    )
    .order("run_timestamp", { ascending: false })
    .limit(1);

  const { data: companyIndustryAnalysisData } = await supabase
    .from("company_industry_analysis")
    .select(
      "company, generated_at, sector, sub_sector, industry_positioning, value_chain, profit_pools, company_fit, competition, tailwinds, headwinds, sources, details",
    )
    .eq("company", code)
    .limit(1);

  const { data: guidanceTrackingRows, error: guidanceTrackingError } = await supabase
    .from("guidance_tracking")
    .select(
      "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details",
    )
    .eq("company_code", code)
    .order("generated_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex w-full px-4 sm:px-8 lg:px-16 py-8 justify-center items-center">
        <p className="text-muted-foreground text-lg">
          No data available for company {code}
        </p>
      </div>
    );
  }

  const latestQuarterData: QuarterData = data[0];
  latestQuarterData.summary = parseSummary(latestQuarterData.summary);
  const chartData = transformToChartData(data);
  const trend = calculateTrend(data.slice(0, 12));
  const detailQuarters = data.slice(0, 12);
  const normalizedGrowthOutlook = normalizeGrowthOutlook({
    details: growthData?.[0]?.details,
    growthScore: growthData?.[0]?.growth_score,
    runTimestamp: growthData?.[0]?.run_timestamp,
    companyName: growthData?.[0]?.company_name,
    fiscalYear: growthData?.[0]?.fiscal_year,
    horizonQuarters: growthData?.[0]?.horizon_quarters,
    horizonYears: growthData?.[0]?.horizon_years,
    visibilityScore: growthData?.[0]?.visibility_score,
    baseGrowthPct: growthData?.[0]?.base_growth_pct,
    upsideGrowthPct: growthData?.[0]?.upside_growth_pct,
    downsideGrowthPct: growthData?.[0]?.downside_growth_pct,
    growthScoreFormula: growthData?.[0]?.growth_score_formula,
    growthScoreSteps: growthData?.[0]?.growth_score_steps,
    factBase: growthData?.[0]?.fact_base,
    summaryBullets: growthData?.[0]?.summary_bullets,
    visibilityRationale: growthData?.[0]?.visibility_rationale,
    catalysts: growthData?.[0]?.catalysts,
    scenarios: growthData?.[0]?.scenarios,
    variantPerception: growthData?.[0]?.variant_perception,
  });
  const normalizedBusinessSnapshot = normalizeBusinessSnapshot({
    companyCode: code,
    companyWebsite: companyRow?.website ?? null,
    snapshotRow: businessSnapshotData?.[0] ?? null,
  });
  const normalizedCompanyIndustryAnalysis = normalizeCompanyIndustryAnalysis(
    (companyIndustryAnalysisData?.[0] as CompanyIndustryAnalysisRow | undefined) ?? null,
  );
  if (guidanceTrackingError) {
    console.error(`Unable to load guidance tracking for ${code}:`, guidanceTrackingError.message);
  }
  const guidanceItems = guidanceTrackingError
    ? []
    : normalizeGuidanceTrackingRows(
        (guidanceTrackingRows as GuidanceTrackingRow[] | null | undefined) ?? null,
      );
  const growthUpdatedAtRaw = normalizedGrowthOutlook?.updatedAtRaw ?? null;
  const growthUpdatedDate = growthUpdatedAtRaw ? new Date(growthUpdatedAtRaw) : null;
  const growthUpdatedAt =
    growthUpdatedDate && !Number.isNaN(growthUpdatedDate.getTime())
      ? new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(growthUpdatedDate)
      : null;
  const growthScore = normalizedGrowthOutlook?.growthScore ?? null;
  const businessSnapshotGeneratedAtShort = normalizedBusinessSnapshot?.generatedAtRaw
    ? (() => {
        const date = new Date(normalizedBusinessSnapshot.generatedAtRaw);
        if (Number.isNaN(date.getTime())) return null;
        return new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
        }).format(date);
      })()
    : null;
  const companyIndustryGeneratedAtShort = normalizedCompanyIndustryAnalysis?.generatedAtRaw
    ? (() => {
        const date = new Date(normalizedCompanyIndustryAnalysis.generatedAtRaw);
        if (Number.isNaN(date.getTime())) return null;
        return new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
        }).format(date);
      })()
    : null;
  const aboutCompany = normalizedBusinessSnapshot?.aboutCompany ?? null;
  const revenueBreakdown = normalizedBusinessSnapshot?.revenueBreakdown ?? null;
  const aboutHeading =
    aboutCompany?.aboutShort ?? normalizedBusinessSnapshot?.businessSummaryShort ?? null;
  const aboutSupportingText =
    aboutCompany?.businessActivity ??
    aboutCompany?.aboutLong ??
    normalizedBusinessSnapshot?.businessSummaryLong ??
    null;
  const hasStructuredBusinessSnapshot =
    Boolean(
      aboutHeading ||
        aboutSupportingText ||
        (revenueBreakdown?.bySegment.length ?? 0) > 0 ||
        (revenueBreakdown?.byProductOrService.length ?? 0) > 0,
    );
  const hasLegacyBusinessSnapshot =
    Boolean(
      normalizedBusinessSnapshot?.businessSummaryShort ||
      normalizedBusinessSnapshot?.businessSummaryLong ||
      normalizedBusinessSnapshot?.mixShiftSummary ||
      (normalizedBusinessSnapshot?.topRevenueDrivers.length ?? 0) > 0 ||
      (normalizedBusinessSnapshot?.keyDependencies.length ?? 0) > 0 ||
      (normalizedBusinessSnapshot?.keyRisksToModel.length ?? 0) > 0,
    );
  const hasBusinessSnapshotContent =
    hasStructuredBusinessSnapshot || hasLegacyBusinessSnapshot;
  const elevatedBlockClass =
    "rounded-xl border border-border/35 bg-background/75 shadow-md shadow-black/20";
  const elevatedMutedBlockClass =
    "rounded-xl border border-border/35 bg-muted/35 shadow-md shadow-black/20";
  const nestedDetailClass =
    "rounded-md border border-border/25 bg-background/45";
  const hasFutureGrowthDeepDive = Boolean(
    normalizedGrowthOutlook?.variantPerception ||
      normalizedGrowthOutlook?.scenarios?.base ||
      normalizedGrowthOutlook?.scenarios?.upside ||
      normalizedGrowthOutlook?.scenarios?.downside,
  );
  const sortRevenueEntries = (
    entries: Array<{ name: string; description: string | null; revenueSharePercent: number | null }>,
  ) =>
    [...entries].sort((a, b) => {
      if (a.revenueSharePercent == null && b.revenueSharePercent == null) return 0;
      if (a.revenueSharePercent == null) return 1;
      if (b.revenueSharePercent == null) return -1;
      return b.revenueSharePercent - a.revenueSharePercent;
    });

  const hasRevenueBreakdown =
    (revenueBreakdown?.bySegment.length ?? 0) > 0 ||
    (revenueBreakdown?.byProductOrService.length ?? 0) > 0;

  const renderRevenueBreakdownCard = ({
    title,
    entries,
    className,
  }: {
    title: string;
    entries: Array<{ name: string; description: string | null; revenueSharePercent: number | null }>;
    className?: string;
  }) => {
    if (entries.length === 0) return null;
    const sortedEntries = sortRevenueEntries(entries);
    const visibleEntries = sortedEntries.slice(0, 2);
    const extraEntries = sortedEntries.slice(2);
    return (
      <div className={`${elevatedBlockClass} min-w-0 p-3 ${className ?? ""}`}>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          {title}
        </p>
        <div className="mt-1.5 space-y-0">
          {visibleEntries.map((entry, idx) => (
            <div
              key={`${entry.name}-${idx}`}
              className={idx === 0 ? "py-2" : "border-t border-border/40 py-2"}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={`${idx === 0 ? "text-[15px]" : "text-sm"} font-medium text-foreground leading-snug`}>
                      {entry.name}
                    </p>
                    {idx === 0 && entry.revenueSharePercent != null && (
                      <span className="rounded-full border border-emerald-200/80 bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800 shrink-0 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                        Top disclosed
                      </span>
                    )}
                  </div>
                </div>
                {entry.revenueSharePercent != null && (
                  <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground shrink-0">
                    {formatPctLabel(entry.revenueSharePercent)}
                  </span>
                )}
              </div>
              {entry.description && (
                <p className={`mt-1 ${idx === 0 ? "text-[13px]" : "text-xs"} text-muted-foreground leading-relaxed line-clamp-2`}>
                  {entry.description}
                </p>
              )}
            </div>
          ))}
        </div>
        {extraEntries.length > 0 && (
          <details className="mt-2 border-t border-border/35 pt-2">
            <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
              Show more ({extraEntries.length})
            </summary>
            <div className="mt-2 space-y-2">
              {extraEntries.map((entry, idx) => (
                <div key={`${entry.name}-extra-${idx}`} className="border-l border-border/60 pl-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-medium text-foreground leading-snug">{entry.name}</p>
                    {entry.revenueSharePercent != null && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatPctLabel(entry.revenueSharePercent)}
                      </span>
                    )}
                  </div>
                  {entry.description && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{entry.description}</p>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  };
  const renderIndustryThemes = (
    title: string,
    items: NormalizedIndustryTheme[],
    accentClass: string,
  ) => {
    if (items.length === 0) return null;
    const leadItem = items[0];
    const extraItems = items.slice(1);

    return (
      <div className="min-w-0 rounded-xl border border-border/25 bg-background/55 p-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          {title}
        </p>
        <div className="mt-2 space-y-2.5">
          <div className={`space-y-1 border-l-2 pl-2.5 ${accentClass}`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[12px] font-semibold text-foreground leading-snug">{leadItem.theme}</p>
              {leadItem.timeHorizon && (
                <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground">
                  {leadItem.timeHorizon.replace(/_/g, " ")}
                </span>
              )}
            </div>
            {leadItem.whyItMattersForCompany && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {leadItem.whyItMattersForCompany}
              </p>
            )}
          </div>

          {extraItems.length > 0 && (
            <details className="border-t border-border/35 pt-2">
              <summary className="cursor-pointer list-none text-[10px] text-muted-foreground hover:text-foreground">
                Show more ({extraItems.length})
              </summary>
              <div className="mt-2 space-y-2">
                {extraItems.map((item, idx) => (
                  <div
                    key={`${title}-${item.theme}-extra-${idx}`}
                    className="space-y-0.5 border-t border-border/25 pt-2 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[12px] font-semibold text-foreground leading-snug">{item.theme}</p>
                      {item.timeHorizon && (
                        <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground">
                          {item.timeHorizon.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    {item.whyItMattersForCompany && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {item.whyItMattersForCompany}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  };
  const renderMissingSectionState = (
    sectionId: string,
    sectionTitle: string,
    description: string,
  ) => (
    <div className="rounded-xl border border-dashed border-border/50 bg-muted/35 p-5 shadow-md shadow-black/15">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {sectionTitle} is not ready yet for this company.
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <MissingSectionRequestButton
          companyCode={code}
          companyName={companyRow?.name ?? null}
          sectionId={sectionId}
          sectionTitle={sectionTitle}
          className="w-full sm:w-auto"
        />
      </div>
    </div>
  );
  const sidebarSections = [
    {
      ...SECTION_MAP.industryContext,
      meta:
        normalizedCompanyIndustryAnalysis?.subSector
          ? { kind: "text" as const, text: normalizedCompanyIndustryAnalysis.subSector }
          : normalizedCompanyIndustryAnalysis
            ? { kind: "text" as const, text: "Live" }
            : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.businessSnapshot,
      meta:
        hasBusinessSnapshotContent &&
        typeof normalizedBusinessSnapshot?.documentsProcessed === "number"
          ? {
              kind: "count" as const,
              count: normalizedBusinessSnapshot.documentsProcessed,
              suffix: "docs",
            }
          : hasBusinessSnapshotContent
            ? { kind: "text" as const, text: "Live" }
            : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.quarterlyScore,
      meta: { kind: "score" as const, score: latestQuarterData?.score ?? null },
    },
    {
      ...SECTION_MAP.futureGrowth,
      meta: normalizedGrowthOutlook
        ? { kind: "score" as const, score: growthScore }
        : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.guidanceHistory,
      meta:
        guidanceItems.length > 0
          ? { kind: "count" as const, count: guidanceItems.length, suffix: "items" }
          : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.community,
      meta: { kind: "text" as const, text: "Discuss" },
    },
  ];

  const toNumeric = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  let rankInfo: RankInfo = { quarter: null, growth: null };
  let sectorRankInfo: SectorRankInfo = null;
  let latestQuarterRowsGlobal: Array<{ company_code?: unknown; score?: unknown }> = [];

  // Quarter rank: latest global quarter across concall_analysis
  const { data: latestQuarterKey } = await supabase
    .from("concall_analysis")
    .select("fy, qtr")
    .order("fy", { ascending: false })
    .order("qtr", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestQuarterKey?.fy != null && latestQuarterKey?.qtr != null) {
    const { data: latestQuarterRows } = await supabase
      .from("concall_analysis")
      .select("company_code, score")
      .eq("fy", latestQuarterKey.fy)
      .eq("qtr", latestQuarterKey.qtr);

    latestQuarterRowsGlobal = (latestQuarterRows ?? []) as Array<{
      company_code?: unknown;
      score?: unknown;
    }>;

    const quarterRanked = assignCompetitionRanks(
      latestQuarterRowsGlobal
      .map((row) => ({
        companyCode: String((row as { company_code?: string }).company_code ?? "").toUpperCase(),
        score: toNumeric((row as { score?: unknown }).score),
      }))
      .filter((row) => row.companyCode && row.score != null)
      .sort((a, b) => {
        if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
        return a.companyCode.localeCompare(b.companyCode);
      }),
      (row) => row.score,
    );

    const quarterTotal = quarterRanked.length;
    const quarterRank =
      quarterRanked.find((row) => row.companyCode === code.toUpperCase())?.leaderboardRank ?? 0;
    if (quarterTotal > 0 && quarterRank > 0) {
      rankInfo = {
        ...rankInfo,
        quarter: {
          rank: quarterRank,
          total: quarterTotal,
          percentile: ((quarterTotal - quarterRank + 1) / quarterTotal) * 100,
        },
      };
    }
  }

  // Growth rank: latest row per company from growth_outlook
  const { data: growthRankRows } = await supabase
    .from("growth_outlook")
    .select("company, growth_score, base_growth_pct, run_timestamp")
    .order("run_timestamp", { ascending: false });

  const latestGrowthByCompany = new Map<string, { company: string; growthScore: number; base: number | null }>();
  (growthRankRows ?? []).forEach((row) => {
    const companyKey = String((row as { company?: string }).company ?? "").toUpperCase();
    if (!companyKey || latestGrowthByCompany.has(companyKey)) return;
    const growthScoreValue = toNumeric((row as { growth_score?: unknown }).growth_score);
    if (growthScoreValue == null) return;
    latestGrowthByCompany.set(companyKey, {
      company: companyKey,
      growthScore: growthScoreValue,
      base: toNumeric((row as { base_growth_pct?: unknown }).base_growth_pct),
    });
  });

  const growthRanked = assignCompetitionRanks(
    Array.from(latestGrowthByCompany.values()).sort((a, b) => {
      if (b.growthScore !== a.growthScore) return b.growthScore - a.growthScore;
      const aBase = a.base ?? Number.NEGATIVE_INFINITY;
      const bBase = b.base ?? Number.NEGATIVE_INFINITY;
      if (bBase !== aBase) return bBase - aBase;
      return a.company.localeCompare(b.company);
    }),
    (row) => row.growthScore,
  );

  const growthTotal = growthRanked.length;
  const growthKeys = [code.toUpperCase(), (companyName ?? "").toUpperCase()].filter(Boolean);
  const growthRank =
    growthRanked.find((row) => growthKeys.includes(row.company))?.leaderboardRank ?? 0;
  if (growthTotal > 0 && growthRank > 0) {
    rankInfo = {
      ...rankInfo,
      growth: {
        rank: growthRank,
        total: growthTotal,
        percentile: ((growthTotal - growthRank + 1) / growthTotal) * 100,
      },
    };
  }

  if (companySector) {
    const { data: sectorPeerRows } = await supabase
      .from("company")
      .select("code, name")
      .eq("sector", companySector);

    const sectorPeers = (sectorPeerRows ?? []) as Array<{ code?: string | null; name?: string | null }>;
    const sectorTotal = sectorPeers.length;

    if (sectorTotal > 0) {
      const latestQuarterByCode = new Map<string, number | null>();
      latestQuarterRowsGlobal.forEach((row) => {
        const companyCode = String(row.company_code ?? "").toUpperCase();
        if (!companyCode || latestQuarterByCode.has(companyCode)) return;
        latestQuarterByCode.set(companyCode, toNumeric(row.score));
      });

      const sectorPeerAvgRows = sectorPeers.map((peer) => {
        const peerCode = String(peer.code ?? "").toUpperCase();
        const peerName = String(peer.name ?? "").toUpperCase();
        const latestQuarterScore = latestQuarterByCode.get(peerCode) ?? null;
        const growthScore =
          latestGrowthByCompany.get(peerCode)?.growthScore ??
          latestGrowthByCompany.get(peerName)?.growthScore ??
          null;

        return {
          code: peerCode,
          name: String(peer.name ?? peer.code ?? "").trim() || peerCode,
          latestQuarterScore,
          growthScore,
          avgScore: computeAvgScore(latestQuarterScore, growthScore),
        };
      });

      const rankedSectorPeers = assignCompetitionRanks(
        sectorPeerAvgRows
          .filter((row) => row.avgScore != null)
          .sort((a, b) => {
            const avgCompare = compareNullableNumbers(a.avgScore, b.avgScore, "desc");
            if (avgCompare !== 0) return avgCompare;
            const latestCompare = compareNullableNumbers(
              a.latestQuarterScore,
              b.latestQuarterScore,
              "desc",
            );
            if (latestCompare !== 0) return latestCompare;
            const growthCompare = compareNullableNumbers(a.growthScore, b.growthScore, "desc");
            if (growthCompare !== 0) return growthCompare;
            return a.name.localeCompare(b.name);
          }),
        (row) => row.avgScore,
      );

      const sectorMatchKeys = [code.toUpperCase(), (companyName ?? "").toUpperCase()].filter(Boolean);
      const sectorRank =
        rankedSectorPeers.find((row) => sectorMatchKeys.includes(row.code))?.leaderboardRank ?? null;

      sectorRankInfo = {
        rank: sectorRank,
        total: sectorTotal,
      };
    }
  }

  const renderScenarioCard = (scenarioKey: "base" | "upside" | "downside") => {
    const scenario = normalizedGrowthOutlook?.scenarios?.[scenarioKey] as NormalizedGrowthScenario | null | undefined;
    if (!scenario) return null;
    const drivers = scenario.drivers;
    const risks = scenario.risks;
    const primaryDriver = (drivers[0] ?? "").trim();
    const primaryRisk = (risks[0] ?? "").trim();
    const fallbackDescription = (scenario.summary ?? "").trim();
    const growthValue = scenario.growth;
    const marginValue = scenario.ebitdaMargin;
    const accentClass =
      scenarioKey === "base"
        ? "border-l-emerald-500/70"
        : scenarioKey === "upside"
        ? "border-l-sky-500/70"
        : "border-l-amber-500/70";

    return (
      <div
        key={scenarioKey}
        className={`${elevatedBlockClass} p-3 space-y-2 border-l-2 ${accentClass}`}
      >
        <div className="flex items-center justify-between text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold uppercase tracking-wide">
            {scenarioKey} case
          </span>
          {typeof scenario.confidence === "number" && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
              {(scenario.confidence * 100).toFixed(0)}% conf
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {growthValue && (
            <span className="px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/35 dark:text-emerald-100 dark:border-emerald-700/40">
              Growth: {String(growthValue)}
            </span>
          )}
          {marginValue && (
            <span className="px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/35 dark:text-sky-100 dark:border-sky-700/40">
              EBITDA margin: {String(marginValue)}
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
            Quick takeaway
          </p>
          <div className="space-y-1">
            {primaryDriver ? (
              <p className="text-[11px] text-foreground leading-snug line-clamp-2">
                {primaryDriver}
              </p>
            ) : fallbackDescription ? (
              <p className="text-[11px] text-foreground leading-snug line-clamp-2">
                {fallbackDescription}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-snug">
                No primary driver provided.
              </p>
            )}
            {primaryRisk ? (
              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                Risk watch: {primaryRisk}
              </p>
            ) : !primaryDriver && !fallbackDescription ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                No primary risk provided.
              </p>
            ) : (
              <></>
            )}
          </div>
        </div>

        {(drivers.length > 1 || risks.length > 1) && (
          <details className={`group ${nestedDetailClass} px-2 py-1.5`}>
            <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground list-none">
              <span className="group-open:hidden">
                Show details ({Math.min(drivers.length, 2)} drivers, {Math.min(risks.length, 2)} risks)
              </span>
              <span className="hidden group-open:inline">Hide details</span>
            </summary>
            <div className="mt-2 space-y-2">
              {drivers.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold">
                    Drivers
                  </p>
                  <ul className="space-y-1">
                    {drivers.slice(0, 2).map((d, idx) => (
                      <li
                        key={idx}
                        className="text-[11px] text-foreground leading-snug rounded-sm border-l border-emerald-400/60 pl-2"
                      >
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {risks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-red-700 dark:text-red-300 font-semibold">
                    Risks
                  </p>
                  <ul className="space-y-1">
                    {risks.slice(0, 2).map((r, idx) => (
                      <li
                        key={idx}
                        className="text-[11px] text-foreground leading-snug rounded-sm border-l border-red-400/60 pl-2"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="flex w-full max-w-full gap-4 lg:gap-6 px-3 sm:px-4 lg:px-12 py-4 sm:py-6">
      <SidebarNavigation sections={sidebarSections} />

      {/* main content - 80% width */}
      <div
        id="main-content"
        className="flex-1 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      >
        <OverviewCard
          companyInfo={{
            code: companyRow?.code ?? code,
            name: companyRow?.name ?? undefined,
            sector: companySector,
            subSector: companySubSector,
            exchange: companyRow?.exchange ?? undefined,
            country: companyRow?.country ?? undefined,
            isNew: companyIsNew,
          }}
          rankInfo={rankInfo}
          sectorRankInfo={sectorRankInfo}
          action={
            <WatchlistButton
              companyCode={code}
              loginRedirectPath={`/company/${code}`}
              initialIsAuthenticated={Boolean(authenticatedUserId)}
              initialHasWatchlist={Boolean(firstWatchlist)}
              initialIsInWatchlist={isInFirstWatchlist}
              initialWatchlistName={firstWatchlist?.name ?? null}
            />
          }
        />

        <SectionCard
          id="industry-context"
          title="Industry Context"
          collapsible
          defaultOpen={false}
          headerAction={
            companyIndustryGeneratedAtShort ? (
              <span className="text-[11px] text-muted-foreground">
                {companyIndustryGeneratedAtShort}
              </span>
            ) : undefined
          }
        >
          {normalizedCompanyIndustryAnalysis ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/30 bg-background/75 p-4 shadow-md shadow-black/20 sm:p-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                  {normalizedCompanyIndustryAnalysis.subSector && (
                    <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
                      {normalizedCompanyIndustryAnalysis.subSector}
                    </span>
                  )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Industry summary
                    </p>
                  {normalizedCompanyIndustryAnalysis.industryPositioning?.industrySummary && (
                    <p className="max-w-5xl text-[15px] sm:text-[16px] font-medium leading-relaxed text-foreground">
                      {normalizedCompanyIndustryAnalysis.industryPositioning.industrySummary}
                    </p>
                  )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {normalizedCompanyIndustryAnalysis.industryPositioning?.whereThisCompanyFits && (
                      <div className="rounded-xl border border-border/20 bg-background/45 px-4 py-3 border-l-2 border-l-sky-400/60">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-foreground/70 font-semibold">
                          Where this company fits
                        </p>
                        <p className="mt-1.5 text-[12px] text-foreground leading-relaxed">
                          {normalizedCompanyIndustryAnalysis.industryPositioning.whereThisCompanyFits}
                        </p>
                      </div>
                    )}
                    {normalizedCompanyIndustryAnalysis.industryPositioning?.whyThisIndustryExists && (
                      <div className="rounded-xl border border-border/20 bg-background/45 px-4 py-3 border-l-2 border-l-amber-400/60">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-foreground/70 font-semibold">
                          Why this industry exists
                        </p>
                        <p className="mt-1.5 text-[12px] text-foreground leading-relaxed">
                          {normalizedCompanyIndustryAnalysis.industryPositioning.whyThisIndustryExists}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                {(normalizedCompanyIndustryAnalysis.valueChain ||
                  normalizedCompanyIndustryAnalysis.profitPools.length > 0) && (
                  <div className={`${elevatedBlockClass} p-4 space-y-4`}>
                    <div className="space-y-2.5">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                        Value chain
                      </p>
                      {normalizedCompanyIndustryAnalysis.valueChain?.companyRole && (
                        <p className="max-w-2xl text-[12px] text-foreground leading-relaxed">
                          {normalizedCompanyIndustryAnalysis.valueChain.companyRole}
                        </p>
                      )}
                    </div>

                    {normalizedCompanyIndustryAnalysis.profitPools.length > 0 && (
                      <div className="border-t border-border/35 pt-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                            Profit pools
                          </p>
                          {normalizedCompanyIndustryAnalysis.profitPools.length > 1 && (
                            <span className="text-[10px] text-muted-foreground">
                              {normalizedCompanyIndustryAnalysis.profitPools.length} pools
                            </span>
                          )}
                        </div>

                        {normalizedCompanyIndustryAnalysis.profitPools.length > 1 ? (
                          <Carousel opts={{ align: "start" }} className="w-full">
                            <CarouselContent>
                              {normalizedCompanyIndustryAnalysis.profitPools.map((pool, idx) => (
                                <CarouselItem key={`${pool.pool}-${idx}`} className="basis-full">
                                  <div className={`${nestedDetailClass} h-full p-3.5 space-y-2.5`}>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="text-[12px] font-semibold text-foreground">{pool.pool}</p>
                                      {pool.companyExposure && (
                                        <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground">
                                          Exposure: {pool.companyExposure}
                                        </span>
                                      )}
                                    </div>
                                    {pool.whoCapturesIt && (
                                      <p className="text-[11px] text-foreground/90 leading-relaxed">
                                        Captured by: {pool.whoCapturesIt}
                                      </p>
                                    )}
                                    {pool.whyItIsProfitable && (
                                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        {pool.whyItIsProfitable}
                                      </p>
                                    )}
                                  </div>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <div className="mt-2 flex justify-center gap-2">
                              <CarouselPrevious className="static translate-x-0 translate-y-0 border border-border bg-background text-foreground hover:bg-accent" />
                              <CarouselNext className="static translate-x-0 translate-y-0 border border-border bg-background text-foreground hover:bg-accent" />
                            </div>
                          </Carousel>
                        ) : (
                          <div className={`${nestedDetailClass} p-3.5 space-y-2.5`}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-[12px] font-semibold text-foreground">
                                {normalizedCompanyIndustryAnalysis.profitPools[0]?.pool}
                              </p>
                              {normalizedCompanyIndustryAnalysis.profitPools[0]?.companyExposure && (
                                <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground">
                                  Exposure: {normalizedCompanyIndustryAnalysis.profitPools[0].companyExposure}
                                </span>
                              )}
                            </div>
                            {normalizedCompanyIndustryAnalysis.profitPools[0]?.whoCapturesIt && (
                              <p className="text-[11px] text-foreground/90 leading-relaxed">
                                Captured by: {normalizedCompanyIndustryAnalysis.profitPools[0].whoCapturesIt}
                              </p>
                            )}
                            {normalizedCompanyIndustryAnalysis.profitPools[0]?.whyItIsProfitable && (
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {normalizedCompanyIndustryAnalysis.profitPools[0].whyItIsProfitable}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(normalizedCompanyIndustryAnalysis.tailwinds.length > 0 ||
                  normalizedCompanyIndustryAnalysis.headwinds.length > 0) && (
                  <div className={`${elevatedBlockClass} p-4 space-y-4`}>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                      Tailwinds & Headwinds
                    </p>
                    <div className="space-y-3">
                      {renderIndustryThemes(
                        "Tailwinds",
                        normalizedCompanyIndustryAnalysis.tailwinds,
                        "border-l-emerald-500/70",
                      )}
                      {renderIndustryThemes(
                        "Headwinds",
                        normalizedCompanyIndustryAnalysis.headwinds,
                        "border-l-red-500/70",
                      )}
                    </div>
                  </div>
                )}
              </div>

              {normalizedCompanyIndustryAnalysis.sourceUrls.length > 0 && (
                <details className={`${nestedDetailClass} px-3 py-2`}>
                  <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
                    Sources ({normalizedCompanyIndustryAnalysis.sourceUrls.length})
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {normalizedCompanyIndustryAnalysis.sourceUrls.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-foreground underline underline-offset-2 break-all"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ) : (
            renderMissingSectionState(
              "industry-context",
              "Industry Context",
              "We have not generated company-specific industry context for this company yet.",
            )
          )}
        </SectionCard>

        <SectionCard
          id="business-overview"
          title="Business Snapshot"
          collapsible
          defaultOpen={false}
          headerAction={
            businessSnapshotGeneratedAtShort ? (
              <span className="text-[11px] text-muted-foreground">
                {businessSnapshotGeneratedAtShort}
              </span>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border/40 bg-muted/15 p-3 sm:p-4 shadow-md shadow-black/20">
              <div className="flex flex-col gap-3">
                {normalizedBusinessSnapshot ? (
                  <>
                    {hasStructuredBusinessSnapshot ? (
                      <div
                        className={`grid grid-cols-1 gap-3 ${
                          aboutHeading || aboutSupportingText
                            ? "lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.95fr)] lg:items-start"
                            : ""
                        }`}
                      >
                        {(aboutHeading || aboutSupportingText) && (
                          <div className="min-w-0 space-y-1">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              About
                            </p>
                            {aboutHeading && (
                              <p className="max-w-4xl text-[17px] sm:text-[19px] font-semibold text-foreground leading-snug">
                                {aboutHeading}
                              </p>
                            )}
                            {aboutSupportingText && (
                              <p className="max-w-3xl text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
                                {aboutSupportingText}
                              </p>
                            )}
                          </div>
                        )}

                        {hasRevenueBreakdown && (
                          <div className="min-w-0">
                            <div className="rounded-2xl border border-border/30 bg-muted/20 p-2.5 shadow-md shadow-black/15">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                Revenue Breakdown
                              </p>
                              <div className="mt-1.5 space-y-2.5">
                                {renderRevenueBreakdownCard({
                                  title: "By Segment",
                                  entries: revenueBreakdown?.bySegment ?? [],
                                  className: "",
                                })}
                                {renderRevenueBreakdownCard({
                                  title: "By Product / Service",
                                  entries: revenueBreakdown?.byProductOrService ?? [],
                                  className: "",
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : hasLegacyBusinessSnapshot ? (
                      <>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            {normalizedBusinessSnapshot.businessSummaryShort ||
                            normalizedBusinessSnapshot.businessSummaryLong ? (
                              <div className={`${elevatedBlockClass} p-3 space-y-2`}>
                                {normalizedBusinessSnapshot.businessSummaryShort && (
                                  <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                                    {normalizedBusinessSnapshot.businessSummaryShort}
                                  </p>
                                )}
                                {normalizedBusinessSnapshot.businessSummaryLong && (
                                  <p className="text-sm text-muted-foreground leading-relaxed sm:line-clamp-3 xl:line-clamp-2">
                                    {normalizedBusinessSnapshot.businessSummaryLong}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No business snapshot summary available yet.
                              </p>
                            )}
                          </div>
                        </div>

                        {(normalizedBusinessSnapshot.topRevenueDrivers.length > 0 ||
                          normalizedBusinessSnapshot.keyDependencies.length > 0 ||
                          normalizedBusinessSnapshot.keyRisksToModel.length > 0) && (
                          <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
                            {normalizedBusinessSnapshot.topRevenueDrivers.length > 0 && (
                              <div className={`${elevatedBlockClass} p-3 xl:col-span-2`}>
                                <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                                  Top Revenue Drivers
                                </p>
                                <ul className="mt-2 space-y-0.5">
                                  {normalizedBusinessSnapshot.topRevenueDrivers.map((driver, idx) => (
                                    <li
                                      key={idx}
                                      className="text-xs text-foreground leading-snug border-l border-border/70 pl-2"
                                    >
                                      {driver}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {(normalizedBusinessSnapshot.keyDependencies.length > 0 ||
                              normalizedBusinessSnapshot.keyRisksToModel.length > 0) && (
                              <div className={`${elevatedBlockClass} p-3 xl:col-span-3`}>
                                <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                                  Model Watchpoints
                                </p>
                                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                  {normalizedBusinessSnapshot.keyDependencies.length > 0 && (
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                                        Dependencies
                                      </p>
                                      <ul className="mt-1.5 space-y-0.5">
                                        {normalizedBusinessSnapshot.keyDependencies.map((dependency, idx) => (
                                          <li
                                            key={idx}
                                            className="text-xs text-foreground leading-snug border-l border-amber-400/50 pl-1.5"
                                          >
                                            {dependency}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {normalizedBusinessSnapshot.keyRisksToModel.length > 0 && (
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                                        Risks
                                      </p>
                                      <ul className="mt-1.5 space-y-0.5">
                                        {normalizedBusinessSnapshot.keyRisksToModel.map((risk, idx) => (
                                          <li
                                            key={idx}
                                            className="text-xs text-foreground leading-snug border-l border-red-400/50 pl-1.5"
                                          >
                                            {risk}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {normalizedBusinessSnapshot.mixShiftSummary && (
                          <div className="rounded-xl border border-sky-200/40 bg-sky-50/40 p-3 shadow-md shadow-black/15 space-y-0.5 dark:border-sky-700/30 dark:bg-sky-950/10">
                            <p className="text-[10px] uppercase tracking-wide text-sky-700 dark:text-sky-300 font-semibold">
                              Mix Shift
                            </p>
                            <p className="text-xs text-foreground/90 leading-relaxed">
                              {normalizedBusinessSnapshot.mixShiftSummary}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      renderMissingSectionState(
                        "business-overview",
                        "Business Snapshot",
                        "We have not generated a usable business snapshot for this company yet.",
                      )
                    )}
                  </>
                ) : (
                  renderMissingSectionState(
                    "business-overview",
                    "Business Snapshot",
                    "We have not generated a usable business snapshot for this company yet.",
                  )
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard id="sentiment-score" title="Quarterly Score">
          <QuarterlyScoreSection
            chartData={chartData}
            detailQuarters={detailQuarters}
            trend={trend}
          />
        </SectionCard>

        <SectionCard
          id="future-growth"
          title="Future Growth Prospects"
          headerAction={
            typeof growthScore === "number" ? <ConcallScore score={growthScore} size="sm" /> : undefined
          }
        >
          {normalizedGrowthOutlook ? (
            <div className="flex flex-col gap-4">
              {normalizedGrowthOutlook.summaryBullets.length > 0 && (
                <div className={`${elevatedMutedBlockClass} p-3 space-y-2`}>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                        Summary
                      </p>
                      {growthUpdatedAt && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-foreground border border-border/60 text-[10px]">
                          Updated: {growthUpdatedAt}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {normalizedGrowthOutlook.summaryBullets.slice(0, 5).map((bullet, idx) => (
                        <li key={idx} className="text-[11px] text-foreground leading-snug">
                          • {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {normalizedGrowthOutlook.catalysts.length > 0 && (
                  <div className={`${elevatedMutedBlockClass} p-3 space-y-2`}>
                    <p className="text-[11px] uppercase tracking-wide text-foreground/90 font-semibold">
                      Top 3 Growth Catalysts
                    </p>
                    <Carousel opts={{ align: "start" }} className="w-full">
                      <CarouselContent>
                        {normalizedGrowthOutlook.catalysts.slice(0, 3).map((c, idx) => {
                          const timelineItems = c.timelineItems;
                          const remainingTimelineItems = timelineItems.slice(2);
                          const hasTimelineDetails = remainingTimelineItems.length > 0;
                          return (
                            <CarouselItem key={idx} className="basis-full md:basis-1/2 xl:basis-1/3">
                              <div
                                className={`h-full rounded-xl border border-border/35 bg-background/75 p-3 shadow-md shadow-black/20 space-y-2 ${
                                  c.expectedImpact === "revenue"
                                    ? "border-l-2 border-l-emerald-500/70"
                                    : c.expectedImpact === "margin"
                                    ? "border-l-2 border-l-sky-500/70"
                                    : "border-l-2 border-l-amber-500/70"
                                }`}
                              >
                                {c.catalyst && (
                                  <p className="text-sm font-semibold text-foreground leading-snug">
                                    {c.catalyst}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                  {c.type && (
                                    <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-200 dark:border-blue-700/40">
                                      {c.type}
                                    </span>
                                  )}
                                  {c.expectedImpact && (
                                    <span className="px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-100 dark:border-emerald-700/40">
                                      Impact: {c.expectedImpact}
                                    </span>
                                  )}
                                </div>

                                {timelineItems.length > 0 && (
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                                      Timeline
                                    </p>
                                    <div className="relative pl-4 before:content-[''] before:absolute before:left-[3px] before:top-1 before:bottom-1 before:w-px before:bg-border/80">
                                      <ul className="space-y-2">
                                        {timelineItems.slice(0, 2).map((t, tIdx) => {
                                          const stageMeta = getTimelineStageDisplay(t.stage);
                                          const period = t.period ?? "";
                                          const source = t.source ?? "";
                                          const quote = t.quote ?? "";
                                          const delta = t.delta ?? "";
                                          return (
                                            <li
                                              key={`${idx}-timeline-primary-${tIdx}`}
                                              className="relative pl-3 space-y-1 border-l border-border/60 ml-1"
                                            >
                                              <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-muted-foreground" />
                                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                                <span
                                                  className={`px-2 py-0.5 rounded-full uppercase tracking-wide ${stageMeta.className}`}
                                                >
                                                  {stageMeta.label}
                                                </span>
                                                {(period || source) && (
                                                  <span className="text-muted-foreground">
                                                    {period}
                                                    {period && source ? " · " : ""}
                                                    {source}
                                                  </span>
                                                )}
                                              </div>
                                              {quote && (
                                                <p className="text-[11px] text-foreground leading-snug">
                                                  {quote}
                                                </p>
                                              )}
                                              {delta && (
                                                <p className="text-[10px] text-muted-foreground leading-snug">
                                                  {delta}
                                                </p>
                                              )}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  </div>
                                )}

                                {hasTimelineDetails && (
                                  <details className={`${nestedDetailClass} px-3 py-2`}>
                                    <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
                                      Show full timeline ({timelineItems.length})
                                    </summary>
                                    <div className="mt-3 space-y-3">
                                      <div className="relative pl-4 before:content-[''] before:absolute before:left-[3px] before:top-1 before:bottom-1 before:w-px before:bg-border/80">
                                        <ul className="space-y-2">
                                          {remainingTimelineItems.map((t, tIdx) => {
                                            const stageMeta = getTimelineStageDisplay(t.stage);
                                            const period = t.period ?? "";
                                            const source = t.source ?? "";
                                            const quote = t.quote ?? "";
                                            const delta = t.delta ?? "";
                                            return (
                                              <li
                                                key={`${idx}-timeline-extra-${tIdx}`}
                                                className="relative pl-3 space-y-1 border-l border-border/60 ml-1"
                                              >
                                                <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-muted-foreground" />
                                                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                                  <span
                                                    className={`px-2 py-0.5 rounded-full uppercase tracking-wide ${stageMeta.className}`}
                                                  >
                                                    {stageMeta.label}
                                                  </span>
                                                  {(period || source) && (
                                                    <span className="text-muted-foreground">
                                                      {period}
                                                      {period && source ? " · " : ""}
                                                      {source}
                                                    </span>
                                                  )}
                                                </div>
                                                {quote && (
                                                  <p className="text-[11px] text-foreground leading-snug">
                                                    {quote}
                                                  </p>
                                                )}
                                                {delta && (
                                                  <p className="text-[10px] text-muted-foreground leading-snug">
                                                    {delta}
                                                  </p>
                                                )}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    </div>
                                  </details>
                                )}
                              </div>
                            </CarouselItem>
                          );
                        })}
                      </CarouselContent>
                      <div className="flex justify-center gap-2 mt-2">
                        <CarouselPrevious className="static translate-x-0 translate-y-0 border border-border bg-background text-foreground hover:bg-accent" />
                        <CarouselNext className="static translate-x-0 translate-y-0 border border-border bg-background text-foreground hover:bg-accent" />
                      </div>
                    </Carousel>
                  </div>
                )}
              {hasFutureGrowthDeepDive && (
                <details className={`group ${nestedDetailClass} px-3 py-2.5`}>
                  <summary className="list-none cursor-pointer">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/90">
                          See more about future growth
                        </p>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          Open detailed variant perception and scenario analysis.
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        <span className="group-open:hidden">Open</span>
                        <span className="hidden group-open:inline">Hide</span>
                      </span>
                    </div>
                  </summary>

                  <div className="mt-3 space-y-3">
                    {normalizedGrowthOutlook.variantPerception && (
                      <div className={`${elevatedMutedBlockClass} p-3 space-y-2.5`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] uppercase tracking-wide text-foreground/90 font-semibold">
                            Variant perception
                          </p>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            Non-consensus view
                          </span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                          <div className={`${elevatedBlockClass} p-2.5 space-y-1.5 border-l-2 border-l-slate-400/70`}>
                            <span className="inline-flex text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                              Consensus
                            </span>
                            {normalizedGrowthOutlook.variantPerception.consensus ? (
                              <p className="text-[11px] text-foreground leading-snug">
                                {normalizedGrowthOutlook.variantPerception.consensus}
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground leading-snug">No consensus note.</p>
                            )}
                          </div>

                          <div className={`${elevatedBlockClass} p-2.5 space-y-1.5 border-l-2 border-l-emerald-500/70`}>
                            <span className="inline-flex text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200 dark:border-emerald-700/40">
                              Upside
                            </span>
                            {normalizedGrowthOutlook.variantPerception.upside.length > 0 ? (
                              <div className="space-y-1.5">
                                <ul className="space-y-1.5">
                                  <li className="relative pl-3 text-[11px] text-foreground leading-snug">
                                    <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
                                    {normalizedGrowthOutlook.variantPerception.upside[0]}
                                  </li>
                                </ul>
                                {normalizedGrowthOutlook.variantPerception.upside.length > 1 && (
                                  <details className="group">
                                    <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground list-none">
                                      <span className="group-open:hidden">
                                        Show more ({normalizedGrowthOutlook.variantPerception.upside.length - 1})
                                      </span>
                                      <span className="hidden group-open:inline">Hide extras</span>
                                    </summary>
                                    <ul className="mt-1.5 space-y-1.5">
                                      {normalizedGrowthOutlook.variantPerception.upside
                                        .slice(1)
                                        .map((x, idx) => (
                                          <li
                                            key={idx}
                                            className="relative pl-3 text-[11px] text-foreground leading-snug"
                                          >
                                            <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                                            {x}
                                          </li>
                                        ))}
                                    </ul>
                                  </details>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground leading-snug">No upside variants.</p>
                            )}
                          </div>

                          <div className={`${elevatedBlockClass} p-2.5 space-y-1.5 border-l-2 border-l-red-500/70`}>
                            <span className="inline-flex text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-red-200 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700/40">
                              Downside
                            </span>
                            {normalizedGrowthOutlook.variantPerception.downside.length > 0 ? (
                              <div className="space-y-1.5">
                                <ul className="space-y-1.5">
                                  <li className="relative pl-3 text-[11px] text-foreground leading-snug">
                                    <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500/70" />
                                    {normalizedGrowthOutlook.variantPerception.downside[0]}
                                  </li>
                                </ul>
                                {normalizedGrowthOutlook.variantPerception.downside.length > 1 && (
                                  <details className="group">
                                    <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground list-none">
                                      <span className="group-open:hidden">
                                        Show more ({normalizedGrowthOutlook.variantPerception.downside.length - 1})
                                      </span>
                                      <span className="hidden group-open:inline">Hide extras</span>
                                    </summary>
                                    <ul className="mt-1.5 space-y-1.5">
                                      {normalizedGrowthOutlook.variantPerception.downside
                                        .slice(1)
                                        .map((x, idx) => (
                                          <li
                                            key={idx}
                                            className="relative pl-3 text-[11px] text-foreground leading-snug"
                                          >
                                            <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500/60" />
                                            {x}
                                          </li>
                                        ))}
                                    </ul>
                                  </details>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground leading-snug">No downside variants.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {(["base", "upside", "downside"] as const).map((scenarioKey) =>
                        renderScenarioCard(scenarioKey)
                      )}
                    </div>
                  </div>
                </details>
              )}

            </div>
          ) : (
            renderMissingSectionState(
              "future-growth",
              "Future Growth Prospects",
              "We have not generated forward growth outlook analysis for this company yet.",
            )
          )}
        </SectionCard>

        <SectionCard
          id="guidance-history"
          title="Guidance History"
          headerAction={
            <span className="text-[11px] text-muted-foreground">
              {guidanceItems.length > 0 ? `${guidanceItems.length} tracked` : "Not ready"}
            </span>
          }
        >
          {guidanceItems.length > 0 ? (
            <GuidanceHistorySection items={guidanceItems} />
          ) : (
            renderMissingSectionState(
              "guidance-history",
              "Guidance History",
              "We have not tracked meaningful management guidance for this company yet.",
            )
          )}
        </SectionCard>

        <SectionCard id="community" title="Community">
          <CompanyCommentsSection companyCode={code} />
        </SectionCard>
      </div>
    </div>
  );
}
