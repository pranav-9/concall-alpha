import { Suspense } from "react";

import { normalizeBusinessSnapshot } from "@/lib/business-snapshot/normalize";
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import { normalizeKeyVariablesSnapshot } from "@/lib/key-variables-snapshot/normalize";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import { createClient } from "@/lib/supabase/server";
import type { GuidanceSnapshotRow } from "@/lib/guidance-snapshot/types";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import type { KeyVariablesSnapshotRow } from "@/lib/key-variables-snapshot/types";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import type { CompanyPageOverviewCacheRow } from "@/lib/company-overview-cache";

import { SectionCard } from "../components/section-card";
import { BusinessSnapshotSection } from "../components/business-snapshot-section";
import { FutureGrowthSection } from "../components/future-growth-section";
import { GuidanceSnapshotSummary } from "../components/guidance-snapshot-summary";
import { IndustryContextSection } from "../components/industry-context-section";
import { KeyVariablesSection } from "../components/key-variables-section";
import { MissingSectionState } from "../components/missing-section-state";
import { MoatAnalysisSection } from "../components/moat-analysis-section";
import { SectionLoading } from "../components/section-loading";
import { SubSectorSection } from "../components/sub-sector-section";
import {
  CompanyCommentsSection,
  GuidanceHistorySection,
  QuarterlyScoreSection,
} from "../components/deferred-company-sections";
import { calculateTrend, parseSummary, transformToChartData } from "../utils";
import type { QuarterData } from "../types";
import { formatShortDate } from "./page-helpers";
import {
  getPercentileTone,
} from "./display-tokens";
import { slugifySector } from "@/app/sector/utils";

type CompanyDetailSectionProps = {
  overview: CompanyPageOverviewCacheRow;
};

const missingSectionState = (
  overview: CompanyPageOverviewCacheRow,
  sectionId: string,
  sectionTitle: string,
  description: string,
) => (
  <MissingSectionState
    companyCode={overview.company_code}
    companyName={overview.company_name}
    sectionId={sectionId}
    sectionTitle={sectionTitle}
    description={description}
  />
);

export function IndustryContextPanel({ overview }: CompanyDetailSectionProps) {
  return (
    <Suspense fallback={<SectionLoading id="industry-context" title="Industry Context" />}>
      <IndustryContextSection
        companyCode={overview.company_code}
        companyName={overview.company_name}
        rankInfo={
          overview.sector_rank != null &&
          overview.sector_total != null &&
          overview.sector_percentile != null
            ? {
                rank: overview.sector_rank,
                total: overview.sector_total,
                percentile: overview.sector_percentile,
                href: overview.sector ? `/sector/${slugifySector(overview.sector)}` : undefined,
              }
            : null
        }
      />
    </Suspense>
  );
}

export function SubSectorPanel({ overview }: CompanyDetailSectionProps) {
  return (
    <Suspense fallback={<SectionLoading id="sub-sector" title="Sub-sectors" />}>
      <SubSectorSection
        companyCode={overview.company_code}
        companyName={overview.company_name}
      />
    </Suspense>
  );
}

export async function BusinessSnapshotPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const [{ data: companyRow }, { data: businessSnapshotData }, { data: moatAnalysisData }] =
    await Promise.all([
      supabase
        .from("company")
        .select("website")
        .eq("code", overview.company_code)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("business_snapshot")
        .select(
          "company, generated_at, segment_profiles, business_snapshot, historical_economics, about_company, revenue_breakdown, revenue_engine, details, snapshot_phase, snapshot_source, source_urls",
        )
        .eq("company", overview.company_code)
        .order("generated_at", { ascending: false })
        .limit(1),
      supabase
        .from("moat_analysis")
        .select("id")
        .eq("company_code", overview.company_code)
        .limit(1),
    ]);
  const normalizedBusinessSnapshot = normalizeBusinessSnapshot({
    companyCode: overview.company_code,
    companyWebsite: (companyRow as { website?: string | null } | null)?.website ?? null,
    snapshotRow: businessSnapshotData?.[0] ?? null,
  });

  return (
    <BusinessSnapshotSection
      snapshot={normalizedBusinessSnapshot}
      companyCode={overview.company_code}
      companyName={overview.company_name}
      generatedAtShort={formatShortDate(normalizedBusinessSnapshot?.generatedAtRaw)}
      hasMoatAnalysis={Boolean(moatAnalysisData?.[0])}
    />
  );
}

