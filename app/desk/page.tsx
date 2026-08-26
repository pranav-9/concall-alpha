import type { Metadata } from "next";
import { Suspense } from "react";

import { formatRelativeActivityTime } from "@/lib/activity-feed";
import { getDeskLeaderboard, type DeskRow } from "@/lib/desk-leaderboard";
import DeskRecencyLedger, {
  DeskRecencyLedgerFallback,
} from "./desk-recency-ledger";
import { DeskHotThemes, DeskHotThemesFallback } from "./desk-hot-themes";
import DeskExchangeSection, {
  DeskExchangeSectionFallback,
} from "./desk-exchange-section";
import DeskLeaderboardTable, {
  type DeskTableRow,
} from "./desk-leaderboard-table";
import DeskTopOfBook from "./desk-top-of-book";

export const metadata: Metadata = {
  title: "The Desk — every covered company, ranked and read",
  description:
    "The working surface: India's covered mid- & small-caps ranked by ConcallScore, quarter leaders, positive trend twists, growth outlook, and moat leaders — read from the documents.",
  alternates: { canonical: "/desk" },
};

// Relative time is computed here (server) so the client table can't drift it on
// hydration; filedRaw stays raw in the data layer.
const toTableRow = (row: DeskRow): DeskTableRow => ({
  code: row.code,
  name: row.name,
  sector: row.sector,
  isNew: row.isNew,
  latestScore: row.latestScore,
  delta: row.delta,
  twistPct: row.twistPct,
  sparkPoints: row.sparkPoints,
  filedLabel: row.filedRaw ? formatRelativeActivityTime(row.filedRaw) : "—",
  moatLabel: row.moatLabel,
  growthLabel: row.growthLabel,
  growthDownside: row.growthDownside,
  growthUpside: row.growthUpside,
  growthScore: row.growthScore,
});

export default async function DeskPage() {
  const board = await getDeskLeaderboard();

  const latestReads = board.latestReads.map(toTableRow);
  const quarterLeaders = board.quarterLeaders.map(toTableRow);
  const positiveTwist = board.positiveTwist.map(toTableRow);
  const growthLeaders = board.growthLeaders.map(toTableRow);
  const moatLeaders = board.moatLeaders.map(toTableRow);
  const mostViewedWeek = board.mostViewedWeek.map(toTableRow);
  const mostViewedMonth = board.mostViewedMonth.map(toTableRow);

  return (
    <main className="house relative min-h-screen">
      {/* Quarter tracker strip hidden 2026-08-25 — results season over. Re-enable next season. */}
      {/* <QuarterTrackerBanner /> */}

      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* Main column — screener header + dense table */}
          <div className="min-w-0">
            <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 border-b border-[var(--rule)] pb-6">
              <div className="min-w-0">
                <p className="house-data house-micro flex flex-wrap items-center gap-x-2 text-[var(--ink-soft)]">
                  <span aria-hidden className="text-[var(--signal)]">
                    ●
                  </span>
                  <span>A fundamental screener</span>
                  <span aria-hidden>·</span>
                  <span>{board.quarterLabel}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {board.reportedCount} of {board.coveredCount} calls read
                  </span>
                </p>
                <h1 className="house-display mt-3 max-w-xl text-3xl leading-[1.05] sm:text-4xl lg:text-[2.75rem]">
                  Ranking India&apos;s top 100 companies.
                </h1>
              </div>

              <dl className="shrink-0 text-right">
                <dt className="house-data house-micro text-[var(--ink-soft)]">Coverage</dt>
                <dd className="house-display text-4xl leading-none text-[var(--ink)]">
                  {board.coveredCount}
                </dd>
                <dd className="house-data house-micro mt-1 text-[var(--ink-soft)]">
                  {board.sectorCount} sectors
                </dd>
              </dl>
            </header>

            <div className="mt-6">
              <DeskLeaderboardTable
                latestReads={latestReads}
                quarterLeaders={quarterLeaders}
                positiveTwist={positiveTwist}
                growthLeaders={growthLeaders}
                moatLeaders={moatLeaders}
                seeAllCount={board.coveredCount}
              />
            </div>
          </div>

          {/* Right rail — top of the book */}
          <aside aria-label="Top of the book">
            <p className="house-data house-micro mb-4 text-[var(--ink-soft)]">Top of the book</p>
            <DeskTopOfBook
              quarterLabel={board.quarterLabel}
              topPerformers={quarterLeaders.slice(0, 5)}
              mostViewedWeek={mostViewedWeek.slice(0, 5)}
              mostViewedMonth={mostViewedMonth.slice(0, 5)}
              mostViewedInitial={board.mostViewedInitial}
            />
          </aside>
        </div>

        <div className="mt-14">
          <Suspense fallback={<DeskRecencyLedgerFallback />}>
            <DeskRecencyLedger quarterLabel={board.quarterLabel} />
          </Suspense>
        </div>

        <div className="mt-12">
          <Suspense fallback={<DeskExchangeSectionFallback />}>
            <DeskExchangeSection />
          </Suspense>
        </div>

        <div className="mt-12">
          <Suspense fallback={<DeskHotThemesFallback />}>
            <DeskHotThemes />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
