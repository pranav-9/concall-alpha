import React, { Suspense } from "react";
import type { Metadata } from "next";
import { isCompanyNew } from "@/lib/company-freshness";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { createClient } from "@/lib/supabase/server";
import { SECTION_MAP } from "../constants";
import {
  QuarterData,
} from "../types";
import { CompanyPageWorkspace } from "../components/company-page-workspace";
import { OverviewCard } from "../components/overview-card";
import CompanyWatchlistSlot, {
  WatchlistSlotFallback,
} from "../components/company-watchlist-slot";
import { IndustryContextSection } from "../components/industry-context-section";
import { BusinessSnapshotSection } from "../components/business-snapshot-section";
import { SubSectorSection } from "../components/sub-sector-section";
import { SectionLoading } from "../components/section-loading";
import { FutureGrowthSection } from "../components/future-growth-section";
import { GuidanceSnapshotSummary } from "../components/guidance-snapshot-summary";
import { MoatAnalysisSection } from "../components/moat-analysis-section";
import { SectionCard } from "../components/section-card";
import { parseSummary, transformToChartData, calculateTrend } from "../utils";
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";
import { normalizeBusinessSnapshot } from "@/lib/business-snapshot/normalize";
import { normalizeKeyVariablesSnapshot } from "@/lib/key-variables-snapshot/normalize";
import {
  CompanyCommentsSection,
  GuidanceHistorySection,
  QuarterlyScoreSection,
} from "../components/deferred-company-sections";
import { KeyVariablesSection } from "../components/key-variables-section";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import { moatTierGradeLabel } from "@/lib/moat-analysis/tier-class";
import type { KeyVariablesSnapshotRow } from "@/lib/key-variables-snapshot/types";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import type { GuidanceSnapshotRow } from "@/lib/guidance-snapshot/types";