export async function MoatAnalysisPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const { data: moatAnalysisData } = await supabase
    .from("moat_analysis")
    .select(
      "id, company_code, company_name, industry, rating, tier, gatekeeper_answer, cycle_tested, assessment_payload, assessment_version, created_at, updated_at",
    )
    .eq("company_code", overview.company_code)
    .limit(1);
  const normalizedMoatAnalysis = normalizeMoatAnalysis(
    (moatAnalysisData?.[0] as MoatAnalysisRow | undefined) ?? null,
  );
  const moatGeneratedAtShort = formatShortDate(normalizedMoatAnalysis?.updatedAtRaw);

  return (
    <SectionCard
      id="moat-analysis"
      title="Moat Analysis"
      feedbackEnabled={Boolean(normalizedMoatAnalysis)}
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
      headerAction={
        moatGeneratedAtShort ? (
          <span className="text-[11px] text-muted-foreground">{moatGeneratedAtShort}</span>
        ) : null
      }
    >
      {normalizedMoatAnalysis ? (
        <MoatAnalysisSection
          analysis={normalizedMoatAnalysis}
          generatedAtShort={moatGeneratedAtShort}
        />
      ) : (
        missingSectionState(
          overview,
          "moat-analysis",
          "Moat Analysis",
          "We have not generated a competitive moat analysis for this company yet.",
        )
      )}
    </SectionCard>
  );
}

export async function QuarterlyScorePanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("concall_analysis")
    .select()
    .eq("company_code", overview.company_code)
    .order("fy", { ascending: false })
    .order("qtr", { ascending: false })
    .limit(12);

  if (error) throw error;
  const quarters = ((data ?? []) as QuarterData[]).map((row) => ({
    ...row,
    summary: parseSummary(row.summary),
  }));
  const chartData = transformToChartData(quarters);
  const detailQuarters = quarters.slice(0, 12);
  const trend = calculateTrend(quarters.slice(0, 12));
  const headerPills = [
    chartData.length > 0 ? "Score trend" : null,
    detailQuarters.length > 0 ? "Quarter detail" : null,
    trend ? "Trend" : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <SectionCard
      id="sentiment-score"
      title="Quarterly Score"
      feedbackEnabled
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
      headerPills={headerPills}
      headerRankPills={
        overview.quarter_rank != null &&
        overview.quarter_total != null &&
        overview.quarter_percentile != null
          ? [
              {
                label: `Q Rank ${overview.quarter_rank}/${overview.quarter_total}`,
                tone: getPercentileTone(overview.quarter_percentile),
                href: "/leaderboards?tab=sentiment",
              },
              {
                label: `Top ${Math.round(overview.quarter_percentile)}%`,
                tone: getPercentileTone(overview.quarter_percentile),
                href: "/leaderboards?tab=sentiment",
              },
            ]
          : undefined
      }
    >
      <QuarterlyScoreSection chartData={chartData} detailQuarters={detailQuarters} trend={trend} />
    </SectionCard>
  );
}

