// The leaderboard's "Read" column: one number and one word, both derived from
// the three scores already on the row (Quarter, Growth, Valuation).
//
// WHY THIS EXISTS separately from portfolio-stance.ts. That module synthesises a
// row from FIVE signals including trajectory and moat, for a holdings decision
// ("add / hold / trim?"). This one answers a different question: given a board
// of companies, which configuration of quality-and-price is this? It reads only
// the three scores the board actually shows, because a board is scanned, not
// studied.
//
// This is now the Read on BOTH boards — /leaderboards and /watchlists render the
// same component (components/score-board-table.tsx), so a reader who learns the
// grammar on one doesn't relearn it on the other. portfolio-stance.ts is no
// longer rendered anywhere; it's kept (with its test) as the vocabulary for a
// holdings-stance surface if one comes back.
//
// DESCRIPTIVE, not prescriptive — same discipline as portfolio-stance.ts. It
// names the shape ("Aligned & cheap", "Priced for it"); it never emits a
// buy/sell call. The reader decides. (Founder stance, Journal: nothing here
// forecasts, so we organize the known setup rather than predict a number.)
//
// THE NUMBER is this Read's own composite, computed live from the row's legs.
// The board's # column is derived from it (score-board-table.tsx ranks on
// readScore), so # and Read can't disagree.
//
// QUARTER LEG — live board vs coverage cut DIVERGE by design (2026-08-11). The
// caller passes this Read a RECENCY-WEIGHTED 4Q leg ("latest counts double",
// lib/quarter-composite blendQuarterLeg via score-board-rows), while
// compute_composite_score.py's coverage cut stays on the flat 4Q mean. Recency
// belongs in the live ORDERING; the cut's membership decision (which sits inside
// the re-score noise floor at the 100/101 line) must stay stable. An earlier
// unification onto the 4Q mean existed because a greyed company could out-rank
// kept ones on the board — that symptom is now handled INDEPENDENTLY: the
// leaderboard greys by LIVE Read rank (rank > COVERAGE_BOARD_SIZE, score-board-
// table.tsx), so a greyed row is always the lowest-ranked and can't out-score a
// kept one. The split is therefore safe.
// The WEIGHTS (0.88/0.12) and the composite arithmetic still mirror the pipeline
// and stay pinned by the cross-impl fixture; only the quarter INPUT differs. The
// valuation leg also diverges (live Read drops a stale >4-day valuation; the cut
// keeps the last stored one).

import { bandForScore, type BandKey } from "@/lib/score-band";
import { bandForGrowthScore, type GrowthBandKey } from "@/lib/growth-band";
import { bandForValuationScore, type ValuationBandKey } from "@/lib/valuation-band";

// WEIGHT NOTE. These mirror QUALITY_WEIGHT / PRICE_WEIGHT in
// concallyser/scripts/compute_composite_score.py, which DERIVES them from the
// measured spread of each leg rather than picking them: a leg's influence on the
// ordering is weight x sd, not weight alone. Measured 2026-07-30, sd(quality)
// 0.54 vs sd(valuation) 2.03 — valuation swings 3.8x wider, so an even-looking
// 0.67/0.33 split would have ranked the board 91% on cheapness. 0.88/0.12 is
// what "quality counts twice what price counts" actually costs here.
//
// If you change these, change them in BOTH places — here and
// compute_composite_score.py — and regenerate
// tests/fixtures/composite-score-cross-impl.json; the contract test on each side
// (board-read.test.ts / test_compute_composite.py) goes red if the two drift.
// That script writes the stored composite + coverage_rank + excluded_from_
// discovery flag that governs homepage/sectors; it no longer greys the
// leaderboard tail (that's the live Read rank now) and never fed this Read's #
// column (always computed live).
export const QUALITY_WEIGHT = 0.88;
export const PRICE_WEIGHT = 0.12;

// TODOS #40 (decided 2026-08-15): a missing valuation leg imputes the fair midpoint —
// 5.0 on the 0-10 LEG scale used here (the stored 0-100 valuation score 50) — never
// the company's own quality. Mirrors MISSING_VALUATION_ANCHOR in
// compute_composite_score.py — see its comment for the measurement and the
// fixed-5.0-over-universe-median decision. Pinned by the cross-impl fixture.
export const MISSING_VALUATION_ANCHOR = 5;

export type BoardReadKey =
  | "aligned_cheap"
  | "quality_fair"
  | "priced_for_it"
  | "outlook_led"
  | "peaking"
  | "cheap_forming"
  | "balanced"
  | "unpriced"
  | "priced_ahead"
  | "cheap_weak"
  | "weak_rich"
  | "no_read";

