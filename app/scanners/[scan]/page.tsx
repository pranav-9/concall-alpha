// /scanners/<scan> — one scan, its own page (2026-10-14; until then every scan
// was a tab on /scanners). Reads ONLY this scan's rows plus the reader's
// watchlist, so a page never waits on another scan's read.
//
// One filter: "In your watchlist" (`?mine=1`), which swaps the scan universe
// from the discovery-listed companies to the reader's watchlist companies —
// listed or not, since watchlists are user-owned and unfiltered. The filter is
// a link, so a view is shareable and needs no client JS. The phone tab bar
// lights Scanners here (lib/phone-chrome, one-level sub-route).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { mobileChipClass } from "@/components/mobile-card";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { authHrefWithNext } from "@/lib/safe-next-path";
import { parsePegSort } from "@/lib/scanners/peg";
import { buildScans, listedScope, scanCounts, watchlistScope, type Scans } from "@/lib/scanners/scope";
import { getReaderWatchlist } from "@/lib/watchlist-codes";

import { GarpScanView } from "../garp-scan";
import { GuidanceUpgradeScanView } from "../guidance-upgrade-scan";
import { scannersHref, SCANS, toScanId, type ScanId } from "../href";
import { SCAN_META } from "../meta";
import { PegScanView } from "../peg-scan";
import { PriceTrendScanView } from "../price-trend-scan";
import { readScanInputs } from "../read";
import { RedFlagScanView } from "../red-flag-scan";
import { WatchlistFilterChip, type WatchlistFilterState } from "../watchlist-filter";

type Params = { scan: string };
type SearchParams = { sort?: string; mine?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const id = toScanId((await params).scan);
  if (!id) return {};
  const { label, blurb } = SCAN_META[id];
  return {
    title: `${label} – Scanners – Story of a Stock`,
    description: blurb,
    alternates: { canonical: `/scanners/${id}` },
  };
}

export default async function ScanPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const scan = toScanId((await params).scan);
  if (!scan) notFound();
  const query = (await searchParams) ?? {};
  const current = currentReportingQuarter();

  const [inputs, reader] = await Promise.all([readScanInputs([scan]), getReaderWatchlist()]);
  const watchCodes = reader.codes ? new Set(reader.codes) : null;

  // A shared `mine=1` link opened signed out falls back to the listed universe.
  const mine = query.mine === "1" && watchCodes != null;
  const scans = buildScans(inputs, mine && watchCodes ? watchlistScope(watchCodes) : listedScope, current);

  // The chip's count is always the watchlist's hits on this scan, so a reader
  // sees what the filter would leave before turning it on.
  const watchCount = watchCodes
    ? scanCounts(mine ? scans : buildScans(inputs, watchlistScope(watchCodes), current))[scan]
    : null;
  const keep = scan === "peg" && query.sort === "trailing" ? { sort: "trailing" } : undefined;
  const filter: WatchlistFilterState = !reader.userId
    ? { kind: "signed-out", signInHref: authHrefWithNext("/auth/login", scannersHref(scan, true, keep)) }
    : watchCodes && watchCodes.size === 0
      ? { kind: "empty" }
      : { kind: "ready", on: mine, count: watchCount, href: scannersHref(scan, !mine, keep) };
  const filterChip = <WatchlistFilterChip state={filter} />;

  return (
    <main className="house min-h-screen">
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-[18px] sm:px-6 sm:pt-8 lg:px-10 lg:pt-11">
        <header className="max-w-2xl">
          <Link
            href="/scanners"
            prefetch={false}
            className="house-data text-[11px] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
          >
            &larr; Scanners
          </Link>
          <h1 className="house-display mt-1.5 text-[30px] leading-[1.02] sm:text-[44px] sm:leading-[0.98] lg:text-[52px]">
            {SCAN_META[scan].label}
          </h1>
        </header>

        <div className="mt-6 sm:mt-8">
          <ScanBody scan={scan} scans={scans} mine={mine} filter={filterChip} sort={query.sort} />
        </div>

        <nav aria-label="Other scans" className="mt-12 border-t border-[var(--rule)] pt-5">
          <p className="house-data text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Other scans</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SCANS.filter((id) => id !== scan).map((id) => (
              <li key={id}>
                <Link href={scannersHref(id, mine)} prefetch={false} className={mobileChipClass(false)}>
                  {SCAN_META[id].label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}

function ScanBody({
  scan,
  scans,
  mine,
  filter,
  sort,
}: {
  scan: ScanId;
  scans: Scans;
  mine: boolean;
  filter: React.ReactNode;
  sort: string | undefined;
}) {
  switch (scan) {
    case "red-flags":
      return scans.redFlags ? <RedFlagScanView scan={scans.redFlags} mine={mine} filter={filter} /> : <Unavailable />;
    case "peg":
      return scans.peg ? (
        <PegScanView
          scan={scans.peg}
          sort={parsePegSort(sort)}
          mine={mine}
          filter={filter}
          sortHref={(s) => scannersHref("peg", mine, s === "trailing" ? { sort: s } : undefined)}
        />
      ) : (
        <Unavailable />
      );
    case "garp":
      return scans.garp ? <GarpScanView scan={scans.garp} mine={mine} filter={filter} /> : <Unavailable />;
    case "guidance":
      return scans.guidance ? (
        <GuidanceUpgradeScanView scan={scans.guidance} mine={mine} filter={filter} />
      ) : (
        <Unavailable />
      );
    case "trend":
      return scans.trend ? <PriceTrendScanView scan={scans.trend} mine={mine} filter={filter} /> : <Unavailable />;
  }
}

function Unavailable() {
  return (
    <p className="max-w-xl text-[13px] leading-[1.5] text-[var(--ink-soft)]">
      This scan couldn&rsquo;t load just now. Refresh in a minute.
    </p>
  );
}