export async function KeyVariablesPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const { data: keyVariablesSnapshotData } = await supabase
    .from("key_variables_snapshot")
    .select(
      "company_code, generated_at, discovery_summary, full_variable_list, deep_treatment, section_synthesis, details, updated_at",
    )
    .eq("company_code", overview.company_code)
    .order("generated_at", { ascending: false })
    .limit(1);
  const normalizedKeyVariablesSnapshot = normalizeKeyVariablesSnapshot(
    (keyVariablesSnapshotData?.[0] as KeyVariablesSnapshotRow | undefined) ?? null,
  );
  const headerPills = normalizedKeyVariablesSnapshot
    ? [
        normalizedKeyVariablesSnapshot.discoverySummary ? "Discovery summary" : null,
        normalizedKeyVariablesSnapshot.deepTreatment.length > 0 ? "Deep treatment" : null,
        normalizedKeyVariablesSnapshot.deepTreatment.some((item) => Boolean(item.kpiHistory))
          ? "KPI history"
          : null,
      ].filter((value): value is string => Boolean(value))
    : [];

  return (
    <SectionCard
      id="key-variables"
      title="Key Variables"
      feedbackEnabled={Boolean(normalizedKeyVariablesSnapshot)}
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
      headerPills={headerPills}
      headerDescription="The non-financial variables that best explain whether growth is healthy, sustainable, and improving in quality."
      headerAction={
        normalizedKeyVariablesSnapshot?.generatedAtRaw ? (
          <span className="text-[11px] text-muted-foreground">
            {formatShortDate(normalizedKeyVariablesSnapshot.generatedAtRaw)}
          </span>
        ) : undefined
      }
    >
      {normalizedKeyVariablesSnapshot ? (
        <KeyVariablesSection
          snapshot={normalizedKeyVariablesSnapshot}
          companyCode={overview.company_code}
          companyName={overview.company_name}
        />
      ) : (
        missingSectionState(
          overview,
          "key-variables",
          "Key Variables",
          "We have not generated a key variables snapshot for this company yet.",
        )
      )}
    </SectionCard>
  );
}

export async function FutureGrowthPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const { data: growthData } = await supabase
    .from("growth_outlook")
    .select("*")
    .or(`company.eq.${overview.company_code},company.eq.${overview.company_name}`)
    .order("run_timestamp", { ascending: false })
    .limit(1);
  const normalizedGrowthOutlook = normalizeGrowthOutlook({
    details: growthData?.[0]?.details,
    growthScore: growthData?.[0]?.growth_score,
    runTimestamp: growthData?.[0]?.run_timestamp,
    companyName: growthData?.[0]?.company_name,
    fiscalYear: growthData?.[0]?.fiscal_year,
    horizonQuarters: growthData?.[0]?.horizon_quarters,
    horizonYears: growthData?.[0]?.horizon_years,
    baseGrowthPct: growthData?.[0]?.base_growth_pct,
    upsideGrowthPct: growthData?.[0]?.upside_growth_pct,
    downsideGrowthPct: growthData?.[0]?.downside_growth_pct,
    growthScoreFormula: growthData?.[0]?.growth_score_formula,
    growthScoreSteps: growthData?.[0]?.growth_score_steps,
    factBase: growthData?.[0]?.fact_base,
    summaryBullets: growthData?.[0]?.summary_bullets,
    catalysts: growthData?.[0]?.catalysts,
    scenarios: growthData?.[0]?.scenarios,
  });

  return (
    <FutureGrowthSection
      outlook={normalizedGrowthOutlook}
      companyCode={overview.company_code}
      companyName={overview.company_name}
      rankInfo={
        overview.growth_rank != null &&
        overview.growth_total != null &&
        overview.growth_percentile != null
          ? {
              rank: overview.growth_rank,
              total: overview.growth_total,
              percentile: overview.growth_percentile,
              href: "/leaderboards?tab=growth",
            }
          : null
      }
    />
  );
}

