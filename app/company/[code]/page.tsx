import React, { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findRemovedCompany } from "@/lib/removed-from-coverage";

import {
  getCachedCompanyPageOverview,
  type CompanyPageOverviewCacheRow,
} from "@/lib/company-overview-cache";
import { buildCompanySections } from "../constants";
import { isBrokerNotesEnabled } from "@/lib/broker-notes/flag";
import { CompanyPageWorkspace } from "../components/company-page-workspace";
import { CompanyAnnouncementsSection } from "../components/company-announcements-section";
import { CompanyJournalSection } from "../components/company-journal-section";
import { TelegramJoinCard } from "@/components/telegram-join-card";
import { getAllPostMeta } from "@/app/blog/posts";
import { companyJournal, type CompanyJournal } from "@/app/blog/lanes";
import {
  OverviewSignalBoard,
  OverviewSignalBoardFallback,
} from "../components/overview-signal-board";
import { getOverviewBusinessLine } from "@/lib/overview-signal-board";
import CompanyWatchlistSlot, {
  WatchlistSlotFallback,
} from "../components/company-watchlist-slot";
import { GatedPanel } from "../components/gated-panel";
import { SectionLoading } from "../components/section-loading";
import {
  BusinessSnapshotPanel,
  IndustryContextPanel,
  // CommunityPanel retired 2026-07 (no engagement) — re-import when re-enabling the tab.
  // CommunityPanel,
  FutureGrowthPanel,
  GuidanceHistoryPanel,
  KeyVariablesPanel,
  QualityPanel,
  ValuationCheckPanel,
  PriceJourneyPanel,
  BrokerNotesPanel,
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
  let overview: CompanyPageOverviewCacheRow | null;
  try {
    overview = await getCachedCompanyPageOverview(code);
  } catch {
    // A failed read is not a missing company — keep the generic title and let
    // the page body surface the error rather than 404 a covered company.
    return {
      title: `${code} - Story of a Stock`,
      description: `Company detail for ${code} on Story of a Stock.`,
    };
  }
  // Not covered (never was, or removed). The page body calls notFound(), which
  // renders ./not-found.tsx and adds noindex. Don't call notFound() here: from
  // metadata it skips the segment's not-found.tsx for Next's bare default. The
  // status stays 200 either way — ./loading.tsx starts the stream first.
  if (!overview) {
    const removed = findRemovedCompany(code);
    return {
      title: removed
        ? `${removed.name} is no longer covered | Story of a Stock`
        : `${code.toUpperCase()} is not covered | Story of a Stock`,
      robots: { index: false },
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

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  // The business one-liner rides beside the cache row (one narrow read, in
  // parallel) so the Overview's story card paints whole in the first flush.
  const [overview, businessLine] = await Promise.all([
    getCachedCompanyPageOverview(code),
    getOverviewBusinessLine(code),
  ]);

  // Every code used to render "No data available for company X", so a removed
  // company (JIOFIN) looked like it still had a page. not-found.tsx says whether
  // we never covered it or stopped, and takes a request.
  if (!overview) notFound();

  // Posts are read from disk (the root layout already does, so they're in the
  // deployed bundle); cheap enough to derive per request.
  const journal: CompanyJournal = companyJournal(getAllPostMeta(), overview.company_code);
  const hasJournal = journal.stories.length + journal.headToHead.length > 0;
  // Server-read flag: off means no tab, no panel and no broker_notes query.
  const brokerNotesEnabled = isBrokerNotesEnabled();
  const sidebarSections = buildCompanySections({
    hasJournal,
    brokerNotesEnabled,
    latestScore: overview.latest_score,
    growthScore: overview.growth_score,
    valuationScore: overview.valuation_score,
    valuationStale: overview.valuation_stale,
  });

  return (
    <div className="relative isolate w-full overflow-hidden px-3 py-3 pb-14 sm:px-4 sm:py-4 sm:pb-28 lg:px-8">
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
            {/* The overview (simplified 2026-10-08). The shell (header + story
                card from the cache row and business line) renders immediately;
                the per-company extras stream in behind Suspense, and the
                fleet-wide board rank streams inside that. */}
            <Suspense
              fallback={
                <OverviewSignalBoardFallback
                  overview={overview}
                  businessLine={businessLine}
                  watchlistSlot={<WatchlistSlotFallback />}
                />
              }
            >
              <OverviewSignalBoard
                overview={overview}
                businessLine={businessLine}
                watchlistSlot={
                  <Suspense fallback={<WatchlistSlotFallback />}>
                    <CompanyWatchlistSlot companyCode={overview.company_code} />
                  </Suspense>
                }
              />
            </Suspense>
            {/* Company pages are the most-viewed surface (2026-09 PostHog: ~40% of
                views, 70% on phones), so the join strip lives here, one line
                under the board. Env-gated: renders nothing without the URL. */}
            <TelegramJoinCard
              surface="company_page"
              variant="inline"
              companyName={overview.company_name}
              className="mt-4"
            />
          </div>

          <div data-section-id="business-overview">
            <Suspense fallback={<SectionLoading id="business-overview" title="Business Snapshot" size={fallbackSize(overview.section_availability.businessSnapshot)} />}>
              <GatedPanel sectionId="business-overview" companyCode={overview.company_code}>
                <BusinessSnapshotPanel overview={overview} />
              </GatedPanel>
            </Suspense>
          </div>

          <div data-section-id="industry-context">
            <Suspense fallback={<SectionLoading id="industry-context" title="Industry Context" />}>
              <IndustryContextPanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="quality">
            {/* Five stacked cards; the moat card alone is short, so the panel
                is always viewport-tall once the substrate row exists. */}
            <Suspense fallback={<SectionLoading id="quality" title="Quality" />}>
              <GatedPanel sectionId="quality" companyCode={overview.company_code}>
                <QualityPanel overview={overview} />
              </GatedPanel>
            </Suspense>
          </div>

          <div data-section-id="sentiment-score">
            <Suspense fallback={<SectionLoading id="sentiment-score" title="ConcallScore" size={fallbackSize(overview.latest_score != null)} />}>
              <ConcallScorePanel overview={overview} />
            </Suspense>
          </div>

          <div data-section-id="key-variables">
            <Suspense fallback={<SectionLoading id="key-variables" title="Key Variables" size={fallbackSize(overview.section_availability.keyVariables)} />}>
              <GatedPanel sectionId="key-variables" companyCode={overview.company_code}>
                <KeyVariablesPanel overview={overview} />
              </GatedPanel>
            </Suspense>
          </div>

          <div data-section-id="future-growth">
            <Suspense fallback={<SectionLoading id="future-growth" title="Future Growth" size={fallbackSize(overview.section_availability.futureGrowth)} />}>
              <GatedPanel sectionId="future-growth" companyCode={overview.company_code}>
                <FutureGrowthPanel overview={overview} />
              </GatedPanel>
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
              <GatedPanel sectionId="valuation-check" companyCode={overview.company_code}>
                <ValuationCheckPanel overview={overview} />
                {/* Anchor for the Price trend scan's rows: the hash resolves to the Valuation tab, then lands here. */}
                <div id="valuation-check-price-journey" className="mt-6 scroll-mt-40">
                  <PriceJourneyPanel overview={overview} />
                </div>
              </GatedPanel>
            </Suspense>
          </div>

          {brokerNotesEnabled ? (
            <div data-section-id="broker-notes">
              <Suspense fallback={<SectionLoading id="broker-notes" title="Broker Notes" />}>
                <GatedPanel sectionId="broker-notes" companyCode={overview.company_code}>
                  <BrokerNotesPanel overview={overview} />
                </GatedPanel>
              </Suspense>
            </div>
          ) : null}

          <div data-section-id="guidance-history">
            <Suspense fallback={<SectionLoading id="guidance-history" title="Guidance" size={fallbackSize(overview.section_availability.guidanceHistory)} />}>
              <GatedPanel sectionId="guidance-history" companyCode={overview.company_code}>
                <GuidanceHistoryPanel overview={overview} />
              </GatedPanel>
            </Suspense>
          </div>

          {hasJournal ? (
            <div data-section-id="company-journal">
              <CompanyJournalSection
                journal={journal}
                companyName={overview.company_name || overview.company_code}
              />
            </div>
          ) : null}

          <div data-section-id="company-announcements">
            <Suspense fallback={<SectionLoading id="company-announcements" title="Announcements" size="block" />}>
              <CompanyAnnouncementsSection overview={overview} />
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
