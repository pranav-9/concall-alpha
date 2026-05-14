import React, { Suspense } from "react";
import type { Metadata } from "next";

import {
  getCachedCompanyPageOverview,
  type CompanyPageOverviewCacheRow,
} from "@/lib/company-overview-cache";
import { SECTION_MAP } from "../constants";
import { CompanyPageWorkspace } from "../components/company-page-workspace";
import { OverviewCard } from "../components/overview-card";
import CompanyWatchlistSlot, {
  WatchlistSlotFallback,
} from "../components/company-watchlist-slot";
import { SectionLoading } from "../components/section-loading";
import {
  getGuidanceCredibilityVerdictDisplay,
  getPercentileTone,
  type OverviewBodyPillTone,
} from "./display-tokens";
import {
  BusinessSnapshotPanel,
  CommunityPanel,
  FutureGrowthPanel,
  GuidanceHistoryPanel,
  KeyVariablesPanel,
  MoatAnalysisPanel,
  QuarterlyScorePanel,
  WalkTheTalkPanel,
} from "./company-detail-sections";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `${code} - Story of a Stock`,
    description: `Company detail for ${code} on Story of a Stock.`,
  };
}

function getMoatTone(label: string | null): OverviewBodyPillTone | undefined {
  const normalized = label?.trim().toLowerCase() ?? "";
  if (normalized.includes("wide")) return "emerald";
  if (normalized.includes("narrow")) return "sky";
  if (normalized.includes("risk")) return "amber";
  if (normalized.includes("no moat")) return "rose";
  return undefined;
}

function getGuidanceTone(verdictKey: string | null): OverviewBodyPillTone | undefined {
  const normalized = verdictKey?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? null;
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
}

function buildSidebarSections(overview: CompanyPageOverviewCacheRow) {
  const availability = overview.section_availability;

  return [
    {
      ...SECTION_MAP.overview,
      meta: overview.sector
        ? { kind: "text" as const, text: overview.sector }
        : { kind: "text" as const, text: "Live" },
    },
    {
      ...SECTION_MAP.businessSnapshot,
      meta: availability.businessSnapshot
        ? { kind: "text" as const, text: "Live" }
        : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.moatAnalysis,
      meta: overview.moat_label
        ? { kind: "text" as const, text: overview.moat_label }
        : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.quarterlyScore,
      meta: { kind: "score" as const, score: overview.latest_score },
    },
    {
      ...SECTION_MAP.keyVariables,
      meta:
        overview.key_variable_count != null && overview.key_variable_count > 0
          ? {
              kind: "count" as const,
              count: overview.key_variable_count,
              suffix: "vars",
            }
          : availability.keyVariables
            ? { kind: "text" as const, text: "Live" }
            : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.futureGrowth,
      meta: availability.futureGrowth
        ? { kind: "score" as const, score: overview.growth_score }
        : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.walkTheTalk,
      meta: { kind: "text" as const, text: "Live" },
    },
    {
      ...SECTION_MAP.guidanceHistory,
      meta:
        overview.guidance_count != null && overview.guidance_count > 0
          ? { kind: "count" as const, count: overview.guidance_count, suffix: "items" }
          : availability.guidanceHistory
            ? { kind: "text" as const, text: "Live" }
            : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.community,
      meta: { kind: "text" as const, text: "Discuss" },
    },
  ];
}

