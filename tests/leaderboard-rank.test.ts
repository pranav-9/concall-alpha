import assert from "node:assert/strict";

import { computeBoardRanks, COVERAGE_BOARD_SIZE } from "../lib/leaderboard-rank";

// ---------------------------------------------------------------------------
// computeBoardRanks: the ONE ranking both the live board and the snapshot writer
// use. Ranks the whole universe by Read (desc), tie-broken by growth score (desc)
// then CODE. NOT tiered by any coverage flag — greying is a separate, live
// decision downstream.
// ---------------------------------------------------------------------------

const r = (companyCode: string, readScore: number | null, growthScore: number | null = null) => ({
  companyCode,
  companyName: companyCode,
  readScore,
  growthScore,
});

// Pure Read-descending ordering.
{
  const ranks = computeBoardRanks([r("A", 6.7), r("B", 8.1), r("C", 7.4)]);
  assert.equal(ranks.get("B"), 1, "highest Read → rank 1");
  assert.equal(ranks.get("C"), 2, "middle Read → rank 2");
  assert.equal(ranks.get("A"), 3, "lowest Read → rank 3");
}

// The regression this replaced: a high-Read row must rank by its Read, never be
// pushed below a lower-Read row by a stored cut. (INOX-style: 7.4 outranks 6.7.)
{
  const ranks = computeBoardRanks([r("KEPT", 6.7), r("HIGH", 7.4)]);
  assert.equal(ranks.get("HIGH"), 1, "7.4 outranks 6.7 regardless of any cut");
  assert.equal(ranks.get("KEPT"), 2, "the lower Read follows");
}

// Equal Read → the higher growth score ranks first (the secondary sort). CODE
// order here would put ABLE first, so this proves growth wins over CODE.
{
  const ranks = computeBoardRanks([r("ABLE", 7.0, 5.0), r("ZED", 7.0, 8.0)]);
  assert.equal(ranks.get("ZED"), 1, "equal Read → higher growth first");
  assert.equal(ranks.get("ABLE"), 2, "equal Read → lower growth second");
}

// Reads compare at DISPLAY precision: 7.24 and 7.16 both render "7.2", so they
// are a tie and growth decides — even though 7.24 > 7.16 at full precision. This
// is what makes the growth tie-break actually reachable on real float Reads.
{
  const ranks = computeBoardRanks([r("HI", 7.24, 3.0), r("LO", 7.16, 9.0)]);
  assert.equal(ranks.get("LO"), 1, "same displayed Read → higher growth first");
  assert.equal(ranks.get("HI"), 2, "full-precision 7.24 does NOT beat 7.16 here");
}

// But a real display-level gap still wins: 7.25 rounds to 7.3, 7.16 to 7.2.
{
  const ranks = computeBoardRanks([r("LOWGROW", 7.25, 1.0), r("HIGROW", 7.16, 9.0)]);
  assert.equal(ranks.get("LOWGROW"), 1, "higher displayed Read wins despite lower growth");
  assert.equal(ranks.get("HIGROW"), 2, "lower displayed Read follows");
}

// Equal Read, a row missing a growth score sorts after one that has it.
{
  const ranks = computeBoardRanks([r("NOGROWTH", 7.0, null), r("HAS", 7.0, 3.0)]);
  assert.equal(ranks.get("HAS"), 1, "a growth score beats a missing one");
  assert.equal(ranks.get("NOGROWTH"), 2, "missing growth sorts last");
}

// Equal Read AND equal growth → final tie-break on CODE by byte compare
// (identical on Node and in the browser, so the Δ column never shows phantom ±1
// movement from locale differences).
{
  const ranks = computeBoardRanks([r("ZED", 7.0, 4.0), r("ABLE", 7.0, 4.0)]);
  assert.equal(ranks.get("ABLE"), 1, "equal Read+growth → earlier CODE first");
  assert.equal(ranks.get("ZED"), 2, "equal Read+growth → later CODE second");
}

// A row with no Read holds no position (unranked, absent from the map) — it is
// not ranked dead-last on a phantom low score.
{
  const ranks = computeBoardRanks([r("A", 7.0), r("NOREAD", null), r("B", 6.0)]);
  assert.equal(ranks.get("A"), 1, "scored rows rank normally");
  assert.equal(ranks.get("B"), 2, "and continue past the unscored one");
  assert.equal(ranks.has("NOREAD"), false, "null Read → no rank");
}

// The coverage line the board greys past is the handpicked-100 size.
assert.equal(COVERAGE_BOARD_SIZE, 100, "board coverage size is 100");

console.log("leaderboard-rank: all assertions passed");
