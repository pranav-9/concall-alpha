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
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import type {
  NormalizedIndustryRegulatoryChange,
  CompanyIndustryAnalysisRow,
  NormalizedIndustryTheme,
} from "@/lib/company-industry-analysis/types";
import type {
  NormalizedRevenueBreakdownItem,
  NormalizedRevenueSplitHistoryRow,
  NormalizedSegmentGrowthCagr3yRow,
} from "@/lib/business-snapshot/types";
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

const formatCompactLabel = (value: string) => value.replace(/_/g, " ").trim();

const formatRangeLabel = (start: string | null, end: string | null) => {
  if (start && end) return `${start} -> ${end}`;
  return start ?? end ?? null;
};

const extractSortNumber = (value: string | null | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const matches = value.match(/\d{2,4}/g);
  if (!matches?.length) return Number.NEGATIVE_INFINITY;
  const raw = matches[matches.length - 1];
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const getMarginProfileDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "higher":
      return {
        label: "Higher margin",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "medium":
      return {
        label: "Medium margin",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "lower":
      return {
        label: "Lower margin",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    case "unknown":
      return {
        label: "Margin unknown",
        className: "border-border/60 bg-muted/60 text-foreground",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getImpactDirectionDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "positive":
    case "favorable":
      return {
        label: "Positive",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "negative":
    case "adverse":
      return {
        label: "Negative",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    case "mixed":
      return {
        label: "Mixed",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "neutral":
      return {
        label: "Neutral",
        className: "border-border/60 bg-muted/60 text-foreground",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getTimeHorizonDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "long_term":
    case "long term":
      return {
        label: "Long term",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "short_term":
    case "short term":
      return {
        label: "Short term",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "medium_term":
    case "medium term":
      return {
        label: "Medium term",
        className:
          "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

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
      "company, generated_at, sector, sub_sector, industry_positioning, regulatory_changes, tailwinds, headwinds, sources, details",
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

  const { data: moatAnalysisData } = await supabase
    .from("moat_analysis")
    .select(
      "id, company_code, company_name, industry, rating, trajectory, trajectory_direction, porter_summary, porter_verdict, moats, quantitative, durability, risks, created_at, updated_at",
    )
    .eq("company_code", code)
    .limit(1);

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
  const normalizedMoatAnalysis = normalizeMoatAnalysis(
    (moatAnalysisData?.[0] as MoatAnalysisRow | undefined) ?? null,
  );
  const moatThesis =
    normalizedMoatAnalysis?.porterVerdict ??
    normalizedMoatAnalysis?.durability ??
    normalizedMoatAnalysis?.moatPillars.find(
      (pillar) => pillar.present && pillar.evidence,
    )?.evidence ??
    null;
  const moatGeneratedAtShort = normalizedMoatAnalysis?.updatedAtRaw
    ? (() => {
        const date = new Date(normalizedMoatAnalysis.updatedAtRaw);
        if (Number.isNaN(date.getTime())) return null;
        return new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
        }).format(date);
      })()
    : null;
  const moatPresentPillars =
    normalizedMoatAnalysis?.moatPillars.filter((pillar) => pillar.present) ?? [];
  const moatAbsentPillars =
    normalizedMoatAnalysis?.moatPillars.filter((pillar) => !pillar.present) ?? [];
  const moatTotalPillars = normalizedMoatAnalysis?.moatPillars.length ?? 0;
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
  const historicalEconomics = normalizedBusinessSnapshot?.historicalEconomics ?? null;
  const aboutHeading =
    aboutCompany?.aboutShort ?? normalizedBusinessSnapshot?.businessSummaryShort ?? null;
  const aboutSupportingText =
    aboutCompany?.aboutLong ?? normalizedBusinessSnapshot?.businessSummaryLong ?? null;
  const hasHistoricalEconomics = Boolean(
    historicalEconomics?.companyRevenueCagr3y ||
      (historicalEconomics?.revenueSplitHistory.length ?? 0) > 0 ||
      (historicalEconomics?.segmentGrowthCagr3y.length ?? 0) > 0,
  );
  const hasStructuredBusinessSnapshot =
    Boolean(
      aboutHeading ||
        aboutSupportingText ||
        hasHistoricalEconomics ||
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
  const snapshotSubsectionClass =
    "rounded-xl border border-border/20 bg-background/25";
  const hasFutureGrowthDeepDive = Boolean(
    normalizedGrowthOutlook?.variantPerception ||
      normalizedGrowthOutlook?.scenarios?.base ||
      normalizedGrowthOutlook?.scenarios?.upside ||
      normalizedGrowthOutlook?.scenarios?.downside,
  );
  const sortRevenueEntries = (
    entries: NormalizedRevenueBreakdownItem[],
  ) =>
    [...entries].sort((a, b) => {
      if (a.revenueSharePercent == null && b.revenueSharePercent == null) return 0;
      if (a.revenueSharePercent == null) return 1;
      if (b.revenueSharePercent == null) return -1;
      return b.revenueSharePercent - a.revenueSharePercent;
    });

  const hasBusinessSegments = (revenueBreakdown?.bySegment.length ?? 0) > 0;

  const renderBusinessSnapshotDrawer = ({
    title,
    preview,
    children,
  }: {
    title: string;
    preview: string;
    children: React.ReactNode;
  }) => (
    <details className={`group/business-snapshot-drawer ${elevatedMutedBlockClass}`}>
      <summary className="list-none cursor-pointer px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
              {title}
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground">{preview}</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 text-[10px] font-medium text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
            <span className="group-open/business-snapshot-drawer:hidden">Show more</span>
            <span className="hidden group-open/business-snapshot-drawer:inline">
              Hide details
            </span>
          </span>
        </div>
      </summary>
      <div className="border-t border-border/40 px-4 py-3">{children}</div>
    </details>
  );

  const renderRevenueBreakdownCard = ({
    title,
    entries,
    className,
    useGrid = false,
  }: {
    title: string;
    entries: NormalizedRevenueBreakdownItem[];
    className?: string;
    useGrid?: boolean;
  }) => {
    if (entries.length === 0) return null;
    const sortedEntries = sortRevenueEntries(entries);
    const visibleLimit = useGrid ? 4 : 2;
    const visibleEntries = sortedEntries.slice(0, visibleLimit);
    const extraEntries = sortedEntries.slice(visibleLimit);

    const renderRevenueEntry = (
      entry: NormalizedRevenueBreakdownItem,
      idx: number,
      variant: "visible" | "extra",
    ) => {
      const marginProfileDisplay = getMarginProfileDisplay(entry.marginProfile);
      const isVisible = variant === "visible";

      if (useGrid) {
        return (
          <div
            key={`${entry.name}-${variant}-${idx}`}
            className={`${snapshotSubsectionClass} h-full p-3`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-medium text-foreground leading-snug">
                    {entry.name}
                  </p>
                  {marginProfileDisplay && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${marginProfileDisplay.className}`}
                    >
                      {marginProfileDisplay.label}
                    </span>
                  )}
                </div>
                {entry.description && (
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {entry.description}
                  </p>
                )}
                {entry.marginProfileNote && (
                  <p className="text-[11px] text-muted-foreground/90 leading-relaxed">
                    {entry.marginProfileNote}
                  </p>
                )}
              </div>
              {entry.revenueSharePercent != null && (
                <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground shrink-0">
                  {formatPctLabel(entry.revenueSharePercent)}
                </span>
              )}
            </div>
          </div>
        );
      }

      return (
        <div
          key={`${entry.name}-${variant}-${idx}`}
          className={
            isVisible
              ? idx === 0
                ? "py-2"
                : "border-t border-border/40 py-2"
              : "border-l border-border/60 pl-2"
          }
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p
                  className={`${
                    isVisible ? (idx === 0 ? "text-[15px]" : "text-sm") : "text-[11px]"
                  } font-medium text-foreground leading-snug`}
                >
                  {entry.name}
                </p>
                {marginProfileDisplay && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${marginProfileDisplay.className}`}
                  >
                    {marginProfileDisplay.label}
                  </span>
                )}
              </div>
              {entry.description && (
                <p
                  className={`${
                    isVisible ? (idx === 0 ? "text-[13px]" : "text-xs") : "text-[11px]"
                  } text-muted-foreground leading-relaxed`}
                >
                  {entry.description}
                </p>
              )}
              {entry.marginProfileNote && (
                <p
                  className={`${
                    isVisible ? "text-[11px]" : "text-[10px]"
                  } text-muted-foreground/90 leading-relaxed`}
                >
                  {entry.marginProfileNote}
                </p>
              )}
            </div>
            {entry.revenueSharePercent != null && (
              <span
                className={`${
                  isVisible
                    ? "rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground"
                    : "text-[10px] text-muted-foreground"
                } shrink-0`}
              >
                {formatPctLabel(entry.revenueSharePercent)}
              </span>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className={`${snapshotSubsectionClass} min-w-0 p-3 ${className ?? ""}`}>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          {title}
        </p>
        <div className={useGrid ? "mt-1.5 grid grid-cols-1 gap-2 lg:grid-cols-2" : "mt-1.5 space-y-0"}>
          {visibleEntries.map((entry, idx) => renderRevenueEntry(entry, idx, "visible"))}
        </div>
        {extraEntries.length > 0 && (
          <details className="mt-2 border-t border-border/35 pt-2">
            <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
              Show more ({extraEntries.length})
            </summary>
            <div className={useGrid ? "mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2" : "mt-2 space-y-2"}>
              {extraEntries.map((entry, idx) => renderRevenueEntry(entry, idx, "extra"))}
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderBusinessSegmentsDrawer = () => {
    if (!hasBusinessSegments) return null;
    const bySegmentCount = revenueBreakdown?.bySegment.length ?? 0;
    const preview =
      bySegmentCount > 0
        ? `${bySegmentCount} segment bucket${bySegmentCount === 1 ? "" : "s"}`
        : "Open segment mix and margins.";

    return renderBusinessSnapshotDrawer({
      title: "Business Segments",
      preview,
      children: (
        <div className="space-y-3">
          {renderRevenueBreakdownCard({
            title: "By Segment",
            entries: revenueBreakdown?.bySegment ?? [],
            className: "",
            useGrid: true,
          })}
        </div>
      ),
    });
  };

  const renderHistoricalEconomicsCard = (
    history: NonNullable<typeof historicalEconomics>,
  ) => {
    const companyRevenueCagr = history.companyRevenueCagr3y;
    const hasCompanyRevenueCagr = Boolean(
      companyRevenueCagr &&
        (companyRevenueCagr.cagrPercent != null ||
          companyRevenueCagr.startYear ||
          companyRevenueCagr.endYear ||
          companyRevenueCagr.scope ||
          companyRevenueCagr.basis),
    );
    const revenueSplitRows = [...history.revenueSplitHistory].sort(
      (a, b) => extractSortNumber(b.year) - extractSortNumber(a.year),
    );
    const visibleRevenueSplitRows = revenueSplitRows.slice(0, 2);
    const extraRevenueSplitRows = revenueSplitRows.slice(2);
    const segmentGrowthRows = [...history.segmentGrowthCagr3y].sort((a, b) =>
      compareNullableNumbers(a.cagrPercent, b.cagrPercent, "desc"),
    );
    const hasSegmentGrowth = segmentGrowthRows.length > 0;
    const hasRevenueSplitHistory = revenueSplitRows.length > 0;
    const historicalMetaColumn = hasCompanyRevenueCagr || hasSegmentGrowth;
    const preview =
      [
        companyRevenueCagr?.cagrPercent != null
          ? `${formatPctLabel(companyRevenueCagr.cagrPercent)} company CAGR`
          : hasCompanyRevenueCagr
            ? "Company CAGR tracked"
            : null,
        hasRevenueSplitHistory
          ? `${revenueSplitRows.length} split year${revenueSplitRows.length === 1 ? "" : "s"}`
          : null,
        hasSegmentGrowth
          ? `${segmentGrowthRows.length} segment CAGR row${segmentGrowthRows.length === 1 ? "" : "s"}`
          : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" · ") || "Open company economics history.";

    if (!historicalMetaColumn && !hasRevenueSplitHistory) return null;

    const renderRevenueSplitRow = (
      row: NormalizedRevenueSplitHistoryRow,
      key: string,
    ) => (
      <div key={key} className={`${snapshotSubsectionClass} p-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold text-foreground">
              {row.year ?? "Period"}
            </p>
            {row.basis && (
              <span className="text-[10px] text-muted-foreground">
                {formatCompactLabel(row.basis)}
              </span>
            )}
          </div>
        </div>
        {row.buckets.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {row.buckets.map((bucket) => (
              <span
                key={`${key}-${bucket.name}`}
                className="rounded-full border border-border/55 bg-background/70 px-2 py-0.5 text-[10px] text-foreground"
              >
                {bucket.name}
                {bucket.revenueSharePercent != null
                  ? ` ${formatPctLabel(bucket.revenueSharePercent)}`
                  : ""}
              </span>
            ))}
          </div>
        )}
        {row.comparabilityNote && (
          <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
            {row.comparabilityNote}
          </p>
        )}
      </div>
    );

    return renderBusinessSnapshotDrawer({
      title: "Historical Economics",
      preview,
      children: (
        <div
          className={`grid grid-cols-1 gap-3 ${
            historicalMetaColumn && hasRevenueSplitHistory
              ? "xl:grid-cols-[minmax(17rem,0.9fr)_minmax(0,1.1fr)]"
              : ""
          }`}
        >
          {historicalMetaColumn && (
            <div className="space-y-3">
              {hasCompanyRevenueCagr && companyRevenueCagr && (
                <div className={`${snapshotSubsectionClass} p-3`}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Company Revenue CAGR (3Y)
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    {companyRevenueCagr.cagrPercent != null && (
                      <p className="text-[22px] font-semibold leading-none text-foreground">
                        {formatPctLabel(companyRevenueCagr.cagrPercent)}
                      </p>
                    )}
                    {formatRangeLabel(
                      companyRevenueCagr.startYear,
                      companyRevenueCagr.endYear,
                    ) && (
                      <span className="text-[11px] text-muted-foreground">
                        {formatRangeLabel(
                          companyRevenueCagr.startYear,
                          companyRevenueCagr.endYear,
                        )}
                      </span>
                    )}
                  </div>
                  {(companyRevenueCagr.scope || companyRevenueCagr.basis) && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {[companyRevenueCagr.scope, companyRevenueCagr.basis]
                        .filter((value): value is string => Boolean(value))
                        .map((value) => formatCompactLabel(value))
                        .join(" · ")}
                    </p>
                  )}
                </div>
              )}

              {hasSegmentGrowth && (
                <div className={`${snapshotSubsectionClass} p-3`}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Segment Growth CAGR (3Y)
                  </p>
                  <div className="mt-2 space-y-2">
                    {segmentGrowthRows.map((row: NormalizedSegmentGrowthCagr3yRow, idx) => (
                      <div
                        key={`${row.segment}-${idx}`}
                        className={idx === 0 ? "space-y-1" : "space-y-1 border-t border-border/35 pt-2"}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-medium text-foreground leading-snug">
                            {row.segment}
                          </p>
                          {row.cagrPercent != null && (
                            <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground shrink-0">
                              {formatPctLabel(row.cagrPercent)}
                            </span>
                          )}
                        </div>
                        {(formatRangeLabel(row.startYear, row.endYear) ||
                          row.comparability ||
                          row.basis) && (
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {[
                              formatRangeLabel(row.startYear, row.endYear),
                              row.comparability
                                ? `${formatCompactLabel(row.comparability)} comparability`
                                : null,
                              row.basis ? formatCompactLabel(row.basis) : null,
                            ]
                              .filter((value): value is string => Boolean(value))
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {hasRevenueSplitHistory && (
            <div className={`${snapshotSubsectionClass} p-3`}>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                Revenue Split History
              </p>
              <div className="mt-2 space-y-2">
                {visibleRevenueSplitRows.map((row, idx) =>
                  renderRevenueSplitRow(row, `${row.year ?? "period"}-${idx}`),
                )}
              </div>
              {extraRevenueSplitRows.length > 0 && (
                <details className="mt-2 border-t border-border/35 pt-2">
                  <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                    Show more ({extraRevenueSplitRows.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {extraRevenueSplitRows.map((row, idx) =>
                      renderRevenueSplitRow(
                        row,
                        `${row.year ?? "period"}-extra-${idx}`,
                      ),
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      ),
    });
  };
  const renderIndustryThemes = (
    title: string,
    items: NormalizedIndustryTheme[],
    accentClass: string,
  ) => {
    if (items.length === 0) return null;
    const visibleItems = items.slice(0, 2);
    const extraItems = items.slice(2);

    return (
      <div className="min-w-0 rounded-xl border border-border/25 bg-background/55 p-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          {title}
        </p>
        <div className="mt-2 space-y-2.5">
          <div className="space-y-2">
            {visibleItems.map((item, idx) => {
              const timeHorizonDisplay = getTimeHorizonDisplay(item.timeHorizon);

              return (
                <div
                  key={`${title}-${item.theme}-visible-${idx}`}
                  className={`space-y-1.5 rounded-xl border border-border/20 bg-background/70 px-3 py-2.5 border-l-2 ${accentClass}`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[12px] font-medium text-foreground leading-snug">
                      {item.theme}
                    </p>
                    {timeHorizonDisplay && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${timeHorizonDisplay.className}`}
                      >
                        {timeHorizonDisplay.label}
                      </span>
                    )}
                  </div>
                  {item.companyMechanism && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {item.companyMechanism}
                    </p>
                  )}
                  {item.horizonBasis && (
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                      Horizon basis: {item.horizonBasis}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {extraItems.length > 0 && (
            <details className="border-t border-border/35 pt-2">
              <summary className="cursor-pointer list-none text-[10px] text-muted-foreground hover:text-foreground">
                Show more ({extraItems.length})
              </summary>
              <div className="mt-2 space-y-2">
                {extraItems.map((item, idx) => {
                  const timeHorizonDisplay = getTimeHorizonDisplay(item.timeHorizon);

                  return (
                    <div
                      key={`${title}-${item.theme}-extra-${idx}`}
                      className={`space-y-1.5 rounded-xl border border-border/20 bg-background/65 px-3 py-2.5 border-l-2 ${accentClass}`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[12px] font-medium text-foreground leading-snug">
                          {item.theme}
                        </p>
                        {timeHorizonDisplay && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${timeHorizonDisplay.className}`}
                          >
                            {timeHorizonDisplay.label}
                          </span>
                        )}
                      </div>
                      {item.companyMechanism && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {item.companyMechanism}
                        </p>
                      )}
                      {item.horizonBasis && (
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                          Horizon basis: {item.horizonBasis}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  };
  const renderRegulatoryChanges = (
    items: NormalizedIndustryRegulatoryChange[],
  ) => {
    if (items.length === 0) return null;

    return (
      <div className={`${elevatedBlockClass} p-4 space-y-3`}>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Regulatory Changes
        </p>
        <div className="space-y-3">
          {items.map((item, idx) => {
            const impactDirectionDisplay = getImpactDirectionDisplay(item.impactDirection);

            return (
              <div
                key={`${item.change}-${idx}`}
                className={`${nestedDetailClass} px-3.5 py-3 space-y-2`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground leading-snug">
                      {item.change}
                    </p>
                    {item.period && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {item.period}
                      </p>
                    )}
                  </div>
                  {impactDirectionDisplay && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${impactDirectionDisplay.className}`}
                    >
                      {impactDirectionDisplay.label}
                    </span>
                  )}
                </div>
                {item.whatChanged && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                      What Changed
                    </p>
                    <p className="text-[11px] text-foreground/90 leading-relaxed">
                      {item.whatChanged}
                    </p>
                  </div>
                )}
                {item.companyImpactMechanism && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                      Company Impact Mechanism
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {item.companyImpactMechanism}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
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
      ...SECTION_MAP.moatAnalysis,
      meta: normalizedMoatAnalysis
        ? { kind: "text" as const, text: normalizedMoatAnalysis.moatRating.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }
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
          moatInfo={
            normalizedMoatAnalysis
              ? {
                  moatRating: normalizedMoatAnalysis.moatRating,
                  moatRatingLabel: normalizedMoatAnalysis.moatRatingLabel,
                  trajectory: normalizedMoatAnalysis.trajectory,
                  trajectoryDirection: normalizedMoatAnalysis.trajectoryDirection,
                }
              : null
          }
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
              {normalizedCompanyIndustryAnalysis.industryPositioning && (
                <div className="rounded-2xl border border-border/30 bg-background/75 p-4 shadow-md shadow-black/20 sm:p-5">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border/50 bg-muted/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {companyRow?.code ?? code}
                      </span>
                      {normalizedCompanyIndustryAnalysis.subSector && (
                        <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
                          {normalizedCompanyIndustryAnalysis.subSector}
                        </span>
                      )}
                    </div>

                    {normalizedCompanyIndustryAnalysis.industryPositioning.customerNeed && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Customer need
                        </p>
                        <p className="max-w-5xl text-[16px] sm:text-[18px] font-semibold leading-relaxed tracking-[-0.01em] text-foreground">
                          {normalizedCompanyIndustryAnalysis.industryPositioning.customerNeed}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-border/30" />

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {normalizedCompanyIndustryAnalysis.industryPositioning.industryEconomicsForCompany && (
                        <div className="rounded-xl border border-border/20 bg-background/45 px-4 py-3 border-l-2 border-l-sky-400/70">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-foreground/70 font-semibold">
                            Industry economics for this company
                          </p>
                          <p className="mt-1.5 text-[12px] text-foreground leading-relaxed">
                            {normalizedCompanyIndustryAnalysis.industryPositioning.industryEconomicsForCompany}
                          </p>
                        </div>
                      )}
                      {normalizedCompanyIndustryAnalysis.industryPositioning.whereThisCompanyFits && (
                        <div className="rounded-xl border border-border/20 bg-background/45 px-4 py-3 border-l-2 border-l-sky-400/70">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-foreground/70 font-semibold">
                            Where this company fits
                          </p>
                          <p className="mt-1.5 text-[12px] text-foreground leading-relaxed">
                            {normalizedCompanyIndustryAnalysis.industryPositioning.whereThisCompanyFits}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {normalizedCompanyIndustryAnalysis.regulatoryChanges.length > 0 &&
                renderRegulatoryChanges(normalizedCompanyIndustryAnalysis.regulatoryChanges)}

              {(normalizedCompanyIndustryAnalysis.tailwinds.length > 0 ||
                normalizedCompanyIndustryAnalysis.headwinds.length > 0) && (
                <div className={`${elevatedBlockClass} p-4 space-y-4`}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Tailwinds & Headwinds
                  </p>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
            {normalizedBusinessSnapshot ? (
              <>
                {hasStructuredBusinessSnapshot ? (
                  <>
                    <div className="space-y-2.5">
                      {(aboutHeading || aboutSupportingText) && (
                        <div className="min-w-0 space-y-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            About
                          </p>
                          {aboutHeading && (
                            <p className="max-w-4xl text-[17px] sm:text-[19px] font-semibold text-foreground leading-snug">
                              {aboutHeading}
                            </p>
                          )}
                          {aboutSupportingText && (
                            <p className="max-w-4xl text-[13px] text-muted-foreground leading-relaxed">
                              {aboutSupportingText}
                            </p>
                          )}
                        </div>
                      )}

                      {renderBusinessSegmentsDrawer()}
                      {historicalEconomics && renderHistoricalEconomicsCard(historicalEconomics)}
                    </div>
                  </>
                ) : hasLegacyBusinessSnapshot ? (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        {normalizedBusinessSnapshot.businessSummaryShort ||
                        normalizedBusinessSnapshot.businessSummaryLong ? (
                          <div className={`${elevatedBlockClass} p-4 space-y-2`}>
                            {normalizedBusinessSnapshot.businessSummaryShort && (
                              <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                                {normalizedBusinessSnapshot.businessSummaryShort}
                              </p>
                            )}
                            {normalizedBusinessSnapshot.businessSummaryLong && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
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
                      <div className="space-y-2.5">
                        {normalizedBusinessSnapshot.topRevenueDrivers.length > 0 && (
                          renderBusinessSnapshotDrawer({
                            title: "Top Revenue Drivers",
                            preview: `${normalizedBusinessSnapshot.topRevenueDrivers.length} driver${
                              normalizedBusinessSnapshot.topRevenueDrivers.length === 1 ? "" : "s"
                            } tracked.`,
                            children: (
                              <div className={`${snapshotSubsectionClass} p-3`}>
                                <ul className="space-y-1">
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
                            ),
                          })
                        )}

                        {(normalizedBusinessSnapshot.keyDependencies.length > 0 ||
                          normalizedBusinessSnapshot.keyRisksToModel.length > 0) && (
                          renderBusinessSnapshotDrawer({
                            title: "Model Watchpoints",
                            preview: [
                              normalizedBusinessSnapshot.keyDependencies.length > 0
                                ? `${normalizedBusinessSnapshot.keyDependencies.length} dependenc${
                                    normalizedBusinessSnapshot.keyDependencies.length === 1 ? "y" : "ies"
                                  }`
                                : null,
                              normalizedBusinessSnapshot.keyRisksToModel.length > 0
                                ? `${normalizedBusinessSnapshot.keyRisksToModel.length} risk${
                                    normalizedBusinessSnapshot.keyRisksToModel.length === 1 ? "" : "s"
                                  }`
                                : null,
                            ]
                              .filter((value): value is string => Boolean(value))
                              .join(" · "),
                            children: (
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {normalizedBusinessSnapshot.keyDependencies.length > 0 && (
                                  <div className={`${snapshotSubsectionClass} p-3`}>
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
                                  <div className={`${snapshotSubsectionClass} p-3`}>
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
                            ),
                          })
                        )}
                      </div>
                    )}

                    {normalizedBusinessSnapshot.mixShiftSummary && (
                      <div className="rounded-xl border border-sky-200/35 bg-sky-50/30 p-3 space-y-0.5 dark:border-sky-700/30 dark:bg-sky-950/10">
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
                <div className={`${elevatedMutedBlockClass} p-3 space-y-3`}>
                  <p className="text-[11px] uppercase tracking-wide text-foreground/90 font-semibold">
                    Top 3 Growth Catalysts
                  </p>
                  <Carousel opts={{ align: "start" }} className="w-full">
                    <CarouselContent className="items-stretch">
                      {normalizedGrowthOutlook.catalysts.slice(0, 3).map((c, idx) => {
                        const timelineItems = c.timelineItems;
                        const visibleTimelineItems = timelineItems.slice(0, 2);
                        const remainingTimelineItems = timelineItems.slice(2);
                        const hasTimelineDetails = remainingTimelineItems.length > 0;
                        const catalystAccentClass =
                          c.expectedImpact === "revenue"
                            ? "before:bg-emerald-400/90"
                            : c.expectedImpact === "margin"
                              ? "before:bg-sky-400/90"
                              : "before:bg-amber-400/90";
                        const catalystDotClass =
                          c.expectedImpact === "revenue"
                            ? "bg-emerald-500"
                            : c.expectedImpact === "margin"
                              ? "bg-sky-500"
                              : "bg-amber-500";

                        return (
                          <CarouselItem key={idx} className="basis-full md:basis-1/2 xl:basis-1/3">
                            <article
                              className={`relative flex h-full flex-col overflow-hidden rounded-xl border border-border/25 bg-background/85 p-4 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 ${catalystAccentClass}`}
                            >
                              <div className="flex h-full flex-1 flex-col gap-4">
                                <div className="space-y-2.5">
                                  {c.catalyst && (
                                    <p className="text-[15px] font-semibold leading-snug text-foreground">
                                      {c.catalyst}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                    {c.type && (
                                      <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/35 dark:text-blue-200">
                                        {c.type}
                                      </span>
                                    )}
                                    {c.expectedImpact && (
                                      <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/35 dark:text-emerald-100">
                                        Impact: {c.expectedImpact}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {timelineItems.length > 0 && (
                                  <div className="space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                        Timeline
                                      </p>
                                      {timelineItems.length > 2 && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {timelineItems.length} updates
                                        </span>
                                      )}
                                    </div>

                                    <div className="relative pl-6 before:absolute before:left-[8px] before:top-1 before:bottom-1 before:w-px before:bg-border/60">
                                      <ul className="space-y-3">
                                        {visibleTimelineItems.map((t, tIdx) => {
                                          const stageMeta = getTimelineStageDisplay(t.stage);
                                          const period = t.period ?? "";
                                          const source = t.source ?? "";
                                          const quote = t.quote ?? "";
                                          const delta = t.delta ?? "";

                                          return (
                                            <li
                                              key={`${idx}-timeline-primary-${tIdx}`}
                                              className="relative space-y-1.5 pl-4"
                                            >
                                              <span className={`absolute left-0 top-2 h-2.5 w-2.5 rounded-full border-2 border-background ${catalystDotClass}`} />
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span
                                                  className={`px-2 py-0.5 rounded-full uppercase tracking-wide text-[10px] ${stageMeta.className}`}
                                                >
                                                  {stageMeta.label}
                                                </span>
                                                {(period || source) && (
                                                  <span className="text-[11px] text-muted-foreground">
                                                    {period}
                                                    {period && source ? " · " : ""}
                                                    {source}
                                                  </span>
                                                )}
                                              </div>
                                              {quote && (
                                                <p className="text-[12px] leading-relaxed text-foreground">
                                                  {quote}
                                                </p>
                                              )}
                                              {delta && (
                                                <p className="text-[11px] leading-relaxed text-muted-foreground">
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
                                  <details className="group mt-auto border-t border-border/30 pt-3">
                                    <summary className="list-none cursor-pointer">
                                      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/25 px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/35">
                                        <div className="space-y-0.5">
                                          <span className="block text-[11px] font-medium text-foreground">
                                            Open full timeline
                                          </span>
                                          <span className="block text-[10px] text-muted-foreground">
                                            {timelineItems.length} updates across the full catalyst trail
                                          </span>
                                        </div>
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                          <span className="group-open:hidden">Open</span>
                                          <span className="hidden group-open:inline">Hide</span>
                                        </span>
                                      </div>
                                    </summary>
                                    <div className="mt-3 relative pl-6 before:absolute before:left-[8px] before:top-1 before:bottom-1 before:w-px before:bg-border/60">
                                      <ul className="space-y-3">
                                        {remainingTimelineItems.map((t, tIdx) => {
                                          const stageMeta = getTimelineStageDisplay(t.stage);
                                          const period = t.period ?? "";
                                          const source = t.source ?? "";
                                          const quote = t.quote ?? "";
                                          const delta = t.delta ?? "";

                                          return (
                                            <li
                                              key={`${idx}-timeline-extra-${tIdx}`}
                                              className="relative space-y-1.5 pl-4"
                                            >
                                              <span className={`absolute left-0 top-2 h-2.5 w-2.5 rounded-full border-2 border-background ${catalystDotClass}`} />
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span
                                                  className={`px-2 py-0.5 rounded-full uppercase tracking-wide text-[10px] ${stageMeta.className}`}
                                                >
                                                  {stageMeta.label}
                                                </span>
                                                {(period || source) && (
                                                  <span className="text-[11px] text-muted-foreground">
                                                    {period}
                                                    {period && source ? " · " : ""}
                                                    {source}
                                                  </span>
                                                )}
                                              </div>
                                              {quote && (
                                                <p className="text-[12px] leading-relaxed text-foreground">
                                                  {quote}
                                                </p>
                                              )}
                                              {delta && (
                                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                                  {delta}
                                                </p>
                                              )}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  </details>
                                )}
                              </div>
                            </article>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>

                    <div className="mt-2 flex justify-center gap-2 xl:hidden">
                      <div className="flex items-center gap-2">
                        <CarouselPrevious className="static size-9 translate-x-0 translate-y-0 border border-border bg-background/80 text-foreground hover:bg-accent" />
                        <CarouselNext className="static size-9 translate-x-0 translate-y-0 border border-border bg-background/80 text-foreground hover:bg-accent" />
                      </div>
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
          headerDescription="Current management stance and quarter-by-quarter evolution."
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

        <SectionCard
          id="moat-analysis"
          title="Moat Analysis"
          collapsible
          headerAction={
            moatGeneratedAtShort ? (
              <span className="text-[11px] text-muted-foreground">{moatGeneratedAtShort}</span>
            ) : undefined
          }
        >
          {normalizedMoatAnalysis ? (
            <div className="space-y-4">
              <div className={`${elevatedBlockClass} p-4 space-y-3`}>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const ratingConfig: Record<string, { className: string }> = {
                      wide_moat: {
                        className:
                          "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-600/50 dark:bg-emerald-900/35 dark:text-emerald-200",
                      },
                      narrow_moat: {
                        className:
                          "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-600/50 dark:bg-sky-900/35 dark:text-sky-200",
                      },
                      no_moat: {
                        className:
                          "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-600/50 dark:bg-rose-900/35 dark:text-rose-200",
                      },
                      moat_at_risk: {
                        className:
                          "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600/50 dark:bg-amber-900/35 dark:text-amber-200",
                      },
                    };
                    const cfg = ratingConfig[normalizedMoatAnalysis.moatRating];
                    const cls = cfg?.className ?? "border-border/60 bg-muted/60 text-foreground";
                    return (
                      <span
                        className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] ${cls}`}
                      >
                        {normalizedMoatAnalysis.moatRatingLabel}
                      </span>
                    );
                  })()}
                  {normalizedMoatAnalysis.trajectory && (
                    <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium text-foreground">
                      {normalizedMoatAnalysis.trajectoryDirection
                        ? `${normalizedMoatAnalysis.trajectory} ${normalizedMoatAnalysis.trajectoryDirection}`
                        : normalizedMoatAnalysis.trajectory}
                    </span>
                  )}
                  {normalizedMoatAnalysis.industry && (
                    <span className="rounded-full border border-border/50 bg-muted/35 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {normalizedMoatAnalysis.industry}
                    </span>
                  )}
                </div>
                {moatThesis && (
                  <p className="max-w-4xl text-[13px] font-medium leading-relaxed text-foreground">
                    {moatThesis}
                  </p>
                )}
              </div>
              {(moatTotalPillars > 0 ||
                normalizedMoatAnalysis.porterVerdict ||
                normalizedMoatAnalysis.porterSummary ||
                normalizedMoatAnalysis.durability ||
                normalizedMoatAnalysis.risks.length > 0) && (
                <div className="space-y-2">
                  {moatTotalPillars > 0 && (
                    <details className={`group ${elevatedMutedBlockClass}`}>
                      <summary className="list-none cursor-pointer px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                                Competitive Advantages
                              </p>
                              <span className="rounded-full border border-emerald-200/80 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                                {moatPresentPillars.length} / {moatTotalPillars} present
                              </span>
                            </div>
                            <p className="text-[11px] leading-snug text-muted-foreground">
                              {moatPresentPillars.length > 0
                                ? `${moatPresentPillars.length} identified strengths${
                                    moatAbsentPillars.length > 0
                                      ? `, ${moatAbsentPillars.length} weaker dimensions`
                                      : ""
                                  }.`
                                : "No durable advantages identified yet."}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            <span className="group-open:hidden">Open</span>
                            <span className="hidden group-open:inline">Hide</span>
                          </span>
                        </div>
                      </summary>
                      <div className="border-t border-border/40 px-4 py-3 space-y-3">
                        {moatPresentPillars.length > 0 && (
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {moatPresentPillars.map((pillar, idx) => (
                              <div
                                key={`${pillar.type}-present-${idx}`}
                                className={`${elevatedBlockClass} border-l-2 border-l-emerald-500/70 p-3 space-y-2`}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-emerald-200/80 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                                    Present
                                  </span>
                                  <p className="text-[12px] font-semibold text-foreground">
                                    {pillar.type}
                                  </p>
                                  {pillar.greenwaldLabel && (
                                    <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                      {pillar.greenwaldLabel}
                                    </span>
                                  )}
                                </div>
                                {pillar.evidence ? (
                                  <p className="text-[12px] leading-relaxed text-foreground">
                                    {pillar.evidence}
                                  </p>
                                ) : (
                                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    Evidence not captured.
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {moatAbsentPillars.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              Missing / weak moat dimensions
                            </p>
                            <div className="space-y-2">
                              {moatAbsentPillars.map((pillar, idx) => (
                                <div
                                  key={`${pillar.type}-absent-${idx}`}
                                  className={`${elevatedBlockClass} border-l-2 border-l-border/70 p-3 space-y-1.5`}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-[12px] font-medium text-foreground">
                                      {pillar.type}
                                    </p>
                                    {pillar.greenwaldLabel && (
                                      <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                        {pillar.greenwaldLabel}
                                      </span>
                                    )}
                                  </div>
                                  {pillar.evidence ? (
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                                      {pillar.evidence}
                                    </p>
                                  ) : (
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                                      No supporting moat evidence captured.
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  {(normalizedMoatAnalysis.porterVerdict ||
                    normalizedMoatAnalysis.porterSummary ||
                    normalizedMoatAnalysis.durability) && (
                    <details className={`group ${elevatedMutedBlockClass}`}>
                      <summary className="list-none cursor-pointer px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                              Defensibility
                            </p>
                            <p className="text-[11px] leading-snug text-muted-foreground">
                              {normalizedMoatAnalysis.porterVerdict ??
                                normalizedMoatAnalysis.durability ??
                                "Industry structure and moat durability."}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            <span className="group-open:hidden">Open</span>
                            <span className="hidden group-open:inline">Hide</span>
                          </span>
                        </div>
                      </summary>
                      <div className="border-t border-border/40 px-4 py-3">
                        <div className={`${elevatedBlockClass} p-3 space-y-2`}>
                          {normalizedMoatAnalysis.porterVerdict && (
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                                Porter verdict
                              </p>
                              <p className="text-[12px] leading-relaxed text-foreground">
                                {normalizedMoatAnalysis.porterVerdict}
                              </p>
                            </div>
                          )}
                          {normalizedMoatAnalysis.porterSummary && (
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Industry structure
                              </p>
                              <p className="text-[12px] leading-relaxed text-muted-foreground">
                                {normalizedMoatAnalysis.porterSummary}
                              </p>
                            </div>
                          )}
                          {normalizedMoatAnalysis.durability && (
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Durability
                              </p>
                              <p className="text-[12px] leading-relaxed text-muted-foreground">
                                {normalizedMoatAnalysis.durability}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </details>
                  )}

                  {normalizedMoatAnalysis.risks.length > 0 && (
                    <details className={`group ${elevatedMutedBlockClass}`}>
                      <summary className="list-none cursor-pointer px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                              Key Risks to the Moat
                            </p>
                            <p className="text-[11px] leading-snug text-muted-foreground">
                              {normalizedMoatAnalysis.risks.length} risk
                              {normalizedMoatAnalysis.risks.length === 1 ? "" : "s"} flagged.
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            <span className="group-open:hidden">Open</span>
                            <span className="hidden group-open:inline">Hide</span>
                          </span>
                        </div>
                      </summary>
                      <div className="border-t border-border/40 px-4 py-3">
                        <div className="space-y-2">
                          {normalizedMoatAnalysis.risks.map((risk, idx) => (
                            <div
                              key={`${risk}-${idx}`}
                              className={`${elevatedBlockClass} border-l-2 border-l-rose-400/70 p-3`}
                            >
                              <p className="text-[12px] leading-relaxed text-foreground">{risk}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          ) : (
            renderMissingSectionState(
              "moat-analysis",
              "Moat Analysis",
              "We have not generated a competitive moat analysis for this company yet.",
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
