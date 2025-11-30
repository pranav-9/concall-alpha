import React from "react";
import { ChartLineLabel } from "./chart";
import { createClient } from "@/lib/supabase/server";
import { QuarterData, BusinessSegment, SegmentRevenue } from "../types";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { OverviewCard } from "../components/overview-card";
import { SectionCard } from "../components/section-card";
import { parseSummary, transformToChartData, calculateTrend } from "../utils";
import { BusinessSegmentsDisplay } from "../components/business-segments-display";
import { SegmentRevenueDisplay } from "../components/segment-revenue-display";
import { TrendingUp, TrendingDown } from "lucide-react";

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = await createClient();

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
  const trend = calculateTrend(data);

  return (
    <div className="flex w-full gap-8 px-8 lg:px-16 py-8">
      <SidebarNavigation />

      {/* main content - 80% width */}
      <div id="main-content" className="flex-1 flex flex-col gap-8">
        <OverviewCard data={latestQuarterData} />

        <SectionCard id="business-overview" title="Business Segments">
          {/* Business Segments and Revenue on same row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Business Segments */}
            {segmentsData && segmentsData.length > 0 && (
              <div>
                <BusinessSegmentsDisplay
                  segments={segmentsData as BusinessSegment[]}
                />
              </div>
            )}

            {/* Segment Revenue Chart */}
            {revenueData && revenueData.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-100 mb-3 text-sm uppercase tracking-wide">
                  Segment Revenue Breakdown
                </h4>
                <SegmentRevenueDisplay
                  revenues={revenueData as SegmentRevenue[]}
                />
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard id="competitive-strategy" title="Competitive Strategy">
          <div className="text-gray-300 leading-relaxed">
            <p className="text-sm">
              Understand {latestQuarterData.company_code}&apos;s strategic
              positioning, competitive advantages, and market opportunities.
              This section analyzes the company&apos;s strategy discussed during
              the latest earnings call.
            </p>
          </div>
        </SectionCard>

        <SectionCard id="sentiment-score" title="Concall Sentiment Score">
          <div className="flex flex-col gap-4">
            {/* Trend indicator */}
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
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
                    <span className="text-sm font-semibold text-emerald-300">
                      Trend: Improving
                    </span>
                  </>
                ) : trend.direction === "declining" ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-400" />
                    <span className="text-sm font-semibold text-red-300">
                      Trend: Declining
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-amber-300">
                    ↔ Trend: Stable
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-300 ml-auto">
                {trend.description}
              </span>
            </div>

            {/* Chart */}
            <div className="flex justify-center">
              <ChartLineLabel chartData={chartData} />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
