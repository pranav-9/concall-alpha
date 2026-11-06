// /quarter-tracker — the results season as one page, in the house skin: how
// much of coverage has reported, and the scored board — company, score, the
// guidance management moved on the call and the key variables year on year.
// The season chart and the week's call calendar sit behind the header's
// "Upcoming calls" button, in a dialog. The board's sort, its one filter
// (Improvers / Raised guidance / Lowered guidance), the sector and the
// Watchlist scope are all links, so any view is a shareable URL; the client
// code is the dialog, the sector select and the chart's scroller. The chart and the headline
// count always show the whole of coverage; the Watchlist scope narrows the
// board and the upcoming list only, the sector the board only.

import type { Metadata } from "next";

import { authHrefWithNext } from "@/lib/safe-next-path";
import { getReaderWatchlist } from "@/lib/watchlist-codes";

import { getTargetQuarter, getTrackerData, type TrackerEntry } from "./data";
import { trackerHref, type TrackerQuery } from "./href";
import { ScoredBoard } from "./scored-board";
import { SectorSelect } from "./sector-select";
import {
  buildSeasonChart,
  callsThisWeek,
  groupUpcoming,
  isImprover,
  istToday,
  latestCallsLabel,
  parseDir,
  parseFilter,
  parseSector,
  parseSort,
  scopeBoard,
  sortScored,
  splitLatestCalls,
  type BoardFilter,
  type SortKey,
} from "./season";
import { SeasonChartPanel } from "./season-chart";
import { EMPTY_SIGNALS } from "./signals";
import { getQuarterSignals } from "./signals-data";
import { FilterChip, WatchlistChip, type WatchlistChipState } from "./tracker-chips";
import { UpcomingCallsDialog } from "./upcoming-dialog";
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

type Param = string | string[] | undefined;
type SearchParams = { sort?: Param; dir?: Param; filter?: Param; sector?: Param; mine?: Param };

/** A repeated query parameter arrives as an array; the first value counts. */
const one = (value: Param): string | undefined => (Array.isArray(value) ? value[0] : value);

const FILTER_TITLES: Record<BoardFilter, { off: string; on: string; none: string }> = {
  improvers: {
    off: "Only companies that scored above their prior quarter",
    on: "Back to every scored company",
    none: "None here has scored above its prior quarter yet",
  },
  raised: {
    off: "Only companies that raised a live guidance number on this quarter's call",
    on: "Back to every scored company",
    none: "None here has raised guidance on this quarter's call yet",
  },
  lowered: {
    off: "Only companies that lowered a live guidance number on this quarter's call",
    on: "Back to every scored company",
    none: "None here has lowered guidance on this quarter's call yet",
  },
};

const GUIDANCE_DOWN_TITLE = "Guidance couldn't be read just now";

const EMPTY_FILTERED: Record<BoardFilter, string> = {
  improvers: "No company here has scored above its prior quarter yet.",
  raised: "No company here has raised guidance on this quarter's call yet.",
  lowered: "No company here has lowered guidance on this quarter's call yet.",
};

