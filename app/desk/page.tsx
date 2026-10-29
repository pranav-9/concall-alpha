import type { Metadata } from "next";
import { Suspense } from "react";

import { getCachedDeskFeaturedReads } from "@/lib/desk-featured/data";
import { researchEligible, selectResearchUpdates } from "@/lib/desk-featured/select";
import { getDeskLeaderboard, type DeskRow } from "@/lib/desk-leaderboard";
import { DeskJournalReads } from "./desk-journal-reads";
import { DeskMovers } from "./desk-movers";
import { DeskNewCoverage } from "./desk-new-coverage";
import type { RankedRow } from "./desk-ranked-rows";
import { DeskResearchUpdated } from "./desk-research-updated";
import { DeskSectionTracker } from "./desk-section-tracker";
import DeskTopOfBook from "./desk-top-of-book";
import { DeskSectionFallback } from "./desk-ui";
import { DeskWire } from "./desk-wire";

export const metadata: Metadata = {
  title: "The Desk — what moved in India's covered mid- & small-caps",
  description:
    "The daily front page: research just updated, the quarter's top reads, new Journal stories, newly covered companies, the week's filings that mattered and the leaderboard's biggest movers — read from the documents.",
  alternates: { canonical: "/desk" },
};

const toRanked = (row: DeskRow): RankedRow => ({ code: row.code, name: row.name, latestScore: row.latestScore });

// The desk (2026-10-29 redesign, to the user's mockup): a front page of what
// moved, top-down — research updated beside the top of the book, then the
// Journal, new coverage, the wire and the week's leaderboard movers. One tree
// for every width: each block's grid collapses to one column on the phone, in
// the same change-first order. The full ranking lives on /leaderboards.
export default async function DeskPage() {
  const [board, featuredReads] = await Promise.all([getDeskLeaderboard(), getCachedDeskFeaturedReads()]);

  // The opening list and the rail paint with the page (no streaming above the
  // fold); everything below streams in its own Suspense.
  // Research updated shows the ranked hundred AND below-cut companies, tagged —
  // fresh work on a below-cut name must not vanish (researchEligible). Large-cap
  // admissions stay on their company page.
  const listed = new Set(board.companies.map((c) => c.code.toUpperCase()));
  const belowCut = new Set(board.belowCutCompanies.map((c) => c.code.toUpperCase()));
  const scoreByCode = new Map(
    [...board.companies, ...board.belowCutCompanies].map((c) => [c.code.toUpperCase(), c.latestScore]),
  );
  const research = selectResearchUpdates(researchEligible(featuredReads, { listed, belowCut }), Date.now());

  return (
    <main className="house relative min-h-screen">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
        {/* No visible masthead (user call 2026-10-29): the blocks open the page. */}
        <h1 className="sr-only">The Desk</h1>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
          <DeskSectionTracker sectionId="desk_research_updated">
            <DeskResearchUpdated reads={research} scoreByCode={scoreByCode} belowCut={belowCut} />
          </DeskSectionTracker>
          <aside aria-label="Top of the book">
            <DeskTopOfBook
              quarterLabel={board.quarterLeadersLabel}
              topPerformers={board.quarterLeaders.slice(0, 5).map(toRanked)}
              mostViewedWeek={board.mostViewedWeek.slice(0, 5).map(toRanked)}
              mostViewedMonth={board.mostViewedMonth.slice(0, 5).map(toRanked)}
              mostViewedInitial={board.mostViewedInitial}
            />
          </aside>
        </div>

        <Suspense fallback={<DeskSectionFallback height="19rem" className="mt-12" />}>
          <div className="mt-12 empty:hidden">
            <DeskJournalReads />
          </div>
        </Suspense>

        <Suspense fallback={<DeskSectionFallback height="17rem" className="mt-12" />}>
          <div className="mt-12 empty:hidden">
            <DeskNewCoverage companies={board.companies} />
          </div>
        </Suspense>

        <Suspense fallback={<DeskSectionFallback height="24rem" className="mt-12" />}>
          <div className="mt-12 empty:hidden">
            <DeskWire />
          </div>
        </Suspense>

        <Suspense fallback={<DeskSectionFallback height="14rem" className="mt-12" />}>
          <div className="mt-12 empty:hidden">
            <DeskMovers companies={board.companies} />
          </div>
        </Suspense>
      </div>
    </main>
  );
}
