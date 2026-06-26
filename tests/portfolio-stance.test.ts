import assert from "node:assert/strict";

import {
  classifyStance,
  compareStance,
  STANCES,
  STANCE_ORDER,
  stanceSortRank,
  type StanceInput,
  type StanceKey,
} from "../lib/portfolio-stance";

const stance = (input: Partial<StanceInput>): StanceKey =>
  classifyStance({
    latestQuarterScore: null,
    trendChange: null,
    growthScore: null,
    trajectoryKey: null,
    moatTier: null,
    ...input,
  }).key;

const expectStance = (name: string, input: Partial<StanceInput>, expected: StanceKey) => {
  const got = stance(input);
  assert.equal(got, expected, `${name}: expected ${expected}, got ${got}`);
};

// ---------------------------------------------------------------------------
// Screenshot rows (the live watchlist the feature was scoped against). These
// pin the reader's actual rows — if one flips after a threshold change, the
// synthesis regressed against the example we designed it on.
// ---------------------------------------------------------------------------

// Jeena Sikho — 8.5, Strong (+0.4), Forward 8.2, Narrow/Mid moat: aligned up.
expectStance(
  "JEENA aligned strong",
  { latestQuarterScore: 8.5, trendChange: 0.4, growthScore: 8.2, trajectoryKey: "strong_steady", moatTier: "mid" },
  "compounding",
);
// Sansera — 8.2, Climbing (+1.2), Forward 7.9, Narrow/Mid moat.
expectStance(
  "SANSERA climbing + solid outlook + moat",
  { latestQuarterScore: 8.2, trendChange: 1.2, growthScore: 7.9, trajectoryKey: "climbing", moatTier: "mid" },
  "compounding",
);
// NAVIN FLUORINE — 7.8, Strong (−0.2), Forward 8.5, Narrow/Mid moat. The −0.2 is
// BELOW the ±0.5 noise floor, so it is NOT a downturn: this stays compounding,
// it does not become cracking/outlook-led off a sub-noise wiggle.
expectStance(
  "NAVIN sub-noise wiggle is not softening",
  { latestQuarterScore: 7.8, trendChange: -0.2, growthScore: 8.5, trajectoryKey: "strong_steady", moatTier: "mid" },
  "compounding",
);
// Sai Life — 7.8, Strong (−0.1), Forward 8.1, NO moat tag (—): the durability leg
// is missing even though score + trend + outlook are fine.
expectStance(
  "SAILIFE no moat underwrite",
  { latestQuarterScore: 7.8, trendChange: -0.1, growthScore: 8.1, trajectoryKey: "strong_steady", moatTier: null },
  "thin_underwrite",
);

// ---------------------------------------------------------------------------
// Each stance, on a clean case.
// ---------------------------------------------------------------------------

// Improving — momentum up, but a leg missing (no moat / soft outlook / lower level).
expectStance(
  "improving: climbing, no moat",
  { latestQuarterScore: 7.5, trendChange: 0.9, growthScore: 7.8, trajectoryKey: "climbing", moatTier: null },
  "improving",
);
expectStance(
  "improving: recovering off a low",
  { latestQuarterScore: 6.4, trendChange: 0.7, growthScore: 7.6, trajectoryKey: "recovering", moatTier: "mid" },
  "improving",
);

// Outlook-led — a REAL downturn, but strong forward + moat (the opportunity divergence).
expectStance(
  "outlook_led: cracking but strong outlook + moat",
  { latestQuarterScore: 6.8, trendChange: -0.9, growthScore: 8.4, trajectoryKey: "cracking", moatTier: "strong" },
  "outlook_led",
);
// Down via a ≥0.5 fall vs the 4Q baseline even when the trajectory label isn't an event.
expectStance(
  "outlook_led: trend-down + strong outlook + moat",
  { latestQuarterScore: 7.0, trendChange: -0.7, growthScore: 8.0, trajectoryKey: "steady", moatTier: "mid" },
  "outlook_led",
);

