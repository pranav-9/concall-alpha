import { getConcallData } from "@/app/company/get-concall-data";
import { SectionDepthGate } from "@/app/company/components/section-depth-gate";
import { BandSummaryLine } from "@/components/band-summary-line";
import { TelegramJoinLink } from "@/components/telegram-join-link";
import { getTelegramJoinUrl } from "@/lib/community";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGE_SHELL, TOUCH_TARGET } from "@/lib/design/shell";
import {
  computeGrowthBandCounts,
  computeQuarterBandCounts,
} from "@/lib/leaderboard-distribution";
import { classifyBoardRead } from "@/lib/board-read";
import { resolveLeaderboardTab, type LeaderboardTab } from "@/lib/leaderboard-tab";
import {
  LEADERBOARD_FREE_ROWS,
  buildLeaderboardGateNext,
  isSignupGateEnabled,
  leaderboardGateCopy,
  leaderboardGateSectionId,
  shouldGateLeaderboard,
} from "@/lib/signup-gate";
import { getReaderWatchlist } from "@/lib/watchlist-codes";
import { buildScoreBoardRows } from "@/lib/score-board-rows";
import { computeBoardRanks, COVERAGE_BOARD_SIZE } from "@/lib/leaderboard-rank";
import {
  readPriorRanks,
  writeTodaySnapshotIfMissing,
  type RankSnapshotRow,
} from "@/lib/leaderboard-snapshot";
import { after } from "next/server";
import type { Metadata } from "next";
import { BelowSm, FromSm } from "@/components/viewport-gate";
import { cn } from "@/lib/utils";
import {
  MOBILE_CHIP_STRIP,
  MOBILE_CHIP_TAB,
  MOBILE_DEK,
  MobileMasthead,
} from "@/components/mobile-card";
import { fetchLeaderboardData } from "./data";
import { BoardFilterChips, BoardFilterProvider, FilteredCount } from "./board-filter";
import { LeaderboardTabs } from "./leaderboard-tabs";
import {
  GrowthTable,
  LeaderboardTable,
  MoatTable,
  OverallTable,
  PhoneGrowthBoard,
  PhoneMoatBoard,
  PhoneOverallBoard,
  PhoneQuarterBoard,
} from "./tables-lazy";

export const metadata: Metadata = {
  title: "Leaderboards – Story of a Stock",
  description: "ConcallScores, growth outlook, and moat tier leaderboards.",
  alternates: { canonical: "/leaderboards" },
};

// The desktop tab strip (2026-10-05, the minimal pass): flat labels in the data
// face, the active board a paper tile with a hairline — no pill, no fill. Every
// colour is restated under dark: because the shadcn trigger ships dark variants
// of its own that would otherwise win. min-w is gone: the labels size the tabs.
const TAB_TRIGGER_CLASS =
  `house-data h-auto flex-none shrink-0 justify-center rounded-md border border-transparent px-4 py-2 text-[12px] font-normal uppercase tracking-[0.14em] text-[var(--ink-soft)] shadow-none transition-colors hover:text-[var(--ink)] dark:text-[var(--ink-soft)] data-[state=active]:border-[var(--rule)] data-[state=active]:bg-[var(--paper-2)] data-[state=active]:text-[var(--ink)] data-[state=active]:shadow-none dark:data-[state=active]:border-[var(--rule)] dark:data-[state=active]:bg-[var(--paper-2)] dark:data-[state=active]:text-[var(--ink)] ${TOUCH_TARGET}`;

/**
 * Sign-up gate on a board (2026-10-02): the same card as the company tabs and
 * the Journal, clipped under row LEADERBOARD_FREE_ROWS. The board itself stamps
 * `data-gate-cut` on its 21st row (via `gateCutIndex`); this only decides, per
 * reader, whether to wrap. No company code — `section_id` is
 * `leaderboard:<board>`, so board events stay out of the per-company funnels.
 */
