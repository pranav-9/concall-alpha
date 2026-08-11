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
// readScore), so # and Read can't disagree. It is DELIBERATELY not the same
// value as the backend's stored composite: the live Read uses the single latest
// quarter (so it reconciles with the Quarter column shown), while
// compute_composite_score.py uses the 4Q mean for the slow coverage cut. Same
// formula (see WEIGHT NOTE), different quarter-leg input, on purpose (D2).

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
// That script writes the stored composite + coverage_rank used to GREY the
// below-cut tail; it does NOT feed this Read's # column (that's computed live).
export const QUALITY_WEIGHT = 0.88;
export const PRICE_WEIGHT = 0.12;

export type BoardReadKey =
  | "aligned_cheap"
  | "priced_for_it"
  | "outlook_led"
  | "peaking"
  | "balanced"
  | "unpriced"
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
  priced_for_it: {
    key: "priced_for_it",
    label: "Priced for it",
    gloss:
      "Quality is real on both the print and the outlook, but the price already reflects it. You're paying for what you can see.",
    rank: 1,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  outlook_led: {
    key: "outlook_led",
    label: "Outlook-led",
    gloss:
      "The print is soft but the forward read is strong — the case rests on what's ahead, not what just happened.",
    rank: 2,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  peaking: {
    key: "peaking",
    label: "Peaking",
    gloss:
      "A strong quarter with a cooler outlook behind it — the good news may already be in the print.",
    rank: 3,
    textClass: "text-amber-700 dark:text-amber-300",
  },
  balanced: {
    key: "balanced",
    label: "Balanced",
    gloss: "Nothing pulling hard in any direction — quality and price both middling.",
    rank: 4,
    textClass: "text-muted-foreground",
  },
  // Split out of "Balanced" 2026-07-30. 18 of 52 Balanced rows had no valuation
  // at all, so the label was asserting a fair-value judgement we hadn't made —
  // the same conflation the Valuation column itself is careful to avoid ("—"
  // means no verdict, not an average one). Quality is legible on these rows;
  // only the price leg is missing.
  unpriced: {
    key: "unpriced",
    label: "No price read",
    gloss:
      "The quarter and outlook are readable, but there's no valuation we'd stand behind — so this says nothing about what you'd pay.",
    rank: 5,
    textClass: "text-muted-foreground",
  },
  cheap_weak: {
    key: "cheap_weak",
    label: "Cheap & weak",
    gloss:
      "Priced low, and the quarter and outlook show why. Cheap is the only leg working.",
    rank: 6,
    textClass: "text-orange-700 dark:text-orange-300",
  },
  weak_rich: {
    key: "weak_rich",
    label: "Weak & rich",
    gloss:
      "Soft on both the print and the outlook, and still not cheap — no leg supporting it.",
    rank: 7,
    textClass: "text-red-700 dark:text-red-300",
  },
  no_read: {
    key: "no_read",
    label: "No read",
    gloss: "Not enough scored legs to name a configuration.",
    rank: 8,
    textClass: "text-muted-foreground",
  },
};

export const BOARD_READ_ORDER: BoardReadKey[] = [
  "aligned_cheap",
  "priced_for_it",
  "outlook_led",
  "peaking",
  "balanced",
  "unpriced",
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
const SOFT_GROWTH: ReadonlySet<GrowthBandKey> = new Set<GrowthBandKey>([
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
  /** Latest reported quarter ConcallScore, 0-10. */
  quarterScore: number | null;
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
 * The composite: quality (mean of the legs present) tilted against price.
 *
 * A missing leg is NEUTRAL, not punitive — it neither helps nor hurts. This
 * mirrors compute_composite_score.py, where the old half-weight penalty was
 * dropped because it demoted companies for a valuation we simply hadn't
 * refreshed, ranking our own pipeline upkeep instead of the business.
 */
export function computeBoardComposite(input: BoardReadInput): number | null {
  const quality: number[] = [];
  if (finite(input.quarterScore)) quality.push(input.quarterScore);
  if (finite(input.growthScore)) quality.push(input.growthScore);
  // Bound to a local so the type guard narrows — a boolean flag doesn't carry
  // narrowing through to a later property access.
  const price = finite(input.valuationScore) ? input.valuationScore : null;

  const qualityMean =
    quality.length > 0 ? quality.reduce((a, b) => a + b, 0) / quality.length : null;

  if (qualityMean != null && price != null) {
    return QUALITY_WEIGHT * qualityMean + PRICE_WEIGHT * price;
  }
  // Missing a whole side: scored on the side that exists (weights renormalise).
  if (qualityMean != null) return qualityMean;
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
  if (!finite(input.quarterScore)) {
    return { key: "no_read", score, description: BOARD_READS.no_read.gloss };
  }

  // A configuration is a relationship BETWEEN legs, so one leg can't express
  // one. Without this floor a soft quarter with no growth and no valuation fell
  // through to the residual and read "Balanced" — asserting a two-sided
  // equilibrium off a single number. Defensive in practice (growth covers the
  // universe today), load-bearing the moment it doesn't.
  const legCount =
    (finite(input.quarterScore) ? 1 : 0) +
    (finite(input.growthScore) ? 1 : 0) +
    (finite(input.valuationScore) ? 1 : 0);
  if (legCount < 2) {
    return { key: "no_read", score, description: BOARD_READS.no_read.gloss };
  }

  const qtrBand = bandForScore(input.quarterScore);
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

  const ctx = [
    `Qtr ${input.quarterScore.toFixed(1)}`,
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
      : { key: "balanced", score, description: withCtx(BOARD_READS.balanced) };
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

  // Mid-band residual: neither side diverging. "Balanced" here is a statement
  // about quality sitting mid-scale, not about price, so it stands with or
  // without a valuation.
  return { key: "balanced", score, description: withCtx(BOARD_READS.balanced) };
}

/** Sort rank; no_read is "no signal", not "worst signal", so it pins last both ways. */
export function boardReadSortRank(key?: BoardReadKey | null): number | null {
  return key && key !== "no_read" ? BOARD_READS[key].rank : null;
}