// Cracking — a real downturn the outlook isn't offsetting.
expectStance(
  "cracking: worsening + soft outlook",
  { latestQuarterScore: 6.0, trendChange: -1.0, growthScore: 6.8, trajectoryKey: "worsening", moatTier: "mid" },
  "cracking",
);
// Strong outlook can't earn outlook-led without a moat read.
expectStance(
  "cracking: strong outlook but no moat",
  { latestQuarterScore: 7.0, trendChange: -0.8, growthScore: 8.2, trajectoryKey: "cracking", moatTier: null },
  "cracking",
);

// Near peak — top-band score, cooler forward, flattened momentum.
expectStance(
  "near_peak: top score, moderate outlook, flat",
  { latestQuarterScore: 8.3, trendChange: 0.1, growthScore: 7.2, trajectoryKey: "steady", moatTier: "mid" },
  "near_peak",
);
expectStance(
  "near_peak: strong-steady top, cool outlook",
  { latestQuarterScore: 8.1, trendChange: 0.2, growthScore: 7.0, trajectoryKey: "strong_steady", moatTier: "mid" },
  "near_peak",
);

// Steady — mid level, flat, moat present, outlook in line.
expectStance(
  "steady: nothing diverging",
  { latestQuarterScore: 7.2, trendChange: 0.0, growthScore: 7.3, trajectoryKey: "steady", moatTier: "mid" },
  "steady",
);

// Soft & stuck — low and not moving.
expectStance(
  "soft_stuck: low + soft outlook",
  { latestQuarterScore: 5.5, trendChange: 0.0, growthScore: 6.0, trajectoryKey: "weak_stuck", moatTier: null },
  "soft_stuck",
);
expectStance(
  "soft_stuck: low, no forward read",
  { latestQuarterScore: 6.0, trendChange: 0.0, growthScore: null, trajectoryKey: "steady", moatTier: null },
  "soft_stuck",
);

// No read — no anchor score, or fewer than 3 scored quarters.
expectStance("no_read: null score", { latestQuarterScore: null, trajectoryKey: "strong_steady" }, "no_read");
expectStance(
  "no_read: <3 quarters",
  { latestQuarterScore: 7.0, growthScore: 8.0, trajectoryKey: "no_read", moatTier: "mid" },
  "no_read",
);

// ---------------------------------------------------------------------------
// Vocabulary + sort invariants.
// ---------------------------------------------------------------------------

assert.equal(STANCE_ORDER.length, Object.keys(STANCES).length, "STANCE_ORDER must cover every stance");
for (const key of STANCE_ORDER) {
  assert.ok(STANCES[key], `STANCES missing ${key}`);
}
// Ranks are unique and match the order array.
const ranks = STANCE_ORDER.map((k) => STANCES[k].rank);
assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), "ranks must be ascending in STANCE_ORDER");
assert.equal(new Set(ranks).size, ranks.length, "ranks must be unique");

// no_read sorts last in BOTH directions (no signal, not worst signal).
assert.equal(stanceSortRank("no_read"), null, "no_read has no sort rank");
assert.equal(
  compareStance({ stanceKey: "cracking" }, { stanceKey: "no_read" }, "desc") < 0,
  true,
  "real stance sorts before no_read (desc)",
);
assert.equal(
  compareStance({ stanceKey: "cracking" }, { stanceKey: "no_read" }, "asc") < 0,
  true,
  "real stance sorts before no_read (asc) too",
);
// desc puts the more-aligned stance first.
assert.equal(
  compareStance({ stanceKey: "compounding" }, { stanceKey: "cracking" }, "desc") < 0,
  true,
  "compounding before cracking (desc)",
);
// within a stance, the stronger moat reads first (desc).
assert.equal(
  compareStance(
    { stanceKey: "compounding", moatRating: "wide_moat" },
    { stanceKey: "compounding", moatRating: "narrow_moat" },
    "desc",
  ) < 0,
  true,
  "wide moat before narrow within the same stance (desc)",
);

console.log("portfolio-stance: all assertions passed");
