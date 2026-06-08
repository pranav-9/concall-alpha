import "server-only";

import { unstable_cache } from "next/cache";

import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { isCompanyNew } from "@/lib/company-freshness";
import { normalizeBusinessSnapshot } from "@/lib/business-snapshot/normalize";
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import { normalizeKeyVariablesSnapshot } from "@/lib/key-variables-snapshot/normalize";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import { moatTierGradeLabel } from "@/lib/moat-analysis/tier-class";
import type { GuidanceSnapshotRow } from "@/lib/guidance-snapshot/types";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import type { KeyVariablesSnapshotRow } from "@/lib/key-variables-snapshot/types";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import {
  compareNullableNumbers,
  computeAvgScore,
} from "@/app/company/[code]/page-helpers";
import { getGuidanceCredibilityVerdictDisplay } from "@/app/company/[code]/display-tokens";

type SupabaseQueryClient = Pick<Awaited<ReturnType<typeof createServerSupabaseClient>>, "from">;

export const companyOverviewCacheTag = (code: string) =>
  `company-overview:${code.toUpperCase()}`;

export type BusinessSegmentMixItem = {
  name: string;
  sharePct: number;
};

export type SectionAvailability = {
  industryContext: boolean;
  subSector: boolean;
  businessSnapshot: boolean;
  moatAnalysis: boolean;
  keyVariables: boolean;
  futureGrowth: boolean;
  guidanceHistory: boolean;
};

export type OverviewTakeaways = {
  moatHeadline: string | null;
  growthBasePct: string | null;
  growthFiscalYear: string | null;
  companyRevenueCagrPct: number | null;
  keyVariableLead: string | null;
  keyVariableTrend: string | null;
};

export type CompanyPageOverviewCacheRow = {
  company_code: string;
  company_name: string;
  is_new: boolean;
  sector: string | null;
  sub_sector: string | null;
  latest_score: number | null;
  quarter_rank: number | null;
  quarter_total: number | null;
  quarter_percentile: number | null;
  growth_score: number | null;
  growth_rank: number | null;
  growth_total: number | null;
  growth_percentile: number | null;
  sector_rank: number | null;
  sector_total: number | null;
  sector_percentile: number | null;
  moat_label: string | null;
  moat_tier_label: string | null;
  key_variable_count: number | null;
  guidance_count: number | null;
  guidance_verdict_key: string | null;
  guidance_verdict_label: string | null;
  revenue_guidance_label: string | null;
  business_segment_mix: BusinessSegmentMixItem[] | null;
  overview_takeaways: OverviewTakeaways | null;
  section_availability: SectionAvailability;
  refreshed_at: string;
};

const toNumeric = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const defaultAvailability: SectionAvailability = {
  industryContext: false,
  subSector: false,
  businessSnapshot: false,
  moatAnalysis: false,
  keyVariables: false,
  futureGrowth: false,
  guidanceHistory: false,
};

const asAvailability = (value: unknown): SectionAvailability => {
  const raw = value && typeof value === "object" ? value as Partial<SectionAvailability> : {};
  return {
    industryContext: Boolean(raw.industryContext),
    subSector: Boolean(raw.subSector),
    businessSnapshot: Boolean(raw.businessSnapshot),
    moatAnalysis: Boolean(raw.moatAnalysis),
    keyVariables: Boolean(raw.keyVariables),
    futureGrowth: Boolean(raw.futureGrowth),
    guidanceHistory: Boolean(raw.guidanceHistory),
  };
};

const asSegmentMix = (value: unknown): BusinessSegmentMixItem[] | null => {
  if (!Array.isArray(value)) return null;
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as { name?: unknown; sharePct?: unknown };
      const name = typeof raw.name === "string" ? raw.name : null;
      const sharePct = toNumeric(raw.sharePct);
      if (!name || sharePct == null) return null;
      return { name, sharePct };
    })
    .filter((item): item is BusinessSegmentMixItem => Boolean(item));
  return items.length >= 2 ? items : null;
};