export type BoardReadDef = {
  key: BoardReadKey;
  label: string;
  gloss: string;
  rank: number; // most-aligned first; no_read pinned last via a null sort rank
  textClass: string;
};

export const BOARD_READS: Record<BoardReadKey, BoardReadDef> = {
  aligned_cheap: {
    key: "aligned_cheap",
    label: "Aligned & cheap",
    gloss:
      "The quarter is strong, the outlook backs it, and the price hasn't caught up — all three pointing the same way.",
    rank: 0,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  // Split out of "Balanced" 2026-08-13. Strong-on-both-legs at a FAIR price was
  // falling through to the residual and reading "quality middling" — the one
  // configuration a quality-first reader most wants surfaced, misdescribed by
  // the label least likely to make them look.
  quality_fair: {
    key: "quality_fair",
    label: "Quality at a fair price",
    gloss:
      "Strong on both the print and the outlook, and the price is still fair — you're paying about what you can see, not a premium for it.",
    rank: 1,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  priced_for_it: {
    key: "priced_for_it",
    label: "Priced for it",
    gloss:
      "Quality is real on both the print and the outlook, but the price already reflects it. You're paying for what you can see.",
    rank: 2,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  outlook_led: {
    key: "outlook_led",
    label: "Outlook-led",
    gloss:
      "The print is soft but the forward read is strong — the case rests on what's ahead, not what just happened.",
    rank: 3,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  peaking: {
    key: "peaking",
    label: "Peaking",
    gloss:
      "A strong quarter with a cooler outlook behind it — the good news may already be in the print.",
    rank: 4,
    textClass: "text-amber-700 dark:text-amber-300",
  },
  // The residual's cheap lean (2026-08-13). Mixed/mid quality legs with a low
  // price used to read "Balanced", hiding the one leg that WAS pulling — the
  // Valuation cell two columns left said "Undervalued" while the Read shrugged.
  cheap_forming: {
    key: "cheap_forming",
    label: "Cheap, quality forming",
    gloss:
      "The price is low while the quality legs are mixed — not the broken kind of cheap, but the case still has to form.",
    rank: 5,
    textClass: "text-amber-700 dark:text-amber-300",
  },
  balanced: {
    key: "balanced",
    label: "Balanced",
    gloss:
      "Nothing pulling hard in any direction — the quality legs sit mid-scale and the price is fair.",
    rank: 6,
    textClass: "text-muted-foreground",
  },
  // Split out of "Balanced" 2026-07-30. 18 of 52 Balanced rows had no valuation
  // at all, so the label was asserting a fair-value judgement we hadn't made —
  // the same conflation the Valuation column itself is careful to avoid ("—"
  // means no verdict, not an average one). Quality is legible on these rows;
  // only the price leg is missing. Since 2026-08-13 the residual routes here
  // too, so NO label that names a price is reachable without a valuation.
  unpriced: {
    key: "unpriced",
    label: "No price read",
    gloss:
      "The quarter and outlook are readable, but there's no valuation we'd stand behind — so this says nothing about what you'd pay.",
    rank: 7,
    textClass: "text-muted-foreground",
  },
  // The residual's rich lean (2026-08-13). Named as the sibling of "Priced for
  // it": there the quality is visible and paid for; here the price is ahead of
  // what the legs currently show. Deliberately print-agnostic ("ahead of it",
  // not "rich for a soft print") because a strong print with only a moderate
  // outlook lands here too.
  priced_ahead: {
    key: "priced_ahead",
    label: "Priced ahead of it",
    gloss:
      "The price is rich while the print and outlook don't fully back it — you're paying ahead of what the legs show.",
    rank: 8,
    textClass: "text-orange-700 dark:text-orange-300",
  },
  cheap_weak: {
    key: "cheap_weak",
    label: "Cheap & weak",
    gloss:
      "Priced low, and the quarter and outlook show why. Cheap is the only leg working.",
    rank: 9,
    textClass: "text-orange-700 dark:text-orange-300",
  },
  weak_rich: {
    key: "weak_rich",
    label: "Weak & rich",
    gloss:
      "Soft on both the print and the outlook, and still not cheap — no leg supporting it.",
    rank: 10,
    textClass: "text-red-700 dark:text-red-300",
  },
  no_read: {
    key: "no_read",
    label: "No read",
    gloss: "Not enough scored legs to name a configuration.",
    rank: 11,
    textClass: "text-muted-foreground",
  },
};

export const BOARD_READ_ORDER: BoardReadKey[] = [
  "aligned_cheap",
  "quality_fair",
  "priced_for_it",
  "outlook_led",
  "peaking",
  "cheap_forming",
  "balanced",
  "unpriced",
  "priced_ahead",
  "cheap_weak",
  "weak_rich",
  "no_read",
];

// Cuts reuse the band vocabulary the three columns already show the reader, so
// the Read can never contradict the words above it. "Strong" on the quality side
// means the band a reader would call good; "cheap"/"rich" are the valuation
// bands either side of Fair.
const STRONG_QTR: ReadonlySet<BandKey> = new Set<BandKey>([
  "strongly_bullish",
  "bullish",
]);
const SOFT_QTR: ReadonlySet<BandKey> = new Set<BandKey>([
  "neutral",
  "mildly_bearish",
  "strongly_bearish",
]);
const STRONG_GROWTH: ReadonlySet<GrowthBandKey> = new Set<GrowthBandKey>([
  "exceptional",
  "strong",
  "solid",
]);
// "moderate" (5.8–6.4) sits below the growth-band median (6.5) on the amber
// caution side, so it counts as the cooling/soft side of a divergence — mirroring
// the quarter side, where the middle band `neutral` is in SOFT_QTR. Without it,
// the ~30% of the fleet in the moderate band could never read "Peaking" (strong
// print, cooling outlook) or fall into the soft-on-both family; they leaked into
// the price residual. The growth-band cut retune (v5, 2026-08-20) moved mid-6
// scores from `soft` into `moderate` and this set was not updated to match.
const SOFT_GROWTH: ReadonlySet<GrowthBandKey> = new Set<GrowthBandKey>([
  "moderate",
  "soft",
  "weak",
]);
const CHEAP: ReadonlySet<ValuationBandKey> = new Set<ValuationBandKey>([
  "deep_value",
  "undervalued",
]);
const RICH: ReadonlySet<ValuationBandKey> = new Set<ValuationBandKey>([
  "expensive",
  "richly_priced",
]);

export type BoardReadInput = {
  /** Standing quarter leg, 0-10. On the Overall board this is the recency-weighted
   * 4Q blend (lib/quarter-composite blendQuarterLeg); other callers may pass a flat
   * mean. The number AND the label are computed from whatever is passed here. */
  concallScore: number | null;
  /** Growth outlook score, 0-10. */
  growthScore: number | null;
  /** Valuation ALREADY rescaled to 0-10 (see lib/valuation-band). */
  valuationScore: number | null;
};

export type BoardReadResult = {
  key: BoardReadKey;
  /** The composite that also ranks the board, 0-10. Null when no leg exists. */
  score: number | null;
  /** Articulated reasoning — which inputs produced the label (tooltip). */
  description: string;
};

const finite = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n);

/**
 * The composite: quality (mean of the quality legs present) tilted against price.
 *
 * A missing QUALITY leg is NEUTRAL, not punitive — it neither helps nor hurts
 * (the old half-weight penalty demoted companies for a valuation we simply
 * hadn't refreshed). A missing VALUATION leg imputes MISSING_VALUATION_ANCHOR
 * (TODOS #40): the old quality-only fallback was arithmetically an own-quality
 * imputation, letting a no-valuation company out-rank an identical one with a
 * mediocre valuation. Mirrors compute_composite_score.py exactly.
 */
export function computeBoardComposite(input: BoardReadInput): number | null {
  const quality: number[] = [];
  if (finite(input.concallScore)) quality.push(input.concallScore);
  if (finite(input.growthScore)) quality.push(input.growthScore);
  // Bound to a local so the type guard narrows — a boolean flag doesn't carry
  // narrowing through to a later property access.
  const price = finite(input.valuationScore) ? input.valuationScore : null;

  const qualityMean =
    quality.length > 0 ? quality.reduce((a, b) => a + b, 0) / quality.length : null;

  if (qualityMean != null) {
    const effectivePrice = price != null ? price : MISSING_VALUATION_ANCHOR;
    return QUALITY_WEIGHT * qualityMean + PRICE_WEIGHT * effectivePrice;
  }
  // Whole quality side missing: scored on price alone (weights renormalise).
  return price;
}

/**
 * Name the configuration. First match wins, and the order is load-bearing: the
 * divergence shapes (outlook_led, peaking) are checked before the plain
 * quality-vs-price ones they would otherwise collapse into.
 */
export function classifyBoardRead(input: BoardReadInput): BoardReadResult {
  const score = computeBoardComposite(input);

  // The quarter is the anchor: without a print there is no configuration to
  // name, however good the outlook looks.
  if (!finite(input.concallScore)) {
    return { key: "no_read", score, description: BOARD_READS.no_read.gloss };
  }

  // A configuration is a relationship BETWEEN legs, so one leg can't express
  // one. Without this floor a soft quarter with no growth and no valuation fell
  // through to the residual and read "Balanced" — asserting a two-sided
  // equilibrium off a single number. Defensive in practice (growth covers the
  // universe today), load-bearing the moment it doesn't.
  const legCount =
    (finite(input.concallScore) ? 1 : 0) +
    (finite(input.growthScore) ? 1 : 0) +
    (finite(input.valuationScore) ? 1 : 0);
  if (legCount < 2) {
    return { key: "no_read", score, description: BOARD_READS.no_read.gloss };
  }

  const qtrBand = bandForScore(input.concallScore);
  const growthBand = finite(input.growthScore)
    ? bandForGrowthScore(input.growthScore)
    : null;
  const valBand = finite(input.valuationScore)
    ? bandForValuationScore(input.valuationScore)
    : null;

  const qtrStrong = STRONG_QTR.has(qtrBand);
  const qtrSoft = SOFT_QTR.has(qtrBand);
  const growthStrong = growthBand != null && STRONG_GROWTH.has(growthBand);
  const growthSoft = growthBand != null && SOFT_GROWTH.has(growthBand);
  const cheap = valBand != null && CHEAP.has(valBand);
  const rich = valBand != null && RICH.has(valBand);

  // "quarter", not "ConcallScore": on the Overall board this leg is the
  // recency-weighted 4Q blend, not the single latest print that word names.
  const ctx = [
    `quarter ${input.concallScore.toFixed(1)}`,
    finite(input.growthScore) ? `growth ${input.growthScore.toFixed(1)}` : "no growth read",
    finite(input.valuationScore)
      ? `valuation ${input.valuationScore.toFixed(1)}`
      : "no valuation read",
  ].join(", ");
  const withCtx = (def: BoardReadDef) => `${def.gloss} ${ctx}.`;

  // Divergences first — a soft print against a strong outlook, or the reverse,
  // is the thing a level-only average would hide.
  if (qtrSoft && growthStrong) {
    return { key: "outlook_led", score, description: withCtx(BOARD_READS.outlook_led) };
  }
  if (qtrStrong && growthSoft) {
    return { key: "peaking", score, description: withCtx(BOARD_READS.peaking) };
  }

  // Quality holding on both legs: the question is what you pay for it.
  if (qtrStrong && growthStrong) {
    if (cheap) {
      return { key: "aligned_cheap", score, description: withCtx(BOARD_READS.aligned_cheap) };
    }
    if (rich) {
      return { key: "priced_for_it", score, description: withCtx(BOARD_READS.priced_for_it) };
    }
    // Fair-value and no-read are NOT the same statement, so they don't share a
    // label. Everything from here down that would name a price has to check.
    return valBand == null
      ? { key: "unpriced", score, description: withCtx(BOARD_READS.unpriced) }
      : { key: "quality_fair", score, description: withCtx(BOARD_READS.quality_fair) };
  }

  // Quality soft on both legs: cheap is either the consolation or absent.
  if (qtrSoft && growthSoft) {
    if (cheap) {
      return { key: "cheap_weak", score, description: withCtx(BOARD_READS.cheap_weak) };
    }
    if (rich) {
      return { key: "weak_rich", score, description: withCtx(BOARD_READS.weak_rich) };
    }
    return valBand == null
      ? { key: "unpriced", score, description: withCtx(BOARD_READS.unpriced) }
      : { key: "balanced", score, description: withCtx(BOARD_READS.balanced) };
  }

  // Mid-band residual: at least one quality leg sits mid-band, so neither the
  // strong nor the soft family fires. Before 2026-08-13 everything here read
  // "Balanced" regardless of price — which put "Balanced" on rows whose
  // Valuation cell said Expensive or Undervalued, breaking the no-contradiction
  // contract at the top of this file. Now the residual makes the same price
  // check every other branch makes; "Balanced" is left meaning exactly what its
  // gloss says: mid quality AND a fair price.
  if (cheap) {
    return { key: "cheap_forming", score, description: withCtx(BOARD_READS.cheap_forming) };
  }
  if (rich) {
    return { key: "priced_ahead", score, description: withCtx(BOARD_READS.priced_ahead) };
  }
  return valBand == null
    ? { key: "unpriced", score, description: withCtx(BOARD_READS.unpriced) }
    : { key: "balanced", score, description: withCtx(BOARD_READS.balanced) };
}

/** Sort rank; no_read is "no signal", not "worst signal", so it pins last both ways. */
export function boardReadSortRank(key?: BoardReadKey | null): number | null {
  return key && key !== "no_read" ? BOARD_READS[key].rank : null;
}
