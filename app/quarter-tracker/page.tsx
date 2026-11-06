// /quarter-tracker — the results season as one page, in the house skin: how
// much of coverage has reported, and the scored board — score, Δ, trail, the
// guidance management moved on the call and the key variables year on year.
// The season chart and the week's call calendar sit behind the header's
// "Upcoming calls" button, in a dialog. The board's sort, its one filter
// (Improvers / Raised guidance / Lowered guidance), the sector and the
// Watchlist scope are all links, so any view is a shareable URL; the only
// client code is the dialog and the sector select. The chart and the headline
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

type SearchParams = { sort?: string; dir?: string; filter?: string; sector?: string; mine?: string };

const FILTER_TITLES: Record<BoardFilter, { off: string; on: string; none: string }> = {
  improvers: {
    off: "Only companies that scored above their prior quarter",
    on: "Back to every scored company",
    none: "No company has scored above its prior quarter yet",
  },
  raised: {
    off: "Only companies that raised a live guidance number on this quarter's call",
    on: "Back to every scored company",
    none: "No raised guidance on this quarter's calls yet",
  },
  lowered: {
    off: "Only companies that lowered a live guidance number on this quarter's call",
    on: "Back to every scored company",
    none: "No lowered guidance on this quarter's calls yet",
  },
};

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
  const sort = parseSort(params.sort);
  const dir = parseDir(params.dir);
  const filter = parseFilter(params.filter);

  const [data, reader] = await Promise.all([getTrackerData(), getReaderWatchlist()]);
  const { target, entries, totalCompanies, reportedCompanies, unofficialCompanies, freshCompanies } = data;
  const scored = entries.filter((e) => e.score != null);
  const upcoming = entries.filter((e) => e.score == null);
  const signals = await getQuarterSignals(target, scored.map((e) => e.code));

  const userId = reader.userId;
  const watchCodes = reader.codes ? new Set(reader.codes) : null;
  // A shared `mine=1` link opened signed out (or with an empty watchlist)
  // falls back to the whole of coverage.
  const mine = params.mine === "1" && watchCodes != null && watchCodes.size > 0;
  const boardSectors = [...new Set(scored.map((e) => e.sector).filter((s): s is string => Boolean(s?.trim())))].sort(
    (a, b) => a.localeCompare(b),
  );
  const sector = parseSector(params.sector, boardSectors);
  const query: TrackerQuery = { sort, dir, filter, sector, mine };

  const now = new Date();
  const today = istToday(now);

  const inWatchlist = (e: TrackerEntry) => watchCodes?.has(e.code.toUpperCase()) ?? false;
  const inSector = (e: TrackerEntry) => !sector || e.sector === sector;
  const signalsOf = (e: TrackerEntry) => signals.get(e.code.toUpperCase()) ?? EMPTY_SIGNALS;
  const matches: Record<BoardFilter, (e: TrackerEntry) => boolean> = {
    improvers: isImprover,
    raised: (e) => Boolean(signalsOf(e).guidance?.raised),
    lowered: (e) => Boolean(signalsOf(e).guidance?.lowered),
  };

  // Each chip counts what turning IT on would leave, everything else as is.
  const sectorScoped = scored.filter(inSector);
  const scope = mine ? sectorScoped.filter(inWatchlist) : sectorScoped;
  const filterCount = (key: BoardFilter) => scope.filter(matches[key]).length;
  const filtered = filter ? scope.filter(matches[filter]) : scope;
  const boardRows = sortScored(filtered, sort, dir);
  const split = splitLatestCalls(boardRows, today);
  const pinned = split.day ? { label: latestCallsLabel(split.day, today), rows: split.latest } : null;

  const scopedUpcoming = mine ? upcoming.filter(inWatchlist) : upcoming;
  const chart = buildSeasonChart(entries, target, today);
  const groups = groupUpcoming(scopedUpcoming, today);
  const thisWeek = callsThisWeek(upcoming, today);

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
      count={filterCount(key)}
      href={trackerHref({ ...query, filter: filter === key ? null : key })}
      label={label}
      glyph={glyph}
      tone={tone}
      titles={FILTER_TITLES[key]}
    />
  );
  const sectorCounts = new Map<string, number>();
  for (const e of mine ? scored.filter(inWatchlist) : scored) {
    if (e.sector) sectorCounts.set(e.sector, (sectorCounts.get(e.sector) ?? 0) + 1);
  }
  const sectorOptions = [
    { value: "", label: "All sectors", href: trackerHref({ ...query, sector: null }) },
    ...boardSectors.map((s) => ({
      value: s,
      label: `${s} (${sectorCounts.get(s) ?? 0})`,
      href: trackerHref({ ...query, sector: s }),
    })),
  ];

  const pct = totalCompanies > 0 ? Math.round((reportedCompanies / totalCompanies) * 100) : 0;
  const emptyMessage =
    scored.length === 0
      ? `No ${target.label} scores yet — each company lands here once its call is scored.`
      : filter
        ? EMPTY_FILTERED[filter]
        : mine
          ? "None of your watchlist companies here has been scored yet."
          : "No company in this sector has been scored yet.";
  const summary = `${target.label} · ${thisWeek} dated this week · ${chart.undated.length} date TBA`;

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
            signals={signals}
            scoreLabel={target.label}
            sort={sort}
            dir={dir}
            sortHref={sortHref}
            now={now}
            emptyMessage={emptyMessage}
            filters={
              <>
                <SectorSelect options={sectorOptions} value={sector ?? ""} />
                {chip("improvers", "Improvers", "▲", "text-[var(--signal)]")}
                {chip("raised", "Raised guidance")}
                {chip("lowered", "Lowered guidance")}
                <WatchlistChip state={watchlistChip(sectorScoped.filter(inWatchlist).filter(filter ? matches[filter] : () => true).length)} />
              </>
            }
          />
        </div>
      </div>
    </main>
  );
}
