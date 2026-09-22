// Short absolute date for the phone Journal ("21 Sep 2026"). Deterministic —
// no Intl/locale — so SSR and hydration always agree. Falls back to the
// frontmatter's own label when the ISO date doesn't parse.
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function shortDateLabel(iso: string, fallback: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return fallback;
  const month = MONTHS[Number(m[2]) - 1];
  const day = Number(m[3]);
  if (!month || !Number.isFinite(day) || day < 1 || day > 31) return fallback;
  return `${day} ${month} ${m[1]}`;
}
