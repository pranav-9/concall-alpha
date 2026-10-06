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

export type RedFlagCheckCount = { id: ForensicCheck["id"]; name: string; count: number };

/** How many companies each check flags — the filter chips, most common first. */
export function redFlagCheckCounts(rows: readonly RedFlagRow[]): RedFlagCheckCount[] {
  const counts = new Map<ForensicCheck["id"], RedFlagCheckCount>();
  for (const row of rows) {
    for (const f of row.flags) {
      const entry = counts.get(f.id);
      if (entry) entry.count += 1;
      else counts.set(f.id, { id: f.id, name: f.name, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export type RedFlagScan = {
  /** Companies with at least one flag, worst first. */
  flagged: RedFlagRow[];
  /** Companies with watches but no flag. */
  watchOnly: RedFlagRow[];
  /** Companies the scan could read at all (assessed > 0). */
  scanned: number;
  checkCounts: RedFlagCheckCount[];
};

export function buildRedFlagScan(rows: readonly RedFlagRow[]): RedFlagScan {
  const sorted = [...rows].sort(compareRedFlagRows);
  const flagged = sorted.filter((r) => r.flags.length > 0);
  return {
    flagged,
    watchOnly: sorted.filter((r) => r.flags.length === 0 && r.watches.length > 0),
    scanned: rows.length,
    checkCounts: redFlagCheckCounts(flagged),
  };
}

/** Narrow the flagged list to one check; an unknown id leaves it whole. */
export function filterByCheck(rows: readonly RedFlagRow[], checkId: string | null | undefined): RedFlagRow[] {
  if (!checkId) return [...rows];
  return rows.filter((r) => r.flags.some((f) => f.id === checkId));
}
