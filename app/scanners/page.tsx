// /scanners — one rule run across every company we cover. Four scans: Red
// flags (the Quality tab's forensic checks that trip), PEG (under 1× on both
// forward and trailing, off the Valuation Check), Guidance upgrades (live
// commitments management raised on the latest call, off the Guidance tab) and
// Price trend (every company's current price phase — rising / sideways /
// falling — with what drove it, off the Price journey card).
//
// One filter: "In your watchlist" (`?mine=1`), which swaps the scan universe
// from the discovery-listed companies to the reader's watchlist companies —
// listed or not, since watchlists are user-owned and unfiltered. One route
// with `?scan=` rather than sub-routes so the phone tab bar (lib/phone-chrome,
// exact-route match) stays on every scan. Server-rendered, house skin, one
// tree at every width; scan tabs and the filter are links, so a view is
// shareable and needs no client JS.

import type { Metadata } from "next";
import Link from "next/link";

import { mobileChipClass, MOBILE_CHIP_STRIP } from "@/components/mobile-card";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { logger } from "@/lib/logger";
import { authHrefWithNext } from "@/lib/safe-next-path";
import { getGuidanceUpgradeRows, getPegRows, getRedFlagRows, getTrendRows } from "@/lib/scanners/data";
import { parsePegSort } from "@/lib/scanners/peg";
import { buildScans, listedScope, scanCounts, watchlistScope } from "@/lib/scanners/scope";
import { getReaderWatchlist } from "@/lib/watchlist-codes";

import { GuidanceUpgradeScanView } from "./guidance-upgrade-scan";
import { parseScan, scannersHref, SCANS, type ScanId } from "./href";
import { PegScanView } from "./peg-scan";
import { PriceTrendScanView } from "./price-trend-scan";
import { RedFlagScanView } from "./red-flag-scan";
import { WatchlistFilterChip, type WatchlistFilterState } from "./watchlist-filter";

export const metadata: Metadata = {
  title: "Scanners – Story of a Stock",
  description:
    "Every company we cover, run through one rule at a time: forensic red flags from the annual numbers, forward and trailing PEG, who just raised guidance, and which prices are rising, sideways or falling — and why.",
  alternates: { canonical: "/scanners" },
};

const SCAN_LABEL: Record<ScanId, string> = {
  "red-flags": "Red flags",
  peg: "PEG ratio",
  guidance: "Guidance upgrades",
  trend: "Price trend",
};

type SearchParams = { scan?: string; sort?: string; mine?: string };

async function settle<T>(label: string, read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    logger.warn(`scanners: ${label} read failed; that scan renders unavailable`, { error });
    return null;
  }
}

export default async function ScannersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const scan = parseScan(params.scan);
  const current = currentReportingQuarter();

  const [redFlagRows, pegRows, guidanceData, trendRows, reader] = await Promise.all([
    settle("red flags", getRedFlagRows),
    settle("peg", getPegRows),
    settle("guidance upgrades", getGuidanceUpgradeRows),
    settle("price trend", getTrendRows),
    getReaderWatchlist(),
  ]);
  const userId = reader.userId;
  const watchCodes = reader.codes ? new Set(reader.codes) : null;
  const inputs = { redFlagRows, pegRows, guidance: guidanceData, trendRows };

  // A shared `mine=1` link opened signed out falls back to the listed universe.
  const mine = params.mine === "1" && watchCodes != null;
  const scans = buildScans(inputs, mine && watchCodes ? watchlistScope(watchCodes) : listedScope, current);
  const counts = scanCounts(scans);

  // The chip's count is always the watchlist's hits on THIS scan, so a reader
  // sees what the filter would leave before turning it on.
  const watchCounts = watchCodes
    ? scanCounts(mine ? scans : buildScans(inputs, watchlistScope(watchCodes), current))
    : null;
  const filter: WatchlistFilterState = !userId
    ? { kind: "signed-out", signInHref: authHrefWithNext("/auth/login", scannersHref(scan, true)) }
    : watchCodes && watchCodes.size === 0
      ? { kind: "empty" }
      : {
          kind: "ready",
          on: mine,
          count: watchCounts?.[scan] ?? null,
          href: scannersHref(scan, !mine, scan === "peg" && params.sort === "trailing" ? { sort: "trailing" } : undefined),
        };
  const filterChip = <WatchlistFilterChip state={filter} />;

  return (
    <main className="house min-h-screen">
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-[18px] sm:px-6 sm:pt-8 lg:px-10 lg:pt-11">
        <header className="max-w-2xl">
          <p className="house-data text-[11px] text-[var(--ink-soft)]">Screens across our coverage</p>
          <h1 className="house-display mt-1.5 text-[30px] leading-[1.02] sm:text-[44px] sm:leading-[0.98] lg:text-[52px]">
            Scanners
          </h1>
          <p className="mt-2.5 text-[13.5px] leading-[1.5] text-[var(--ink-soft)] sm:text-[15px]">
            One rule, run across every company we cover. Each hit restates what that company&rsquo;s
            own page already says &mdash; open it for the why.
          </p>
        </header>

        <nav aria-label="Scans" className={`${MOBILE_CHIP_STRIP} -mx-4 mt-5 px-4 sm:mx-0 sm:px-0`}>
          {SCANS.map((id) => (
            <Link
              key={id}
              href={scannersHref(id, mine)}
              scroll={false}
              aria-current={scan === id ? "page" : undefined}
              className={mobileChipClass(scan === id)}
            >
              {SCAN_LABEL[id]}
              {counts[id] != null ? <span className="ml-2 opacity-70">{counts[id]}</span> : null}
            </Link>
          ))}
        </nav>

        <div className="mt-6 sm:mt-8">
          {scan === "red-flags" ? (
            scans.redFlags ? (
              <RedFlagScanView scan={scans.redFlags} mine={mine} filter={filterChip} />
            ) : (
              <Unavailable />
            )
          ) : scan === "peg" ? (
            scans.peg ? (
              <PegScanView
                scan={scans.peg}
                sort={parsePegSort(params.sort)}
                mine={mine}
                filter={filterChip}
                sortHref={(sort) => scannersHref("peg", mine, sort === "trailing" ? { sort } : undefined)}
              />
            ) : (
              <Unavailable />
            )
          ) : scan === "trend" ? (
            scans.trend ? (
              <PriceTrendScanView scan={scans.trend} mine={mine} filter={filterChip} />
            ) : (
              <Unavailable />
            )
          ) : scans.guidance ? (
            <GuidanceUpgradeScanView scan={scans.guidance} mine={mine} filter={filterChip} />
          ) : (
            <Unavailable />
          )}
        </div>
      </div>
    </main>
  );
}

function Unavailable() {
  return (
    <p className="max-w-xl text-[13px] leading-[1.5] text-[var(--ink-soft)]">
      This scan couldn&rsquo;t load just now. Refresh in a minute.
    </p>
  );
}
