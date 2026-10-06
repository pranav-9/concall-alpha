// Which companies the scans run over, and what each scan finds there. PURE, so
// the watchlist filter's rules are pinned by tests (the signed-in path can't be
// browser-checked headless):
//   - default: the discovery-listed companies (a scanner is a discovery surface);
//   - `mine`: the reader's watchlist companies, listed or NOT — watchlists are
//     user-owned and unfiltered, so a watched large cap still gets scanned.

import type { ReportingQuarter } from "@/lib/current-quarter";

import { buildGuidanceUpgradeScan, type GuidanceUpgradeRow, type GuidanceUpgradeScan } from "./guidance-upgrades";
import { buildPegScan, type PegRow, type PegScan } from "./peg";
import { buildRedFlagScan, type RedFlagRow, type RedFlagScan, type ScanCompany } from "./red-flags";

export type ScanInputs = {
  redFlagRows: RedFlagRow[] | null;
  pegRows: PegRow[] | null;
  guidance: { rows: GuidanceUpgradeRow[]; readable: ScanCompany[] } | null;
};

export type Scans = {
  redFlags: RedFlagScan | null;
  peg: PegScan | null;
  guidance: GuidanceUpgradeScan | null;
};

export type ScanCounts = { "red-flags": number | null; peg: number | null; guidance: number | null };

export const listedScope = (c: ScanCompany) => c.listed;
export const watchlistScope = (codes: ReadonlySet<string>) => (c: ScanCompany) => codes.has(c.code);

/** Every scan over one universe. A null input (failed read) stays a null scan. */
export function buildScans(
  inputs: ScanInputs,
  scope: (c: ScanCompany) => boolean,
  current: ReportingQuarter,
  now: Date = new Date(),
): Scans {
  return {
    redFlags: inputs.redFlagRows ? buildRedFlagScan(inputs.redFlagRows.filter(scope)) : null,
    peg: inputs.pegRows ? buildPegScan(inputs.pegRows.filter(scope), now) : null,
    guidance: inputs.guidance
      ? buildGuidanceUpgradeScan(
          inputs.guidance.rows.filter(scope),
          inputs.guidance.readable.filter(scope).length,
          current,
        )
      : null,
  };
}

/** What each scan tab's count reads. */
export function scanCounts(scans: Scans): ScanCounts {
  return {
    "red-flags": scans.redFlags?.flagged.length ?? null,
    peg: scans.peg?.hits.length ?? null,
    guidance: scans.guidance?.rows.length ?? null,
  };
}
