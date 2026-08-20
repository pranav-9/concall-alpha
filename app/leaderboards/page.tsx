import { getConcallData } from "@/app/company/get-concall-data";
import { BandSummaryLine } from "@/components/band-summary-line";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  TOUCH_TARGET,
} from "@/lib/design/shell";
import {
  computeBoardReadCounts,
  computeGrowthBandCounts,
  computeQuarterBandCounts,
} from "@/lib/leaderboard-distribution";
import { classifyBoardRead } from "@/lib/board-read";
import { resolveLeaderboardTab } from "@/lib/leaderboard-tab";
import { buildScoreBoardRows } from "@/lib/score-board-rows";
import { computeBoardRanks, COVERAGE_BOARD_SIZE } from "@/lib/leaderboard-rank";
import {
  readPriorRanks,
  writeTodaySnapshotIfMissing,
  type RankSnapshotRow,
} from "@/lib/leaderboard-snapshot";
import { after } from "next/server";
import type { Metadata } from "next";
import { fetchLeaderboardData } from "./data";
import { LeaderboardTabs } from "./leaderboard-tabs";
import { GrowthTable, LeaderboardTable, MoatTable, OverallTable } from "./tables-lazy";

export const metadata: Metadata = {
  title: "Leaderboards – Story of a Stock",
  description: "ConcallScores, growth outlook, and moat tier leaderboards.",
  alternates: { canonical: "/leaderboards" },
};

const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

