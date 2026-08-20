// The homepage hero's featured "read": one covered company whose three lenses
// (ConcallScore, Growth, Valuation) all point the same POSITIVE way, resolved
// through classifyBoardRead into the same composite the leaderboard ranks by.
//
// This is the PURE selection layer — no fetching, no next/cache — so it can be
// unit-tested in isolation (tests/home-featured-read.test.ts). The cached fetch
// that feeds it lives in lib/home-featured-read.ts.
//
// Two rules are load-bearing and enforced HERE, not in the component:
//   1. All three legs must be present. The hero draws three circles; a missing
//      leg is not a Venn. (Also: valuation decays on a ~4-day clock, so this is
//      what can empty the pool and trigger the hero's trail fallback.)
//   2. Only POSITIVE verdicts qualify. A marquee surface must never carry a
//      standing negative call ("Weak & rich") on a named company — the same
//      discipline home-trails.ts uses to skip the alarm family.

import { BOARD_READS, classifyBoardRead, type BoardReadKey } from "./board-read";
import type { CompanyTrail } from "./home-trails";

/** The verdict families the hero is allowed to feature (board-read ranks 0-3). */
const POSITIVE_READS: ReadonlySet<BoardReadKey> = new Set<BoardReadKey>([
  "aligned_cheap",
  "quality_fair",
  "priced_for_it",
  "outlook_led",
]);

export type FeaturedCandidate = {
  code: string;
  name: string;
  sector: string | null;
  /** Standing quarter leg: trailing 4-quarter mean ConcallScore, 0-10. */
  concallScore: number | null;
  /** Growth outlook score, 0-10. */
  growthScore: number | null;
  /** Valuation ALREADY rescaled to 0-10 (lib/valuation-band). */
  valuationScore: number | null;
  /** The company's own scored-quarter trail — carried through for the proof sparkline. */
  trail: CompanyTrail;
};

export type FeaturedRead = {
  code: string;
  name: string;
  sector: string | null;
  concallScore: number;
  growthScore: number;
  valuationScore: number;
  readKey: BoardReadKey;
  readScore: number;
  readLabel: string;
  trail: CompanyTrail;
};

const finite = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n);

/**
 * Rank every qualifying company the hero may feature, highest composite first
 * (ties break on code so the order is deterministic within a cache window).
 *
 * A company qualifies only with all three legs present AND a positive verdict —
 * the same gate `pickFeaturedRead` enforces, so the equation hero (rank 0) and
 * the compare-sectors table (the top slice) can never disagree with each other
 * or with the leaderboard's Read column.
 *
 * `limit` caps the returned slice; omit it for the full ranked list.
 */
export function pickFeaturedReads(
  candidates: FeaturedCandidate[],
  limit?: number,
): FeaturedRead[] {
  const qualified: FeaturedRead[] = [];

  for (const c of candidates) {
    if (!finite(c.concallScore) || !finite(c.growthScore) || !finite(c.valuationScore)) {
      continue;
    }
    const read = classifyBoardRead({
      concallScore: c.concallScore,
      growthScore: c.growthScore,
      valuationScore: c.valuationScore,
    });
    if (!POSITIVE_READS.has(read.key) || !finite(read.score)) continue;

    qualified.push({
      code: c.code,
      name: c.name,
      sector: c.sector,
      concallScore: c.concallScore,
      growthScore: c.growthScore,
      valuationScore: c.valuationScore,
      readKey: read.key,
      readScore: read.score,
      readLabel: BOARD_READS[read.key].label,
      trail: c.trail,
    });
  }

  qualified.sort((a, b) => b.readScore - a.readScore || a.code.localeCompare(b.code));
  return typeof limit === "number" ? qualified.slice(0, limit) : qualified;
}

/**
 * Pick the single company the hero should feature, or null when none qualifies
 * (empty pool → the hero falls back to a score-trail plate). Thin wrapper over
 * `pickFeaturedReads` so the two can never diverge on the gate or the ordering.
 */
export function pickFeaturedRead(candidates: FeaturedCandidate[]): FeaturedRead | null {
  return pickFeaturedReads(candidates, 1)[0] ?? null;
}