const asOverviewTakeaways = (value: unknown): OverviewTakeaways | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const takeaways: OverviewTakeaways = {
    moatHeadline: str(raw.moatHeadline),
    growthBasePct: str(raw.growthBasePct),
    growthFiscalYear: str(raw.growthFiscalYear),
    companyRevenueCagrPct: toNumeric(raw.companyRevenueCagrPct),
    keyVariableLead: str(raw.keyVariableLead),
    keyVariableTrend: str(raw.keyVariableTrend),
  };
  return Object.values(takeaways).some((v) => v != null) ? takeaways : null;
};

function normalizeCacheRow(row: Record<string, unknown>): CompanyPageOverviewCacheRow {
  return {
    company_code: String(row.company_code ?? ""),
    company_name: String(row.company_name ?? row.company_code ?? ""),
    is_new: Boolean(row.is_new),
    sector: typeof row.sector === "string" ? row.sector : null,
    sub_sector: typeof row.sub_sector === "string" ? row.sub_sector : null,
    latest_score: toNumeric(row.latest_score),
    quarter_rank: toNumeric(row.quarter_rank),
    quarter_total: toNumeric(row.quarter_total),
    quarter_percentile: toNumeric(row.quarter_percentile),
    growth_score: toNumeric(row.growth_score),
    growth_rank: toNumeric(row.growth_rank),
    growth_total: toNumeric(row.growth_total),
    growth_percentile: toNumeric(row.growth_percentile),
    sector_rank: toNumeric(row.sector_rank),
    sector_total: toNumeric(row.sector_total),
    sector_percentile: toNumeric(row.sector_percentile),
    moat_label: typeof row.moat_label === "string" ? row.moat_label : null,
    moat_tier_label: typeof row.moat_tier_label === "string" ? row.moat_tier_label : null,
    key_variable_count: toNumeric(row.key_variable_count),
    guidance_count: toNumeric(row.guidance_count),
    guidance_verdict_key:
      typeof row.guidance_verdict_key === "string" ? row.guidance_verdict_key : null,
    guidance_verdict_label:
      typeof row.guidance_verdict_label === "string" ? row.guidance_verdict_label : null,
    revenue_guidance_label:
      typeof row.revenue_guidance_label === "string" ? row.revenue_guidance_label : null,
    business_segment_mix: asSegmentMix(row.business_segment_mix),
    overview_takeaways: asOverviewTakeaways(row.overview_takeaways),
    section_availability: asAvailability(row.section_availability),
    refreshed_at: String(row.refreshed_at ?? new Date().toISOString()),
  };
}

