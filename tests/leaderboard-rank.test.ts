import assert from "node:assert/strict";

import { computeBoardRanks, COVERAGE_BOARD_SIZE } from "../lib/leaderboard-rank";

// ---------------------------------------------------------------------------
// computeBoardRanks: the ONE ranking both the live board and the snapshot writer
// use. Ranks the whole universe purely by Read (desc), tie-broken by CODE. NOT
// tiered by any coverage flag — greying is a separate, live decision downstream.
// ---------------------------------------------------------------------------

const r = (companyCode: string, readScore: number | null) => ({
  companyCode,
  companyName: companyCode,
  readScore,
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

// Ties break on CODE by byte compare (identical on Node and in the browser, so
// the Δ column never shows phantom ±1 movement from locale differences).
{
  const ranks = computeBoardRanks([r("ZED", 7.0), r("ABLE", 7.0)]);
  assert.equal(ranks.get("ABLE"), 1, "equal Read → earlier CODE first");
  assert.equal(ranks.get("ZED"), 2, "equal Read → later CODE second");
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
