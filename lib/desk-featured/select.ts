// Deterministic selection for the Featured Reads strip: the three freshest
// eligible reads, hero first.
//
// Recency governs EVERY slot. An earlier cut pinned only the hero to the
// freshest read and rotated the two secondary slots by IST day index, to give a
// daily visitor something new and to buy high-effort deep-tracks more than one
// day of airtime. It paid for that by lying about recency: the strip would lead
// with today's read and fill both secondaries with older cards while fresher
// ones sat hidden, so a returning reader could not tell that new work had
// landed. The honest, complete tape is the recency ledger directly below this
// strip, so nothing is hidden by not featuring it; shelf life for older reads
// belongs in an archive, not in a carousel on a "what's new" surface.
//
// Stateless and clock-free by design — the portal is a read-only consumer and
// writes nothing (no last_featured_at column, no cron). The pick is a pure
// function of the eligible pool, so every viewer sees the same front page and
// it turns over exactly when a producer promotes a new card, not on a timer.

import type { FeaturedRead } from "./types";

// How many cards the strip shows: 1 hero + 2 secondaries.
export const FEATURED_SLOTS = 3;

// The one definition of "freshest", shared with the fetch in data.ts so the SQL
// order and this comparator cannot drift apart. Leading key decides which rows
// survive the fetch LIMIT; weight breaks exact recency ties; id is the final,
// unique key so a total tie resolves the same way on every fetch (Postgres
// promises no row order among rows equal on every sort key).
export const SELECTION_ORDER = [
  { column: "published_at", ascending: false },
  { column: "feature_weight", ascending: false },
  { column: "id", ascending: true },
] as const;

const publishedMs = (r: FeaturedRead): number => {
  const ms = r.publishedAtRaw ? Date.parse(r.publishedAtRaw) : NaN;
  return Number.isFinite(ms) ? ms : 0;
};

// The FEATURED_SLOTS freshest eligible reads, hero first. Feature weight only
// breaks an exact recency tie — it gates eligibility upstream (data.ts) but
// never promotes an older read over a newer one. Key precedence here must match
// SELECTION_ORDER.
export function selectFeaturedReads(reads: FeaturedRead[]): FeaturedRead[] {
  return [...reads]
    .sort(
      (a, b) =>
        publishedMs(b) - publishedMs(a) ||
        b.weight - a.weight ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .slice(0, FEATURED_SLOTS);
}
