// Deterministic selection for the desk's "Research updated" list (2026-10-29
// redesign; it was the three-card Featured Reads strip before): the freshest
// eligible research cards, one per company.
//
// Recency governs EVERY slot. An earlier cut of the strip pinned only the hero
// to the freshest read and rotated the other slots by IST day index, to give a
// daily visitor something new and to buy high-effort deep-tracks more than one
// day of airtime. It paid for that by lying about recency: fresher cards sat
// hidden behind older ones, so a returning reader could not tell that new work
// had landed. Shelf life for older reads belongs in an archive (/activity), not
// in a rotation on a "what's new" surface.
//
// Stateless by design — the portal is a read-only consumer and writes nothing
// (no last_featured_at column, no cron). The pick is a pure function of the
// eligible pool, so every viewer sees the same list and it turns over exactly
// when a producer promotes a new card, not on a timer.
//
// The one exception (2026-10-11, the user's call): an editorial PIN. A card
// whose `pinned_until` is still ahead leads the list for that long. The
// producer sets the instant; the portal only reads the clock to compare against
// it, so the pick stays the same for every viewer and expires on its own.
//
// Journal cards (section "journal") are not research updates: the desk's
// "Featured reads · from the Journal" block reads the posts themselves, and a
// pinned Journal card leads that block instead (lib/desk-journal.ts).

import { isPinned, type FeaturedRead } from "./types";

// How many rows the "Research updated" list shows.
export const RESEARCH_SLOTS = 7;

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

const byRecency = (a: FeaturedRead, b: FeaturedRead): number =>
  publishedMs(b) - publishedMs(a) ||
  b.weight - a.weight ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// The `slots` freshest research cards, one per company (its newest card), live
// pins first. Feature weight only breaks an exact recency tie — it gates
// eligibility upstream (data.ts) but never promotes an older read over a newer
// one. Key precedence here must match SELECTION_ORDER. Several live pins order
// among themselves by recency. Never mutates `reads` — the cached pool is
// shared by every request in the revalidate window.
export function selectResearchUpdates(
  reads: FeaturedRead[],
  nowMs: number = Date.now(),
  slots: number = RESEARCH_SLOTS,
): FeaturedRead[] {
  const research = reads.filter((r) => r.section !== "journal");
  const pinned = research.filter((r) => isPinned(r, nowMs)).sort(byRecency);
  const rest = research.filter((r) => !isPinned(r, nowMs)).sort(byRecency);
  const seen = new Set<string>();
  const out: FeaturedRead[] = [];
  for (const read of [...pinned, ...rest]) {
    if (out.length >= slots) break;
    const key = read.companyCode.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(read);
  }
  return out;
}

export type ResearchCoverage = {
  /** UPPERCASE codes of the ranked hundred (isDiscoveryListed). */
  listed: ReadonlySet<string>;
  /** UPPERCASE codes below the coverage cut — never large-cap admissions. */
  belowCut: ReadonlySet<string>;
};

// Which research cards the desk may show (user call 2026-10-29). Research
// updated reports fresh work, so it is the one ranked-desk block that does NOT
// apply isDiscoveryListed: a deep-track on a below-cut company (UNIMECH,
// 2026-10-28) is exactly the update that could earn it back into the hundred,
// and hiding it read as "the run never landed". Below-cut cards show, tagged;
// large-cap admissions (outside the mid/small positioning) and codes we don't
// cover stay out. Pinned by tests/desk-featured-select.test.ts.
export function researchEligible(reads: FeaturedRead[], coverage: ResearchCoverage): FeaturedRead[] {
  return reads.filter((r) => {
    const key = r.companyCode.toUpperCase();
    return coverage.listed.has(key) || coverage.belowCut.has(key);
  });
}
