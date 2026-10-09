// /quarter-tracker — the results season as one page, in the house skin: how
// much of coverage has reported, the season chart (one square per company on
// the day its board meets), the scored board, and who reports next. Two
// filters, Improvers and Watchlist, and the board's sort are all links, so any
// view is a shareable URL and the page ships no client state. The chart and
// the headline count always show the whole of coverage; the Watchlist filter
// narrows the board and the upcoming panel only.

import type { Metadata } from "next";

import { authHrefWithNext } from "@/lib/safe-next-path";
import { getReaderWatchlist } from "@/lib/watchlist-codes";

import { getTargetQuarter, getTrackerData, type TrackerEntry } from "./data";
import { trackerHref, type TrackerQuery } from "./href";
import { ScoredBoard } from "./scored-board";
import {
  buildSeasonChart,
  groupUpcoming,
  isImprover,
  istToday,
  parseDir,
  parseSort,
  sortScored,
  type SortKey,
} from "./season";
import { SeasonChartCard } from "./season-chart";
import { ImproversChip, WatchlistChip, type WatchlistChipState } from "./tracker-chips";
import { UpcomingPanel } from "./upcoming-panel";

// generateMetadata (not a static export) so the label is computed per request
// and never freezes at a season boundary.
export async function generateMetadata(): Promise<Metadata> {
  const { label } = getTargetQuarter();
  return {
    title: `${label} season – Story of a Stock`,
    description: `Every covered company through the ${label} results season: who has reported and how the call scored, who is next and when, and who still owes a date.`,
    alternates: { canonical: "/quarter-tracker" },
  };
}

type SearchParams = { sort?: string; dir?: string; filter?: string; mine?: string };

export default async function QuarterTrackerPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const sort = parseSort(params.sort);
  const dir = parseDir(params.dir);
  const improvers = params.filter === "improvers";

  const [data, reader] = await Promise.all([getTrackerData(), getReaderWatchlist()]);
  const userId = reader.userId;
  const watchCodes = reader.codes ? new Set(reader.codes) : null;
  // A shared `mine=1` link opened signed out (or with an empty watchlist)
  // falls back to the whole of coverage.
  const mine = params.mine === "1" && watchCodes != null && watchCodes.size > 0;
  const query: TrackerQuery = { sort, dir, improvers, mine };

  const { target, entries, totalCompanies, reportedCompanies, unofficialCompanies, freshCompanies } =
    data;
  const now = new Date();
  const today = istToday(now);

  const inWatchlist = (e: TrackerEntry) => watchCodes?.has(e.code.toUpperCase()) ?? false;
  const scored = entries.filter((e) => e.score != null);
  const upcoming = entries.filter((e) => e.score == null);
  const scopedScored = mine ? scored.filter(inWatchlist) : scored;
  const scopedUpcoming = mine ? upcoming.filter(inWatchlist) : upcoming;
  const improverRows = scopedScored.filter(isImprover);
  const boardRows = sortScored(improvers ? improverRows : scopedScored, sort, dir);

  const chart = buildSeasonChart(entries, target, today);
  const groups = groupUpcoming(scopedUpcoming, today);

  // Each block's Watchlist chip counts ITS companies on the reader's lists, so
  // the reader sees what the filter would leave before turning it on.
  const watchlistChip = (count: number): WatchlistChipState =>
    !userId
      ? { kind: "signed-out", signInHref: authHrefWithNext("/auth/login", trackerHref({ ...query, mine: true })) }
      : watchCodes == null || watchCodes.size === 0
        ? { kind: "empty" }
        : { kind: "ready", on: mine, count, href: trackerHref({ ...query, mine: !mine }) };
  const sortHref = (key: SortKey) =>
    trackerHref({ ...query, sort: key, dir: key === sort ? (dir === "desc" ? "asc" : "desc") : "desc" });

  const pct = totalCompanies > 0 ? Math.round((reportedCompanies / totalCompanies) * 100) : 0;
  const emptyMessage =
    scored.length === 0
      ? `No ${target.label} scores yet — each company lands here once its call is scored.`
      : improvers
        ? "No company has scored above its prior quarter yet."
        : "None of your watchlist companies has been scored yet.";

  return (
    <main className="house min-h-screen">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-[18px] sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <h1 className="house-display text-[34px] leading-[1.02] sm:text-[44px] sm:leading-[0.98]">
            {target.label} season
          </h1>
          <div className="w-full max-w-[14rem] sm:w-[14rem]">
            <p className="house-data text-[11px] text-[var(--ink-soft)]">
              <span className="house-display mr-1.5 text-[22px] leading-none text-[var(--ink)]">
                {reportedCompanies}
              </span>
              of {totalCompanies} reported
            </p>
            <div
              role="progressbar"
              aria-label={`${reportedCompanies} of ${totalCompanies} covered companies have reported`}
              aria-valuemin={0}
              aria-valuemax={totalCompanies}
              aria-valuenow={reportedCompanies}
              className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[var(--rule)]"
            >
              <div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </header>

        <div className="mt-6 sm:mt-8">
          <SeasonChartCard
            chart={chart}
            freshCompanies={freshCompanies}
            unofficialCompanies={unofficialCompanies}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <ScoredBoard
            rows={boardRows}
            scoreLabel={target.label}
            sort={sort}
            dir={dir}
            sortHref={sortHref}
            now={now}
            emptyMessage={emptyMessage}
            chips={
              <>
                <ImproversChip
                  on={improvers}
                  count={improverRows.length}
                  href={trackerHref({ ...query, improvers: !improvers })}
                />
                <WatchlistChip state={watchlistChip(scored.filter(inWatchlist).length)} />
              </>
            }
          />
          <UpcomingPanel
            groups={groups}
            today={today}
            scoped={mine}
            chip={<WatchlistChip size="sm" state={watchlistChip(upcoming.filter(inWatchlist).length)} />}
          />
        </div>
      </div>
    </main>
  );
}
