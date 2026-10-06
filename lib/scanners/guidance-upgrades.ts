// The Guidance upgrades scan — companies where management has RAISED a live
// commitment. PURE: no Supabase, no React. A raise here is one the Guidance tab
// prints a "Raised" chip for: a live row (horizon still ahead) whose latest
// value change went up (buildGuidanceVerdict → liveStateKey). So the scan never
// calls something a raise the company page doesn't.
//
// It lists a SUBSET of those, though: only raises whose printed from → to
// values read as a raise on their own (isLegibleRaise). Phase 6 trails can
// carry a label and a number from different sentences (RATNAVEER printed
// ₹1500cr → ₹400cr on numbers 200 → 400), or compare a bps expansion with a
// margin level (RADICO 1.3% → 20%). On a company page that is one row among
// many; at the top of a discovery list it is the headline, so those are left
// out and counted instead.

import { managementSortScore } from "@/lib/board-signals";
import { extractFyQuarter } from "@/lib/guidance-tracking/normalize";
import type { NormalizedGuidanceItem } from "@/lib/guidance-tracking/types";
import {
  buildGuidanceVerdict,
  commitmentShortLabel,
  liveStateKey,
  type LiveRow,
  type ReportingQuarter,
} from "@/lib/guidance-tracking/verdict";
import type { CredibilityVerdictKey } from "@/lib/walk-the-talk/types";

import type { ScanCompany } from "./red-flags";

export type GuidanceRaise = {
  key: string;
  /** "Revenue growth (FY27)" — the Guidance tab's own short label. */
  label: string;
  /** The value before the raise, when the trail states one. */
  from: string | null;
  to: string;
  /** Quarter the raise was made ("Q1 FY27"), when the trail dates it. */
  raisedIn: string | null;
  /** Sortable index of `raisedIn` (fy * 4 + qtr), null when undated. */
  raisedIndex: number | null;
};

export type GuidanceUpgradeRow = ScanCompany & {
  /** Raised live commitments, most recent first. */
  raises: GuidanceRaise[];
  /** Quarter index of each "Raised" row left out because its printed values don't read as a raise. */
  skippedRaisedIndexes: Array<number | null>;
  latestRaisedIndex: number | null;
  latestRaisedIn: string | null;
  /** Live commitments the company also LOWERED — the same tab's "Lowered" chip. */
  loweredCount: number;
  /** The Guidance tab's credibility verdict, as context for how much a raise is worth. */
  tier: CredibilityVerdictKey;
  tierLabel: string;
  metCount: number;
  countedCount: number;
};

const quarterIndex = (period: string | null): number | null => {
  const q = extractFyQuarter(period);
  return q ? q.fy * 4 + q.qtr : null;
};

/** The raise on one live row: the last step that moved (it moved up, or the row isn't "raised"). */
function raiseOf(row: LiveRow): GuidanceRaise | null {
  let i = row.trail.length - 1;
  while (i >= 0 && !row.trail[i].direction) i -= 1;
  if (i < 0 || row.trail[i].direction !== "up") return null;
  const step = row.trail[i];
  return {
    key: row.item.guidanceKey,
    label: commitmentShortLabel(row.item),
    from: i > 0 ? row.trail[i - 1].label : null,
    to: step.label,
    raisedIn: step.quarter,
    raisedIndex: quarterIndex(step.quarter),
  };
}

/** A value multiplying past this is more likely a different quantity than a revised one. */
export const MAX_RAISE_MULTIPLE = 3;

type ParsedLabel = { mid: number; unit: string };

