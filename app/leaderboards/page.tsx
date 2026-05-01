import { getConcallData } from "@/app/company/get-concall-data";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_SKY,
} from "@/lib/design/shell";
import type { Metadata } from "next";
import Link from "next/link";
import { fetchLeaderboardData } from "./data";
import { LeaderboardTabs } from "./leaderboard-tabs";
import { GrowthTable, LeaderboardTable, MoatTable } from "./tables-lazy";

export const metadata: Metadata = {
  title: "Leaderboards – Story of a Stock",
  description: "Concall sentiment, growth outlook, and moat tier leaderboards.",
};

const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

const TAB_TRIGGER_CLASS =
  "min-w-[6rem] justify-center rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800 data-[state=active]:shadow-sm dark:data-[state=active]:bg-sky-900/30 dark:data-[state=active]:text-sky-200";

const STAT_CARD_INTERACTIVE_CLASS =
  "block transition-colors hover:bg-sky-100/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:hover:bg-sky-900/30";

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolved = await searchParams;
  const tabParam = resolved?.tab;
  const defaultTab =
    tabParam === "growth" ? "growth" : tabParam === "moat" ? "moat" : "sentiment";
  const [{ rows, quarterLabels }, { growthEntries, moatEntries }] = await Promise.all([
    getConcallData(),
    fetchLeaderboardData(),
  ]);

  const latestQuarterLabel = quarterLabels[0] ?? null;
  const totalCompanies = Math.max(rows.length, growthEntries.length, moatEntries.length);
  const sentimentCovered = latestQuarterLabel
    ? rows.filter((r) => r[latestQuarterLabel] != null).length
    : rows.length;
  const growthCovered = growthEntries.filter((e) => e.growthScore != null).length;
  const moatCovered = moatEntries.filter((e) => e.moatRating !== "unknown").length;

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                Leaderboards
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Concall sentiment, growth outlook, and moat tiers in a single research shell.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link
                href="?tab=sentiment"
                scroll={false}
                prefetch={false}
                aria-label="View sentiment leaderboard"
                className={`${PANEL_CARD_SKY} ${STAT_CARD_INTERACTIVE_CLASS}`}
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Sentiment
                </p>
                <p className="mt-2 text-2xl font-black leading-none text-foreground">
                  {sentimentCovered}
                  <span className="ml-1 text-base font-medium text-muted-foreground">
                    / {totalCompanies}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {latestQuarterLabel
                    ? `Rank by ${latestQuarterLabel} coverage and 4Q average.`
                    : "Rank by quarter coverage and 4Q average."}
                </p>
              </Link>
              <Link
                href="?tab=growth"
                scroll={false}
                prefetch={false}
                aria-label="View growth leaderboard"
                className={`${PANEL_CARD_SKY} ${STAT_CARD_INTERACTIVE_CLASS}`}
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Growth
                </p>
                <p className="mt-2 text-2xl font-black leading-none text-foreground">
                  {growthCovered}
                  <span className="ml-1 text-base font-medium text-muted-foreground">
                    / {totalCompanies}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Rank by growth score with base/upside/downside spread.
                </p>
              </Link>
              <Link
                href="?tab=moat"
                scroll={false}
                prefetch={false}
                aria-label="View moat leaderboard"
                className={`${PANEL_CARD_SKY} ${STAT_CARD_INTERACTIVE_CLASS}`}
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Moat
                </p>
                <p className="mt-2 text-2xl font-black leading-none text-foreground">
                  {moatCovered}
                  <span className="ml-1 text-base font-medium text-muted-foreground">
                    / {totalCompanies}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Rank by tier — Wide → Narrow → At Risk → No Moat.
                </p>
              </Link>
            </div>
          </div>
        </section>

        <LeaderboardTabs defaultTab={defaultTab} className="w-full space-y-4">
          <TabsList className="inline-flex h-auto w-fit rounded-full border border-sky-200/35 bg-background/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm dark:border-sky-700/20">
            <TabsTrigger value="sentiment" className={TAB_TRIGGER_CLASS}>
              Sentiment
            </TabsTrigger>
            <TabsTrigger value="growth" className={TAB_TRIGGER_CLASS}>
              Growth
            </TabsTrigger>
            <TabsTrigger value="moat" className={TAB_TRIGGER_CLASS}>
              Moat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sentiment" className="mt-4">
            <LeaderboardTable quarterLabels={quarterLabels} data={rows} />
          </TabsContent>

          <TabsContent value="growth" className="mt-4">
            {growthEntries.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No growth outlook data available yet.
              </div>
            ) : (
              <GrowthTable data={growthEntries} />
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