export async function buildCompanyPageOverviewCacheRow(
  supabase: SupabaseQueryClient,
  code: string,
): Promise<CompanyPageOverviewCacheRow | null> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;

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
      .select("name, sector, sub_sector, code, website, created_at")
      .eq("code", normalizedCode)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("concall_analysis")
      .select("company_code, score, fy, qtr, quarter_label")
      .eq("company_code", normalizedCode)
      .order("fy", { ascending: false })
      .order("qtr", { ascending: false })
      .limit(12),
    supabase
      .from("business_snapshot")
      .select(
        "company, generated_at, segment_profiles, business_snapshot, historical_economics, about_company, revenue_breakdown, revenue_engine, details, snapshot_phase, snapshot_source, source_urls",
      )
      .eq("company", normalizedCode)
      .order("generated_at", { ascending: false })
      .limit(1),
    supabase
      .from("company_industry_analysis")
      .select("sub_sector")
      .eq("company", normalizedCode)
      .limit(1),
    supabase
      .from("guidance_tracking")
      .select(
        "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details",
      )
      .eq("company_code", normalizedCode)
      .order("generated_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("guidance_snapshot")
      .select(
        "company_code, generated_at, analysis_window_quarters, guidance_style_classification, big_picture_growth_guidance, current_year_revenue_guidance, prior_two_year_accuracy, credibility_verdict, guidance_items, source_files, details, updated_at",
      )
      .eq("company_code", normalizedCode)
      .order("generated_at", { ascending: false })
      .limit(1),
    supabase
      .from("moat_analysis")
      .select(
        "id, company_code, company_name, industry, rating, tier, gatekeeper_answer, cycle_tested, assessment_payload, assessment_version, created_at, updated_at",
      )
      .eq("company_code", normalizedCode)
      .limit(1),
    supabase
      .from("key_variables_snapshot")
      .select(
        "company_code, generated_at, discovery_summary, full_variable_list, deep_treatment, section_synthesis, details, updated_at",
      )
      .eq("company_code", normalizedCode)
      .order("generated_at", { ascending: false })
      .limit(1),
    supabase
      .from("growth_outlook")
      .select("company, growth_score, base_growth_pct, run_timestamp")
      .order("run_timestamp", { ascending: false }),
  ]);

  if (concallResult.error) throw concallResult.error;

  const company = companyRow as {
    name?: string | null;
    sector?: string | null;
    sub_sector?: string | null;
    code?: string | null;
    website?: string | null;
    created_at?: string | null;
  } | null;
  const companyName = company?.name?.trim() || normalizedCode;
  const companySector = company?.sector?.trim() || null;
  const companySubSector = company?.sub_sector?.trim() || null;
  const concallRows = (concallResult.data ?? []) as Array<{
    company_code?: string | null;
    score?: unknown;
    fy?: unknown;
    qtr?: unknown;
  }>;
  if (!company && concallRows.length === 0) return null;

  const latestQuarterData = concallRows[0] ?? null;
  const latestScore = toNumeric(latestQuarterData?.score);
  const companyLatestFy = latestQuarterData?.fy ?? null;
  const companyLatestQtr = latestQuarterData?.qtr ?? null;

  const growthOutlookDetailPromise = supabase
    .from("growth_outlook")
    .select("*")
    .or(
      [
        normalizedCode ? `company.eq.${normalizedCode}` : null,
        companyName ? `company.eq.${companyName}` : null,
      ]
        .filter(Boolean)
        .join(",") || `company.eq.${normalizedCode}`,
    )
    .order("run_timestamp", { ascending: false })
    .limit(1);

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

  const [growthDetailResult, latestQuarterRowsResult, sectorPeerResult] = await Promise.all([
    growthOutlookDetailPromise,
    latestQuarterRowsPromise,
    sectorPeerPromise,
  ]);

  const sectorPeerRows = (sectorPeerResult?.data ?? []) as Array<{
    code?: string | null;
    name?: string | null;
  }>;
  const peerCodesUpper = sectorPeerRows
    .map((row) => String(row.code ?? "").toUpperCase())
    .filter(Boolean);
  const peerConcallRowsResult =
    peerCodesUpper.length > 0
      ? await supabase
          .from("concall_analysis")
          .select("company_code, fy, qtr, score")
          .in("company_code", peerCodesUpper)
      : null;

  const normalizedGrowthOutlook = normalizeGrowthOutlook({
    details: growthDetailResult.data?.[0]?.details,
    growthScore: growthDetailResult.data?.[0]?.growth_score,
    runTimestamp: growthDetailResult.data?.[0]?.run_timestamp,
    companyName: growthDetailResult.data?.[0]?.company_name,
    fiscalYear: growthDetailResult.data?.[0]?.fiscal_year,
    horizonQuarters: growthDetailResult.data?.[0]?.horizon_quarters,
    horizonYears: growthDetailResult.data?.[0]?.horizon_years,
    baseGrowthPct: growthDetailResult.data?.[0]?.base_growth_pct,
    upsideGrowthPct: growthDetailResult.data?.[0]?.upside_growth_pct,
    downsideGrowthPct: growthDetailResult.data?.[0]?.downside_growth_pct,
    growthScoreFormula: growthDetailResult.data?.[0]?.growth_score_formula,
    growthScoreSteps: growthDetailResult.data?.[0]?.growth_score_steps,
    factBase: growthDetailResult.data?.[0]?.fact_base,
    summaryBullets: growthDetailResult.data?.[0]?.summary_bullets,
    catalysts: growthDetailResult.data?.[0]?.catalysts,
    scenarios: growthDetailResult.data?.[0]?.scenarios,
  });
  const normalizedBusinessSnapshot = normalizeBusinessSnapshot({
    companyCode: normalizedCode,
    companyWebsite: company?.website ?? null,
    snapshotRow: businessSnapshotData?.[0] ?? null,
  });
  const normalizedKeyVariablesSnapshot = normalizeKeyVariablesSnapshot(
    (keyVariablesSnapshotData?.[0] as KeyVariablesSnapshotRow | undefined) ?? null,
  );
  const normalizedGuidanceSnapshot = normalizeGuidanceSnapshot(
    (guidanceSnapshotResult.data?.[0] as GuidanceSnapshotRow | undefined) ?? null,
  );
  const legacyGuidanceItems = normalizeGuidanceTrackingRows(
    (guidanceTrackingResult.data as GuidanceTrackingRow[] | null | undefined) ?? null,
  );
  const guidanceItems = normalizedGuidanceSnapshot?.guidanceItems ?? legacyGuidanceItems;
  const normalizedMoatAnalysis = normalizeMoatAnalysis(
    (moatAnalysisData?.[0] as MoatAnalysisRow | undefined) ?? null,
  );

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
  const hasStructuredBusinessSnapshot = Boolean(
    aboutHeading ||
      aboutSupportingText ||
      hasHistoricalEconomics ||
      (normalizedBusinessSnapshot?.revenueBreakdown?.bySegment.length ?? 0) > 0 ||
      (normalizedBusinessSnapshot?.revenueBreakdown?.byProductOrService.length ?? 0) > 0,
  );
  const hasLegacyBusinessSnapshot = Boolean(
    normalizedBusinessSnapshot?.businessSummaryShort ||
      normalizedBusinessSnapshot?.businessSummaryLong ||
      normalizedBusinessSnapshot?.mixShiftSummary ||
      (normalizedBusinessSnapshot?.topRevenueDrivers.length ?? 0) > 0 ||
      (normalizedBusinessSnapshot?.keyDependencies.length ?? 0) > 0 ||
      (normalizedBusinessSnapshot?.keyRisksToModel.length ?? 0) > 0,
  );
  const hasBusinessSnapshotContent = hasStructuredBusinessSnapshot || hasLegacyBusinessSnapshot;

  // v2 overview takeaways: one headline signal per section, derived from the
  // already-normalized objects above (no extra fetches). Stored as a single
  // jsonb column so the hot-table migration stays to one column.
  const leadKeyVariable = normalizedKeyVariablesSnapshot?.deepTreatment?.[0] ?? null;
  const overviewTakeaways: OverviewTakeaways = {
    moatHeadline: normalizedMoatAnalysis?.payload?.headline?.trim() || null,
    growthBasePct: normalizedGrowthOutlook?.baseGrowthPct?.trim() || null,
    growthFiscalYear: normalizedGrowthOutlook?.fiscalYear?.trim() || null,
    companyRevenueCagrPct:
      historicalEconomics?.companyRevenueCagr3y?.cagrPercent ?? null,
    keyVariableLead: leadKeyVariable?.variable?.trim() || null,
    keyVariableTrend:
      leadKeyVariable?.trendInterpretation?.trim() ||
      leadKeyVariable?.currentRead?.trim() ||
      null,
  };

  const latestQuarterRowsGlobal = (latestQuarterRowsResult?.data ?? []) as Array<{
    company_code?: unknown;
    score?: unknown;
  }>;
  const quarterRankInfo = (() => {
    if (!latestQuarterRowsGlobal.length) return null;
    const ranked = assignCompetitionRanks(
      latestQuarterRowsGlobal
        .map((row) => ({
          companyCode: String(row.company_code ?? "").toUpperCase(),
          score: toNumeric(row.score),
        }))
        .filter((row) => row.companyCode && row.score != null)
        .sort((a, b) => {
          if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
          return a.companyCode.localeCompare(b.companyCode);
        }),
      (row) => row.score,
    );
    const total = ranked.length;
    const rank =
      ranked.find((row) => row.companyCode === normalizedCode)?.leaderboardRank ?? null;
    if (!rank || total === 0) return null;
    return { rank, total, percentile: ((total - rank + 1) / total) * 100 };
  })();

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
  const growthRankInfo = (() => {
    if (!latestGrowthByCompany.size) return null;
    const ranked = assignCompetitionRanks(
      Array.from(latestGrowthByCompany.values()).sort((a, b) => {
        if (b.growthScore !== a.growthScore) return b.growthScore - a.growthScore;
        const aBase = a.base ?? Number.NEGATIVE_INFINITY;
        const bBase = b.base ?? Number.NEGATIVE_INFINITY;
        if (bBase !== aBase) return bBase - aBase;
        return a.company.localeCompare(b.company);
      }),
      (row) => row.growthScore,
    );
    const total = ranked.length;
    const keys = [normalizedCode, companyName.toUpperCase()];
    const rank = ranked.find((row) => keys.includes(row.company))?.leaderboardRank ?? null;
    if (!rank || total === 0) return null;
    return { rank, total, percentile: ((total - rank + 1) / total) * 100 };
  })();

  const sectorRankInfo = (() => {
    if (!companySector || sectorPeerRows.length === 0) return null;
    const latestQuarterByCode = new Map<string, number | null>();
    latestQuarterRowsGlobal.forEach((row) => {
      const companyCode = String(row.company_code ?? "").toUpperCase();
      if (!companyCode || latestQuarterByCode.has(companyCode)) return;
      latestQuarterByCode.set(companyCode, toNumeric(row.score));
    });
    const peerConcallByCode = new Map<
      string,
      Array<{ fy: number; qtr: number; score: number | null }>
    >();
    ((peerConcallRowsResult?.data ?? []) as Array<{
      company_code?: unknown;
      fy?: unknown;
      qtr?: unknown;
      score?: unknown;
    }>).forEach((row) => {
      const key = String(row.company_code ?? "").toUpperCase();
      const fy = Number(row.fy);
      const qtr = Number(row.qtr);
      if (!key || !Number.isFinite(fy) || !Number.isFinite(qtr)) return;
      const bucket = peerConcallByCode.get(key) ?? [];
      bucket.push({ fy, qtr, score: toNumeric(row.score) });
      peerConcallByCode.set(key, bucket);
    });
    const peer4QAvgByCode = new Map<string, number | null>();
    peerConcallByCode.forEach((rows, key) => {
      rows.sort((a, b) => b.fy - a.fy || b.qtr - a.qtr);
      const validScores = rows
        .slice(0, 4)
        .map((row) => row.score)
        .filter((value): value is number => value != null);
      peer4QAvgByCode.set(
        key,
        validScores.length > 0
          ? validScores.reduce((sum, value) => sum + value, 0) / validScores.length
          : null,
      );
    });
    const sectorPeerAvgRows = sectorPeerRows.map((peer) => {
      const peerCode = String(peer.code ?? "").toUpperCase();
      const peerName = String(peer.name ?? "").toUpperCase();
      const latestQuarterScore = latestQuarterByCode.get(peerCode) ?? null;
      const growthScore =
        latestGrowthByCompany.get(peerCode)?.growthScore ??
        latestGrowthByCompany.get(peerName)?.growthScore ??
        null;
      const avg4QuarterScore = peer4QAvgByCode.get(peerCode) ?? null;
      return {
        code: peerCode,
        name: String(peer.name ?? peer.code ?? "").trim() || peerCode,
        avgScore: computeAvgScore(latestQuarterScore, growthScore, avg4QuarterScore),
        latestQuarterScore,
        growthScore,
        avg4QuarterScore,
      };
    });
    const ranked = assignCompetitionRanks(
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
    const total = sectorPeerRows.length;
    const rank = ranked.find((row) => row.code === normalizedCode)?.leaderboardRank ?? null;
    if (!rank || total === 0) return null;
    return { rank, total, percentile: ((total - rank + 1) / total) * 100 };
  })();

  // Phase 6 v2 dropped the synthesis blocks (current-year revenue guidance,
  // credibility verdict). These cache fields stay nullable for now; PR 2 will
  // re-populate them by deriving from guidance_items.
  const revenueGuidanceLabel: string | null = null;
  const credibilityVerdictKey: string | null = null;
  const credibilityDisplay = getGuidanceCredibilityVerdictDisplay(credibilityVerdictKey);
  const segmentEntries = normalizedBusinessSnapshot?.revenueBreakdown?.bySegment ?? [];
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
  const hasIndustryAnalysis = Boolean(industryPreviewRows?.[0]);

  return {
    company_code: normalizedCode,
    company_name: companyName,
    is_new: isCompanyNew(company?.created_at ?? null),
    sector: companySector,
    sub_sector: companySubSector,
    latest_score: latestScore,
    quarter_rank: quarterRankInfo?.rank ?? null,
    quarter_total: quarterRankInfo?.total ?? null,
    quarter_percentile: quarterRankInfo?.percentile ?? null,
    growth_score: normalizedGrowthOutlook?.growthScore ?? null,
    growth_rank: growthRankInfo?.rank ?? null,
    growth_total: growthRankInfo?.total ?? null,
    growth_percentile: growthRankInfo?.percentile ?? null,
    sector_rank: sectorRankInfo?.rank ?? null,
    sector_total: sectorRankInfo?.total ?? null,
    sector_percentile: sectorRankInfo?.percentile ?? null,
    moat_label: normalizedMoatAnalysis?.moatRatingLabel ?? null,
    moat_tier_label: normalizedMoatAnalysis?.moatTier
      ? moatTierGradeLabel(normalizedMoatAnalysis.moatTier)
      : null,
    key_variable_count: normalizedKeyVariablesSnapshot?.deepTreatment.length ?? null,
    guidance_count: guidanceItems.length,
    guidance_verdict_key: credibilityVerdictKey,
    guidance_verdict_label: credibilityDisplay?.label ?? null,
    revenue_guidance_label: revenueGuidanceLabel,
    business_segment_mix: businessSegmentMix,
    overview_takeaways: overviewTakeaways,
    section_availability: {
      industryContext: hasIndustryAnalysis,
      subSector: hasIndustryAnalysis,
      businessSnapshot: hasBusinessSnapshotContent,
      moatAnalysis: Boolean(normalizedMoatAnalysis),
      keyVariables: Boolean(normalizedKeyVariablesSnapshot),
      futureGrowth: Boolean(normalizedGrowthOutlook),
      guidanceHistory: Boolean(normalizedGuidanceSnapshot || guidanceItems.length > 0),
    },
    refreshed_at: new Date().toISOString(),
  };
}

