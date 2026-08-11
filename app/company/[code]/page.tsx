import React, { Suspense } from "react";
import type { Metadata } from "next";

import {
  getCachedCompanyPageOverview,
  type CompanyPageOverviewCacheRow,
} from "@/lib/company-overview-cache";
import { SECTION_MAP } from "../constants";
import { CompanyPageWorkspace } from "../components/company-page-workspace";
import { TheReadOverview } from "../components/overview-the-read";
import CompanyWatchlistSlot, {
  WatchlistSlotFallback,
} from "../components/company-watchlist-slot";
import { SectionLoading } from "../components/section-loading";
import {
  BusinessSnapshotPanel,
  // CommunityPanel retired 2026-07 (no engagement) — re-import when re-enabling the tab.
  // CommunityPanel,
  FutureGrowthPanel,
  GuidanceHistoryPanel,
  KeyVariablesPanel,
  MoatAnalysisPanel,
  ValuationCheckPanel,
  ConcallScorePanel,
  // WalkTheTalkPanel hidden for now — re-import when re-enabling the tab.
  // WalkTheTalkPanel,
} from "./company-detail-sections";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  // Same fetcher + cache key as the page body, so this costs no extra query.
  const overview = await getCachedCompanyPageOverview(code).catch(() => null);
  if (!overview) {
    return {
      title: `${code} - Story of a Stock`,
      description: `Company detail for ${code} on Story of a Stock.`,
    };
  }

  const name = overview.company_name || overview.company_code;
  const sectorSuffix = overview.sector ? ` (${overview.sector})` : "";
  return {
    title: `${name} (${overview.company_code}) — concall analysis | Story of a Stock`,
    description: `Quarterly earnings-call analysis for ${name}${sectorSuffix}: concall score, moat rating, guidance credibility, and key variables — sourced from company filings and transcripts.`,
    alternates: { canonical: `/company/${overview.company_code}` },
  };
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
      ...SECTION_MAP.concallScore,
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
    // Walk the Talk tab hidden for now — verdict-style synthesis surface;
    // re-enable when ready. Component code is kept intact.
    // {
    //   ...SECTION_MAP.walkTheTalk,
    //   meta: { kind: "text" as const, text: "Live" },
    // },
    {
      ...SECTION_MAP.valuationCheck,
      meta: availability.valuationCheck
        ? { kind: "text" as const, text: "Live" }
        : { kind: "text" as const, text: "Soon" },
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
    // Community tab retired for now — no engagement (1 comment total as of 2026-07).
    // Component + API routes + Supabase tables kept intact; re-enable when ready.
    // {
    //   ...SECTION_MAP.community,
    //   meta: { kind: "text" as const, text: "Discuss" },
    // },
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

  return (
    <div className="relative isolate w-full overflow-hidden px-3 py-3 pb-24 sm:px-4 sm:py-4 sm:pb-28 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.06),_transparent_34%),linear-gradient(to_bottom,_rgba(255,255,255,0.75),_transparent)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_34%),linear-gradient(to_bottom,_rgba(15,23,42,0.32),_transparent)]" />
      <div
        id="main-content"
        className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-5 overflow-x-hidden"
      >
        <CompanyPageWorkspace
          sections={sidebarSections}
          defaultSectionId="overview"
          companyCode={overview.company_code}
        >
          <div data-section-id="overview">
            <TheReadOverview
              overview={overview}
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
            <Suspense fallback={<SectionLoading id="sentiment-score" title="ConcallScore" />}>
              <ConcallScorePanel overview={overview} />
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

          {/* Walk the Talk panel hidden for now — re-enable alongside the
              tab nav entry above when ready. */}
          {/* <div data-section-id="walk-the-talk">
            <Suspense fallback={<SectionLoading id="walk-the-talk" title="Walk the Talk" />}>
              <WalkTheTalkPanel overview={overview} />
            </Suspense>
          </div> */}

          <div data-section-id="valuation-check">
            <Suspense fallback={<SectionLoading id="valuation-check" title="Valuation Check" />}>
              <ValuationCheckPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="guidance-history">
            <Suspense fallback={<SectionLoading id="guidance-history" title="Guidance History" />}>
              <GuidanceHistoryPanel overview={overview} />
            </Suspense>
          </div>

          {/* Community panel retired for now — re-enable alongside the
              tab nav entry above when ready. */}
          {/* <div data-section-id="community">
            <CommunityPanel overview={overview} />
          </div> */}
        </CompanyPageWorkspace>
      </div>
    </div>
  );
}
