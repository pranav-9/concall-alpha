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

/** The verdict families the hero is allowed to feature (board-read ranks 0-2). */
const POSITIVE_READS: ReadonlySet<BoardReadKey> = new Set<BoardReadKey>([
  "aligned_cheap",
  "priced_for_it",
  "outlook_led",
]);

export type FeaturedCandidate = {
  code: string;
  name: string;
  sector: string | null;
  /** Standing quarter leg: trailing 4-quarter mean ConcallScore, 0-10. */
  quarterScore: number | null;
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
  quarterScore: number;
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
 * Pick the single company the hero should feature, or null when none qualifies
 * (empty pool → the hero falls back to a score-trail plate).
 *
 * Highest composite wins; ties break on code so the choice is deterministic
 * within a cache window.
 */
export function pickFeaturedRead(candidates: FeaturedCandidate[]): FeaturedRead | null {
  const qualified: FeaturedRead[] = [];

  for (const c of candidates) {
    if (!finite(c.quarterScore) || !finite(c.growthScore) || !finite(c.valuationScore)) {
      continue;
    }
    const read = classifyBoardRead({
      quarterScore: c.quarterScore,
      growthScore: c.growthScore,
      valuationScore: c.valuationScore,
    });
    if (!POSITIVE_READS.has(read.key) || !finite(read.score)) continue;

    qualified.push({
      code: c.code,
      name: c.name,
      sector: c.sector,
      quarterScore: c.quarterScore,
      growthScore: c.growthScore,
      valuationScore: c.valuationScore,
      readKey: read.key,
      readScore: read.score,
      readLabel: BOARD_READS[read.key].label,
      trail: c.trail,
    });
  }

  qualified.sort((a, b) => b.readScore - a.readScore || a.code.localeCompare(b.code));
  return qualified[0] ?? null;
}
