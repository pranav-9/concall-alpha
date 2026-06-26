import type { CompanyRow } from "@/app/company/leaderboard-table";
import { getConcallData } from "@/app/company/get-concall-data";
import type { WatchlistTableRow } from "@/app/watchlists/watchlist-table";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  TABLE_CARD_SKY,
} from "@/lib/design/shell";
import {
  computeGrowthBandCounts,
  computeQuarterBandCounts,
  type BandCount,
} from "@/lib/leaderboard-distribution";
import { buildScorePath } from "@/lib/score-path";
import type { Metadata } from "next";
import Link from "next/link";
import { fetchLeaderboardData, type GrowthEntry, type MoatRowTable } from "./data";
import { LeaderboardTabs } from "./leaderboard-tabs";
import { GrowthTable, LeaderboardTable, MoatTable, OverallTable } from "./tables-lazy";

export const metadata: Metadata = {
  title: "Leaderboards – Story of a Stock",
  description: "Quarter scores, growth outlook, and moat tier leaderboards.",
};

const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

const TAB_TRIGGER_CLASS =
  "min-w-[6rem] justify-center rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800 data-[state=active]:shadow-sm dark:data-[state=active]:bg-sky-900/30 dark:data-[state=active]:text-sky-200";

const toNumericValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

// "Overall" rows: join the three leaderboard substrates — quarter/trajectory
// (getConcallData), growth + moat (fetchLeaderboardData) — into the watchlist
// row shape, over the whole universe. A Moat "unknown" rating means no real
// assessment, so it maps to an empty moat read ("—"), matching how a watchlist
// surfaces an un-assessed name (and lets the Read stance flag the missing leg).
function buildOverallRows(
  rows: CompanyRow[],
  latestLabel: string | null,
  quarterLabels: string[],
  growthEntries: GrowthEntry[],
  moatEntries: MoatRowTable[],
): WatchlistTableRow[] {
  const growthByCode = new Map<string, number | null>();
  const nameByCode = new Map<string, string>();
  growthEntries.forEach((entry) => {
    const code = entry.companyCode.toUpperCase();
    growthByCode.set(code, entry.growthScore ?? null);
    if (entry.companyName) nameByCode.set(code, entry.companyName);
  });

  const moatByCode = new Map<
    string,
    Pick<WatchlistTableRow, "moatLabel" | "moatRating" | "moatTier">
  >();
  moatEntries.forEach((entry) => {
    const code = entry.companyCode.toUpperCase();
    moatByCode.set(
      code,
      entry.moatRating === "unknown"
        ? { moatLabel: null, moatRating: null, moatTier: null }
        : { moatLabel: entry.moatLabel, moatRating: entry.moatRating, moatTier: entry.moatTier },
    );
    if (!nameByCode.has(code) && entry.companyName) nameByCode.set(code, entry.companyName);
  });

  return rows.map((row) => {
    const code = String(row.company).toUpperCase();
    const moat = moatByCode.get(code);
    return {
      companyCode: code,
      companyName: nameByCode.get(code) ?? code,
      latestQuarterScore: latestLabel ? toNumericValue(row[latestLabel]) : null,
      avg4QuarterScore: toNumericValue(row["Latest 4Q Avg"]),
      growthScore: growthByCode.get(code) ?? null,
      trajectoryKey: row.trajectoryKey,
      trendChange: row.trendChange ?? null,
      trendDescription: row.trendDescription ?? null,
      scorePath: buildScorePath(row, quarterLabels),
      moatLabel: moat?.moatLabel ?? null,
      moatRating: moat?.moatRating ?? null,
      moatTier: moat?.moatTier ?? null,
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
  const [{ rows, latestLabel, quarterLabels }, { growthEntries, moatEntries }] = await Promise.all([
    getConcallData(),
    fetchLeaderboardData(),
  ]);

  const overallRows = buildOverallRows(
    rows,
    latestLabel ?? null,
    quarterLabels,
    growthEntries,
    moatEntries,
  );

  const latestQuarterLabel = quarterLabels[0] ?? null;
  const quarterLatestScores = latestQuarterLabel
    ? rows.map((r) => {
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
              Quarter scores, growth outlook, and moat tiers in a single research shell.
            </p>
          </div>
        </section>

        <LeaderboardTabs defaultTab={defaultTab} className="w-full space-y-4">
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

          <TabsContent value="overall" className="mt-4 space-y-3">
            <BandSummaryLine
              scored={quarterScored}
              total={rows.length}
              scopeNote="scored this quarter"
              bandCounts={quarterBandCounts}
            />
            <div className={TABLE_CARD_SKY}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Every signal in one place
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Sorted by latest quarter score · click{" "}
                  <span className="font-medium text-foreground">Read</span> to sort by the synthesis
                </p>
              </div>
              <OverallTable rows={overallRows} />
            </div>
          </TabsContent>

          <TabsContent value="quarter" className="mt-4 space-y-3">
            <BandSummaryLine
              scored={quarterScored}
              total={rows.length}
              scopeNote="scored this quarter"
              bandCounts={quarterBandCounts}
            />
            <LeaderboardTable quarterLabels={quarterLabels} data={rows} />
          </TabsContent>

          <TabsContent value="growth" className="mt-4 space-y-3">
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
            {moatEntries.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No moat assessments available yet.
              </div>
            ) : (
              <MoatTable data={moatEntries} />
            )}
          </TabsContent>
        </LeaderboardTabs>

        {/* placeholder anchor */}
        <div className="flex justify-end">
          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            Back to home
          </Link>
        </div>
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