const selectColumns =
  "company_code,company_name,is_new,sector,sub_sector,latest_score,quarter_rank,quarter_total,quarter_percentile,growth_score,growth_rank,growth_total,growth_percentile,sector_rank,sector_total,sector_percentile,moat_label,moat_tier_label,key_variable_count,guidance_count,guidance_verdict_key,guidance_verdict_label,revenue_guidance_label,business_segment_mix,overview_takeaways,section_availability,refreshed_at";

async function readCompanyOverview(code: string): Promise<CompanyPageOverviewCacheRow | null> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;

  const supabase = createPublicReadClient();
  const { data, error } = await supabase
    .from("company_page_overview_cache")
    .select(selectColumns)
    .eq("company_code", normalizedCode)
    .maybeSingle();

  if (!error && data) {
    return normalizeCacheRow(data as Record<string, unknown>);
  }

  return buildCompanyPageOverviewCacheRow(supabase, normalizedCode);
}

export async function getCachedCompanyPageOverview(
  code: string,
): Promise<CompanyPageOverviewCacheRow | null> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;

  const read = unstable_cache(
    () => readCompanyOverview(normalizedCode),
    ["company-page-overview", normalizedCode],
    {
      revalidate: 300,
      tags: [companyOverviewCacheTag(normalizedCode)],
    },
  );

  return read();
}

export function toCompanyPageOverviewUpsert(row: CompanyPageOverviewCacheRow) {
  return {
    ...row,
    company_code: row.company_code.toUpperCase(),
    section_availability: row.section_availability ?? defaultAvailability,
    updated_at: row.refreshed_at,
  };
}
