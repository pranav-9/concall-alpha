// /scanners — one rule run across every company we cover. Three scans: Red
// flags (the Quality tab's forensic checks that trip), PEG (forward and
// trailing, off the Valuation Check) and Guidance upgrades (live commitments
// management raised, off the Guidance tab). One route with `?scan=` rather than
// sub-routes so the phone tab bar (lib/phone-chrome, exact-route match) stays
// on every scan. Server-rendered, house skin, one tree at every width; the
// filters are links, so a scan view is shareable and needs no client JS.

import type { Metadata } from "next";
import Link from "next/link";

import { mobileChipClass, MOBILE_CHIP_STRIP } from "@/components/mobile-card";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { logger } from "@/lib/logger";
import { getGuidanceUpgradeRows, getPegRows, getRedFlagRows } from "@/lib/scanners/data";
import {
  buildGuidanceUpgradeScan,
  parseGuidanceWindow,
  type GuidanceUpgradeScan,
} from "@/lib/scanners/guidance-upgrades";
import { buildPegScan, parsePegSort, parsePegView, type PegScan } from "@/lib/scanners/peg";
import { buildRedFlagScan, type RedFlagScan } from "@/lib/scanners/red-flags";

import { GuidanceUpgradeScanView } from "./guidance-upgrade-scan";
import { PegScanView } from "./peg-scan";
import { RedFlagScanView } from "./red-flag-scan";

export const metadata: Metadata = {
  title: "Scanners – Story of a Stock",
  description:
    "Every company we cover, run through one rule at a time: forensic red flags from the annual numbers, forward and trailing PEG, and who just raised guidance.",
  alternates: { canonical: "/scanners" },
};

const SCANS = ["red-flags", "peg", "guidance"] as const;
type ScanId = (typeof SCANS)[number];

const SCAN_LABEL: Record<ScanId, string> = {
  "red-flags": "Red flags",
  peg: "PEG ratio",
  guidance: "Guidance upgrades",
};

const parseScan = (raw: string | undefined): ScanId =>
  raw === "peg" || raw === "guidance" ? raw : "red-flags";

type SearchParams = { scan?: string; check?: string; view?: string; sort?: string; window?: string };

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

  // Every scan is read on every visit — the tab chips carry each one's count.
  const [redFlagRows, pegRows, guidanceData] = await Promise.all([
    settle("red flags", getRedFlagRows),
    settle("peg", getPegRows),
    settle("guidance upgrades", getGuidanceUpgradeRows),
  ]);
  const redFlags: RedFlagScan | null = redFlagRows ? buildRedFlagScan(redFlagRows) : null;
  const peg: PegScan | null = pegRows ? buildPegScan(pegRows) : null;
  const guidance: GuidanceUpgradeScan | null = guidanceData
    ? buildGuidanceUpgradeScan(guidanceData.rows, guidanceData.scanned, current)
    : null;

  const counts: Record<ScanId, number | null> = {
    "red-flags": redFlags?.flagged.length ?? null,
    peg: peg?.counts.both ?? null,
    guidance: guidance?.counts.latest ?? null,
  };

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
              href={id === "red-flags" ? "/scanners" : `/scanners?scan=${id}`}
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
            redFlags ? (
              <RedFlagScanView scan={redFlags} checkId={params.check ?? null} />
            ) : (
              <Unavailable />
            )
          ) : scan === "peg" ? (
            peg ? (
              <PegScanView scan={peg} view={parsePegView(params.view)} sort={parsePegSort(params.sort)} />
            ) : (
              <Unavailable />
            )
          ) : guidance ? (
            <GuidanceUpgradeScanView scan={guidance} window={parseGuidanceWindow(params.window)} current={current} />
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
