// Single source of truth for the platform-wide score-trajectory classification:
// the Trend column's label vocabulary, its thresholds, its sort order, and its
// articulated descriptions. Consumed by: get-concall-data (classification),
// the leaderboard Trend column (display + sort), and /how-scores-work (legend).
//
// Band (lib/score-band.ts) answers "where does the score sit?"; this module
// answers "where is it heading?" — orthogonal axes, shown side by side.
// Founder framing (Journal 2026-06-06): "A 7 on the way up is a different
// stock from a 7 on the way down."
//
// Every threshold is anchored at or above the measured Phase-1 re-score drift
// band of ±0.5 (NUVAMA 3-run study, 2026-05-29): a move that drift can explain
// must never earn a directional label. The old calculateTrend threshold of 0.2
// sat below that floor — ~38% of its labels were noise (analysis 2026-06-12,
// 45 companies). Taxonomy validated on live data through 3 rule iterations;
// the pinned pitfall fixtures live in tests/score-trajectory.test.ts.
// Thresholds were fit on 45 companies — re-validate against the re-score
// backlog when it lands (TODOS.md item 3).

export type TrajectoryKey =
  | "climbing"
  | "inflecting_up"
  | "strong_steady"
  | "steady"
  | "drifting"
  | "choppy"
  | "weak_stuck"
  | "cracking"
  | "worsening"
  | "no_read";

export type TrajectoryDef = {
  key: TrajectoryKey;
  label: string; // full vocabulary — tooltip, legend
  cellLabel: string; // one word — fits the 12px leaderboard cell
  rank: number; // sort order, best trajectory first (no_read pinned last via sortUndefined, not rank)
  definition: string; // rule in reader terms — legend on /how-scores-work
  textClass: string; // label text on a neutral surface; reuses the band CVD-safe teal<->red ramp
};

// Thresholds. NOISE is the floor everything else respects.
export const TRAJECTORY_NOISE = 0.5; // ±: re-score drift band; smaller moves are unreadable
const MIN_QUARTERS = 3; // below this, no trajectory rule can distinguish shape from noise
const DELTA_WINDOW = 6; // quarters of history the rules look at
const LEVEL_WINDOW = 4; // quarters used for level/range reads (strong, steady, range)
const CLIMB_GAIN_MIN = 0.8; // net gain over the level window to call a climb
const CLIMB_DIP_TOLERANCE = -0.15; // largest single dip a climb may contain
const EVENT_DELTA = 0.6; // single-quarter move that counts as an event (crack / inflection)
const BASE_STABLE_MAX = 0.6; // every base delta must be within this for an event read
const SLIDE_LOSS_MIN = -0.8; // cumulative fall to call worsening
const STRONG_FLOOR = 7.0; // min of last 4 to call strong & steady
const FLAT_RANGE_MAX = 0.6; // last-4 range to call steady / stuck
const WEAK_CEILING = 5.5; // latest below this + flat = weak & stuck

