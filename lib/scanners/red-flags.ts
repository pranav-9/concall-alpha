// The Red flags scan — every covered company's forensic checks, filtered to the
// ones that trip. PURE: no Supabase, no React, so tests can pin the order and
// the counts. The statuses come from the same buildForensicChecks the Quality
// tab renders, so a scan hit can never say something the company page doesn't.

import { buildForensicChecks } from "@/lib/company-quality/forensics";
import type { CompanyQualityV1, ForensicCheck } from "@/lib/company-quality/types";

export type ScanCompany = {
  code: string;
  name: string | null;
  sector: string | null;
  /** Discovery-listed (lib/coverage-policy). The default scan universe; the watchlist filter ignores it. */
  listed: boolean;
};

export type RedFlagHit = {
  id: ForensicCheck["id"];
  name: string;
  metric: string;
  note: string;
};

export type RedFlagRow = ScanCompany & {
  flags: RedFlagHit[];
  watches: RedFlagHit[];
  /** Checks the data could actually run (clean + watch + flag). */
  assessed: number;
};

const hit = (c: ForensicCheck): RedFlagHit => ({ id: c.id, name: c.name, metric: c.metric, note: c.note });

/** One company's scan row, or null when no check could run (nothing to say). */
export function buildRedFlagRow(company: ScanCompany, payload: CompanyQualityV1): RedFlagRow | null {
  const checks = buildForensicChecks(payload);
  const flags = checks.filter((c) => c.status === "flag").map(hit);
  const watches = checks.filter((c) => c.status === "watch").map(hit);
  const assessed = checks.filter(
    (c) => c.status === "clean" || c.status === "watch" || c.status === "flag",
  ).length;
  if (assessed === 0) return null;
  return { ...company, flags, watches, assessed };
}

const label = (row: ScanCompany) => (row.name ?? row.code).toLowerCase();

/** Most flags first, then most watches, then name. */
export function compareRedFlagRows(a: RedFlagRow, b: RedFlagRow): number {
  return (
    b.flags.length - a.flags.length ||
    b.watches.length - a.watches.length ||
    label(a).localeCompare(label(b))
  );
}

export type RedFlagScan = {
  /** Companies with at least one flag, worst first. */
  flagged: RedFlagRow[];
  /** Companies with watches but no flag. */
  watchOnly: RedFlagRow[];
  /** Companies the scan could read at all (assessed > 0). */
  scanned: number;
};

export function buildRedFlagScan(rows: readonly RedFlagRow[]): RedFlagScan {
  const sorted = [...rows].sort(compareRedFlagRows);
  return {
    flagged: sorted.filter((r) => r.flags.length > 0),
    watchOnly: sorted.filter((r) => r.flags.length === 0 && r.watches.length > 0),
    scanned: rows.length,
  };
}
