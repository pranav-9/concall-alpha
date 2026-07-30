import type { CompanyRow } from "@/app/company/leaderboard-table";
import { getConcallData } from "@/app/company/get-concall-data";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  TABLE_CARD_SKY,
} from "@/lib/design/shell";
import {
  computeBoardReadCounts,
  computeGrowthBandCounts,
  computeQuarterBandCounts,
  type BandCount,
} from "@/lib/leaderboard-distribution";
import { classifyBoardRead } from "@/lib/board-read";
import { toValuationScale } from "@/lib/valuation-band";
import type { Metadata } from "next";
import { fetchLeaderboardData } from "./data";
import { LeaderboardTabs } from "./leaderboard-tabs";
import type { OverallRow } from "./overall-table";
import { GrowthTable, LeaderboardTable, MoatTable, OverallTable } from "./tables-lazy";

export const metadata: Metadata = {
  title: "Leaderboards – Story of a Stock",
  description: "Quarter scores, growth outlook, and moat tier leaderboards.",
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
  "shrink-0 justify-center rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors sm:min-w-[6rem] data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm";

const toNumericValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

// "Overall" rows: join the quarter substrate (getConcallData) with the growth
// and valuation ones into four parallel 0-10 scores. Moat and guidance are
// deliberately absent — the moat rating is categorical and can't share the
// number+band format, so it keeps its own tab. See overall-table.tsx.
function buildOverallRows(
  rows: CompanyRow[],
  latestLabel: string | null,
  growthScoreByCode: Map<string, number>,
  nameByCode: Map<string, string>,
): OverallRow[] {
  return rows.map((row) => {
    const code = String(row.company).toUpperCase();
    // A company that hasn't reported the board's latest quarter yet would show a
    // bare "—", which empties the column at the start of every earnings season.
    // Fall back to its own newest quarter and label it, the same way the
    // /company board does (app/company/leaderboard-table.tsx).
    const boardScore = latestLabel ? toNumericValue(row[latestLabel]) : null;
    const ownScore = toNumericValue(row.ownLatestScore);
    const isStale = boardScore == null && ownScore != null;
    return {
      companyCode: code,
      companyName: nameByCode.get(code) ?? code,
      quarterScore: boardScore ?? ownScore,
      quarterAsOf: isStale ? (row.ownLatestQuarterLabel ?? null) : null,
      growthScore: growthScoreByCode.get(code) ?? null,
      // getConcallData already applies the publish + staleness gates; this only
      // moves the stored 0-100 integer onto the board's 0-10 scale.
      valuationScore: toValuationScale(toNumericValue(row.valuationScore)),
      belowCut: row.belowCut === true,
    };
  });
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolved = await searchParams;
  const tabParam = resolved?.tab;
  // "Overall" is the default landing tab. "sentiment" preserved as an alias for
  // back-compat with old bookmarks that pointed at the prior default (Quarter).
  const defaultTab =
    tabParam === "quarter" || tabParam === "sentiment"
      ? "quarter"
      : tabParam === "growth"
        ? "growth"
        : tabParam === "moat"
          ? "moat"
          : "overall";
  const [
    { rows, latestLabel, quarterLabels },
    { growthEntries, moatEntries, growthScoreByCode, nameByCode },
  ] = await Promise.all([
    // includeBelowCut: the Overall board renders the tail greyed out rather than
    // dropping it. Large caps are still excluded outright — two different gates.
    getConcallData({ excludeLargeCaps: true, includeBelowCut: true }),
    fetchLeaderboardData(),
  ]);

  const overallRows = buildOverallRows(
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
  const quarterBandCounts = computeQuarterBandCounts(quarterLatestScores);
  const quarterScored = quarterLatestScores.filter((s): s is number => typeof s === "number").length;
  const growthBandCounts = computeGrowthBandCounts(growthEntries.map((e) => e.growthScore));
  const growthScored = growthEntries.filter((e) => typeof e.growthScore === "number").length;

  // The Overall summary describes the Read column, not the Quarter one — the
  // board is ranked by the composite, so counting quarter bands under it
  // described a column the reader isn't sorted by. Counted in the Read's own
  // configuration vocabulary, which is what the cells actually show.
  const overallReads = overallRows.map((row) =>
    classifyBoardRead({
      quarterScore: row.quarterScore,
      growthScore: row.growthScore,
      valuationScore: row.valuationScore,
    }),
  );
  const overallBandCounts = computeBoardReadCounts(overallReads.map((r) => r.key));
  const overallScored = overallReads.filter((r) => r.key !== "no_read").length;
  const belowCutCount = overallRows.filter((row) => row.belowCut).length;

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
              Quarter
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
            <div className={TABLE_CARD_SKY}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Overall board
                </h2>
                {/* The sort key is coverage_rank, and the Read column now shows
                    the very number it ranks on — so this line only has to say
                    which way the weighting leans. The old caption existed
                    because the rank was invisible; it isn't any more. */}
                <p className="text-[11px] text-muted-foreground">
                  Ranked by Read · quality weighted 2:1 over price
                </p>
              </div>
              <OverallTable rows={overallRows} />
              {belowCutCount > 0 && (
                // The greyed rows need naming or they read as a rendering fault.
                // Deliberately NOT "the last N": cut membership is a stored,
                // reviewed flag while the order above is computed live, so a
                // greyed row can sit mid-board until the next compute run. The
                // copy has to be true in both states.
                <p className="border-t border-border/35 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">{belowCutCount}</span>{" "}
                  {belowCutCount === 1 ? "greyed company sits" : "greyed companies sit"} below the
                  coverage cut — still tracked, not in the ranked hundred, and not linked from this
                  board. Their pages stay reachable through search.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quarter" className="mt-4 space-y-3">
            <h2 className="sr-only">Quarter board</h2>
            <BandSummaryLine
              scored={quarterScored}
              total={rankedRows.length}
              scopeNote="scored this quarter"
              bandCounts={quarterBandCounts}
            />
            <LeaderboardTable quarterLabels={quarterLabels} data={rankedRows} />
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

function BandSummaryLine<K extends string>({
  scored,
  total,
  scopeNote,
  bandCounts,
}: {
  scored: number;
  total: number;
  scopeNote: string; // e.g. "scored this quarter" — shown when scored < total
  bandCounts: BandCount<K>[];
}) {
  const visible = bandCounts.filter((b) => b.count > 0);
  if (scored === 0 || visible.length === 0) return null;
  return (
    <p className="px-1 text-[12px] text-muted-foreground">
      {scored === total ? (
        <span className="font-semibold text-foreground">{total} companies</span>
      ) : (
        <>
          <span className="font-semibold text-foreground">
            {scored} of {total}
          </span>{" "}
          companies {scopeNote}
        </>
      )}
      {" · "}
      {visible.map((b, i) => (
        <span key={b.key}>
          {i > 0 && " · "}
          <span className="font-semibold text-foreground">{b.count}</span> {b.label}
        </span>
      ))}
    </p>
  );
}
