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

// Rows come in already ordered by the query (feature_weight desc, published_at
// desc). Build a bounded pool, then rotate a FEATURED_SLOTS-wide window across
// it by the day index. Returns up to FEATURED_SLOTS reads, hero first.
export function selectFeaturedReads(
  reads: FeaturedRead[],
  now: Date = new Date(),
): FeaturedRead[] {
  const pool = reads.slice(0, POOL_SIZE);
  if (pool.length === 0) return [];
  if (pool.length <= FEATURED_SLOTS) return pool;

  const start = ((istDayIndex(now) % pool.length) + pool.length) % pool.length;

  const picked: FeaturedRead[] = [];
  for (let i = 0; i < FEATURED_SLOTS; i += 1) {
    picked.push(pool[(start + i) % pool.length]);
  }
  return picked;
}
