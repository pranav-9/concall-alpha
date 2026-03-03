import React from "react";
import type { Metadata } from "next";
import { ChartLineLabel } from "./chart";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { createClient } from "@/lib/supabase/server";
import {
  QuarterData,
  BusinessSegment,
  SegmentRevenue,
  TopStrategyLatest,
} from "../types";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { OverviewCard } from "../components/overview-card";
import { SectionCard } from "../components/section-card";
import { parseSummary, transformToChartData, calculateTrend } from "../utils";
import { BusinessSegmentsDisplay } from "../components/business-segments-display";
import { SegmentRevenueDisplay } from "../components/segment-revenue-display";
import { TopStrategiesDisplay } from "../components/top-strategies-display";
import { TrendingUp, TrendingDown } from "lucide-react";
import ConcallScore from "@/components/concall-score";
import { CompanyCommentsSection } from "@/components/company/company-comments-section";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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

type ConcallDetails = {
  score?: number;
  category?: string;
  rationale?: string[];
  quarter_summary?: string[];
  results_summary?: string[];
  guidance?: string;
  risks?: string[];
  fy?: number;
  qtr?: number;
  confidence?: number;
};

type RankInfo = {
  quarter?: { rank: number; total: number; percentile: number } | null;
  growth?: { rank: number; total: number; percentile: number } | null;
};