// Two constraints ride on this string:
//   min-w only from sm up — four 6rem triggers plus the list's own padding
//   measured 394px, which overflowed a 366px phone and cut the "Moat" tab off
//   the screen. Below sm they size to their labels (~322px total).
//   Active state is the design system's in-page tab pill (bg-foreground /
//   text-background), matching the navbar 200px above. The previous sky tint
//   put two active-state languages on one screen and reached for a raw palette
//   utility outside the four sanctioned sources of colour.
const TAB_TRIGGER_CLASS =
  `shrink-0 justify-center rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors sm:min-w-[6rem] data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm ${TOUCH_TARGET}`;

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
  const [
    { rows, latestLabel, quarterLabels },
    { growthEntries, moatEntries, growthScoreByCode, nameByCode },
    priorRankByCode,
  ] = await Promise.all([
    // includeBelowCut: the Overall board renders the tail greyed out rather than
    // dropping it. Large caps are still excluded outright — two different gates.
    getConcallData({ excludeLargeCaps: true, includeBelowCut: true }),
    fetchLeaderboardData(),
    // Ranks from the prior snapshot window for the Δ column. Empty until history accrues.
    readPriorRanks(),
  ]);

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

  // The Overall summary describes the Read column, not the Quarter one — the
  // board is ranked by the composite, so counting quarter bands under it
  // described a column the reader isn't sorted by. Counted in the Read's own
  // configuration vocabulary, which is what the cells actually show.
  const overallReads = overallRows.map((row) =>
    classifyBoardRead({
      concallScore: row.concallScore,
      growthScore: row.growthScore,
      valuationScore: row.valuationScore,
    }),
  );
  const overallBandCounts = computeBoardReadCounts(overallReads.map((r) => r.key));
  const overallScored = overallReads.filter((r) => r.key !== "no_read").length;

  // Δ column: rank the whole board by its live Read (the SAME helper the board
  // renders with, so today's snapshot can't diverge from the live #), then record
  // today's snapshot once per UTC day via after() so the write never blocks the
  // response. The board itself gets priorRankByCode (read above) for the delta.
  const currentRankByCode = computeBoardRanks(
    overallRows.map((row, i) => ({
      companyCode: row.companyCode,
      companyName: row.companyName,
      readScore: overallReads[i].score,
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
  // Counted over the whole board including the greyed tail, unlike the Quarter
  // tab — this board renders that tail, so a count that excluded it would not
  // match what the reader can see.
  const overallFreshCount = overallRows.filter((row) => row.concallScoredWithin24h).length;

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
              Leaderboards
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Every company on the same three scores — the quarter just reported, the outlook
              ahead, and what you pay for it.
            </p>
          </div>
        </section>

        <LeaderboardTabs defaultTab={defaultTab} className="w-full space-y-4">
          {/* Scrolls rather than clips if the strip ever outgrows the viewport
              again (a fifth tab, a longer label). Negative margin lets the pill
              run to the screen edge on mobile instead of stopping at the gutter. */}
          <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto w-fit rounded-full border border-sky-200/35 bg-background/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm dark:border-sky-700/20">
            <TabsTrigger value="overall" className={TAB_TRIGGER_CLASS}>
              Overall
            </TabsTrigger>
            <TabsTrigger value="quarter" className={TAB_TRIGGER_CLASS}>
              ConcallScore
            </TabsTrigger>
            <TabsTrigger value="growth" className={TAB_TRIGGER_CLASS}>
              Growth
            </TabsTrigger>
            <TabsTrigger value="moat" className={TAB_TRIGGER_CLASS}>
              Moat
            </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overall" className="mt-4 space-y-3">
            <BandSummaryLine
              scored={overallScored}
              total={overallRows.length}
              scopeNote="with a read"
              bandCounts={overallBandCounts}
            />
            {/* House-style board frame (2026-08-11): cream paper card + house
                title bar, the leaderboard's move toward the homepage house look.
                Scoped to `.house` so the palette vars resolve. The in-table cell
                theming is a follow-up design pass. */}
            <div
              className="house overflow-hidden rounded-[1.45rem] border shadow-[0_18px_38px_-32px_rgba(15,23,42,0.24)]"
              style={{ borderColor: "var(--rule)", background: "var(--paper)" }}
            >
              <div
                className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
                style={{ borderColor: "var(--rule)" }}
              >
                <h2 className="house-micro font-semibold" style={{ color: "var(--ink)" }}>
                  Overall Board · {overallRows.length}
                </h2>
                {/* The board sorts on the live Read (score-board-table.tsx ranks
                    on readScore), the Read column shows that very number, AND the
                    grey tail is the same live rank past COVERAGE_BOARD_SIZE — one
                    number decides order and greying, so they can't contradict. The
                    stored coverage flag governs homepage/sectors, not this board. */}
                <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
                  Ranked by Read
                </p>
              </div>
              <OverallTable
                rows={overallRows}
                priorRankByCode={priorRankByCode}
                coverageCutRank={COVERAGE_BOARD_SIZE}
              />
              {overallFreshCount > 0 && (
                <p className="border-t border-border/35 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">New · 24h</span> marks the{" "}
                  {overallFreshCount} scored in the last twenty-four hours.
                </p>
              )}
              {belowCutCount > 0 && (
                // The greyed tail is simply the rows ranked past the top 100 on the
                // live Read — greyed because they're lowest-ranked, so a greyed row
                // can never sit above a kept one. Named here so it doesn't read as a
                // rendering fault.
                <p className="border-t border-border/35 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
                  The <span className="font-medium text-foreground">{belowCutCount}</span> greyed{" "}
                  {belowCutCount === 1 ? "company" : "companies"} at the bottom{" "}
                  {belowCutCount === 1 ? "ranks" : "rank"} outside the top 100 by Read — still tracked
                  and still open to read, just below the covered set.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quarter" className="mt-4 space-y-3">
            <h2 className="sr-only">Quarter board</h2>
            <BandSummaryLine
              scored={concallScored}
              total={rankedRows.length}
              scopeNote="scored this quarter"
              bandCounts={quarterBandCounts}
            />
            <LeaderboardTable quarterLabels={quarterLabels} data={rankedRows} />
            {quarterFreshCount > 0 && (
              <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">New · 24h</span> marks the{" "}
                {quarterFreshCount} {quarterFreshCount === 1 ? "score" : "scores"} written in the
                last twenty-four hours.
              </p>
            )}
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
                <GrowthTable data={growthEntries} />
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
              <MoatTable data={moatEntries} />
            )}
          </TabsContent>
        </LeaderboardTabs>

      </div>
    </main>
  );
}
