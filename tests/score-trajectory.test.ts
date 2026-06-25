import assert from "node:assert/strict";

import {
  classifyTrajectory,
  quarterIndex,
  TRAJECTORIES,
  TRAJECTORY_ORDER,
  type TrajectoryKey,
} from "../lib/score-trajectory";

const label = (scores: number[], hasGapInWindow = false): TrajectoryKey =>
  classifyTrajectory(scores, { hasGapInWindow }).key;

const expectLabel = (name: string, scores: number[], expected: TrajectoryKey) => {
  const got = label(scores);
  assert.equal(got, expected, `${name}: expected ${expected}, got ${got} for [${scores.join(", ")}]`);
};

// ---------------------------------------------------------------------------
// Real-path fixtures (live data, 2026-06-12 analysis). Newest-first, like the
// production caller. Each pin below encodes a rule-order decision from the
// eng review — if one fails after a threshold change, the taxonomy regressed.
// ---------------------------------------------------------------------------

// Climbing — genuine staircases.
expectLabel("SANSERA steep climb is NOT chop", [8.2, 7.7, 7.1, 5.0, 6.5, 7.1, 7.8, 5.8], "climbing");
expectLabel("GPIL grind up", [7.1, 7.1, 6.4, 6.0, 6.0, 7.2], "climbing");
expectLabel("ATHERENERG", [8.2, 6.7, 6.7, 6.1], "climbing");
expectLabel("KDDL recovery climb", [7.9, 6.1, 4.8, 5.1], "climbing");

// The NEULANDLAB pitfall: ±2.7 alternation must never read as climbing or
// inflecting — the unstable base disqualifies an event read; alternation = chop.
expectLabel("NEULANDLAB alternator", [7.8, 5.1, 7.8, 4.9, 5.5, 5.5], "choppy");

// The SAILIFE pitfall: a climb that finished 4 quarters ago is not a climb.
expectLabel("SAILIFE stale climb", [7.8, 7.9, 7.9, 7.9, 7.3, 6.7], "strong_steady");

// The PRIVISCL pitfall: wobble that never leaves the strong band is strength,
// not chop.
expectLabel("PRIVISCL strong wobble", [7.3, 7.2, 7.8, 7.2, 8.2, 7.1], "strong_steady");
expectLabel("TDPOWERSYS", [8.0, 7.8, 8.1, 7.3, 8.3, 8.7], "strong_steady");
expectLabel("NAVINFLUOR (old label said declining)", [7.8, 7.9, 8.2, 8.2, 8.2, 7.8], "strong_steady");

// Cracking — fresh break off a steady base; beats strong_steady (TIMETECHNO
// was ≥7 across the window and still cracked).
expectLabel("TIMETECHNO", [7.1, 8.2, 7.7, 7.2, 7.2, 7.3], "cracking");
expectLabel("CARTRADE", [6.3, 7.9, 7.6, 7.8], "cracking");

// Worsening — sustained slides.
expectLabel("GRAVITA", [5.2, 6.1, 6.4, 7.2, 7.3, 8.0], "worsening");
expectLabel("POKARNA", [3.6, 4.8, 7.0, 7.0], "worsening");
expectLabel("AVANTIFEED", [5.4, 6.3, 6.4, 6.0, 7.2, 6.0], "worsening");

// Inflecting up — fresh break upward off a flat base.
expectLabel("STLTECH", [7.0, 5.9, 6.5, 6.7], "inflecting_up");

// Calm reads.
expectLabel("NH mid-band range", [5.7, 6.0, 6.3, 6.1, 6.5, 6.5], "steady");
// Latest move is exactly +0.6 — the event threshold. Pre-epsilon float error
// hid this below 0.6; the rule-faithful read is an inflection.
expectLabel("ENTERO exact-threshold inflection", [7.3, 6.7, 7.1, 7.3], "inflecting_up");
expectLabel("BETA alternation is chop, not crack", [5.5, 6.8, 6.3, 7.7, 6.5, 7.1], "choppy");
expectLabel("NUVAMA", [7.2, 6.9, 5.5, 6.7, 7.2, 7.1], "drifting");

// ---------------------------------------------------------------------------
// Recovering — an event-sized up-move in the LATEST quarter off a recent low,
// while the window is still net-down. A V-turn out of a decline. Sits above
// choppy: a crash-then-bounce is two sign-flips that the chop rule would
// otherwise read as instability. The net-down guard (recentGain ≤ -0.8) is what
// separates it from a chaotic zigzag, whose window is net-UP.
// AARTIPHARM: reversed from "choppy" 2026-06-25 — the live read was an early
// recovery, not chop (the recovery is the salient recent signal, not the
// older middle wobble).
// ---------------------------------------------------------------------------
expectLabel("AARTIPHARM V-recovery: crash then turn up", [5.3, 4.6, 4.6, 7.2, 6.7, 7.0], "recovering");
expectLabel("recovering: latest +0.6 off a low, window net-down", [5.4, 4.8, 4.8, 6.4], "recovering");
// Boundary: latest +0.6 but the window is net-UP — a gentle staircase, so it
// reads climbing, NOT recovering. The net-down guard keeps these apart.
expectLabel("net-up climb is not a 'recovery'", [6.4, 5.8, 5.8, 5.6], "climbing");
// The NEULANDLAB zigzag (pinned choppy above) is the other side of the guard:
// big latest up-move but a net-UP window, so it stays choppy, not recovering.