import {
  computeAvgScore,
  compareNullableNumbers,
  formatPctLabel,
  formatShortDate,
  type SectorRankInfo,
} from "./page-helpers";
import {
  getGuidanceCredibilityVerdictDisplay,
  getPercentileTone,
  type OverviewBodyPillTone,
} from "./display-tokens";
import { MissingSectionState } from "../components/missing-section-state";


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

  // Round 1: queries that depend only on `code` — run in parallel.
  const [
    { data: companyRow },
    concallResult,
    { data: businessSnapshotData },
    { data: industryPreviewRows },
    guidanceTrackingResult,
    guidanceSnapshotResult,
    { data: moatAnalysisData },
    { data: keyVariablesSnapshotData },
    { data: growthRankRows },
  ] = await Promise.all([
    supabase
      .from("company")
      .select("name, sector, sub_sector, exchange, country, code, website, created_at")
      .eq("code", code)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("concall_analysis")
      .select()
      .eq("company_code", code)
      .order("fy", { ascending: false })
      .order("qtr", { ascending: false })
      .limit(12),
    supabase
      .from("business_snapshot")
      .select(
        "company, generated_at, segment_profiles, business_snapshot, historical_economics, about_company, revenue_breakdown, revenue_engine, details, snapshot_phase, snapshot_source, source_urls",
      )
      .eq("company", code)
      .order("generated_at", { ascending: false })
      .limit(1),
    // Lightweight existence + sub_sector probe for sidebar/preview indicators.
    // The full industry analysis JSONB is fetched lazily inside the streaming
    // <IndustryContextSection /> and <SubSectorSection />.
    supabase
      .from("company_industry_analysis")
      .select("sub_sector")
      .eq("company", code)
      .limit(1),
    supabase
      .from("guidance_tracking")
      .select(
        "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details",
      )
      .eq("company_code", code)
      .order("generated_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("guidance_snapshot")
      .select(
        "company_code, generated_at, analysis_window_quarters, guidance_style_classification, big_picture_growth_guidance, current_year_revenue_guidance, prior_two_year_accuracy, credibility_verdict, guidance_items, source_files, details, updated_at",
      )
      .eq("company_code", code)
      .order("generated_at", { ascending: false })
      .limit(1),
    supabase
      .from("moat_analysis")
      .select(
        "id, company_code, company_name, industry, rating, tier, gatekeeper_answer, cycle_tested, assessment_payload, assessment_version, created_at, updated_at",
      )
      .eq("company_code", code)
      .limit(1),
    supabase
      .from("key_variables_snapshot")
      .select(
        "company_code, generated_at, analysis_window_quarters, discovery_summary, full_variable_list, deep_treatment, section_synthesis, source_files, details, updated_at",
      )
      .eq("company_code", code)
      .order("generated_at", { ascending: false })
      .limit(1),
    supabase
      .from("growth_outlook")
      .select("company, growth_score, base_growth_pct, run_timestamp")
      .order("run_timestamp", { ascending: false }),
  ]);

  const { data, error } = concallResult;
  const { data: guidanceTrackingRows, error: guidanceTrackingError } = guidanceTrackingResult;
  const { data: guidanceSnapshotData, error: guidanceSnapshotError } = guidanceSnapshotResult;

  const companyName = companyRow?.name as string | undefined;
  const companyIsNew = isCompanyNew(companyRow?.created_at ?? null);
  const companySector = companyRow?.sector?.trim() || undefined;
  const companySubSector = companyRow?.sub_sector?.trim() || undefined;

  // Round 2: queries that depend on round-1 results but not on each other.
  // Watchlist queries are deferred into <CompanyWatchlistSlot /> so they don't
  // block the page shell.
  const growthOutlookDetailPromise = supabase
    .from("growth_outlook")
    .select("*")
    .or(
      [code ? `company.eq.${code}` : null, companyName ? `company.eq.${companyName}` : null]
        .filter(Boolean)
        .join(",") || `company.eq.${code}`,
    )
    .order("run_timestamp", { ascending: false })
    .limit(1);

  const companyLatestFy = data?.[0]?.fy ?? null;
  const companyLatestQtr = data?.[0]?.qtr ?? null;
  const latestQuarterRowsPromise =
    companyLatestFy != null && companyLatestQtr != null
      ? supabase
          .from("concall_analysis")
          .select("company_code, score")
          .eq("fy", companyLatestFy)
          .eq("qtr", companyLatestQtr)
      : null;

  const sectorPeerPromise = companySector
    ? supabase.from("company").select("code, name").eq("sector", companySector)
    : null;

  const [
    growthDetailResult,
    latestQuarterRowsResult,
    sectorPeerResult,
  ] = await Promise.all([
    growthOutlookDetailPromise,
    latestQuarterRowsPromise,
    sectorPeerPromise,
  ]);

  const growthData = growthDetailResult.data;
  const latestQuarterRowsGlobal = (latestQuarterRowsResult?.data ?? []) as Array<{
    company_code?: unknown;
    score?: unknown;
  }>;
  const sectorPeerRows = sectorPeerResult?.data ?? null;

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
  const industryPreview = (industryPreviewRows?.[0] as { sub_sector?: string | null } | undefined) ?? null;
  const hasIndustryAnalysis = industryPreview != null;
  const industrySubSectorLabel = industryPreview?.sub_sector?.trim() || null;
  const normalizedKeyVariablesSnapshot = normalizeKeyVariablesSnapshot(
    (keyVariablesSnapshotData?.[0] as KeyVariablesSnapshotRow | undefined) ?? null,
  );
  if (guidanceSnapshotError) {
    console.error(`Unable to load guidance snapshot for ${code}:`, guidanceSnapshotError.message);
  }
  if (guidanceTrackingError) {
    console.error(`Unable to load guidance tracking for ${code}:`, guidanceTrackingError.message);
  }
  const normalizedGuidanceSnapshot = guidanceSnapshotError
    ? null
    : normalizeGuidanceSnapshot(
        (guidanceSnapshotData?.[0] as GuidanceSnapshotRow | undefined) ?? null,
      );
  const legacyGuidanceItems = guidanceTrackingError
    ? []
    : normalizeGuidanceTrackingRows(
        (guidanceTrackingRows as GuidanceTrackingRow[] | null | undefined) ?? null,
      );
  const guidanceItems = normalizedGuidanceSnapshot?.guidanceItems ?? legacyGuidanceItems;
  const normalizedMoatAnalysis = normalizeMoatAnalysis(
    (moatAnalysisData?.[0] as MoatAnalysisRow | undefined) ?? null,
  );
  const moatGeneratedAtShort = formatShortDate(normalizedMoatAnalysis?.updatedAtRaw);
  const growthScore = normalizedGrowthOutlook?.growthScore ?? null;
  const businessSnapshotGeneratedAtShort = formatShortDate(normalizedBusinessSnapshot?.generatedAtRaw);
  const keyVariablesGeneratedAtShort = formatShortDate(normalizedKeyVariablesSnapshot?.generatedAtRaw);
  const aboutCompany = normalizedBusinessSnapshot?.aboutCompany ?? null;
  const historicalEconomics = normalizedBusinessSnapshot?.historicalEconomics ?? null;
  const hasHistoricalEconomicsSource =
    normalizedBusinessSnapshot?.hasHistoricalEconomicsSource ?? false;
  const aboutHeading =
    aboutCompany?.aboutShort ?? normalizedBusinessSnapshot?.businessSummaryShort ?? null;
  const aboutSupportingText =
    aboutCompany?.aboutLong ?? normalizedBusinessSnapshot?.businessSummaryLong ?? null;
  const hasHistoricalEconomics = Boolean(
    historicalEconomics?.companyRevenueCagr3y ||
      historicalEconomics?.summary ||
      historicalEconomics?.revenueHistoryBySegment ||
      historicalEconomics?.revenueMixHistoryBySegment ||
      historicalEconomics?.revenueHistoryByUnit ||
      historicalEconomics?.revenueMixHistoryByUnit ||
      hasHistoricalEconomicsSource ||
      (historicalEconomics?.revenueSplitHistory.length ?? 0) > 0 ||
      (historicalEconomics?.segmentGrowthCagr3y.length ?? 0) > 0,
  );
  const hasStructuredBusinessSnapshot =
    Boolean(
      aboutHeading ||
        aboutSupportingText ||
        hasHistoricalEconomics ||
        (normalizedBusinessSnapshot?.revenueBreakdown?.bySegment.length ?? 0) > 0 ||
        (normalizedBusinessSnapshot?.revenueBreakdown?.byProductOrService.length ?? 0) > 0,
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
  const guidanceCurrentGuidanceLabel =
    normalizedGuidanceSnapshot?.currentYearRevenueGuidance?.officialCurrentGuidancePercent != null
      ? `Current guidance ${formatPctLabel(
          normalizedGuidanceSnapshot.currentYearRevenueGuidance.officialCurrentGuidancePercent,
        )}`
      : normalizedGuidanceSnapshot?.currentYearRevenueGuidance
        ? "Current guidance"
        : null;

  const segmentEntries = normalizedBusinessSnapshot?.revenueBreakdown?.bySegment ?? [];
  const quarterlyHeaderPills = [
    chartData.length > 0 ? "Score trend" : null,
    detailQuarters.length > 0 ? "Quarter detail" : null,
    trend ? "Trend" : null,
  ].filter((value): value is string => Boolean(value));
  const keyVariablesHeaderPills = normalizedKeyVariablesSnapshot
    ? [
        normalizedKeyVariablesSnapshot.discoverySummary ? "Discovery summary" : null,
        normalizedKeyVariablesSnapshot.deepTreatment.length > 0 ? "Deep treatment" : null,
        normalizedKeyVariablesSnapshot.deepTreatment.some((item) => Boolean(item.kpiHistory))
          ? "KPI history"
          : null,
      ].filter((value): value is string => Boolean(value))
    : [];
  const guidanceHeaderPills = normalizedGuidanceSnapshot
    ? [
        guidanceSnapshotAnalysisWindowLabel,
        guidanceSnapshotUpdatedAtShort ? `Updated ${guidanceSnapshotUpdatedAtShort}` : null,
        guidanceSnapshotSourceFilesLabel,
        guidanceCurrentGuidanceLabel,
        normalizedGuidanceSnapshot.currentYearRevenueGuidance?.sourceQuarterTimeline.length
          ? "Guidance evolution"
        : null,
        normalizedGuidanceSnapshot.priorTwoYearAccuracy.length > 0 ? "Accuracy" : null,
        normalizedGuidanceSnapshot.credibilityVerdict ? "Credibility verdict" : null,
      ].filter((value): value is string => Boolean(value))
    : [];




  const renderMissingSectionState = (
    sectionId: string,
    sectionTitle: string,
    description: string,
  ) => (
    <MissingSectionState
      companyCode={code}
      companyName={companyRow?.name ?? null}
      sectionId={sectionId}
      sectionTitle={sectionTitle}
      description={description}
    />
  );
  const sidebarSections = [
    {
      ...SECTION_MAP.overview,
      meta:
        companySector
          ? { kind: "text" as const, text: companySector }
          : { kind: "text" as const, text: "Live" },
    },
    {
      ...SECTION_MAP.industryContext,
      meta:
        industrySubSectorLabel
          ? { kind: "text" as const, text: industrySubSectorLabel }
          : hasIndustryAnalysis
            ? { kind: "text" as const, text: "Live" }
            : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.subSector,
      meta: hasIndustryAnalysis
        ? { kind: "text" as const, text: "Live" }
        : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.businessSnapshot,
      meta:
        hasBusinessSnapshotContent
          ? { kind: "text" as const, text: "Live" }
          : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.moatAnalysis,
      meta: normalizedMoatAnalysis?.moatRatingLabel
        ? { kind: "text" as const, text: normalizedMoatAnalysis.moatRatingLabel }
        : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.quarterlyScore,
      meta: { kind: "score" as const, score: latestQuarterData?.score ?? null },
    },
    {
      ...SECTION_MAP.keyVariables,
      meta:
        normalizedKeyVariablesSnapshot?.deepTreatment.length
          ? {
              kind: "count" as const,
              count: normalizedKeyVariablesSnapshot.deepTreatment.length,
              suffix: "vars",
            }
          : normalizedKeyVariablesSnapshot
            ? { kind: "text" as const, text: "Live" }
            : { kind: "text" as const, text: "Soon" },
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
          : normalizedGuidanceSnapshot
            ? { kind: "text" as const, text: "Live" }
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

  let sectorRankInfo: SectorRankInfo = null;

  const latestGrowthByCompany = new Map<
    string,
    { company: string; growthScore: number; base: number | null }
  >();
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

  if (companySector) {
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

  const quarterRankInfo = (() => {
    if (!latestQuarterRowsGlobal.length) return null;

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
    if (quarterTotal === 0) return null;

    const quarterKeys = [code.toUpperCase(), (companyRow?.code ?? "").toUpperCase()].filter(
      Boolean,
    );
    const quarterRank =
      quarterRanked.find((row) => quarterKeys.includes(row.companyCode))?.leaderboardRank ?? null;
    if (quarterRank == null) return null;

    return {
      rank: quarterRank,
      total: quarterTotal,
      percentile: ((quarterTotal - quarterRank + 1) / quarterTotal) * 100,
    };
  })();

  const growthRankInfo = (() => {
    if (!growthRankRows?.length || latestGrowthByCompany.size === 0) return null;

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
    if (growthTotal === 0) return null;

    const growthKeys = [code.toUpperCase(), (companyName ?? "").toUpperCase()].filter(Boolean);
    const growthRank =
      growthRanked.find((row) => growthKeys.includes(row.company))?.leaderboardRank ?? null;
    if (growthRank == null) return null;

    return {
      rank: growthRank,
      total: growthTotal,
      percentile: ((growthTotal - growthRank + 1) / growthTotal) * 100,
    };
  })();

  const credibilityVerdictKey = normalizedGuidanceSnapshot?.credibilityVerdict?.verdict ?? null;
  const credibilityDisplay = getGuidanceCredibilityVerdictDisplay(credibilityVerdictKey);
  const credibilityTone: OverviewBodyPillTone | undefined = (() => {
    const normalized = credibilityVerdictKey?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? null;
    switch (normalized) {
      case "high_trust":
        return "emerald";
      case "credible":
        return "sky";
      case "mixed":
        return "amber";
      case "low_trust":
        return "rose";
      case "not_assessable":
        return "slate";
      default:
        return undefined;
    }
  })();
  const revenueGuidance = normalizedGuidanceSnapshot?.currentYearRevenueGuidance ?? null;
  const revenueGuidanceLabel = (() => {
    if (!revenueGuidance) return null;
    const fyPart = revenueGuidance.fiscalYear ? `${revenueGuidance.fiscalYear} ` : "";
    if (revenueGuidance.officialCurrentGuidancePercent != null) {
      return `${fyPart}Rev: ${revenueGuidance.officialCurrentGuidancePercent}%`;
    }
    if (revenueGuidance.officialCurrentGuidanceText) {
      return `${fyPart}Rev: ${revenueGuidance.officialCurrentGuidanceText}`;
    }
    return null;
  })();

  const moatRatingTone: OverviewBodyPillTone | undefined = (() => {
    switch (normalizedMoatAnalysis?.moatRating) {
      case "wide_moat":
        return "emerald";
      case "narrow_moat":
        return "sky";
      case "moat_at_risk":
        return "amber";
      case "no_moat":
        return "rose";
      default:
        return undefined;
    }
  })();
  const sectorRankPercentile =
    sectorRankInfo?.rank != null && sectorRankInfo.total > 0
      ? ((sectorRankInfo.total - sectorRankInfo.rank + 1) / sectorRankInfo.total) * 100
      : null;
  const businessSegmentMix = (() => {
    const sorted = segmentEntries
      .filter(
        (s): s is typeof s & { revenueSharePercent: number } =>
          typeof s.revenueSharePercent === "number" && s.revenueSharePercent > 0,
      )
      .sort((a, b) => b.revenueSharePercent - a.revenueSharePercent);
    if (sorted.length < 2) return null;
    return sorted.map((s) => ({ name: s.name, sharePct: s.revenueSharePercent }));
  })();

  const overviewSectionPreviews = [
    {
      title: "Industry Context",
      href: "#industry-context",
      bodyPills: (() => {
        const pills: Array<{ label: string; tone: OverviewBodyPillTone }> = [];
        if (companySector) {
          pills.push({ label: companySector, tone: "sky" });
        }
        if (sectorRankInfo?.rank != null && sectorRankPercentile != null) {
          const tone = getPercentileTone(sectorRankPercentile);
          pills.push({
            label: `Sector Rank ${sectorRankInfo.rank}/${sectorRankInfo.total}`,
            tone,
          });
          pills.push({ label: `Top ${Math.round(sectorRankPercentile)}%`, tone });
        }
        return pills.length > 0 ? pills : undefined;
      })(),
      indicator: hasIndustryAnalysis
        ? undefined
        : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Sub-sector Analysis",
      href: "#sub-sector",
      bodyPills: companySubSector
        ? [{ label: companySubSector, tone: "emerald" as const }]
        : undefined,
      indicator: hasIndustryAnalysis
        ? undefined
        : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Business Snapshot",
      href: "#business-overview",
      media: businessSegmentMix
        ? { kind: "segment-bar" as const, segments: businessSegmentMix }
        : undefined,
      indicator: hasBusinessSnapshotContent
        ? undefined
        : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Moat Analysis",
      href: "#moat-analysis",
      indicator: normalizedMoatAnalysis?.moatRatingLabel
        ? {
            kind: "pill" as const,
            label: normalizedMoatAnalysis.moatTier
              ? `${normalizedMoatAnalysis.moatRatingLabel} · ${moatTierGradeLabel(normalizedMoatAnalysis.moatTier)}`
              : normalizedMoatAnalysis.moatRatingLabel,
            tone: moatRatingTone,
          }
        : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Key Variables",
      href: "#key-variables",
      indicator: normalizedKeyVariablesSnapshot
        ? {
            kind: "pill" as const,
            label: `${normalizedKeyVariablesSnapshot.deepTreatment.length} vars`,
          }
        : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Quarterly Score",
      href: "#sentiment-score",
      bodyPills:
        quarterRankInfo?.rank != null
          ? [
              {
                label: `Q Rank ${quarterRankInfo.rank}/${quarterRankInfo.total}`,
                tone: getPercentileTone(quarterRankInfo.percentile),
              },
              {
                label: `Top ${Math.round(quarterRankInfo.percentile)}%`,
                tone: getPercentileTone(quarterRankInfo.percentile),
              },
            ]
          : undefined,
      indicator:
        latestQuarterData?.score != null
          ? { kind: "score" as const, score: latestQuarterData.score }
          : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Growth Prospects",
      href: "#future-growth",
      bodyPills:
        growthRankInfo?.rank != null
          ? [
              {
                label: `Growth Rank ${growthRankInfo.rank}/${growthRankInfo.total}`,
                tone: getPercentileTone(growthRankInfo.percentile),
              },
              {
                label: `Top ${Math.round(growthRankInfo.percentile)}%`,
                tone: getPercentileTone(growthRankInfo.percentile),
              },
            ]
          : undefined,
      indicator:
        growthScore != null
          ? { kind: "score" as const, score: growthScore }
          : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Guidance Tracker",
      href: "#guidance-history",
      bodyPills: revenueGuidanceLabel
        ? [{ label: revenueGuidanceLabel, tone: "sky" as const }]
        : undefined,
      indicator: credibilityDisplay
        ? {
            kind: "pill" as const,
            label: credibilityDisplay.label,
            tone: credibilityTone,
          }
        : guidanceItems.length > 0
          ? {
              kind: "pill" as const,
              label: `${guidanceItems.length} items`,
            }
          : normalizedGuidanceSnapshot
            ? undefined
            : { kind: "pill" as const, label: "Soon" },
    },
  ];




  return (
    <div className="relative isolate w-full overflow-hidden px-3 py-3 pb-24 sm:px-4 sm:py-4 sm:pb-28 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.06),_transparent_34%),linear-gradient(to_bottom,_rgba(255,255,255,0.75),_transparent)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_34%),linear-gradient(to_bottom,_rgba(15,23,42,0.32),_transparent)]" />
      <div
        id="main-content"
        className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-5 overflow-x-hidden"
      >
        <CompanyPageWorkspace sections={sidebarSections} defaultSectionId="overview">
          <div data-section-id="overview">
            <OverviewCard
              companyInfo={{
                code: companyRow?.code ?? code,
                name: companyRow?.name ?? undefined,
                isNew: companyIsNew,
              }}
              sectionPreviews={overviewSectionPreviews}
              watchlistSlot={
                <Suspense fallback={<WatchlistSlotFallback />}>
                  <CompanyWatchlistSlot companyCode={code} />
                </Suspense>
              }
            />
          </div>

          <div data-section-id="industry-context">
            <Suspense fallback={<SectionLoading id="industry-context" title="Industry Context" />}>
              <IndustryContextSection
                companyCode={companyRow?.code ?? code}
                companyName={companyRow?.name ?? null}
              />
            </Suspense>
          </div>

          <div data-section-id="sub-sector">
            <Suspense fallback={<SectionLoading id="sub-sector" title="Sub-sectors" />}>
              <SubSectorSection
                companyCode={companyRow?.code ?? code}
                companyName={companyRow?.name ?? null}
              />
            </Suspense>
          </div>

          <div data-section-id="business-overview">
            <BusinessSnapshotSection
              snapshot={normalizedBusinessSnapshot}
              companyCode={companyRow?.code ?? code}
              companyName={companyRow?.name ?? null}
              generatedAtShort={businessSnapshotGeneratedAtShort}
              hasMoatAnalysis={Boolean(normalizedMoatAnalysis)}
            />
          </div>

          <div data-section-id="moat-analysis">
        <SectionCard
          id="moat-analysis"
          title="Moat Analysis"
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
            <MissingSectionState
              companyCode={code}
              companyName={companyRow?.name ?? null}
              sectionId="moat-analysis"
              sectionTitle="Moat Analysis"
              description="We have not generated a competitive moat analysis for this company yet."
            />
          )}
        </SectionCard>
          </div>

          <div data-section-id="sentiment-score">
        <SectionCard
          id="sentiment-score"
          title="Quarterly Score"
          headerPills={quarterlyHeaderPills}
        >
          <QuarterlyScoreSection
            chartData={chartData}
            detailQuarters={detailQuarters}
            trend={trend}
          />
        </SectionCard>
          </div>

          <div data-section-id="key-variables">
        <SectionCard
          id="key-variables"
          title="Key Variables"
          headerPills={keyVariablesHeaderPills}
          headerDescription="The non-financial variables that best explain whether growth is healthy, sustainable, and improving in quality."
          headerAction={
            keyVariablesGeneratedAtShort ? (
              <span className="text-[11px] text-muted-foreground">
                {keyVariablesGeneratedAtShort}
              </span>
            ) : undefined
          }
        >
          {normalizedKeyVariablesSnapshot ? (
            <KeyVariablesSection snapshot={normalizedKeyVariablesSnapshot} />
          ) : (
            renderMissingSectionState(
              "key-variables",
              "Key Variables",
              "We have not generated a key variables snapshot for this company yet.",
            )
          )}
        </SectionCard>
          </div>

          <div data-section-id="future-growth">
            <FutureGrowthSection
              outlook={normalizedGrowthOutlook}
              companyCode={companyRow?.code ?? code}
              companyName={companyRow?.name ?? null}
            />
          </div>

          <div data-section-id="guidance-history">
        <SectionCard
          id="guidance-history"
          title="Guidance History"
          headerPills={guidanceHeaderPills}
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
            renderMissingSectionState(
              "guidance-history",
              "Guidance History",
              "We have not tracked meaningful management guidance for this company yet.",
            )
          )}
        </SectionCard>
          </div>

          <div data-section-id="community">
        <SectionCard id="community" title="Community">
          <CompanyCommentsSection companyCode={code} />
        </SectionCard>
          </div>
        </CompanyPageWorkspace>
      </div>
    </div>
  );
}