function buildOverviewSectionPreviews(overview: CompanyPageOverviewCacheRow) {
  const availability = overview.section_availability;
  const moatLabel =
    overview.moat_label && overview.moat_tier_label
      ? `${overview.moat_label} - ${overview.moat_tier_label}`
      : overview.moat_label;
  const guidanceDisplay =
    overview.guidance_verdict_label ??
    getGuidanceCredibilityVerdictDisplay(overview.guidance_verdict_key)?.label ??
    null;

  return [
    {
      title: "Business Snapshot",
      href: "#business-overview",
      media: overview.business_segment_mix
        ? { kind: "segment-bar" as const, segments: overview.business_segment_mix }
        : undefined,
      indicator: availability.businessSnapshot
        ? undefined
        : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Moat Analysis",
      href: "#moat-analysis",
      indicator: moatLabel
        ? {
            kind: "pill" as const,
            label: moatLabel,
            tone: getMoatTone(overview.moat_label),
          }
        : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Key Variables",
      href: "#key-variables",
      indicator: availability.keyVariables
        ? {
            kind: "pill" as const,
            label: `${overview.key_variable_count ?? 0} vars`,
          }
        : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Quarterly Score",
      href: "#sentiment-score",
      bodyPills:
        overview.quarter_rank != null &&
        overview.quarter_total != null &&
        overview.quarter_percentile != null
          ? [
              {
                label: `Q Rank ${overview.quarter_rank}/${overview.quarter_total}`,
                tone: getPercentileTone(overview.quarter_percentile),
              },
              {
                label: `Top ${Math.round(overview.quarter_percentile)}%`,
                tone: getPercentileTone(overview.quarter_percentile),
              },
            ]
          : undefined,
      indicator:
        overview.latest_score != null
          ? { kind: "score" as const, score: overview.latest_score }
          : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Growth Prospects",
      href: "#future-growth",
      bodyPills:
        overview.growth_rank != null &&
        overview.growth_total != null &&
        overview.growth_percentile != null
          ? [
              {
                label: `Growth Rank ${overview.growth_rank}/${overview.growth_total}`,
                tone: getPercentileTone(overview.growth_percentile),
              },
              {
                label: `Top ${Math.round(overview.growth_percentile)}%`,
                tone: getPercentileTone(overview.growth_percentile),
              },
            ]
          : undefined,
      indicator:
        overview.growth_score != null
          ? { kind: "score" as const, score: overview.growth_score }
          : { kind: "pill" as const, label: "Soon" },
    },
    {
      title: "Guidance Tracker",
      href: "#guidance-history",
      bodyPills: overview.revenue_guidance_label
        ? [{ label: overview.revenue_guidance_label, tone: "sky" as const }]
        : undefined,
      indicator: guidanceDisplay
        ? {
            kind: "pill" as const,
            label: guidanceDisplay,
            tone: getGuidanceTone(overview.guidance_verdict_key),
          }
        : overview.guidance_count != null && overview.guidance_count > 0
          ? {
              kind: "pill" as const,
              label: `${overview.guidance_count} items`,
            }
          : availability.guidanceHistory
            ? undefined
            : { kind: "pill" as const, label: "Soon" },
    },
  ];
}

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const overview = await getCachedCompanyPageOverview(code);

  if (!overview) {
    return (
      <div className="flex w-full items-center justify-center px-4 py-8 sm:px-8 lg:px-16">
        <p className="text-lg text-muted-foreground">No data available for company {code}</p>
      </div>
    );
  }

  const sidebarSections = buildSidebarSections(overview);
  const overviewSectionPreviews = buildOverviewSectionPreviews(overview);

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
                code: overview.company_code,
                name: overview.company_name,
                isNew: overview.is_new,
              }}
              sectionPreviews={overviewSectionPreviews}
              watchlistSlot={
                <Suspense fallback={<WatchlistSlotFallback />}>
                  <CompanyWatchlistSlot companyCode={overview.company_code} />
                </Suspense>
              }
            />
          </div>

          <div data-section-id="business-overview">
            <Suspense fallback={<SectionLoading id="business-overview" title="Business Snapshot" />}>
              <BusinessSnapshotPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="moat-analysis">
            <Suspense fallback={<SectionLoading id="moat-analysis" title="Moat Analysis" />}>
              <MoatAnalysisPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="sentiment-score">
            <Suspense fallback={<SectionLoading id="sentiment-score" title="Quarterly Score" />}>
              <QuarterlyScorePanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="key-variables">
            <Suspense fallback={<SectionLoading id="key-variables" title="Key Variables" />}>
              <KeyVariablesPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="future-growth">
            <Suspense fallback={<SectionLoading id="future-growth" title="Future Growth" />}>
              <FutureGrowthPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="walk-the-talk">
            <Suspense fallback={<SectionLoading id="walk-the-talk" title="Walk the Talk" />}>
              <WalkTheTalkPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="guidance-history">
            <Suspense fallback={<SectionLoading id="guidance-history" title="Guidance History" />}>
              <GuidanceHistoryPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="community">
            <CommunityPanel overview={overview} />
          </div>
        </CompanyPageWorkspace>
      </div>
    </div>
  );
}