// ---------------------------------------------------------------------------
// No-read floor (D5): < 3 scored quarters.
// ---------------------------------------------------------------------------
assert.equal(label([]), "no_read");
assert.equal(label([7.0]), "no_read");
assert.equal(label([7.0, 5.0]), "no_read");
assert.notEqual(label([7.0, 6.5, 6.2]), "no_read", "n=3 must classify");

// Non-finite scores degrade to fewer points, never NaN math.
assert.equal(label([7.0, Number.NaN, 6.5] as number[]), "no_read");

// ---------------------------------------------------------------------------
// Boundary pins — exact threshold values stay on their decided side.
// ---------------------------------------------------------------------------
expectLabel("gain exactly 0.8 climbs", [7.0, 6.6, 6.4, 6.2], "climbing");
expectLabel("gain 0.7 does not climb", [6.9, 6.6, 6.4, 6.2], "drifting");
expectLabel("latest +0.6 off flat base inflects", [6.8, 6.2, 6.2, 6.2], "inflecting_up");
expectLabel("latest +0.5 off flat base is noise", [6.7, 6.2, 6.2, 6.2], "steady");
expectLabel("latest -0.6 off flat base cracks", [6.2, 6.8, 6.8, 6.8], "cracking");
expectLabel("dip of exactly -0.15 stays a climb", [7.2, 7.35, 6.8, 6.2], "climbing");
expectLabel("min4 exactly 7.0 is strong", [7.3, 7.0, 7.2, 7.4], "strong_steady");
expectLabel("flat below 5.5 is stuck", [4.8, 5.0, 5.2, 4.9], "weak_stuck");

// ---------------------------------------------------------------------------
// Gap guard (D2): gaps in the window withhold event labels but allow calm ones.
// ---------------------------------------------------------------------------
assert.equal(label([7.0, 6.6, 6.4, 6.2], true), "drifting", "gap blocks climbing");
assert.equal(label([6.8, 6.2, 6.2, 6.2], true), "steady", "gap blocks inflecting up");
assert.equal(label([6.2, 6.8, 6.8, 6.8], true), "steady", "gap blocks cracking");
assert.equal(label([7.3, 7.0, 7.2, 7.4], true), "strong_steady", "gap allows strong & steady");
assert.equal(label([5.2, 6.1, 6.4, 7.2], true), "worsening", "gap allows worsening (D2 as written)");

// ---------------------------------------------------------------------------
// Change semantics (D6): latest − 4Q avg INCLUDING latest, so the leaderboard
// row reconciles (Latest − 4Q Avg = Trend).
// ---------------------------------------------------------------------------
{
  const r = classifyTrajectory([8.0, 7.0, 7.0, 7.0], { hasGapInWindow: false });
  assert.ok(Math.abs(r.change - (8.0 - 7.25)) < 1e-9, `change should be dampened delta, got ${r.change}`);
  assert.match(r.description, /7\.0 → 7\.0 → 7\.0 → 8\.0/, "description carries oldest→newest path");
}

// ---------------------------------------------------------------------------
// quarterIndex — FY rollover is consecutive (the outside-voice finding 7 /
// CRITICAL test). Q1 FY27 follows Q4 FY26; same-FY quarters step by 1.
// ---------------------------------------------------------------------------
assert.equal(quarterIndex(2027, 1) - quarterIndex(2026, 4), 1, "FY rollover must be contiguous");
assert.equal(quarterIndex(2026, 3) - quarterIndex(2026, 2), 1);
assert.equal(quarterIndex(2026, 4) - quarterIndex(2026, 1), 3);
assert.ok(quarterIndex(2027, 1) - quarterIndex(2026, 3) > 1, "skipped quarter must read as a gap");

// ---------------------------------------------------------------------------
// Taxonomy integrity: order matches ranks; cell labels stay one word.
// ---------------------------------------------------------------------------
TRAJECTORY_ORDER.forEach((key, i) => {
  assert.equal(TRAJECTORIES[key].rank, i, `${key} rank must match TRAJECTORY_ORDER position`);
});
for (const def of Object.values(TRAJECTORIES)) {
  assert.ok(!def.cellLabel.includes(" "), `cellLabel "${def.cellLabel}" must be a single word`);
}

// ---------------------------------------------------------------------------
// CRITICAL regression: every live-shaped history classifies without throwing.
// Shapes drawn from the depth distribution observed in production (1, 2-3,
// 4-7, 8-15, 16+ quarters; values spanning the 3.2–8.8 observed score range).
// ---------------------------------------------------------------------------
const liveShapes: number[][] = [
  [3.2],
  [6.4],
  [8.8, 8.8],
  [7.0, 6.8, 6.5],
  [4.4, 4.4, 4.3, 3.2],
  Array.from({ length: 12 }, (_, i) => 5 + ((i * 7) % 40) / 10,),
  Array.from({ length: 24 }, (_, i) => 3.2 + ((i * 13) % 56) / 10,),
];
for (const shape of liveShapes) {
  for (const gap of [false, true]) {
    const r = classifyTrajectory(shape, { hasGapInWindow: gap });
    assert.ok(r.key in TRAJECTORIES, "must return a known key");
    assert.ok(Number.isFinite(r.change), "change must be finite");
    assert.ok(r.description.length > 0, "description must be non-empty");
  }
}

console.log("score-trajectory: all assertions passed");
