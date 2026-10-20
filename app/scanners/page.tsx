// /scanners — the index of scans. Each scan runs one rule across every company
// we cover and has its own page at /scanners/<scan> (2026-10-14; before that
// every scan was a tab here, `?scan=`). Five scans: Red flags (the Quality tab's
// forensic checks that trip), PEG (under 1× on both forward and trailing, off
// the Valuation Check), GARP (Growth score Solid or better AND Valuation score
// Fair or better, off the leaderboard's two columns), Guidance upgrades (live
// commitments management raised on the latest call, off the Guidance tab),
// Price trend (every company's current price phase, off the Price journey card)
// and Order book vs market cap (the disclosed book off the Key Variables card
// against the Screener market cap under the Valuation Check, with its growth).
//
// Each card carries its scan's count over the discovery-listed companies. An old
// tab link (`?scan=` / `?mine=` / `?sort=`) redirects to the scan's own page.

import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";

import { currentReportingQuarter } from "@/lib/current-quarter";
import { buildScans, listedScope, scanCounts } from "@/lib/scanners/scope";
import { cn } from "@/lib/utils";

import { legacyScannersHref, scannersHref, SCANS } from "./href";
import { SCAN_META } from "./meta";
import { readScanInputs } from "./read";

export const metadata: Metadata = {
  title: "Scanners – Story of a Stock",
  description:
    "Every company we cover, run through one rule at a time: forensic red flags from the annual numbers, forward and trailing PEG, growth at a reasonable price, who just raised guidance, which prices are rising, sideways or falling — and why — and whose order book is biggest against its market cap.",
  alternates: { canonical: "/scanners" },
};

type SearchParams = { scan?: string; sort?: string; mine?: string };

export default async function ScannersIndexPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const legacy = legacyScannersHref((await searchParams) ?? {});
  if (legacy) permanentRedirect(legacy);

  const counts = scanCounts(buildScans(await readScanInputs(SCANS), listedScope, currentReportingQuarter()));

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

        <ul className="mt-7 grid gap-3 sm:mt-9 sm:grid-cols-2 lg:grid-cols-3">
          {SCANS.map((id) => {
            const { label, blurb, countNoun } = SCAN_META[id];
            const count = counts[id];
            return (
              <li key={id}>
                <Link
                  href={scannersHref(id, false)}
                  prefetch={false}
                  className={cn(
                    "group flex h-full flex-col rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 transition-colors",
                    "hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]",
                  )}
                >
                  <h2 className="house-display text-[21px] leading-[1.1] text-[var(--ink)] sm:text-[23px]">{label}</h2>
                  <p className="mt-2 flex-1 text-[13px] leading-[1.5] text-[var(--ink-soft)]">{blurb}</p>
                  <p className="house-data mt-4 flex items-baseline justify-between gap-3 text-[11px] text-[var(--ink-soft)]">
                    <span>
                      {count != null ? (
                        <>
                          <span className="text-[20px] leading-none text-[var(--signal)]">{count}</span>{" "}
                          {countNoun}
                        </>
                      ) : (
                        "Unavailable just now"
                      )}
                    </span>
                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                      &rarr;
                    </span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
