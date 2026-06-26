// Single source of truth for the watchlist "Read" column: a synthesis that
// collapses the five per-row decision signals (level, trajectory, current-vs-
// baseline, forward outlook, moat) into ONE configuration label.
//
// Why this exists: the watchlist already shows Band / Qtr / Trend / Forward /
// Moat — five signals the reader has to integrate by eye on every row. For a
// portfolio decision ("add / hold / trim / watch?") the value isn't another
// signal, it's the *configuration across* them — especially where they diverge
// (soft print but strong outlook; top score but cooling forward; fine score but
// no moat underwrite). This module names those shapes.
//
// DESCRIPTIVE, not prescriptive. It names the configuration ("Outlook-led",
// "Near peak"), it does not emit a buy/sell call. The reader makes the decision;
// this just does the integration. (Founder stance, Journal: no model "sees the
// future" — so we organize the known setup, we don't forecast a number.)
//
// Noise discipline is inherited from score-trajectory.ts: a move smaller than
// the ±0.5 Phase-1 re-score drift band must never drive a label. That's why the
// "down" read needs a real cracking/worsening trajectory or a ≥0.5 fall vs the
// 4Q baseline — a −0.2 wiggle is not "softening".
//
// The thresholds below are a v1 fit, like the trajectory constants. Re-validate
// against the re-score backlog when it lands (TODOS.md item 3) — the same
// holdout that re-validates the trajectory thresholds re-validates these.