function BoardGate({
  gated,
  board,
  below,
  children,
}: {
  gated: boolean;
  board: LeaderboardTab;
  below: readonly string[];
  children: React.ReactNode;
}) {
  if (!gated) return <>{children}</>;
  return (
    <SectionDepthGate
      companyCode={undefined}
      sectionId={leaderboardGateSectionId(board)}
      scope="board"
      below={below}
      nextPath={buildLeaderboardGateNext(board)}
    >
      {children}
    </SectionDepthGate>
  );
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolved = await searchParams;
  // Default landing tab, resolved through the shared helper (handles the
  // "sentiment" back-compat alias and unknown values). Same resolver the client
  // tab strip reconciles with, so the two can't drift.
  const defaultTab = resolveLeaderboardTab(resolved?.tab);
  const gateEnabled = isSignupGateEnabled();
  const [
    { rows, latestLabel, quarterLabels },
    { growthEntries, moatEntries, growthScoreByCode, nameByCode, sectorByCode },
    priorRankByCode,
    reader,
  ] = await Promise.all([
    // includeBelowCut: the Overall board renders the tail greyed out rather than
    // dropping it. Large caps are still excluded outright — two different gates.
    getConcallData({ excludeLargeCaps: true, includeBelowCut: true }),
    fetchLeaderboardData(),
    // Ranks from the prior snapshot window for the Δ column. Empty until history accrues.
    readPriorRanks(),
    // Who is reading, and their watchlist codes for the Watchlist filter —
    // asked on every load (the filter needs it, gate or not), alongside the
    // board reads rather than after them.
    getReaderWatchlist(),
  ]);
  const isAuthenticated = reader.userId !== null;
  const watchlistCodesAll = reader.codes;
  // Flag on and nobody signed in: every board clips under its top 20 rows. The
  // marker index goes to the row components only in that case, so a signed-in
  // reader's DOM carries no gate attribute at all.
  const gated = shouldGateLeaderboard({ enabled: gateEnabled, isAuthenticated });
  const gateCutIndex = gated ? LEADERBOARD_FREE_ROWS : undefined;

  const overallRows = buildScoreBoardRows(
    rows,
    latestLabel ?? null,
    growthScoreByCode,
    nameByCode,
  );

  // The Quarter tab keeps its long-standing scope: the ranked hundred only.
  const rankedRows = rows.filter((row) => row.belowCut !== true);

  const latestQuarterLabel = quarterLabels[0] ?? null;
  const quarterLatestScores = latestQuarterLabel
    ? rankedRows.map((r) => {
        const raw = r[latestQuarterLabel];
        if (raw == null || raw === "") return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })
    : [];
  // Some of the Latest column moved since the reader last looked. Counted here
  // so the legend below the table only appears when there is something to explain.
  const quarterFreshCount = rankedRows.filter((r) => r.scoredWithin24h === true).length;
  const quarterBandCounts = computeQuarterBandCounts(quarterLatestScores);
  const concallScored = quarterLatestScores.filter((s): s is number => typeof s === "number").length;
  const growthBandCounts = computeGrowthBandCounts(growthEntries.map((e) => e.growthScore));
  const growthScored = growthEntries.filter((e) => typeof e.growthScore === "number").length;

  const overallReads = overallRows.map((row) =>
    classifyBoardRead({
      concallScore: row.concallScore,
      growthScore: row.growthScore,
      valuationScore: row.valuationScore,
    }),
  );

  // Δ column: rank the whole board by its live Read (the SAME helper the board
  // renders with, so today's snapshot can't diverge from the live #), then record
  // today's snapshot once per UTC day via after() so the write never blocks the
  // response. The board itself gets priorRankByCode (read above) for the delta.
  const currentRankByCode = computeBoardRanks(
    overallRows.map((row, i) => ({
      companyCode: row.companyCode,
      companyName: row.companyName,
      readScore: overallReads[i].score,
      growthScore: row.growthScore,
    })),
  );
  // Greyed = ranks past the coverage line on the LIVE Read (matching the board's
  // own `dim`), plus any unranked row (no Read → never in the top N). NOT the
  // stored belowCut anymore — that governs homepage/sectors, not this board.
  const belowCutCount = overallRows.reduce((n, row) => {
    const rank = currentRankByCode.get(row.companyCode);
    return n + (rank == null || rank > COVERAGE_BOARD_SIZE ? 1 : 0);
  }, 0);
  const snapshotRows: RankSnapshotRow[] = overallRows.flatMap((row, i) => {
    const rank = currentRankByCode.get(row.companyCode);
    return rank != null
      ? [{ companyCode: row.companyCode, rank, readScore: overallReads[i].score }]
      : [];
  });
  after(() => writeTodaySnapshotIfMissing(snapshotRows));

  // The two board filters. Improvers = a better Overall rank than at the prior
  // snapshot — the same subtraction the Δ column prints, so the chip's count is
  // the number of ▲ rows. Watchlist = the reader's lists, narrowed to companies
  // these boards can show (a watchlist is unfiltered; the boards are not).
  const overallCodes = overallRows.map((row) => row.companyCode.toUpperCase());
  const improverCodes = overallCodes.filter((code) => {
    const rank = currentRankByCode.get(code);
    const prior = priorRankByCode[code];
    return rank != null && prior != null && prior - rank > 0;
  });
  const boardCodes = new Set(overallCodes);
  const watchlistCodes = watchlistCodesAll?.filter((code) => boardCodes.has(code)) ?? null;
  const telegramUrl = getTelegramJoinUrl();

  // The gate card's "below" lines, from the rows each board really renders.
  const gateCopy = {
    overall: leaderboardGateCopy("overall", { total: overallRows.length, tail: belowCutCount }),
    quarter: leaderboardGateCopy("quarter", { total: rankedRows.length }),
    growth: leaderboardGateCopy("growth", { total: growthEntries.length }),
    moat: leaderboardGateCopy("moat", { total: moatEntries.length }),
  } satisfies Record<LeaderboardTab, readonly string[]>;

  // Phone-board props. Maps become plain Records here — they cross into client
  // components — projected to the codes the Quarter board actually paints, so
  // the below-cut tail's names/sectors don't ride in the RSC payload for nothing.
  // `new` on the phone means new to coverage (the Desk's meaning), read off the
  // quarter rows, which carry isNew for the whole universe.
  const newCodes = rows.filter((row) => row.isNew).map((row) => String(row.company).toUpperCase());
  const rankedCodes = rankedRows.map((row) => String(row.company).toUpperCase());
  const nameRecord = Object.fromEntries(
    rankedCodes.flatMap((code) => (nameByCode.has(code) ? [[code, nameByCode.get(code)!]] : [])),
  );
  const sectorRecord = Object.fromEntries(
    rankedCodes.flatMap((code) => (sectorByCode.has(code) ? [[code, sectorByCode.get(code)!]] : [])),
  );
  const previousQuarterLabel = quarterLabels[1] ?? null;
  const phoneNote = "house-data px-4 pt-0.5 text-[11px] text-[var(--ink-soft)] [text-wrap:pretty]";

  return (
    <BoardFilterProvider improverCodes={improverCodes} watchlistCodes={watchlistCodes}>
    <main className="relative isolate overflow-hidden">
      {/* Phone (handoff 2026-09-13, "Ranking — mobile"): house skin, masthead,
          the board tabs as a chip strip, one card per board. Its own
          LeaderboardTabs instance — the same ?tab resolver, instant client
          switch and history.replaceState sync — since only one of the two trees
          survives hydration (components/viewport-gate). From sm the atmospheric
          shell below is untouched. */}
      <BelowSm className="house min-h-screen pb-6">
        <MobileMasthead title="Leaderboards">
          <p className={MOBILE_DEK}>
            Every company on the same scores — the quarter just reported, the outlook ahead, and
            what you pay for it.
          </p>
          {telegramUrl ? (
            <p className="house-data mt-2 text-[10px] text-[var(--ink-soft)]">
              Section changes get posted in the{" "}
              <TelegramJoinLink href={telegramUrl} surface="leaderboards" className="house-link">
                Telegram group
              </TelegramJoinLink>{" "}
              first.
            </p>
          ) : null}
        </MobileMasthead>

        <LeaderboardTabs defaultTab={defaultTab} className="w-full gap-0">
          <TabsList
            aria-label="Boards"
            className={`${MOBILE_CHIP_STRIP} h-auto w-full justify-start rounded-none bg-transparent px-4 pb-1 pt-3.5 text-[var(--ink-soft)]`}
          >
            <TabsTrigger value="overall" className={MOBILE_CHIP_TAB}>
              Overall
            </TabsTrigger>
            <TabsTrigger value="quarter" className={MOBILE_CHIP_TAB}>
              ConcallScore
            </TabsTrigger>
            <TabsTrigger value="growth" className={MOBILE_CHIP_TAB}>
              Growth
            </TabsTrigger>
            <TabsTrigger value="moat" className={MOBILE_CHIP_TAB}>
              Moat
            </TabsTrigger>
          </TabsList>
          <BoardFilterChips variant="phone" />

          <TabsContent value="overall">
            <p className={cn(phoneNote, "pt-2")}>Ranked by Read — the quarter, the outlook and valuation, combined.</p>
            <BoardGate gated={gated} board="overall" below={gateCopy.overall}>
              <PhoneOverallBoard
                rows={overallRows}
                priorRankByCode={priorRankByCode}
                coverageCutRank={COVERAGE_BOARD_SIZE}
                newCodes={newCodes}
                gateCutIndex={gateCutIndex}
              />
            </BoardGate>
          </TabsContent>
          <TabsContent value="quarter">
            <p className={phoneNote}>The quarter just reported, scored 0–10 from the transcript and deck.</p>
            <BoardGate gated={gated} board="quarter" below={gateCopy.quarter}>
              <PhoneQuarterBoard
                rows={rankedRows}
                latestLabel={latestQuarterLabel}
                previousLabel={previousQuarterLabel}
                nameByCode={nameRecord}
                sectorByCode={sectorRecord}
                gateCutIndex={gateCutIndex}
              />
            </BoardGate>
          </TabsContent>
          <TabsContent value="growth">
            <p className={phoneNote}>Forward outlook, with base / upside / downside revenue scenarios.</p>
            <BoardGate gated={gated} board="growth" below={gateCopy.growth}>
              <PhoneGrowthBoard rows={growthEntries} gateCutIndex={gateCutIndex} />
            </BoardGate>
          </TabsContent>
          <TabsContent value="moat">
            <p className={phoneNote}>Grouped by moat rating; strength, active sources and cycle-tested.</p>
            <BoardGate gated={gated} board="moat" below={gateCopy.moat}>
              <PhoneMoatBoard rows={moatEntries} gateCutIndex={gateCutIndex} />
            </BoardGate>
          </TabsContent>
        </LeaderboardTabs>
      </BelowSm>

      {/* Desktop (2026-10-05, the minimal pass): the house paper, a bare title
          over one rule, the board tabs and the two filters on one line, then the
          board. No hero card, no dek, no atmospheric wash. */}
      <FromSm className="house min-h-screen">
      <div className={PAGE_SHELL}>
        <header className="border-b border-[var(--rule)] pb-6 pt-3">
          <h1 className="house-display text-4xl sm:text-5xl">Leaderboards</h1>
        </header>

        <LeaderboardTabs defaultTab={defaultTab} className="w-full gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <TabsList aria-label="Boards" className="inline-flex h-auto w-fit gap-1 rounded-none bg-transparent p-0">
              <TabsTrigger value="overall" className={TAB_TRIGGER_CLASS}>
                Overall
              </TabsTrigger>
              <TabsTrigger value="quarter" className={TAB_TRIGGER_CLASS}>
                Quarter
              </TabsTrigger>
              <TabsTrigger value="growth" className={TAB_TRIGGER_CLASS}>
                Growth
              </TabsTrigger>
              <TabsTrigger value="moat" className={TAB_TRIGGER_CLASS}>
                Moat
              </TabsTrigger>
            </TabsList>
            <BoardFilterChips variant="desktop" />
          </div>

          <TabsContent value="overall" className="mt-0">
            <BoardGate gated={gated} board="overall" below={gateCopy.overall}>
            {/* The board plate: a hairline frame, a paper margin, then the board
                on the lighter paper — title bar, table, one footnote. */}
            <div className="rounded-2xl border border-[var(--rule)] p-2">
            <div className="overflow-hidden rounded-md border border-[var(--rule)] bg-[var(--paper-2)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-3.5">
                <h2 className="house-data text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
                  Overall · <FilteredCount codes={overallCodes} /> companies
                </h2>
                {/* The board sorts on the live Read (score-board-table.tsx ranks
                    on readScore), the Read column shows that very number, AND the
                    grey tail is the same live rank past COVERAGE_BOARD_SIZE — one
                    number decides order and greying, so they can't contradict. The
                    stored coverage flag governs homepage/sectors, not this board. */}
                <p className="house-data text-[12px] text-[var(--ink-soft)]">Ranked by Read</p>
              </div>
              <OverallTable
                rows={overallRows}
                priorRankByCode={priorRankByCode}
                coverageCutRank={COVERAGE_BOARD_SIZE}
                gateCutIndex={gateCutIndex}
                addedCodes={newCodes}
              />
              {belowCutCount > 0 && (
                // The greyed tail is simply the rows ranked past the top 100 on the
                // live Read — greyed because they're lowest-ranked, so a greyed row
                // can never sit above a kept one. Named here so it doesn't read as a
                // rendering fault.
                <p className="house-data border-t border-[var(--rule)] px-4 py-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                  The {belowCutCount} greyed {belowCutCount === 1 ? "company ranks" : "companies rank"}{" "}
                  outside the top 100 by Read — still tracked, still open to read.
                </p>
              )}
            </div>
            </div>
            </BoardGate>
          </TabsContent>

          <TabsContent value="quarter" className="mt-4 space-y-3">
            <h2 className="sr-only">Quarter board</h2>
            <BandSummaryLine
              scored={concallScored}
              total={rankedRows.length}
              scopeNote="scored this quarter"
              bandCounts={quarterBandCounts}
            />
            <BoardGate gated={gated} board="quarter" below={gateCopy.quarter}>
              <div className="space-y-3">
                <LeaderboardTable
                  quarterLabels={quarterLabels}
                  data={rankedRows}
                  gateCutIndex={gateCutIndex}
                />
                {quarterFreshCount > 0 && (
                  <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">New · 24h</span> marks the{" "}
                    {quarterFreshCount} {quarterFreshCount === 1 ? "score" : "scores"} written in the
                    last twenty-four hours.
                  </p>
                )}
              </div>
            </BoardGate>
          </TabsContent>

          <TabsContent value="growth" className="mt-4 space-y-3">
            <h2 className="sr-only">Growth board</h2>
            {growthEntries.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No growth outlook data available yet.
              </div>
            ) : (
              <>
                <BandSummaryLine
                  scored={growthScored}
                  total={growthEntries.length}
                  scopeNote="with a growth score"
                  bandCounts={growthBandCounts}
                />
                <BoardGate gated={gated} board="growth" below={gateCopy.growth}>
                  <GrowthTable data={growthEntries} gateCutIndex={gateCutIndex} />
                </BoardGate>
              </>
            )}
          </TabsContent>

          <TabsContent value="moat" className="mt-4">
            <h2 className="sr-only">Moat board</h2>
            {moatEntries.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No moat assessments available yet.
              </div>
            ) : (
              <BoardGate gated={gated} board="moat" below={gateCopy.moat}>
                <MoatTable data={moatEntries} gateCutIndex={gateCutIndex} />
              </BoardGate>
            )}
          </TabsContent>
        </LeaderboardTabs>

        {telegramUrl ? (
          <p className="house-data text-[11px] text-[var(--ink-soft)]">
            Section changes get posted in the{" "}
            <TelegramJoinLink href={telegramUrl} surface="leaderboards" className="house-link">
              Telegram group
            </TelegramJoinLink>{" "}
            first.
          </p>
        ) : null}
      </div>
      </FromSm>
    </main>
    </BoardFilterProvider>
  );
}
