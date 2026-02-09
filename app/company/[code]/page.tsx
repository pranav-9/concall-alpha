import React from "react";
import type { Metadata } from "next";
import { ChartLineLabel } from "./chart";
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

type GrowthScenario = {
  confidence?: number;
  key_drivers?: string[];
  key_risks?: string[];
  fcf_direction?: string | null;
  margin_trend_bps?: string | null;
  revenue_growth_pct?: string | null;
};

type GrowthOutlook = {
  fiscal_year?: string | null;
  horizon_years?: number | null;
  horizon_quarters?: number | null;
  visibility_score?: number | null;
  summary_bullets?: string[] | null;
   growth_score?: number | string | null;
   growth_score_formula?: string | null;
   growth_score_steps?: string[] | null;
  scenarios?: {
    base?: GrowthScenario;
    upside?: GrowthScenario;
    downside?: GrowthScenario;
  };
};

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `${code} – Concall Alpha`,
    description: `Company detail for ${code} on Concall Alpha.`,
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
    .select("name, sector, sub_sector, exchange, country, code")
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

  const { data: growthData } = await supabase
    .from("growth_outlook")
    .select("details, growth_score, growth_score_formula, growth_score_steps")
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
      <div className="flex w-full px-16 p-8 justify-center items-center">
        <p className="text-gray-400 text-lg">
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
  const growthOutlook = growthData?.[0]?.details as GrowthOutlook | undefined;
  const growthScoreRaw =
    growthData?.[0]?.growth_score ?? (growthOutlook as GrowthOutlook | undefined)?.growth_score ?? null;
  const growthScore =
    typeof growthScoreRaw === "number"
      ? growthScoreRaw
      : typeof growthScoreRaw === "string"
      ? parseFloat(growthScoreRaw)
      : null;
  const growthFormula =
    growthData?.[0]?.growth_score_formula ??
    (growthOutlook as GrowthOutlook | undefined)?.growth_score_formula ??
    null;
  const growthSteps =
    (growthData?.[0]?.growth_score_steps as string[] | null | undefined) ??
    (growthOutlook as GrowthOutlook | undefined)?.growth_score_steps ??
    null;

  const parseDetails = (val: unknown) => {
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

  return (
    <div className="flex w-full gap-6 px-6 lg:px-12 py-6">
      <SidebarNavigation />

      {/* main content - 80% width */}
      <div id="main-content" className="flex-1 flex flex-col gap-4">
        <OverviewCard
          companyInfo={{
            code: companyRow?.code ?? code,
            name: companyRow?.name ?? undefined,
            sector: companyRow?.sector ?? undefined,
            subSector: companyRow?.sub_sector ?? undefined,
            exchange: companyRow?.exchange ?? undefined,
            country: companyRow?.country ?? undefined,
          }}
        />

        <SectionCard id="sentiment-score" title="Concall Sentiment Score">
          <div className="flex flex-col gap-4">
            {/* Trend indicator */}
            <div
              className={`flex items-center gap-2 p-2 rounded-lg ${
                trend.direction === "improving"
                  ? "bg-emerald-500/20 border border-emerald-500/50"
                  : trend.direction === "declining"
                  ? "bg-red-500/20 border border-red-500/50"
                  : "bg-amber-500/20 border border-amber-500/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {trend.direction === "improving" ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300">
                      Trend: Improving
                    </span>
                  </>
                ) : trend.direction === "declining" ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-400" />
                    <span className="text-xs font-semibold text-red-300">
                      Trend: Declining
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-amber-300">
                    ↔ Trend: Stable
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-300 ml-auto">
                {trend.description}
              </span>
            </div>

            {/* Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
                <div className="flex justify-center">
                  <ChartLineLabel chartData={chartData} />
                </div>
                <p className="text-[11px] text-gray-400 text-center">
                  Showing the latest 12 quarterly points (newest to oldest).
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <p className="text-xs font-semibold text-gray-200">
                  Score context (latest 12 quarters)
                </p>
                <div className="flex justify-center">
                  <div className="w-full">
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
                          const details = parseDetails(q.details) as ConcallDetails | null;
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
                              <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 shadow-sm h-full w-[90%]">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-gray-200">
                                      {detailQuarterLabel}
                                    </span>
                                    {isLatest && (
                                      <span className="text-[10px] font-semibold text-blue-300 px-2 py-0.5 rounded-full bg-blue-900/40">
                                        Latest
                                      </span>
                                    )}
                                  </span>
                                  <ConcallScore score={detailScore} size="sm" />
                                </div>
                                {/* category intentionally hidden */}
                                {guidance && (
                                  <p className="text-[11px] text-gray-200 leading-snug line-clamp-3 mb-2">
                                    {guidance}
                                  </p>
                                )}
                                {quarterSummary.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                                      Quarter summary
                                    </p>
                                    <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-gray-500">
                                      {quarterSummary.map((item, rIdx) => (
                                        <li
                                          key={rIdx}
                                          className="text-[11px] text-gray-200 leading-snug line-clamp-2"
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {rationale.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                                      Rationale
                                    </p>
                                    <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-gray-500">
                                      {rationale.map((item, rIdx) => (
                                        <li
                                          key={rIdx}
                                          className="text-[11px] text-gray-200 leading-snug line-clamp-2"
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {risks.length > 0 && (
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                                      Risks
                                    </p>
                                    <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-gray-500">
                                      {risks.map((item, rIdx) => (
                                        <li
                                          key={rIdx}
                                          className="text-[11px] text-gray-200 leading-snug line-clamp-2"
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {!details && (
                                  <p className="text-[10px] text-gray-500 mt-2">
                                    No additional context available.
                                  </p>
                                )}
                                {details && (
                                  <Drawer direction="right">
                                    <DrawerTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-3 text-xs"
                                      >
                                        Open details
                                      </Button>
                                    </DrawerTrigger>
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
                                      <div className="px-4 pb-4 space-y-4 text-sm text-gray-200 max-h-[75vh] overflow-y-auto">
                                        <div className="flex items-center gap-2">
                                          <ConcallScore
                                            score={detailScore}
                                            size="sm"
                                          />
                                          {isLatest && (
                                            <span className="text-[11px] font-semibold text-blue-300 px-2 py-0.5 rounded-full bg-blue-900/40">
                                              Latest
                                            </span>
                                          )}
                                          {category && (
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-200">
                                              {category}
                                            </span>
                                          )}
                                          {typeof confidence === "number" && (
                                            <span className="text-[11px] text-gray-400">
                                              Confidence:{" "}
                                              {(confidence * 100).toFixed(0)}%
                                            </span>
                                          )}
                                        </div>
                                        {quarterSummary.length > 0 && (
                                          <div className="space-y-1">
                                            <p className="text-sm font-semibold text-gray-100 uppercase tracking-wide">
                                              Quarter summary
                                            </p>
                                            <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-gray-500">
                                              {quarterSummary.map((item, rIdx) => (
                                                <li
                                                  key={rIdx}
                                                  className="text-xs text-gray-300 leading-snug"
                                                >
                                                  {item}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {resultsSummary.length > 0 && (
                                          <div className="space-y-1">
                                            <p className="text-sm font-semibold text-gray-100 uppercase tracking-wide">
                                              Results summary
                                            </p>
                                            <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-gray-500">
                                              {resultsSummary.map((item, rIdx) => (
                                                <li
                                                  key={rIdx}
                                                  className="text-xs text-gray-300 leading-snug"
                                                >
                                                  {item}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {guidance && (
                                          <div className="space-y-1">
                                            <p className="text-sm font-semibold text-gray-100 uppercase tracking-wide">
                                              Guidance
                                            </p>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                              {guidance}
                                            </p>
                                          </div>
                                        )}
                                        {rationale.length > 0 && (
                                          <div className="space-y-1">
                                            <p className="text-sm font-semibold text-gray-100 uppercase tracking-wide">
                                              Rationale
                                            </p>
                                            <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-gray-500">
                                              {rationale.map((item, rIdx) => (
                                                <li
                                                  key={rIdx}
                                                  className="text-xs text-gray-300 leading-snug"
                                                >
                                                  {item}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {risks.length > 0 && (
                                          <div className="space-y-1">
                                            <p className="text-sm font-semibold text-gray-100 uppercase tracking-wide">
                                              Risks
                                            </p>
                                            <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-gray-500">
                                              {risks.map((item, rIdx) => (
                                                <li
                                                  key={rIdx}
                                                  className="text-xs text-gray-300 leading-snug"
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
                        <CarouselPrevious className="static translate-x-0 translate-y-0" />
                        <CarouselNext className="static translate-x-0 translate-y-0" />
                      </div>
                    </Carousel>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard id="placeholder" title="Future Growth Prospects">
          {growthOutlook ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
                {growthOutlook.fiscal_year && (
                  <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-100">
                    Horizon: {growthOutlook.fiscal_year}
                  </span>
                )}
                {typeof growthOutlook.horizon_years === "number" && (
                  <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-100">
                    {growthOutlook.horizon_years} yr outlook
                  </span>
                )}
                {typeof growthOutlook.visibility_score === "number" && (
                  <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-100">
                    Visibility: {(growthOutlook.visibility_score * 100).toFixed(0)}%
                  </span>
                )}
                {typeof growthScore === "number" && (
                  <span className="px-2 py-1 rounded-full bg-emerald-900/60 text-emerald-100 border border-emerald-700/50">
                    Growth score: {growthScore.toFixed(1)}
                  </span>
                )}
              </div>

              {Array.isArray(growthOutlook.summary_bullets) &&
                growthOutlook.summary_bullets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-100">Summary</p>
                    <ul className="space-y-1">
                      {growthOutlook.summary_bullets.map((b, idx) => (
                        <li key={idx} className="text-sm text-gray-300 leading-snug">
                          • {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {(growthFormula || (growthSteps && growthSteps.length > 0)) && (
                <div className="space-y-1 text-xs text-gray-400 bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                  <p className="font-semibold text-gray-200 text-[11px] uppercase tracking-wide">
                    How this growth score is computed
                  </p>
                  {growthFormula && <p className="text-gray-300">{growthFormula}</p>}
                  {growthSteps && growthSteps.length > 0 && (
                    <ul className="list-disc list-inside space-y-1">
                      {growthSteps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["base", "upside", "downside"] as const).map((scenarioKey) => {
                  const scenario = growthOutlook.scenarios?.[scenarioKey] as GrowthScenario | undefined;
                  if (!scenario) return null;
                  const drivers = Array.isArray(scenario.key_drivers) ? scenario.key_drivers : [];
                  const risks = Array.isArray(scenario.key_risks) ? scenario.key_risks : [];
                  return (
                    <div
                      key={scenarioKey}
                      className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-200">
                        <span className="font-semibold capitalize">{scenarioKey} case</span>
                        {typeof scenario.confidence === "number" && (
                          <span className="text-[11px] text-gray-400">
                            {(scenario.confidence * 100).toFixed(0)}% conf
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {scenario.revenue_growth_pct && (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-700/40 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                              Growth
                            </span>
                            <span className="text-sm font-semibold text-emerald-100">
                              {scenario.revenue_growth_pct}
                            </span>
                          </div>
                        )}
                        <div className="text-[11px] text-gray-300 space-y-1">
                          {scenario.margin_trend_bps && <p>Margin trend: {scenario.margin_trend_bps}</p>}
                          {scenario.fcf_direction && <p>FCF: {scenario.fcf_direction}</p>}
                        </div>
                      </div>
                      {drivers.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                            Drivers
                          </p>
                          <ul className="space-y-1">
                            {drivers.slice(0, 3).map((d, idx) => (
                              <li key={idx} className="text-[11px] text-gray-200 leading-snug">
                                • {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {risks.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                            Risks
                          </p>
                          <ul className="space-y-1">
                            {risks.slice(0, 3).map((r, idx) => (
                              <li key={idx} className="text-[11px] text-gray-200 leading-snug">
                                • {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-700/70 bg-gray-900/40 p-6 text-sm text-gray-400">
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
            <div className="text-gray-400 text-sm">
              No strategy data available
            </div>
          )}
        </SectionCard>

        <SectionCard id="business-overview" title="Business Segments">
          {/* Business Segments and Revenue on same row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Business Segments */}
            {segmentsData && segmentsData.length > 0 && (
              <div className="bg-black/40 rounded-xl p-4 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-all duration-300">
                <BusinessSegmentsDisplay
                  segments={segmentsData as BusinessSegment[]}
                />
              </div>
            )}

            {/* Segment Revenue Chart */}
            {revenueData && revenueData.length > 0 && (
              <div className="bg-black/40 rounded-xl p-4 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-all duration-300">
                <h4 className="font-semibold text-gray-100 mb-2 text-xs uppercase tracking-wide">
                  Segment Revenue Breakdown
                </h4>
                <SegmentRevenueDisplay
                  revenues={revenueData as SegmentRevenue[]}
                />
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