export const TRAJECTORIES: Record<TrajectoryKey, TrajectoryDef> = {
  climbing: {
    key: "climbing",
    label: "Climbing",
    cellLabel: "Climbing",
    rank: 0,
    definition: `Staircase: net gain ≥ ${CLIMB_GAIN_MIN} over the last ~4 quarters, no meaningful down-quarter inside the climb.`,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  inflecting_up: {
    key: "inflecting_up",
    label: "Inflecting up",
    cellLabel: "Inflecting",
    rank: 1,
    definition: `Fresh break upward: latest quarter +${EVENT_DELTA} or more off a stable base.`,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  strong_steady: {
    key: "strong_steady",
    label: "Strong & steady",
    cellLabel: "Strong",
    rank: 2,
    definition: `Last 4 quarters all ≥ ${STRONG_FLOOR} with no fresh break down.`,
    textClass: "text-teal-700 dark:text-teal-300",
  },
  steady: {
    key: "steady",
    label: "Steady",
    cellLabel: "Steady",
    rank: 3,
    definition: `Range-bound: last 4 quarters within ${FLAT_RANGE_MAX} of each other.`,
    textClass: "text-muted-foreground",
  },
  drifting: {
    key: "drifting",
    label: "Drifting",
    cellLabel: "Drifting",
    rank: 4,
    definition: "Moves around, but no direction the noise floor can't explain.",
    textClass: "text-muted-foreground",
  },
  choppy: {
    key: "choppy",
    label: "Choppy",
    cellLabel: "Choppy",
    rank: 5,
    definition: `Alternating swings beyond ±${TRAJECTORY_NOISE} — the score itself is unstable.`,
    textClass: "text-amber-700 dark:text-amber-300",
  },
  weak_stuck: {
    key: "weak_stuck",
    label: "Weak & stuck",
    cellLabel: "Stuck",
    rank: 6,
    definition: `Flat below ${WEAK_CEILING} — low and not moving.`,
    textClass: "text-orange-700 dark:text-orange-300",
  },
  cracking: {
    key: "cracking",
    label: "Cracking",
    cellLabel: "Cracking",
    rank: 7,
    definition: `Fresh break downward: latest quarter −${EVENT_DELTA} or more off a stable base.`,
    textClass: "text-red-700 dark:text-red-300",
  },
  worsening: {
    key: "worsening",
    label: "Worsening",
    cellLabel: "Worsening",
    rank: 8,
    definition: `Sustained slide: cumulative fall of ${Math.abs(SLIDE_LOSS_MIN)}+ across consecutive quarters.`,
    textClass: "text-red-700 dark:text-red-300",
  },
  no_read: {
    key: "no_read",
    label: "No read yet",
    cellLabel: "—",
    rank: 9,
    definition: `Fewer than ${MIN_QUARTERS} scored quarters — not enough points for any trajectory rule.`,
    textClass: "text-muted-foreground",
  },
};

// Best -> worst for legend ordering (matches rank).
export const TRAJECTORY_ORDER: TrajectoryKey[] = [
  "climbing",
  "inflecting_up",
  "strong_steady",
  "steady",
  "drifting",
  "choppy",
  "weak_stuck",
  "cracking",
  "worsening",
  "no_read",
];

export type TrajectoryResult = {
  key: TrajectoryKey;
  /** Latest score − 4Q avg (avg INCLUDES latest, deliberately dampened) so the
   * leaderboard row reconciles for the reader: Latest − 4Q Avg = Trend. */
  change: number;
  /** Articulated reasoning incl. the score path, oldest → newest. */
  description: string;
};

const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;

// Score deltas are decimal arithmetic on one-decimal scores; 7.0 − 6.2 is
// 0.799999…, so every threshold comparison tolerates float error. A score
// exactly ON a threshold takes the label the threshold names.
const EPS = 1e-9;
const geq = (a: number, b: number) => a >= b - EPS;
const leq = (a: number, b: number) => a <= b + EPS;

export function classifyTrajectory(
  rawScores: readonly number[],
  opts: { hasGapInWindow: boolean },
): TrajectoryResult {
  // Defensive finite filter — callers should pre-filter and flag gaps, but a
  // stray null/NaN must degrade to "fewer points", never to NaN math.
  const scores = rawScores.filter((s) => typeof s === "number" && Number.isFinite(s));
  const n = scores.length;

  const last4 = scores.slice(0, LEVEL_WINDOW);
  const avg4 = last4.length > 0 ? last4.reduce((a, b) => a + b, 0) / last4.length : 0;
  const change = n > 0 ? scores[0] - avg4 : 0;
  // Path shown oldest -> newest so it reads left-to-right like the chart.
  const path = [...last4].reverse().map((s) => s.toFixed(1)).join(" → ");
  const gapNote = opts.hasGapInWindow
    ? " History has quarter gaps, so sharp-move labels are withheld."
    : "";

  if (n < MIN_QUARTERS) {
    return {
      key: "no_read",
      change,
      description: TRAJECTORIES.no_read.definition,
    };
  }

  const deltas: number[] = [];
  for (let i = 0; i < Math.min(n, DELTA_WINDOW) - 1; i++) deltas.push(scores[i] - scores[i + 1]);
  const latestD = deltas[0];
  const rng4 = Math.max(...last4) - Math.min(...last4);
  const min4 = Math.min(...last4);
  const recentGain = scores[0] - scores[Math.min(LEVEL_WINDOW - 1, n - 1)];
  const climbDeltas = deltas.slice(0, LEVEL_WINDOW - 1);
  const rises = climbDeltas.filter((d) => geq(d, CLIMB_DIP_TOLERANCE)).length;
  const hasBigDrop = climbDeltas.some((d) => leq(d, -EVENT_DELTA));
  // Base = the quarters BEFORE the latest move; an event read needs it stable,
  // otherwise a single delta off an alternating base masquerades as an event
  // (the NEULANDLAB pitfall).
  const baseStable = deltas.slice(1, LEVEL_WINDOW).every((d) => leq(Math.abs(d), BASE_STABLE_MAX));
  let fall = 0;
  let loss = 0;
  for (const d of deltas) {
    if (leq(d, 0.15)) {
      fall += 1;
      loss += d;
    } else break;
  }
  // Chop = direction ALTERNATION among meaningful moves — not variance, which
  // would misread a steep monotonic climb as chop (the SANSERA pitfall).
  const sig = deltas.filter((d) => geq(Math.abs(d), TRAJECTORY_NOISE));
  let flips = 0;
  for (let i = 0; i < sig.length - 1; i++) if (sig[i] * sig[i + 1] < 0) flips += 1;
  const gap = opts.hasGapInWindow;

  // Rule order is load-bearing — see tests/score-trajectory.test.ts for the
  // pinned counterexamples behind each guard. Event labels (climbing,
  // inflecting up, cracking) are withheld when the window has gaps (D2).
  if (geq(recentGain, CLIMB_GAIN_MIN) && rises >= 2 && geq(latestD, CLIMB_DIP_TOLERANCE) && !hasBigDrop && !gap) {
    return {
      key: "climbing",
      change,
      description: `Climbed ${fmt(recentGain)} over ${last4.length} qtrs: ${path}.`,
    };
  }
  if (fall >= 2 && leq(loss, SLIDE_LOSS_MIN)) {
    return {
      key: "worsening",
      change,
      description: `Slid ${fmt(loss)} over ${fall} qtrs: ${path}.${gapNote}`,
    };
  }
  if (leq(latestD, -EVENT_DELTA) && baseStable && !gap) {
    return {
      key: "cracking",
      change,
      description: `Cracked ${fmt(latestD)} in the latest quarter off a steady base: ${path}.`,
    };
  }
  if (flips >= 2 && !geq(min4, STRONG_FLOOR)) {
    return {
      key: "choppy",
      change,
      description: `Alternating beyond ±${TRAJECTORY_NOISE} with no stable read: ${path}.${gapNote}`,
    };
  }
  if (geq(latestD, EVENT_DELTA) && baseStable && !gap) {
    return {
      key: "inflecting_up",
      change,
      description: `Inflected ${fmt(latestD)} in the latest quarter off a flat base: ${path}.`,
    };
  }
  if (geq(min4, STRONG_FLOOR)) {
    return {
      key: "strong_steady",
      change,
      description: `Holding strong — all of the last ${last4.length} qtrs at ${STRONG_FLOOR}+: ${path}.${gapNote}`,
    };
  }
  if (leq(rng4, FLAT_RANGE_MAX) && scores[0] < WEAK_CEILING) {
    return {
      key: "weak_stuck",
      change,
      description: `Flat below ${WEAK_CEILING}: ${path}.${gapNote}`,
    };
  }
  if (leq(rng4, FLAT_RANGE_MAX)) {
    return {
      key: "steady",
      change,
      description: `Range-bound within ${FLAT_RANGE_MAX}: ${path}.${gapNote}`,
    };
  }
  return {
    key: "drifting",
    change,
    description: `Moving without a direction the ±${TRAJECTORY_NOISE} noise floor can't explain: ${path}.${gapNote}`,
  };
}

/** fy/qtr -> absolute quarter index; consecutive quarters differ by exactly 1
 * ACROSS fiscal-year boundaries too (Q1 FY27 follows Q4 FY26). */
export function quarterIndex(fy: number, qtr: number): number {
  return fy * 4 + (qtr - 1);
}
