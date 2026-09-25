// Short absolute date for the Journal ("21 Sep 2026"). Deterministic —
// no Intl/locale — so SSR and hydration always agree. Falls back to the
// frontmatter's own label when the ISO date doesn't parse.
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function shortDateLabel(iso: string, fallback: string): string {
  // The date must be the whole string or be followed by a time part; a
  // trailing "garbage" suffix is corruption, not a date.
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(iso);
  if (!m) return fallback;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  const month = MONTHS[monthIndex];
  if (!month || day < 1) return fallback;
  // Round-trip through UTC so "2026-02-31" (which Date would roll to March)
  // falls back instead of printing a day that doesn't exist.
  const d = new Date(Date.UTC(year, monthIndex, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== monthIndex || d.getUTCDate() !== day) {
    return fallback;
  }
  return `${day} ${month} ${m[1]}`;
}

// --- Relative dates for the desktop Journal -------------------------------
// Computed on the server in IST at request time. Pure: `today` is passed in.

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** Today's date in IST as yyyy-mm-dd. */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Days since the epoch for a real yyyy-mm-dd date; null for garbage or a day that doesn't exist ("2026-09-31"). */
function isoDay(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(Date.UTC(year, monthIndex, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== monthIndex || d.getUTCDate() !== day) {
    return null;
  }
  return d.getTime() / DAY_MS;
}

/** The Monday on or before `day` (epoch days). 1970-01-01 was a Thursday, so shift by 3. */
function mondayOf(day: number): number {
  return day - ((day + 3) % 7);
}

/** Whole days from `iso` to `today` (both yyyy-mm-dd); null if either won't parse. */
export function daysAgo(iso: string, today: string): number | null {
  const a = isoDay(iso);
  const b = isoDay(today);
  return a === null || b === null ? null : b - a;
}

/** "Today" / "Yesterday" / "N days ago" (≤7) / "25 Sep 2026". */
export function relativeDayLabel(iso: string, fallback: string, today: string): string {
  const d = daysAgo(iso, today);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d !== null && d > 1 && d <= 7) return `${d} days ago`;
  return shortDateLabel(iso, fallback);
}

/** Published today or yesterday (IST) — the card's live dot. */
export function isFresh(iso: string, today: string): boolean {
  const d = daysAgo(iso, today);
  return d === 0 || d === 1;
}

export type WeekGroup = "this" | "last" | "earlier";

/** Weeks start Monday. "this" = Monday to today, "last" = the Mon–Sun before it. */
export function weekGroup(iso: string, today: string): WeekGroup {
  const d = isoDay(iso);
  const t = isoDay(today);
  if (d === null || t === null) return "earlier";
  // A future-dated post (rare: a scheduled publish) sits with this week.
  const monday = mondayOf(t);
  if (d >= monday) return "this";
  if (d >= monday - 7) return "last";
  return "earlier";
}

function dayMonth(day: number): string {
  const d = new Date(day * DAY_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Date-range labels for the week groups. For Fri 25 Sep 2026: "21 Sep – 25 Sep", "14 Sep – 20 Sep", "Before 14 Sep". */
export function weekRanges(today: string): Record<WeekGroup, string> {
  const t = isoDay(today);
  if (t === null) return { this: "", last: "", earlier: "" };
  const monday = mondayOf(t);
  return {
    this: monday === t ? dayMonth(t) : `${dayMonth(monday)} – ${dayMonth(t)}`,
    last: `${dayMonth(monday - 7)} – ${dayMonth(monday - 1)}`,
    earlier: `Before ${dayMonth(monday - 7)}`,
  };
}

/** "24 Sep" when `iso` falls in `today`'s year, else "24 Sep 2025" — the archive rows' date. */
export function rowDateLabel(iso: string, fallback: string, today: string): string {
  const label = shortDateLabel(iso, fallback);
  return iso.slice(0, 4) === today.slice(0, 4) ? label.replace(/ \d{4}$/, "") : label;
}