const parseJsonObject = (val: unknown) => {
  if (!val) return null;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof val === "object" ? val : null;
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
    .select("name, sector, sub_sector, exchange, country, code, website")
    .eq("code", code)
    .limit(1)
    .maybeSingle();
  const companyName = companyRow?.name as string | undefined;

  // Fetch concall analysis data
  const { data, error } = await supabase
    .from("concall_analysis")
    .select()
    .eq("company_code", code)
    .order("fy", { ascending: false })
    .order("qtr", { ascending: false });

  // Fetch business segments data
  const { data: segmentsData } = await supabase
    .from("business_segments")
    .select()
    .eq("company", code)
    .order("created_at", { ascending: false });

  // Fetch segment revenue data
  const { data: revenueData } = await supabase
    .from("segment_revenue")
    .select()
    .eq("company", code)
    .order("financial_year", { ascending: false });

  // Fetch latest top strategies data
  const { data: topStrategiesData } = await supabase
    .from("top_strategies_latest")
    .select()
    .eq("company", code)
    .order("latest_fiscal_year", { ascending: false })
    .order("strategy_rank", { ascending: true });

  const { data: businessSnapshotData } = await supabase
    .from("business_snapshot")
    .select(
      "company, generated_at, documents_processed, segment_profiles, business_snapshot, details, snapshot_phase, snapshot_source, source_urls",
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
  const detailQuartersOldestFirst = [...detailQuarters].reverse();
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
  const growthUpdatedAtRaw = normalizedGrowthOutlook?.updatedAtRaw ?? null;
  const growthUpdatedDate = growthUpdatedAtRaw ? new Date(growthUpdatedAtRaw) : null;
  const growthUpdatedAt =
    growthUpdatedDate && !Number.isNaN(growthUpdatedDate.getTime())
      ? new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(growthUpdatedDate)
      : null;
  const growthScore = normalizedGrowthOutlook?.growthScore ?? null;

  const toNumeric = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  let rankInfo: RankInfo = { quarter: null, growth: null };

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

    const quarterRanked = assignCompetitionRanks(
      (latestQuarterRows ?? [])
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
        className={`rounded-lg border border-border bg-muted/30 p-3 space-y-2 border-l-2 ${accentClass}`}
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
          <details className="group rounded-md border border-border bg-muted/20 px-2 py-1.5">
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
    <div className="flex w-full max-w-full overflow-x-hidden gap-4 lg:gap-6 px-3 sm:px-4 lg:px-12 py-4 sm:py-6">
      <SidebarNavigation />

      {/* main content - 80% width */}
      <div id="main-content" className="flex-1 min-w-0 flex flex-col gap-4">
        <OverviewCard
          companyInfo={{
            code: companyRow?.code ?? code,
            name: companyRow?.name ?? undefined,
            sector: companyRow?.sector ?? undefined,
            subSector: companyRow?.sub_sector ?? undefined,
            exchange: companyRow?.exchange ?? undefined,
            country: companyRow?.country ?? undefined,
          }}
          rankInfo={rankInfo}
        />

        <SectionCard id="sentiment-score" title="Quarterly Score">
          <div className="flex flex-col gap-4">
            {/* Trend indicator */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg ${
                trend.direction === "improving"
                  ? "bg-emerald-100 border border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/50"
                  : trend.direction === "declining"
                  ? "bg-red-100 border border-red-300 dark:bg-red-500/20 dark:border-red-500/50"
                  : "bg-amber-100 border border-amber-300 dark:bg-amber-500/20 dark:border-amber-500/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {trend.direction === "improving" ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      Trend: Improving
                    </span>
                  </>
                ) : trend.direction === "declining" ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                      Trend: Declining
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    ↔ Trend: Stable
                  </span>
                )}
              </div>
              <span className="text-[11px] text-foreground/80 sm:ml-auto break-words">
                {trend.description}
              </span>
            </div>

            {/* Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-col gap-2">
                <div className="flex justify-center">
                  <ChartLineLabel chartData={chartData} />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Showing the latest 12 quarterly points (newest to oldest).
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-2 w-full">
                <p className="text-xs font-semibold text-foreground">
                  Score context (latest 12 quarters)
                </p>
                <div className="flex justify-center">
                  <div className="w-full max-w-full overflow-hidden">
                    <Carousel
                      opts={{
                        align: "start",
                        startIndex:
                          detailQuartersOldestFirst.length > 0
                            ? detailQuartersOldestFirst.length - 1
                            : 0,
                      }}
                      className="w-full"
                    >
                      <CarouselContent>
                        {detailQuartersOldestFirst.map((q, idx) => {
                          const details = parseJsonObject(q.details) as ConcallDetails | null;
                          const risks = Array.isArray(details?.risks)
                            ? (details?.risks as string[]).slice(0, 2)
                            : [];
                          const rationale = Array.isArray(details?.rationale)
                            ? (details?.rationale as string[]).slice(0, 2)
                            : [];
                          const quarterSummary = Array.isArray(details?.quarter_summary)
                            ? (details?.quarter_summary as string[]).slice(0, 2)
                            : [];
                          const resultsSummary = Array.isArray(details?.results_summary)
                            ? (details?.results_summary as string[]).slice(0, 2)
                            : [];
                          const guidance =
                            typeof details?.guidance === "string"
                              ? (details?.guidance as string)
                              : null;
                          const category =
                            typeof details?.category === "string"
                              ? (details?.category as string)
                              : null;
                          const confidence =
                            typeof details?.confidence === "number"
                              ? (details?.confidence as number)
                              : null;
                          const detailScore =
                            typeof details?.score === "number" ? details.score : q.score;
                          const detailQuarterLabel =
                            typeof details?.qtr === "number" && typeof details?.fy === "number"
                              ? `Q${details.qtr} FY${details.fy}`
                              : q.quarter_label;
                          const isLatest =
                            idx === detailQuartersOldestFirst.length - 1;

                          return (
                            <CarouselItem
                              key={`${q.fy}-${q.qtr}-${idx}`}
                              className="basis-full md:basis-1/2 flex justify-center"
                            >
                              <div
                                className={`rounded-lg border border-border bg-card p-3 shadow-sm h-full w-[90%] ${
                                  isLatest ? "border-t-2 border-t-sky-300 dark:border-t-sky-600" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-foreground">
                                      {detailQuarterLabel}
                                    </span>
                                    {isLatest && (
                                      <span className="text-[10px] font-semibold text-blue-700 px-2 py-0.5 rounded-full bg-blue-100 border border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-700/40">
                                        Latest
                                      </span>
                                    )}
                                  </span>
                                  <ConcallScore score={detailScore} size="sm" />
                                </div>
                                {/* category intentionally hidden */}
                                {guidance && (
                                  <p className="text-[11px] text-foreground/90 leading-relaxed line-clamp-3 mb-2">
                                    {guidance}
                                  </p>
                                )}
                                {quarterSummary.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-[10px] uppercase tracking-wide text-foreground/70 font-semibold">
                                      Quarter summary
                                    </p>
                                    <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-muted-foreground">
                                      {quarterSummary.map((item, rIdx) => (
                                        <li
                                          key={rIdx}
                                          className="text-[11px] text-foreground/90 leading-relaxed line-clamp-2"
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {rationale.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-[10px] uppercase tracking-wide text-foreground/70 font-semibold">
                                      Rationale
                                    </p>
                                    <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-muted-foreground">
                                      {rationale.map((item, rIdx) => (
                                        <li
                                          key={rIdx}
                                          className="text-[11px] text-foreground/90 leading-relaxed line-clamp-2"
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {!details && (
                                  <p className="text-[10px] text-muted-foreground mt-2">
                                    No additional context available.
                                  </p>
                                )}
                                {details && (
                                  <Drawer direction="right">
                                    <div className="mt-3 flex justify-center sm:justify-start">
                                      <DrawerTrigger asChild>
                                        <Button
                                          size="sm"
                                          className="text-xs font-semibold uppercase tracking-wide bg-emerald-500 text-black border border-emerald-300 shadow-sm hover:bg-emerald-400"
                                        >
                                          Show details
                                        </Button>
                                      </DrawerTrigger>
                                    </div>
                                    <DrawerContent>
                                      <DrawerHeader>
                                        <DrawerTitle>
                                          {detailQuarterLabel} details
                                        </DrawerTitle>
                                        <DrawerDescription>
                                          Full quarter context from concall
                                          analysis details.
                                        </DrawerDescription>
                                      </DrawerHeader>
                                      <div className="px-4 pb-4 space-y-4 text-sm text-foreground max-h-[75vh] overflow-y-auto">
                                        <div className="flex items-center gap-2">
                                          <ConcallScore
                                            score={detailScore}
                                            size="sm"
                                          />
                                          {isLatest && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50">
                                              Latest
                                            </span>
                                          )}
                                          {category && (
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                                              {category}
                                            </span>
                                          )}
                                          {typeof confidence === "number" && (
                                            <span className="text-[11px] text-muted-foreground">
                                              Confidence:{" "}
                                              {(confidence * 100).toFixed(0)}%
                                            </span>
                                          )}
                                        </div>
                                        {quarterSummary.length > 0 && (
                                          <div className="space-y-1.5">
                                            <p className="text-sm font-semibold text-foreground uppercase tracking-wide">
                                              Quarter summary
                                            </p>
                                            <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-muted-foreground">
                                              {quarterSummary.map((item, rIdx) => (
                                                <li
                                                  key={rIdx}
                                                  className="text-xs text-foreground/80 leading-snug"
                                                >
                                                  {item}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {resultsSummary.length > 0 && (
                                          <div className="space-y-1.5">
                                            <p className="text-sm font-semibold text-foreground uppercase tracking-wide">
                                              Results summary
                                            </p>
                                            <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-muted-foreground">
                                              {resultsSummary.map((item, rIdx) => (
                                                <li
                                                  key={rIdx}
                                                  className="text-xs text-foreground/80 leading-snug"
                                                >
                                                  {item}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {guidance && (
                                          <div className="space-y-1.5">
                                            <p className="text-sm font-semibold text-foreground uppercase tracking-wide">
                                              Guidance
                                            </p>
                                            <p className="text-xs text-foreground/80 leading-relaxed">
                                              {guidance}
                                            </p>
                                          </div>
                                        )}
                                        {rationale.length > 0 && (
                                          <div className="space-y-1.5">
                                            <p className="text-sm font-semibold text-foreground uppercase tracking-wide">
                                              Rationale
                                            </p>
                                            <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-muted-foreground">
                                              {rationale.map((item, rIdx) => (
                                                <li
                                                  key={rIdx}
                                                  className="text-xs text-foreground/80 leading-snug"
                                                >
                                                  {item}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {risks.length > 0 && (
                                          <div className="space-y-1.5">
                                            <p className="text-sm font-semibold text-foreground uppercase tracking-wide">
                                              Risks
                                            </p>
                                            <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-muted-foreground">
                                              {risks.map((item, rIdx) => (
                                                <li
                                                  key={rIdx}
                                                  className="text-xs text-foreground/80 leading-snug"
                                                >
                                                  {item}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                      <DrawerFooter>
                                        <DrawerClose asChild>
                                          <Button variant="outline">
                                            Close
                                          </Button>
                                        </DrawerClose>
                                      </DrawerFooter>
                                    </DrawerContent>
                                  </Drawer>
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
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard id="placeholder" title="Future Growth Prospects">
          {normalizedGrowthOutlook ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/80">
                {typeof growthScore === "number" && (
                  <span className="px-2 py-1 rounded-full border border-emerald-200 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100 dark:border-emerald-700/50">
                    Growth score: {growthScore.toFixed(1)}
                  </span>
                )}
                {growthUpdatedAt && (
                  <span className="px-2 py-1 rounded-full bg-muted text-foreground border border-border/60">
                    Updated: {growthUpdatedAt}
                  </span>
                )}
              </div>

              {normalizedGrowthOutlook.summaryBullets.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                      Summary
                    </p>
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
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wide text-foreground/90 font-semibold">
                        Catalysts (next 12-24 months)
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                          Total triggers: {normalizedGrowthOutlook.catalysts.length}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          Visible per view: 1 / 2 / 3
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border md:hidden">
                          Slides: {normalizedGrowthOutlook.catalysts.length}
                        </span>
                        <span className="hidden md:inline-flex xl:hidden px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          Slides: {Math.ceil(normalizedGrowthOutlook.catalysts.length / 2)}
                        </span>
                        <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          Slides: {Math.ceil(normalizedGrowthOutlook.catalysts.length / 3)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Swipe or use arrows to browse all triggers.
                    </p>
                    <Carousel opts={{ align: "start" }} className="w-full">
                      <CarouselContent>
                        {normalizedGrowthOutlook.catalysts.map((c, idx) => {
                          const timelineItems = c.timelineItems;
                          return (
                            <CarouselItem key={idx} className="basis-full md:basis-1/2 xl:basis-1/3">
                              <div
                                className={`h-full rounded-md border border-border bg-muted/30 p-3 space-y-2 ${
                                  c.expectedImpact === "revenue"
                                    ? "border-l-2 border-l-emerald-500/70"
                                    : c.expectedImpact === "margin"
                                    ? "border-l-2 border-l-sky-500/70"
                                    : "border-l-2 border-l-amber-500/70"
                                }`}
                              >
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                  {c.type && (
                                    <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-200 dark:border-blue-700/40">
                                      {c.type}
                                    </span>
                                  )}
                                  {c.timing && (
                                    <span className="px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                                      {c.timing}
                                    </span>
                                  )}
                                  {c.expectedImpact && (
                                    <span className="px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-100 dark:border-emerald-700/40">
                                      Impact: {c.expectedImpact}
                                    </span>
                                  )}
                                  {c.quantified?.value != null && (
                                    <span className="px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                                      Qty: {String(c.quantified.value)}
                                      {c.quantified.unit ? ` ${c.quantified.unit}` : ""}
                                    </span>
                                  )}
                                </div>
                                {c.catalyst && (
                                  <p className="text-sm font-semibold text-foreground leading-snug">
                                    {c.catalyst}
                                  </p>
                                )}

                                {(c.priority || c.investibilityChecks) && (
                                  <div className="space-y-1.5">
                                    {c.priority && (
                                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                                        {typeof c.priority.weightedPriority === "number" && (
                                          <span className="px-2 py-0.5 rounded-full bg-background border border-border">
                                            Priority: {c.priority.weightedPriority.toFixed(1)}
                                          </span>
                                        )}
                                        {typeof c.priority.certaintyScore === "number" && (
                                          <span className="px-2 py-0.5 rounded-full bg-background border border-border">
                                            Certainty: {c.priority.certaintyScore}
                                          </span>
                                        )}
                                        {typeof c.priority.timeRelevance === "number" && (
                                          <span className="px-2 py-0.5 rounded-full bg-background border border-border">
                                            Time: {c.priority.timeRelevance}
                                          </span>
                                        )}
                                        {typeof c.priority.progressionDepth === "number" && (
                                          <span className="px-2 py-0.5 rounded-full bg-background border border-border">
                                            Progression: {c.priority.progressionDepth}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {c.investibilityChecks && (
                                      <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                                        {c.investibilityChecks.entryTiming && (
                                          <span className="px-2 py-0.5 rounded-full bg-muted border border-border">
                                            Entry: {c.investibilityChecks.entryTiming}
                                          </span>
                                        )}
                                        {c.investibilityChecks.adoption && (
                                          <span className="px-2 py-0.5 rounded-full bg-muted border border-border">
                                            Adoption: {c.investibilityChecks.adoption}
                                          </span>
                                        )}
                                        {c.investibilityChecks.feasibility && (
                                          <span className="px-2 py-0.5 rounded-full bg-muted border border-border">
                                            Feasibility: {c.investibilityChecks.feasibility}
                                          </span>
                                        )}
                                        {c.investibilityChecks.unitEconomics && (
                                          <span className="px-2 py-0.5 rounded-full bg-muted border border-border">
                                            Unit economics: {c.investibilityChecks.unitEconomics}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

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
                                                <p className="text-[11px] text-foreground leading-snug line-clamp-2">
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
                                    {timelineItems.length > 2 && (
                                      <details className="text-[10px] text-muted-foreground">
                                        <summary className="cursor-pointer hover:text-foreground/80">
                                          Show full timeline ({timelineItems.length})
                                        </summary>
                                        <div className="relative pl-4 mt-1.5 before:content-[''] before:absolute before:left-[3px] before:top-1 before:bottom-1 before:w-px before:bg-border/80">
                                          <ul className="space-y-2">
                                            {timelineItems.slice(2).map((t, tIdx) => {
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
                                      </details>
                                    )}
                                  </div>
                                )}

                                {c.evidenceLines.length > 0 && (
                                  <div className="space-y-1 pt-2 border-t border-border/60">
                                    {timelineItems.length > 0 ? (
                                      <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                                        Supporting evidence
                                      </p>
                                    ) : null}
                                    <p className="text-[11px] text-foreground leading-snug">
                                      • {c.evidenceLines[0]?.meta ? `${c.evidenceLines[0].meta} · ` : ""}
                                      {c.evidenceLines[0]?.text ?? "Evidence available"}
                                    </p>
                                    {c.evidenceLines.length > 1 && (
                                      <details className="text-[10px] text-muted-foreground">
                                        <summary className="cursor-pointer hover:text-foreground/80">
                                          Show evidence ({c.evidenceLines.length})
                                        </summary>
                                        <div className="mt-1 space-y-1">
                                          {c.evidenceLines.slice(1).map((ev, evIdx) => (
                                            <p key={evIdx} className="leading-snug text-foreground">
                                              • {ev.meta ? `${ev.meta} · ` : ""}
                                              {ev.text}
                                            </p>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                  </div>
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
              {normalizedGrowthOutlook.variantPerception && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-foreground/90 font-semibold">
                      Variant perception
                    </p>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Non-consensus view
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                    <div className="rounded-md border border-border bg-card p-2.5 space-y-1.5 border-l-2 border-l-slate-400/70">
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

                    <div className="rounded-md border border-border bg-card p-2.5 space-y-1.5 border-l-2 border-l-emerald-500/70">
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

                    <div className="rounded-md border border-border bg-card p-2.5 space-y-1.5 border-l-2 border-l-red-500/70">
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
              <div className="md:hidden min-w-0 space-y-3">
                {(["base", "upside", "downside"] as const).map((scenarioKey) => (
                  <React.Fragment key={`mobile-${scenarioKey}`}>
                    {renderScenarioCard(scenarioKey)}
                  </React.Fragment>
                ))}
              </div>

              <div className="hidden md:grid md:grid-cols-3 gap-3">
                {(["base", "upside", "downside"] as const).map((scenarioKey) =>
                  renderScenarioCard(scenarioKey)
                )}
              </div>

            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-6 text-sm text-muted-foreground">
              Growth outlook data not available yet for this company.
            </div>
          )}
        </SectionCard>

        <SectionCard
          id="competitive-strategy"
          title="Story of the Stock - Top Strategies"
        >
          {topStrategiesData && topStrategiesData.length > 0 ? (
            <TopStrategiesDisplay
              strategies={topStrategiesData as TopStrategyLatest[]}
            />
          ) : (
            <div className="text-muted-foreground text-sm">
              No strategy data available
            </div>
          )}
        </SectionCard>

        <SectionCard id="business-overview" title="Business Snapshot">
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Business Snapshot
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {normalizedBusinessSnapshot?.generatedAtLabel && (
                        <span>Generated: {normalizedBusinessSnapshot.generatedAtLabel}</span>
                      )}
                      {normalizedBusinessSnapshot?.snapshotSource && (
                        <span>Source: {normalizedBusinessSnapshot.snapshotSource}</span>
                      )}
                      {typeof normalizedBusinessSnapshot?.snapshotPhase === "number" && (
                        <span>Phase: {normalizedBusinessSnapshot.snapshotPhase}</span>
                      )}
                      {typeof normalizedBusinessSnapshot?.documentsProcessed === "number" && (
                        <span>
                          Docs processed: {normalizedBusinessSnapshot.documentsProcessed}
                        </span>
                      )}
                    </div>
                  </div>
                  {normalizedBusinessSnapshot?.website && (
                    <a
                      href={normalizedBusinessSnapshot.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Visit website
                    </a>
                  )}
                </div>

                {normalizedBusinessSnapshot ? (
                  <>
                    {normalizedBusinessSnapshot.businessSummaryShort ||
                    normalizedBusinessSnapshot.businessSummaryLong ? (
                      <div className="rounded-xl border border-border/50 bg-background/70 p-4 space-y-2">
                        {normalizedBusinessSnapshot.businessSummaryShort && (
                          <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                            {normalizedBusinessSnapshot.businessSummaryShort}
                          </p>
                        )}
                        {normalizedBusinessSnapshot.businessSummaryLong && (
                          <p className="text-sm text-muted-foreground leading-relaxed max-w-4xl">
                            {normalizedBusinessSnapshot.businessSummaryLong}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No business snapshot summary available yet.
                      </p>
                    )}

                    {(normalizedBusinessSnapshot.businessModelQuality ||
                      normalizedBusinessSnapshot.operatingModel ||
                      normalizedBusinessSnapshot.valueChainPosition ||
                      normalizedBusinessSnapshot.demandShape ||
                      normalizedBusinessSnapshot.dominantSegment ||
                      normalizedBusinessSnapshot.emergingSegment) && (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          Business Model Profile
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {normalizedBusinessSnapshot.businessModelQuality && (
                            <span className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-foreground">
                              Model: {normalizedBusinessSnapshot.businessModelQuality}
                            </span>
                          )}
                          {normalizedBusinessSnapshot.operatingModel && (
                            <span className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-foreground">
                              Ops: {normalizedBusinessSnapshot.operatingModel}
                            </span>
                          )}
                          {normalizedBusinessSnapshot.valueChainPosition && (
                            <span className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-foreground">
                              Value chain: {normalizedBusinessSnapshot.valueChainPosition}
                            </span>
                          )}
                          {normalizedBusinessSnapshot.demandShape && (
                            <span className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-foreground">
                              Demand: {normalizedBusinessSnapshot.demandShape}
                            </span>
                          )}
                          {normalizedBusinessSnapshot.dominantSegment && (
                            <span className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-foreground">
                              Core: {normalizedBusinessSnapshot.dominantSegment}
                            </span>
                          )}
                          {normalizedBusinessSnapshot.emergingSegment && (
                            <span className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-foreground">
                              Emerging: {normalizedBusinessSnapshot.emergingSegment}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {(normalizedBusinessSnapshot.topRevenueDrivers.length > 0 ||
                      normalizedBusinessSnapshot.topGrowthDrivers.length > 0) && (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          What Drives the Business
                        </p>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {normalizedBusinessSnapshot.topRevenueDrivers.length > 0 && (
                            <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                              <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                                Top Revenue Drivers
                              </p>
                              <ul className="mt-2 space-y-1">
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
                          {normalizedBusinessSnapshot.topGrowthDrivers.length > 0 && (
                            <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                              <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                                Top Growth Drivers
                              </p>
                              <ul className="mt-2 space-y-1">
                                {normalizedBusinessSnapshot.topGrowthDrivers.map((driver, idx) => (
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
                        </div>
                      </div>
                    )}

                    {(normalizedBusinessSnapshot.keyDependencies.length > 0 ||
                      normalizedBusinessSnapshot.keyRisksToModel.length > 0) && (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          What Can Break the Model
                        </p>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {normalizedBusinessSnapshot.keyDependencies.length > 0 && (
                            <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                              <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                                Key Dependencies
                              </p>
                              <ul className="mt-2 space-y-1">
                                {normalizedBusinessSnapshot.keyDependencies.map((dependency, idx) => (
                                  <li
                                    key={idx}
                                    className="text-xs text-foreground leading-snug border-l border-amber-400/50 pl-2"
                                  >
                                    {dependency}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {normalizedBusinessSnapshot.keyRisksToModel.length > 0 && (
                            <div className="rounded-lg border border-border/50 bg-background/70 p-3">
                              <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                                Key Risks to Model
                              </p>
                              <ul className="mt-2 space-y-1">
                                {normalizedBusinessSnapshot.keyRisksToModel.map((risk, idx) => (
                                  <li
                                    key={idx}
                                    className="text-xs text-foreground leading-snug border-l border-red-400/50 pl-2"
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

                    {normalizedBusinessSnapshot.mixShiftSummary && (
                      <div className="rounded-lg border border-sky-200/60 bg-sky-50/60 p-3 space-y-1 dark:border-sky-700/30 dark:bg-sky-950/10">
                        <p className="text-[10px] uppercase tracking-wide text-sky-700 dark:text-sky-300 font-semibold">
                          Mix Shift
                        </p>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {normalizedBusinessSnapshot.mixShiftSummary}
                        </p>
                      </div>
                    )}

                    {normalizedBusinessSnapshot.sourceUrls.length > 0 && (
                      <details className="rounded-lg border border-border/40 bg-background/60 p-3">
                        <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground">
                          Sources
                        </summary>
                        <div className="mt-2 flex flex-col gap-1.5">
                          {normalizedBusinessSnapshot.sourceUrls.map((url, idx) => (
                            <a
                              key={`${url}-${idx}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 break-all"
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Business snapshot data not available yet.
                  </p>
                )}
              </div>
            </div>

            {(segmentsData && segmentsData.length > 0) ||
            (revenueData && revenueData.length > 0) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {segmentsData && segmentsData.length > 0 && (
                  <div className="bg-muted/40 rounded-xl p-4 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-all duration-300">
                    <BusinessSegmentsDisplay
                      segments={segmentsData as BusinessSegment[]}
                    />
                  </div>
                )}

                {revenueData && revenueData.length > 0 && (
                  <div className="bg-muted/40 rounded-xl p-4 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-all duration-300">
                    <h4 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wide">
                      Segment Revenue Breakdown
                    </h4>
                    <SegmentRevenueDisplay
                      revenues={revenueData as SegmentRevenue[]}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard id="community" title="Community">
          <CompanyCommentsSection companyCode={code} />
        </SectionCard>
      </div>
    </div>
  );
}