export async function GuidanceHistoryPanel({ overview }: CompanyDetailSectionProps) {
  const supabase = await createClient();
  const [guidanceTrackingResult, guidanceSnapshotResult] = await Promise.all([
    supabase
      .from("guidance_tracking")
      .select(
        "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details",
      )
      .eq("company_code", overview.company_code)
      .order("generated_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("guidance_snapshot")
      .select(
        "company_code, generated_at, analysis_window_quarters, guidance_style_classification, big_picture_growth_guidance, current_year_revenue_guidance, prior_two_year_accuracy, credibility_verdict, guidance_items, source_files, details, updated_at",
      )
      .eq("company_code", overview.company_code)
      .order("generated_at", { ascending: false })
      .limit(1),
  ]);
  const normalizedGuidanceSnapshot = normalizeGuidanceSnapshot(
    (guidanceSnapshotResult.data?.[0] as GuidanceSnapshotRow | undefined) ?? null,
  );
  const legacyGuidanceItems = normalizeGuidanceTrackingRows(
    (guidanceTrackingResult.data as GuidanceTrackingRow[] | null | undefined) ?? null,
  );
  const guidanceItems = normalizedGuidanceSnapshot?.guidanceItems ?? legacyGuidanceItems;
  const guidanceSnapshotUpdatedAtShort = formatShortDate(
    normalizedGuidanceSnapshot?.updatedAtRaw ?? normalizedGuidanceSnapshot?.generatedAtRaw,
    true,
  );
  const guidanceSnapshotAnalysisWindowLabel =
    normalizedGuidanceSnapshot?.analysisWindowQuarters != null
      ? `${normalizedGuidanceSnapshot.analysisWindowQuarters} qtr${
          normalizedGuidanceSnapshot.analysisWindowQuarters === 1 ? "" : "s"
        }`
      : null;
  const guidanceSnapshotSourceFilesLabel =
    normalizedGuidanceSnapshot?.sourceFiles.length
      ? `${normalizedGuidanceSnapshot.sourceFiles.length} source file${
          normalizedGuidanceSnapshot.sourceFiles.length === 1 ? "" : "s"
        }`
      : null;
  const currentGuidanceLabel =
    normalizedGuidanceSnapshot?.currentYearRevenueGuidance?.officialCurrentGuidancePercent != null
      ? `Current guidance ${normalizedGuidanceSnapshot.currentYearRevenueGuidance.officialCurrentGuidancePercent}%`
      : normalizedGuidanceSnapshot?.currentYearRevenueGuidance
        ? "Current guidance"
        : null;
  const headerPills = normalizedGuidanceSnapshot
    ? [
        guidanceSnapshotAnalysisWindowLabel,
        guidanceSnapshotUpdatedAtShort ? `Updated ${guidanceSnapshotUpdatedAtShort}` : null,
        guidanceSnapshotSourceFilesLabel,
        currentGuidanceLabel,
        normalizedGuidanceSnapshot.currentYearRevenueGuidance?.sourceQuarterTimeline.length
          ? "Guidance evolution"
          : null,
        normalizedGuidanceSnapshot.priorTwoYearAccuracy.length > 0 ? "Accuracy" : null,
        normalizedGuidanceSnapshot.credibilityVerdict ? "Credibility verdict" : null,
      ].filter((value): value is string => Boolean(value))
    : [];
  return (
    <SectionCard
      id="guidance-history"
      title="Guidance History"
      feedbackEnabled={Boolean(normalizedGuidanceSnapshot || guidanceItems.length > 0)}
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
      headerPills={headerPills}
      headerAction={
        <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          {guidanceItems.length > 0
            ? `${guidanceItems.length} tracked`
            : normalizedGuidanceSnapshot
              ? "Live snapshot"
              : "Not ready"}
        </span>
      }
    >
      {normalizedGuidanceSnapshot ? (
        <div className="space-y-4">
          <GuidanceSnapshotSummary snapshot={normalizedGuidanceSnapshot} />
          {guidanceItems.length > 0 ? <GuidanceHistorySection items={guidanceItems} /> : null}
        </div>
      ) : guidanceItems.length > 0 ? (
        <GuidanceHistorySection items={guidanceItems} />
      ) : (
        missingSectionState(
          overview,
          "guidance-history",
          "Guidance History",
          "We have not tracked meaningful management guidance for this company yet.",
        )
      )}
    </SectionCard>
  );
}

export function CommunityPanel({ overview }: CompanyDetailSectionProps) {
  return (
    <SectionCard
      id="community"
      title="Community"
      feedbackEnabled
      feedbackCompanyCode={overview.company_code}
      feedbackCompanyName={overview.company_name}
    >
      <CompanyCommentsSection companyCode={overview.company_code} />
    </SectionCard>
  );
}