/** "20-24%" → {mid 22, unit "%"}; "₹1,500cr+" → {mid 1500, unit "cr"}; prose → null. */
export function parseValueLabel(label: string | null): ParsedLabel | null {
  if (!label) return null;
  const m = label
    .replace(/[₹$,+~≈]/g, "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*([a-z%]*)$/i);
  if (!m) return null;
  const lo = parseFloat(m[1]);
  const hi = m[2] ? parseFloat(m[2]) : lo;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return { mid: (lo + hi) / 2, unit: m[3].toLowerCase() };
}

/** The printed from → to values, on their own, show a believable raise. */
export function isLegibleRaise(from: string | null, to: string): boolean {
  const a = parseValueLabel(from);
  const b = parseValueLabel(to);
  if (!a || !b || a.unit !== b.unit || a.mid <= 0) return false;
  return b.mid > a.mid && b.mid / a.mid <= MAX_RAISE_MULTIPLE;
}

const byRecency = (a: { raisedIndex: number | null }, b: { raisedIndex: number | null }) =>
  (b.raisedIndex ?? Number.NEGATIVE_INFINITY) - (a.raisedIndex ?? Number.NEGATIVE_INFINITY);

/**
 * One company's row, or null when it has no raised live commitment. A row whose
 * every raise was skipped comes back with `raises: []` so the scan can count it;
 * buildGuidanceUpgradeScan drops it from the list.
 */
export function buildGuidanceUpgradeRow(
  company: ScanCompany,
  items: NormalizedGuidanceItem[],
  current: ReportingQuarter,
  scoredCredibility?: unknown,
): GuidanceUpgradeRow | null {
  if (items.length === 0) return null;
  const verdict = buildGuidanceVerdict(items, current, scoredCredibility);
  const raises: GuidanceRaise[] = [];
  const skippedRaisedIndexes: Array<number | null> = [];
  let loweredCount = 0;
  for (const row of verdict.live) {
    const key = liveStateKey(row);
    if (key === "lowered") loweredCount += 1;
    if (key !== "raised") continue;
    const raise = raiseOf(row);
    if (raise && isLegibleRaise(raise.from, raise.to)) raises.push(raise);
    else skippedRaisedIndexes.push(raise?.raisedIndex ?? null);
  }
  if (raises.length === 0 && skippedRaisedIndexes.length === 0) return null;
  raises.sort(byRecency);
  return {
    ...company,
    raises,
    skippedRaisedIndexes,
    latestRaisedIndex: raises[0]?.raisedIndex ?? null,
    latestRaisedIn: raises[0]?.raisedIn ?? null,
    loweredCount,
    tier: verdict.tier,
    tierLabel: verdict.tierLabel,
    metCount: verdict.metCount,
    countedCount: verdict.countedCount,
  };
}

const quarterLabelOf = (i: number) => {
  const fy = Math.floor((i - 1) / 4);
  return `Q${i - fy * 4} FY${String(fy % 100).padStart(2, "0")}`;
};

/**
 * The scan's window: raises made on the last reported quarter's call (the
 * quarter before the one in reporting season) or later, as a minimum quarter
 * index. In October (Q2 FY27 season) that is the Q1 FY27 call onward, so a Q2
 * call that has already happened counts too.
 */
export function latestCallFloor(current: ReportingQuarter): number {
  return current.fy * 4 + current.qtr - 1;
}

/** "Q1 FY27" — the call the window opens on. */
export function latestCallLabel(current: ReportingQuarter): string {
  return quarterLabelOf(latestCallFloor(current));
}

export type GuidanceUpgradeScan = {
  /** Companies with a legible raise inside the window, ordered. */
  rows: GuidanceUpgradeRow[];
  /** Companies whose guidance the scan could read at all. */
  scanned: number;
  /** Raises inside the window left out because their values don't read as a raise. */
  skippedRaises: number;
  /** The call the window opens on ("Q1 FY27") and its quarter index. */
  sinceLabel: string;
  floor: number;
};

const inWindow = (index: number | null, floor: number) => index != null && index >= floor;

// The watchlist's own management order (tier first, hit rate second), so a
// raise from a management that delivers outranks one from a management that doesn't.
const trackRecord = (r: GuidanceUpgradeRow) =>
  managementSortScore({
    tier: r.tier,
    tierLabel: r.tierLabel,
    metCount: r.metCount,
    countedCount: r.countedCount,
    verdictSource: "counted",
  }) ?? 0;

/** Most recent raise first; within a quarter, the stronger track record, then more raises, then name. */
export function compareGuidanceUpgradeRows(a: GuidanceUpgradeRow, b: GuidanceUpgradeRow): number {
  return (
    (b.latestRaisedIndex ?? Number.NEGATIVE_INFINITY) - (a.latestRaisedIndex ?? Number.NEGATIVE_INFINITY) ||
    trackRecord(b) - trackRecord(a) ||
    b.raises.length - a.raises.length ||
    (a.name ?? a.code).localeCompare(b.name ?? b.code)
  );
}

export function buildGuidanceUpgradeScan(
  rows: readonly GuidanceUpgradeRow[],
  scanned: number,
  current: ReportingQuarter,
): GuidanceUpgradeScan {
  const floor = latestCallFloor(current);
  return {
    rows: rows.filter((r) => inWindow(r.latestRaisedIndex, floor)).sort(compareGuidanceUpgradeRows),
    scanned,
    skippedRaises: rows.reduce(
      (n, r) => n + r.skippedRaisedIndexes.filter((i) => inWindow(i, floor)).length,
      0,
    ),
    sinceLabel: latestCallLabel(current),
    floor,
  };
}
