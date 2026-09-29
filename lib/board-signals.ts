// The watchlist board's four categorical signals — Moat, Forensic checks,
// Guidance strength, Management reliability — as PURE vocabulary: the row
// shapes, the words each cell prints, and a numeric "better first" order for
// sorting. No React, no Supabase, so the sort tests can pin the order and the
// client board can print the words. The server fetch lives in
// lib/watchlist-signals.ts.
//
// Every label restates one the company page already prints for the same
// verdict (moat rating/tier chips, the forensic tally, the ambition × evidence
// pills, the credibility tier) — the board must never introduce a claim the
// section behind it doesn't make.

import type { AmbitionLabel, EvidenceBand } from "@/lib/guidance-snapshot/types";
import { MOAT_RATING_ORDER, moatTierRank } from "@/lib/moat-analysis/rank";
import type { MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";
import type { CredibilityVerdictKey } from "@/lib/walk-the-talk/types";

export type MoatSignal = {
  rating: MoatRatingKey;
  tier: MoatTier | null;
};

export type ForensicSignal = {
  clean: number;
  watch: number;
  flag: number;
  /** clean + watch + flag — the checks the data could actually run. */
  assessed: number;
};

export type GuidanceSignal = {
  ambition: AmbitionLabel;
  evidence: EvidenceBand;
};

export type ManagementSignal = {
  tier: CredibilityVerdictKey;
  tierLabel: string;
  metCount: number;
  /** Graded resolved commitments (met + missed + dropped + revised/delayed past horizon). */
  countedCount: number;
  verdictSource: "scored" | "counted";
};

export type BoardSignals = {
  moat: MoatSignal | null;
  forensics: ForensicSignal | null;
  guidance: GuidanceSignal | null;
  management: ManagementSignal | null;
};

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

/** "Wide" / "Narrow" / "None" / "At risk" — the rating, one word. */
export const MOAT_SHORT_LABEL: Record<MoatRatingKey, string> = {
  wide_moat: "Wide",
  narrow_moat: "Narrow",
  moat_at_risk: "At risk",
  no_moat: "None",
  unknown: "Unknown",
};

const MOAT_TIER_WORD: Record<MoatTier, string> = {
  strong: "strong",
  mid: "mid",
  weak: "weak",
};

/**
 * The Moat cell: "Narrow · strong". A NO MOAT row carries no tier worth
 * printing (there is nothing to grade the strength of), so it reads "None".
 * Trajectory is deliberately absent — no moat history is stored, so the
 * portal never says "widening" (lib/moat-analysis/plain-language.ts).
 */
export function moatCellLabel(moat: MoatSignal): string {
  const rating = MOAT_SHORT_LABEL[moat.rating];
  if (moat.rating === "no_moat" || moat.rating === "unknown" || !moat.tier) return rating;
  return `${rating} · ${MOAT_TIER_WORD[moat.tier]}`;
}

/** Tone for the Moat cell — the same ramp the moat chips use (tier-class.ts). */
export type SignalTone = "good" | "warn" | "bad" | "muted";

export function moatTone(rating: MoatRatingKey): SignalTone {
  switch (rating) {
    case "wide_moat":
    case "narrow_moat":
      return "good";
    case "moat_at_risk":
      return "warn";
    case "no_moat":
      return "bad";
    default:
      return "muted";
  }
}

const AMBITION_WORD: Record<AmbitionLabel, string> = {
  ambitious: "Ambitious",
  measured: "Measured",
  conservative: "Conservative",
};

const EVIDENCE_NOTE: Record<EvidenceBand, string | null> = {
  well_evidenced: null,
  partly_evidenced: "partly evidenced",
  thinly_evidenced: "thinly evidenced",
};

/**
 * The Guidance cell: the ambition word ("Ambitious" / "Measured" /
 * "Conservative"), and beneath it the evidence caveat when the live book
 * behind it is only partly or thinly evidenced. Well-evidenced guidance
 * prints the ambition alone; the strength is implied. Mirrors the section's
 * two pills.
 */
export function guidanceCellLabel(guidance: GuidanceSignal): string {
  return AMBITION_WORD[guidance.ambition];
}

export function guidanceCellNote(guidance: GuidanceSignal): string | null {
  return EVIDENCE_NOTE[guidance.evidence];
}

/** Ambition colours the word (amber = ambitious, as the section's pill does); thin evidence pulls it to warn. */
export function guidanceTone(guidance: GuidanceSignal): SignalTone {
  if (guidance.evidence === "thinly_evidenced") return "warn";
  if (guidance.ambition === "ambitious") return "warn";
  if (guidance.ambition === "measured") return "good";
  return "muted";
}

/** Same tone map as guidance-header-pills.ts GUIDANCE_TIER_TONE, on the board's ramp. */
export function managementTone(tier: CredibilityVerdictKey): SignalTone {
  switch (tier) {
    case "reliable":
    case "high_trust":
    case "credible":
      return "good";
    case "mixed":
    case "erratic":
      return "warn";
    case "weak":
    case "low_trust":
      return "bad";
    default:
      return "muted";
  }
}

/** Forensic tone from the tally: any flag = bad, any watch = warn, else good. */
export function forensicTone(f: ForensicSignal): SignalTone {
  if (f.flag > 0) return "bad";
  if (f.watch > 0) return "warn";
  return "good";
}

// ---------------------------------------------------------------------------
// Sort order — a single number per signal where HIGHER IS BETTER, so the board
// can sort these columns with the same null-last numeric comparator it uses
// for the scores, and "desc" means best-first on every column.
// ---------------------------------------------------------------------------

/** Rating first (wide > narrow > at risk > none), tier second (strong > mid > weak). */
export function moatSortScore(moat: MoatSignal | null | undefined): number | null {
  if (!moat || moat.rating === "unknown") return null;
  const ratingRank = MOAT_RATING_ORDER[moat.rating]; // 0 best
  return (10 - ratingRank) * 10 + (3 - moatTierRank(moat.tier));
}

/** Fewer flags first, then fewer watches, then more cleans. */
export function forensicSortScore(f: ForensicSignal | null | undefined): number | null {
  if (!f || f.assessed === 0) return null;
  return -f.flag * 100 - f.watch * 10 + f.clean;
}

const EVIDENCE_RANK: Record<EvidenceBand, number> = {
  well_evidenced: 2,
  partly_evidenced: 1,
  thinly_evidenced: 0,
};
const AMBITION_RANK: Record<AmbitionLabel, number> = {
  ambitious: 2,
  measured: 1,
  conservative: 0,
};

/** Better-evidenced first; within a band, the bolder guide first. */
export function guidanceSortScore(g: GuidanceSignal | null | undefined): number | null {
  if (!g) return null;
  return EVIDENCE_RANK[g.evidence] * 10 + AMBITION_RANK[g.ambition];
}

const TIER_RANK: Record<CredibilityVerdictKey, number> = {
  high_trust: 5,
  reliable: 5,
  credible: 4,
  mixed: 3,
  erratic: 2,
  low_trust: 1,
  weak: 1,
  not_enough_data: 0,
  not_assessable: 0,
};

/** Tier first, hit-rate second — a stored "high trust" outranks a counted 3/4. */
export function managementSortScore(m: ManagementSignal | null | undefined): number | null {
  if (!m) return null;
  const hitRate = m.countedCount > 0 ? m.metCount / m.countedCount : 0;
  return TIER_RANK[m.tier] * 10 + hitRate * 9;
}
