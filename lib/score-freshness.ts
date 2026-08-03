// Provenance and recency of the score behind a leaderboard cell.
//
// Two facts a reader needs about a quarter score that the number alone can't
// carry: whether it was scored off the issuer's own transcript or a third
// party's (the SEBI 5-working-day window means results season runs on borrowed
// transcripts), and whether it landed since they last looked.
//
// Both are computed server-side. The 24h window in particular must NOT be
// evaluated in the browser — Date.now() during hydration disagrees with the
// server render and React tears the row.

/** `details.scoring_meta.source_status`, as stamped by concallyser's
 *  scripts/stamp_unofficial_provenance.py. Absent = issuer-filed (the norm). */
export type ScoreSourceStatus = "unofficial" | null;

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeSourceStatus(value: unknown): ScoreSourceStatus {
  return value === "unofficial" ? "unofficial" : null;
}

/** True when the score row was written (or re-written) inside the last 24h. */
export function isScoredWithin24h(
  timestamp: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!timestamp) return false;
  const ts = Date.parse(timestamp);
  const nowMs = now.getTime();
  if (!Number.isFinite(ts) || !Number.isFinite(nowMs)) return false;
  // Future timestamps (clock skew between the pipeline host and the renderer)
  // still count as fresh — they are certainly not older than a day.
  return ts >= nowMs - DAY_MS;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * "3 Aug 2026, 17:28 IST" — deterministic, so a server render and a client
 * hydration produce the same string. Deliberately not toLocaleString: that
 * reads the renderer's timezone, which differs between Vercel (UTC) and the
 * reader, and the mismatch throws a hydration error on a title attribute.
 * The audience is Indian, so the fixed +05:30 offset is the useful frame.
 */
export function formatScoredAt(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null;
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return null;
  const ist = new Date(ms + 5.5 * 60 * 60 * 1000);
  const hh = String(ist.getUTCHours()).padStart(2, "0");
  const mm = String(ist.getUTCMinutes()).padStart(2, "0");
  return `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}, ${hh}:${mm} IST`;
}

/**
 * When the score currently in the row was computed.
 *
 * `details.scoring_meta.scored_at` is the only field that answers this. The row's
 * own `created_at`/`updated_at` record when the ROW was first inserted, and
 * nothing bumps them on a re-score — concall_analysis upserts in place, so a
 * quarter re-scored off the official transcript keeps the timestamp of the
 * unofficial score it replaced. On 2026-08-03 that gap was 507 of 897 rows
 * platform-wide and 33 of the 60 Q1 FY27 rows; ADANIPORTS was re-scored that
 * morning and still carried a created_at of 30 Jul.
 *
 * scored_at is present on every row that has scoring_meta, and rows without
 * scoring_meta are hidden portal-wide, so the fallbacks are belt-and-braces.
 */
export function scoreWrittenAt(row: {
  scored_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}): string | null {
  return row.scored_at ?? row.updated_at ?? row.created_at ?? null;
}
