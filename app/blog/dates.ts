// Short absolute date for the phone Journal ("21 Sep 2026"). Deterministic —
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
