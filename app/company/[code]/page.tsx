import React, { Suspense } from "react";
import type { Metadata } from "next";

import {
  getCachedCompanyPageOverview,
  type CompanyPageOverviewCacheRow,
} from "@/lib/company-overview-cache";
import { SECTION_MAP } from "../constants";
import { CompanyPageWorkspace } from "../components/company-page-workspace";
import {
  OverviewSignalBoard,
  OverviewSignalBoardFallback,
} from "../components/overview-signal-board";
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

// Suspense fallback size per panel, from what the cache row already knows: a
// panel that will render a real section gets a viewport-tall skeleton, one
// that will render its short empty state gets a short one. Either mismatch
// moves the footer when the panel lands (see section-loading.tsx).
const fallbackSize = (available: boolean): "panel" | "block" => (available ? "panel" : "block");

function buildSidebarSections(overview: CompanyPageOverviewCacheRow) {
  // Only three tabs carry a badge, and each carries a score circle — nothing
  // else (decision 2026-08-26). The tab bar reads as a three-number scorecard:
  // ConcallScore (quarterly), Future Growth, and Valuation, each in its own band
  // scheme. A score that isn't available yet (null, or a stale/withheld
  // valuation) simply shows no badge rather than a placeholder. Every other tab
  // is label-only.
  return [
    SECTION_MAP.overview,
    SECTION_MAP.businessSnapshot,
    SECTION_MAP.moatAnalysis,
    {
      ...SECTION_MAP.concallScore,
      meta:
        overview.latest_score != null
          ? { kind: "score" as const, score: overview.latest_score, scoreKind: "quarterly" as const }
          : undefined,
    },
    SECTION_MAP.keyVariables,
    {
      ...SECTION_MAP.futureGrowth,
      meta:
        overview.growth_score != null
          ? { kind: "score" as const, score: overview.growth_score, scoreKind: "growth" as const }
          : undefined,
    },
    // Walk the Talk tab hidden for now — verdict-style synthesis surface;
    // re-enable when ready. Component code is kept intact.
    // { ...SECTION_MAP.walkTheTalk },
    {
      ...SECTION_MAP.valuationCheck,
      // Withhold the badge when the valuation is stale — the portal already
      // withholds a valuation priced more than 10 days ago, so the tab must not
      // flash a score the section itself won't stand behind.
      meta:
        overview.valuation_score != null && !overview.valuation_stale
          ? { kind: "score" as const, score: overview.valuation_score, scoreKind: "valuation" as const }
          : undefined,
    },
    SECTION_MAP.guidanceHistory,
    // Community tab retired for now — no engagement (1 comment total as of 2026-07).
    // Component + API routes + Supabase tables kept intact; re-enable when ready.
    // { ...SECTION_MAP.community },
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
            {/* Recency-first signal board (2026-08-21). The shell (header from the
                cache row) renders immediately; the per-company extras stream in
                behind Suspense, and the fleet-wide board rank streams inside that. */}
            <Suspense
              fallback={
                <OverviewSignalBoardFallback
                  overview={overview}
                  watchlistSlot={<WatchlistSlotFallback />}
                />
              }
            >
              <OverviewSignalBoard
                overview={overview}
                watchlistSlot={
                  <Suspense fallback={<WatchlistSlotFallback />}>
                    <CompanyWatchlistSlot companyCode={overview.company_code} />
                  </Suspense>
                }
              />
            </Suspense>
          </div>

          <div data-section-id="business-overview">
            <Suspense fallback={<SectionLoading id="business-overview" title="Business Snapshot" size={fallbackSize(overview.section_availability.businessSnapshot)} />}>
              <BusinessSnapshotPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="moat-analysis">
            <Suspense fallback={<SectionLoading id="moat-analysis" title="Moat Analysis" size={fallbackSize(overview.section_availability.moatAnalysis)} />}>
              <MoatAnalysisPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="sentiment-score">
            <Suspense fallback={<SectionLoading id="sentiment-score" title="ConcallScore" size={fallbackSize(overview.latest_score != null)} />}>
              <ConcallScorePanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="key-variables">
            <Suspense fallback={<SectionLoading id="key-variables" title="Key Variables" size={fallbackSize(overview.section_availability.keyVariables)} />}>
              <KeyVariablesPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="future-growth">
            <Suspense fallback={<SectionLoading id="future-growth" title="Future Growth" size={fallbackSize(overview.section_availability.futureGrowth)} />}>
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
            <Suspense fallback={<SectionLoading id="valuation-check" title="Valuation Check" size={fallbackSize(overview.section_availability.valuationCheck && !overview.valuation_stale)} />}>
              <ValuationCheckPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="guidance-history">
            <Suspense fallback={<SectionLoading id="guidance-history" title="Guidance History" size={fallbackSize(overview.section_availability.guidanceHistory)} />}>
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
