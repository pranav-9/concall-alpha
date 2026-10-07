// Pure season arithmetic for the quarter tracker — no React, no Supabase — so
// tests/quarter-tracker-season.test.ts can pin it. Everything here is keyed on
// IST calendar dates (YYYY-MM-DD): Indian results and calls are scheduled in
// IST, and a calendar date is not an instant, so no timezone may shift it.

import type { ReportingQuarter } from "@/lib/current-quarter";
import type { TrackerEntry } from "./data";

export type ISODate = string;

const DAY_MS = 86_400_000;

const istFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

/** Today's IST calendar date. */
export const istToday = (now: Date = new Date()): ISODate => istFormatter.format(now);

/** The IST calendar day an instant (ISO timestamp) falls on; null when unparsable. */
export const istDateOf = (iso: string | null | undefined): ISODate | null => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? istFormatter.format(new Date(ms)) : null;
};

const utcMs = (iso: ISODate): number => Date.parse(`${iso}T00:00:00Z`);
const fromUtcMs = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: ISODate, n: number): ISODate => fromUtcMs(utcMs(iso) + n * DAY_MS);
export const daysBetween = (from: ISODate, to: ISODate): number =>
  Math.round((utcMs(to) - utcMs(from)) / DAY_MS);
/** 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (iso: ISODate): number => new Date(utcMs(iso)).getUTCDay();
export const isWeekend = (iso: ISODate): boolean => {
  const d = weekdayOf(iso);
  return d === 0 || d === 6;
};
export const isMonday = (iso: ISODate): boolean => weekdayOf(iso) === 1;

/** Last day of the quarter this season reports. `fy` is the 4-digit FY-end year. */
export function quarterEnd({ fy, qtr }: Pick<ReportingQuarter, "fy" | "qtr">): ISODate {
  switch (qtr) {
    case 1:
      return `${fy - 1}-06-30`;
    case 2:
      return `${fy - 1}-09-30`;
    case 3:
      return `${fy - 1}-12-31`;
    default:
      return `${fy}-03-31`;
  }
}

/**
 * The regulatory window a season runs in: SEBI LODR Reg. 33 gives a listed
 * company 45 days from quarter end to file results, 60 for the audited Q4.
 */
export function seasonWindow(q: Pick<ReportingQuarter, "fy" | "qtr">): {
  start: ISODate;
  deadline: ISODate;
} {
  const end = quarterEnd(q);
  return { start: addDays(end, 1), deadline: addDays(end, q.qtr === 4 ? 60 : 45) };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const parts = (iso: ISODate) => {
  const d = new Date(utcMs(iso));
  return { day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()], weekday: WEEKDAYS[d.getUTCDay()] };
};

/** "Thu 29 Oct" */
export const formatDay = (iso: ISODate): string => {
  const p = parts(iso);
  return `${p.weekday} ${p.day} ${p.month}`;
};

/** "5 Oct" — the axis tick. */
export const formatTick = (iso: ISODate): string => {
  const p = parts(iso);
  return `${p.day} ${p.month}`;
};

/** "Thu" */
export const formatWeekday = (iso: ISODate): string => parts(iso).weekday;

/** "16:00" → "4:00 PM" */
export const formatTime = (hhmm: string): string => {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** "Today" / "Tomorrow" / "In 4 days" / "3 days ago". */
export const relativeDay = (today: ISODate, iso: ISODate): string => {
  const n = daysBetween(today, iso);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
};

/** "5h ago" / "12d ago" — coarse on purpose; the board cares about how recent, not the minute. */
export const formatAgo = (iso: string | null, now: Date): string => {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "—";
  const mins = Math.round((now.getTime() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
};

// ---------------------------------------------------------------------------
// The scored board
// ---------------------------------------------------------------------------

/** A move smaller than this is noise — the same epsilon the old movement chips used. */
export const SCORE_DELTA_EPSILON = 0.05;

export const scoreDelta = (e: TrackerEntry): number | null =>
  e.score != null && e.priorScore != null ? e.score - e.priorScore : null;

export const isImprover = (e: TrackerEntry): boolean => {
  const d = scoreDelta(e);
  return d != null && d >= SCORE_DELTA_EPSILON;
};

export type SortKey = "score" | "delta" | "scored";
export type SortDir = "asc" | "desc";

export const parseSort = (raw: string | undefined): SortKey =>
  raw === "delta" || raw === "scored" ? raw : "score";
export const parseDir = (raw: string | undefined): SortDir => (raw === "asc" ? "asc" : "desc");

/**
 * Stable sort of scored entries. Missing values (no prior quarter for Δ, no
 * timestamp) sort last in both directions rather than reading as a big drop.
 * Ties fall through to score, then name, so the order can't flicker between
 * renders.
 */
export function sortScored(entries: TrackerEntry[], sort: SortKey, dir: SortDir): TrackerEntry[] {
  const sign = dir === "asc" ? 1 : -1;
  const value = (e: TrackerEntry): number | null => {
    if (sort === "score") return e.score;
    if (sort === "delta") return scoreDelta(e);
    const ms = e.scoredAt ? Date.parse(e.scoredAt) : NaN;
    return Number.isFinite(ms) ? ms : null;
  };
  return [...entries].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av == null && bv == null) return byScoreThenName(a, b);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av !== bv) return sign * (av - bv);
    return byScoreThenName(a, b);
  });
}

const byScoreThenName = (a: TrackerEntry, b: TrackerEntry): number => {
  const as = a.score ?? Number.NEGATIVE_INFINITY;
  const bs = b.score ?? Number.NEGATIVE_INFINITY;
  if (bs !== as) return bs - as;
  return a.name.localeCompare(b.name);
};