export default async function QuarterTrackerPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const sort = parseSort(one(params.sort));
  const dir = parseDir(one(params.dir));
  const filter = parseFilter(one(params.filter));

  // Three independent reads: the signals are keyed on the quarter alone, so
  // they never wait on the tracker data or the reader's auth + watchlist.
  const [data, reader, signals] = await Promise.all([
    getTrackerData(),
    getReaderWatchlist(),
    getQuarterSignals(getTargetQuarter()),
  ]);
  const { target, entries, totalCompanies, reportedCompanies, unofficialCompanies, freshCompanies } = data;
  const scored = entries.filter((e) => e.score != null);
  const upcoming = entries.filter((e) => e.score == null);

  const userId = reader.userId;
  const watchCodes = reader.codes ? new Set(reader.codes) : null;
  // A shared `mine=1` link opened signed out (or with an empty watchlist)
  // falls back to the whole of coverage.
  const mine = one(params.mine) === "1" && watchCodes != null && watchCodes.size > 0;
  const boardSectors = [...new Set(scored.map((e) => e.sector).filter((s): s is string => Boolean(s?.trim())))].sort(
    (a, b) => a.localeCompare(b),
  );
  const sector = parseSector(params.sector, boardSectors);
  const query: TrackerQuery = { sort, dir, filter, sector, mine };

  const now = new Date();
  const today = istToday(now);

  const inWatchlist = (e: TrackerEntry) => watchCodes?.has(e.code.toUpperCase()) ?? false;
  const signalsOf = (e: TrackerEntry) => signals.byCode.get(e.code.toUpperCase()) ?? EMPTY_SIGNALS;
  const board = scopeBoard({
    scored,
    filter,
    sector,
    mine,
    inWatchlist,
    matches: {
      improvers: isImprover,
      raised: (e) => Boolean(signalsOf(e).guidance?.raised),
      lowered: (e) => Boolean(signalsOf(e).guidance?.lowered),
    },
  });
  // A failed guidance read must not read as "nobody moved guidance".
  const guidanceDown = !signals.guidanceAvailable;
  const boardRows = sortScored(board.rows, sort, dir);
  const split = splitLatestCalls(boardRows, today);
  const pinned = split.day ? { label: latestCallsLabel(split.day, today), rows: split.latest } : null;

  const scopedUpcoming = mine ? upcoming.filter(inWatchlist) : upcoming;
  const chart = buildSeasonChart(entries, target, today);
  const groups = groupUpcoming(scopedUpcoming, today);
  // The button, the summary and the list under it count the same companies:
  // the watchlist scope narrows all three.
  const thisWeek = callsThisWeek(scopedUpcoming, today);
  const callDateTba = groups.noCall.length + groups.undated.length;

  const watchlistChip = (count: number): WatchlistChipState =>
    !userId
      ? { kind: "signed-out", signInHref: authHrefWithNext("/auth/login", trackerHref({ ...query, mine: true })) }
      : watchCodes == null || watchCodes.size === 0
        ? { kind: "empty" }
        : { kind: "ready", on: mine, count, href: trackerHref({ ...query, mine: !mine }) };
  const sortHref = (key: SortKey) =>
    trackerHref({ ...query, sort: key, dir: key === sort ? (dir === "desc" ? "asc" : "desc") : "desc" });
  const chip = (key: BoardFilter, label: string, glyph?: string, tone?: string) => (
    <FilterChip
      on={filter === key}
      count={board.filterCounts[key]}
      unavailable={key !== "improvers" && guidanceDown ? GUIDANCE_DOWN_TITLE : undefined}
      href={trackerHref({ ...query, filter: filter === key ? null : key })}
      label={label}
      glyph={glyph}
      tone={tone}
      titles={FILTER_TITLES[key]}
    />
  );
  const sectorOptions = [
    { value: "", label: "All sectors", href: trackerHref({ ...query, sector: null }) },
    ...boardSectors.map((s) => ({
      value: s,
      label: `${s} (${board.sectorCounts.get(s) ?? 0})`,
      href: trackerHref({ ...query, sector: s }),
    })),
  ];

  const pct = totalCompanies > 0 ? Math.round((reportedCompanies / totalCompanies) * 100) : 0;
  const emptyMessage =
    scored.length === 0
      ? `No ${target.label} scores yet — each company lands here once its call is scored.`
      : filter && filter !== "improvers" && guidanceDown
        ? `${GUIDANCE_DOWN_TITLE}, so this filter can't run. Try again in a minute.`
        : filter
        ? EMPTY_FILTERED[filter]
        : mine
          ? "None of your watchlist companies here has been scored yet."
          : "No company in this sector has been scored yet.";
  // "Call date TBA" counts what the list's own fold counts (no call date on
  // file), not the chart's "no board-meeting date", so no company is in both halves.
  const summary = `${target.label} · ${thisWeek} dated this week · ${callDateTba} call date TBA${mine ? " · your watchlist" : ""}`;
  const unreadable = [
    signals.guidanceAvailable ? null : "Guidance",
    signals.keyVariablesAvailable ? null : "Key variables",
  ].filter((leg): leg is string => leg != null);
  const notice =
    unreadable.length > 0
      ? `${unreadable.join(" and ")} couldn't be read just now${
          signals.guidanceAvailable ? "" : ", so the Raised / Lowered filters are paused"
        }. Try again in a minute.`
      : null;

  return (
    <main className="house min-h-screen">
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-[18px] sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-[var(--rule)] pb-5 sm:pb-6">
          <h1 className="house-display text-[34px] leading-[1.02] sm:text-[44px] sm:leading-[0.98]">
            {target.label} season
          </h1>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <UpcomingCallsDialog thisWeek={thisWeek} summary={summary}>
              <div className="overflow-hidden rounded-lg border border-[var(--rule)] bg-[var(--paper-2)]">
                <SeasonChartPanel
                  chart={chart}
                  freshCompanies={freshCompanies}
                  unofficialCompanies={unofficialCompanies}
                />
                <div className="border-t border-[var(--rule)]">
                  <UpcomingPanel
                    groups={groups}
                    today={today}
                    scoped={mine}
                    chip={<WatchlistChip state={watchlistChip(upcoming.filter(inWatchlist).length)} />}
                  />
                </div>
              </div>
            </UpcomingCallsDialog>
            <div className="w-[11.5rem] sm:w-[12.5rem]">
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
          </div>
        </header>

        <div className="mt-6 sm:mt-8">
          <ScoredBoard
            pinned={pinned}
            rows={split.rest}
            signals={signals.byCode}
            scoreLabel={target.label}
            sort={sort}
            dir={dir}
            sortHref={sortHref}
            now={now}
            emptyMessage={emptyMessage}
            notice={notice}
            filters={
              <>
                <SectorSelect options={sectorOptions} value={sector ?? ""} />
                {chip("improvers", "Improvers", "▲", "text-[var(--signal)]")}
                {chip("raised", "Raised guidance")}
                {chip("lowered", "Lowered guidance")}
                <WatchlistChip state={watchlistChip(board.watchlistCount)} />
              </>
            }
          />
        </div>
      </div>
    </main>
  );
}