import { MOAT_RATING_ORDER } from "@/lib/moat-analysis/rank";
import type { MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";
import { TRAJECTORY_NOISE, type TrajectoryKey } from "@/lib/score-trajectory";

export type StanceKey =
  | "compounding"
  | "outlook_led"
  | "improving"
  | "near_peak"
  | "thin_underwrite"
  | "steady"
  | "soft_stuck"
  | "cracking"
  | "no_read";

export type StanceDef = {
  key: StanceKey;
  label: string; // full label — cell + tooltip headline
  gloss: string; // one-line plain-English meaning — legend / tooltip body
  rank: number; // sort order, most-aligned first (no_read pinned last via null rank)
  textClass: string; // label text on a neutral surface; reuses the band teal<->red ramp
};

// Thresholds (band-aligned to score-band.ts / growth-band.ts so the cuts agree
// with what the Qtr and Forward columns already show the reader).
const LEVEL_BULLISH = 7.0; // Qtr score at/above this is a "clearly strong quarter" (bullish band)
const LEVEL_TOP = 8.0; // strongly-bullish band — the top of the Qtr scale in practice
const LEVEL_DECENT = 6.5; // mildly-bullish+ : score is still respectable
const FWD_STRONG_MIN = 7.5; // Forward "Solid" or better — a genuinely good outlook
const FWD_SOFT_MAX = 7.0; // Forward below this is "Soft"/"Weak" — a real concern
const DOWN_TREND_MAX = -TRAJECTORY_NOISE; // latest vs 4Q avg this far down = a real (non-noise) fall

// Trajectory groupings (keys from score-trajectory.ts).
const UP_TRAJECTORIES: ReadonlySet<TrajectoryKey> = new Set([
  "climbing",
  "inflecting_up",
  "recovering",
]);
const STRONG_UP_TRAJECTORIES: ReadonlySet<TrajectoryKey> = new Set([
  "climbing",
  "inflecting_up",
  "strong_steady",
]);
const DOWN_TRAJECTORIES: ReadonlySet<TrajectoryKey> = new Set(["cracking", "worsening"]);

export const STANCES: Record<StanceKey, StanceDef> = {
  compounding: {
    key: "compounding",
    label: "Compounding",
    gloss: "Strong and rising, forward outlook solid+, moat intact — every signal pointing the same way up.",
    rank: 0,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  outlook_led: {
    key: "outlook_led",
    label: "Outlook-led",
    gloss: "The print is genuinely soft/cracking, but the forward outlook is strong and the moat holds — weakness against a strong-ahead read.",
    rank: 1,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  improving: {
    key: "improving",
    label: "Improving",
    gloss: "Score is turning up (climbing / inflecting / recovering) — momentum, but not the full conviction stack yet.",
    rank: 2,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  near_peak: {
    key: "near_peak",
    label: "Near peak",
    gloss: "Top-band score now, but the forward outlook is a notch cooler and momentum has flattened — priced for the good news.",
    rank: 3,
    textClass: "text-amber-700 dark:text-amber-300",
  },
  thin_underwrite: {
    key: "thin_underwrite",
    label: "Thin underwrite",
    gloss: "Score and trend hold up, but there's no moat read backing the durability — the quality leg is missing.",
    rank: 4,
    textClass: "text-amber-700 dark:text-amber-300",
  },
  steady: {
    key: "steady",
    label: "Steady",
    gloss: "Holding in place — nothing in the signals pulling it either way.",
    rank: 5,
    textClass: "text-muted-foreground",
  },
  soft_stuck: {
    key: "soft_stuck",
    label: "Soft & stuck",
    gloss: "Low and not moving, with a soft forward outlook — low conviction.",
    rank: 6,
    textClass: "text-orange-700 dark:text-orange-300",
  },
  cracking: {
    key: "cracking",
    label: "Cracking",
    gloss: "Breaking down (fresh drop or sustained slide) and the outlook isn't offsetting it.",
    rank: 7,
    textClass: "text-red-700 dark:text-red-300",
  },
  no_read: {
    key: "no_read",
    label: "No read",
    gloss: "No Qtr score, or fewer than 3 scored quarters — not enough to read a configuration.",
    rank: 8,
    textClass: "text-muted-foreground",
  },
};

// Most-aligned -> most-cautionary, then the no-signal state. Legend ordering.
export const STANCE_ORDER: StanceKey[] = [
  "compounding",
  "outlook_led",
  "improving",
  "near_peak",
  "thin_underwrite",
  "steady",
  "soft_stuck",
  "cracking",
  "no_read",
];

export type StanceInput = {
  latestQuarterScore: number | null;
  /** Latest − 4Q avg (the Trend column's Δ); a real fall needs ≤ −0.5. */
  trendChange?: number | null;
  growthScore: number | null;
  trajectoryKey?: TrajectoryKey | null;
  /** A moat read exists when the tier is present (Sai-Life-style "—" = none). */
  moatTier?: MoatTier | null;
};

export type StanceResult = {
  key: StanceKey;
  /** Articulated reasoning — the inputs that triggered the label (tooltip). */
  description: string;
};

const isFinite = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n);

const fwdLabel = (fwd: number) =>
  fwd >= FWD_STRONG_MIN ? "strong" : fwd < FWD_SOFT_MAX ? "soft" : "moderate";

// First match wins. Order is load-bearing: the divergence configs (outlook_led,
// near_peak) are checked before the plain ones they'd otherwise collapse into.
export function classifyStance(input: StanceInput): StanceResult {
  const level = isFinite(input.latestQuarterScore) ? input.latestQuarterScore : null;
  const traj: TrajectoryKey = input.trajectoryKey ?? "no_read";
  const fwd = isFinite(input.growthScore) ? input.growthScore : null;
  const trend = isFinite(input.trendChange) ? input.trendChange : null;
  const hasMoat = input.moatTier != null;

  // No anchor (no score) or no shape yet (<3 quarters) -> nothing to synthesize.
  if (level == null || traj === "no_read") {
    return { key: "no_read", description: STANCES.no_read.gloss };
  }

  const up = UP_TRAJECTORIES.has(traj);
  const strongUp = STRONG_UP_TRAJECTORIES.has(traj);
  const down = DOWN_TRAJECTORIES.has(traj) || (trend != null && trend <= DOWN_TREND_MAX);
  const fwdStrong = fwd != null && fwd >= FWD_STRONG_MIN;
  const fwdSoft = fwd != null && fwd < FWD_SOFT_MAX;

  const fwdNote = fwd != null ? `forward ${fwd.toFixed(1)} (${fwdLabel(fwd)})` : "no forward read";
  const moatNote = hasMoat ? "moat backed" : "no moat read";
  const ctx = `Qtr ${level.toFixed(1)}, ${traj}, ${fwdNote}, ${moatNote}.`;

  // Opportunity divergence: a real downturn, but strong outlook + durable.
  if (down && fwdStrong && hasMoat) {
    return { key: "outlook_led", description: `${STANCES.outlook_led.gloss} ${ctx}` };
  }
  // A real downturn the outlook isn't rescuing.
  if (down) {
    return { key: "cracking", description: `${STANCES.cracking.gloss} ${ctx}` };
  }
  // Full conviction stack: strong level, up-or-holding-strong, good outlook, moat.
  if (level >= LEVEL_BULLISH && strongUp && fwdStrong && hasMoat) {
    return { key: "compounding", description: `${STANCES.compounding.gloss} ${ctx}` };
  }
  // Momentum up, but missing a leg (no moat, soft outlook, or lower level).
  if (up) {
    return { key: "improving", description: `${STANCES.improving.gloss} ${ctx}` };
  }
  // Caution divergence: top score, cooler outlook, flattened momentum.
  if (level >= LEVEL_TOP && !fwdStrong) {
    return { key: "near_peak", description: `${STANCES.near_peak.gloss} ${ctx}` };
  }
  // Durability gap: respectable score/trend, but no moat read underwriting it.
  if (!hasMoat && level >= LEVEL_DECENT) {
    return { key: "thin_underwrite", description: `${STANCES.thin_underwrite.gloss} ${ctx}` };
  }
  // Low and not improving.
  if (level < LEVEL_DECENT && (fwdSoft || fwd == null)) {
    return { key: "soft_stuck", description: `${STANCES.soft_stuck.gloss} ${ctx}` };
  }
  // Residual: in place, nothing diverging.
  return { key: "steady", description: `${STANCES.steady.gloss} ${ctx}` };
}

// ---------------------------------------------------------------------------
// Sort helper — mirrors compareTrend in score-trajectory.ts so the Read column
// sorts the same way the Trend column does: best first, no_read pinned last in
// BOTH directions (it's "no signal", not "worst signal").
// ---------------------------------------------------------------------------

export function stanceSortRank(key?: StanceKey | null): number | null {
  return key && key !== "no_read" ? STANCES[key].rank : null;
}

type StanceSortable = { stanceKey?: StanceKey | null; moatRating?: MoatRatingKey | null };

const moatOrder = (rating: MoatRatingKey | null | undefined) =>
  rating ? MOAT_RATING_ORDER[rating] ?? MOAT_RATING_ORDER.unknown : MOAT_RATING_ORDER.unknown;

export function compareStance(
  a: StanceSortable,
  b: StanceSortable,
  direction: "asc" | "desc" = "desc",
): number {
  const ra = stanceSortRank(a.stanceKey);
  const rb = stanceSortRank(b.stanceKey);
  if (ra == null && rb == null) return 0;
  if (ra == null) return 1;
  if (rb == null) return -1;
  if (ra !== rb) return direction === "desc" ? ra - rb : rb - ra;
  // Within a stance, the stronger moat reads first (stable, decision-relevant tiebreak).
  const diff = moatOrder(a.moatRating) - moatOrder(b.moatRating);
  return direction === "desc" ? diff : -diff;
}