// ---------------------------------------------------------------------------
// The season chart: one square per company on the day its board meets
// ---------------------------------------------------------------------------

export type CellState =
  /** Scored off the issuer's own transcript. */
  | "scored"
  /** Scored off a third-party transcript; owes a re-score. */
  | "unofficial"
  /** Board met, no score yet — the transcript is usually the wait. */
  | "pending"
  /** A results date is on file, still ahead. */
  | "set";

export type SeasonCell = {
  entry: TrackerEntry;
  state: CellState;
  /** No board-meeting date on file, so the square sits on the day it was scored. */
  placedByScore: boolean;
};

export type SeasonDay = {
  date: ISODate;
  /** Bottom-up: scored first (best score lowest), then pending, then dates set. */
  cells: SeasonCell[];
  weekend: boolean;
  today: boolean;
  monday: boolean;
};

export type SeasonChart = {
  days: SeasonDay[];
  /** The tallest day's stack. */
  rows: number;
  /** Not yet reported and no date on file. */
  undated: TrackerEntry[];
  /** Index of today's column, or -1 when today is outside the drawn range. */
  todayIndex: number;
};

const STATE_ORDER: Record<CellState, number> = { scored: 0, unofficial: 0, pending: 1, set: 2 };

export function buildSeasonChart(
  entries: TrackerEntry[],
  quarter: Pick<ReportingQuarter, "fy" | "qtr">,
  today: ISODate,
): SeasonChart {
  const window = seasonWindow(quarter);
  const byDay = new Map<ISODate, SeasonCell[]>();
  const undated: TrackerEntry[] = [];

  for (const entry of entries) {
    const scored = entry.score != null;
    const placedByScore = scored && !entry.resultsDate;
    const day = entry.resultsDate ?? (scored ? istDateOf(entry.scoredAt) : null);
    if (!day) {
      undated.push(entry);
      continue;
    }
    const state: CellState = scored
      ? entry.sourceStatus === "unofficial"
        ? "unofficial"
        : "scored"
      : day < today
        ? "pending"
        : "set";
    const list = byDay.get(day);
    const cell = { entry, state, placedByScore };
    if (list) list.push(cell);
    else byDay.set(day, [cell]);
  }

  // Drawn range: the regulatory window, stretched to any date on file outside it.
  // Today is not a reason to stretch — a season viewed after its deadline keeps
  // its own extent and simply has no TODAY band.
  const known = [...byDay.keys()];
  let start = window.start;
  let end = window.deadline;
  for (const d of known) {
    if (d < start) start = d;
    if (d > end) end = d;
  }

  const days: SeasonDay[] = [];
  let rows = 0;
  let todayIndex = -1;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const cells = (byDay.get(d) ?? []).sort(
      (a, b) =>
        STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
        (b.entry.score ?? 0) - (a.entry.score ?? 0) ||
        a.entry.name.localeCompare(b.entry.name),
    );
    if (cells.length > rows) rows = cells.length;
    if (d === today) todayIndex = days.length;
    days.push({ date: d, cells, weekend: isWeekend(d), today: d === today, monday: isMonday(d) });
  }

  undated.sort((a, b) => a.name.localeCompare(b.name));
  return { days, rows, undated, todayIndex };
}

// ---------------------------------------------------------------------------
// The upcoming panel
// ---------------------------------------------------------------------------

export type UpcomingGroups = {
  /** Board met, no score yet — results-date order, oldest first. */
  pending: TrackerEntry[];
  /** Dated and still ahead, grouped by day in date order. */
  ahead: Array<{ date: ISODate; entries: TrackerEntry[] }>;
  /** Not yet reported, no date on file. */
  undated: TrackerEntry[];
};

export function groupUpcoming(entries: TrackerEntry[], today: ISODate): UpcomingGroups {
  const byName = (a: TrackerEntry, b: TrackerEntry) => a.name.localeCompare(b.name);
  const upcoming = entries.filter((e) => e.score == null);
  const dated = upcoming
    .filter((e) => e.resultsDate)
    .sort((a, b) => a.resultsDate!.localeCompare(b.resultsDate!) || byName(a, b));
  const pending = dated.filter((e) => e.resultsDate! < today);
  const groups = new Map<ISODate, TrackerEntry[]>();
  for (const e of dated) {
    if (e.resultsDate! < today) continue;
    const list = groups.get(e.resultsDate!);
    if (list) list.push(e);
    else groups.set(e.resultsDate!, [e]);
  }
  return {
    pending,
    ahead: [...groups.entries()].map(([date, list]) => ({ date, entries: list })),
    undated: upcoming.filter((e) => !e.resultsDate).sort(byName),
  };
}

/**
 * The call column of an upcoming row. The weekday is shown only when the call
 * is not on the results day itself — most calls are the same afternoon.
 */
export function callLabel(entry: TrackerEntry): { text: string; href: string | null; muted: boolean } {
  if (entry.callDate) {
    const sameDay = entry.resultsDate === entry.callDate;
    const when = [
      sameDay ? null : formatWeekday(entry.callDate),
      entry.callTime ? formatTime(entry.callTime) : null,
    ]
      .filter(Boolean)
      .join(" ");
    // No time on the invite: the weekday alone still says "there is a call".
    return { text: `Call ${when || formatWeekday(entry.callDate)}`, href: entry.callUrl, muted: false };
  }
  if (entry.callUnreadable && entry.callUrl) {
    return { text: "Invite filed", href: entry.callUrl, muted: true };
  }
  return { text: "Call TBA", href: null, muted: true };
}
