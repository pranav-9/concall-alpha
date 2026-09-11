// Deterministic, stateless daily rotation for the Featured Reads strip.
//
// "Stagger the spotlight, not the data": every eligible upgrade is live in the
// system the instant it lands (in the recency ledger below). This module only
// decides WHICH of them the front-page cards foreground today, and it changes
// the pick once per IST calendar day so a daily visitor sees something fresh.
//
// Stateless by design — the portal is a read-only consumer and writes nothing
// (no last_featured_at column, no cron). The rotation is a pure function of the
// eligible pool and today's IST date, so every viewer on a given day sees the
// same front page and it advances at IST midnight.

import type { FeaturedRead } from "./types";

// How many cards the strip shows: 1 hero + 2 secondaries.
export const FEATURED_SLOTS = 3;

// The rotation pool: the N most recent eligible reads. The daily window slides
// across this pool, so items cycle through the spotlight over roughly a week
// before a fresher upgrade pushes the oldest out of the pool entirely.
const POOL_SIZE = 12;

// Integer index of the current IST calendar day (days since the Unix epoch).
// Pinning to Asia/Kolkata means the front page turns over at IST midnight, not
// the server's local midnight.
function istDayIndex(now: Date): number {
  const istDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now); // YYYY-MM-DD
  const ms = Date.parse(`${istDate}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : 0;
}

const publishedMs = (r: FeaturedRead): number => {
  const ms = r.publishedAtRaw ? Date.parse(r.publishedAtRaw) : NaN;
  return Number.isFinite(ms) ? ms : 0;
};

// The hero is ALWAYS the freshest eligible read — this is a "what's new"
// surface, so the newest upgrade must headline, never get buried by the daily
// offset. Only the two secondary slots rotate: a window slides across the rest
// of the pool by IST day index, giving daily novelty without hiding the latest.
// Pool and hero are ordered by recency (weight breaks ties); weight still gates
// eligibility upstream. Returns up to FEATURED_SLOTS reads, hero first.
export function selectFeaturedReads(
  reads: FeaturedRead[],
  now: Date = new Date(),
): FeaturedRead[] {
  const pool = [...reads]
    .sort((a, b) => publishedMs(b) - publishedMs(a) || b.weight - a.weight)
    .slice(0, POOL_SIZE);
  if (pool.length === 0) return [];

  const [hero, ...rest] = pool;
  if (rest.length === 0) return [hero];

  const secSlots = FEATURED_SLOTS - 1;
  if (rest.length <= secSlots) return [hero, ...rest];

  const start = ((istDayIndex(now) % rest.length) + rest.length) % rest.length;
  const secondaries: FeaturedRead[] = [];
  for (let i = 0; i < secSlots; i += 1) {
    secondaries.push(rest[(start + i) % rest.length]);
  }
  return [hero, ...secondaries];
}
