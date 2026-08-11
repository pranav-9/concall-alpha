import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  BOARD_READS,
  BOARD_READ_ORDER,
  boardReadSortRank,
  classifyBoardRead,
  computeBoardComposite,
  PRICE_WEIGHT,
  QUALITY_WEIGHT,
  type BoardReadInput,
  type BoardReadKey,
} from "../lib/board-read";
import { bandForValuationScore, toValuationScale } from "../lib/valuation-band";

const read = (input: Partial<BoardReadInput>): BoardReadKey =>
  classifyBoardRead({
    quarterScore: null,
    growthScore: null,
    valuationScore: null,
    ...input,
  }).key;

const expectRead = (name: string, input: Partial<BoardReadInput>, expected: BoardReadKey) => {
  const got = read(input);
  assert.equal(got, expected, `${name}: expected ${expected}, got ${got}`);
};

// ---------------------------------------------------------------------------
// The composite. This is the load-bearing one: the same formula is implemented
// a second time in concallyser/scripts/compute_composite_score.py, which writes
// the stored coverage_rank the board's # column sorts by. If these two drift,
// the board silently ranks on one number while displaying another.
// ---------------------------------------------------------------------------

assert.equal(QUALITY_WEIGHT + PRICE_WEIGHT, 1, "weights must sum to 1");

// Hand-computed: quality = (8.0 + 8.4)/2 = 8.2; 0.88*8.2 + 0.12*6.2 = 7.96
assert.equal(
  Number(
    computeBoardComposite({ quarterScore: 8.0, growthScore: 8.4, valuationScore: 6.2 })!.toFixed(2),
  ),
  7.96,
);

// Full-precision fixture generated from the live legs by the Python script's own
// code path (see the file's _comment). Deliberately NOT the numbers printed in
// the dry-run report — those are rounded to one decimal for display, and
// comparing against them passes a formula that is quietly wrong in the third
// place. Regenerate with the snippet in the fixture's _comment if the weights
// change on the Python side.
const crossImpl = JSON.parse(
  readFileSync(new URL("./fixtures/composite-score-cross-impl.json", import.meta.url), "utf8"),
) as {
  quality_weight: number;
  price_weight: number;
  rows: Array<{
    code: string;
    qtr: number | null;
    growth: number | null;
    valuation: number | null;
    // null on the synthetic no-read vectors (all legs absent, D4).
    composite: number | null;
  }>;
};

assert.equal(
  crossImpl.quality_weight,
  QUALITY_WEIGHT,
  "QUALITY_WEIGHT has drifted from compute_composite_score.py",
);
assert.equal(
  crossImpl.price_weight,
  PRICE_WEIGHT,
  "PRICE_WEIGHT has drifted from compute_composite_score.py",
);
assert.ok(crossImpl.rows.length >= 10, "fixture should cover a spread of leg shapes");

let checkedMissingValuation = 0;
let checkedNoRead = 0;
for (const row of crossImpl.rows) {
  const got = computeBoardComposite({
    quarterScore: row.qtr,
    growthScore: row.growth,
    valuationScore: row.valuation,
  });
  const expected = row.composite;
  if (expected === null) {
    // Synthetic no-read vector (D4): no legs → null, NOT 0.0. Both impls agree.
    assert.equal(got, null, `${row.code}: all-null vector must return null, got ${got}`);
    checkedNoRead += 1;
    continue;
  }
  assert.ok(got != null, `${row.code}: composite should not be null`);
  // 1e-6 — this is the same arithmetic in two languages, not an approximation.
  assert.ok(
    Math.abs(got - expected) < 1e-6,
    `${row.code}: TS composite ${got} != Python ${expected} — the portal and ` +
      `compute_composite_score.py have drifted apart`,
  );
  if (row.valuation == null) checkedMissingValuation += 1;
}
assert.ok(
  checkedMissingValuation > 0,
  "fixture must include rows with no valuation — that path is the one that changed",
);
assert.ok(
  checkedNoRead > 0,
  "fixture must include the all-null no-read vector (D4) so both impls stay pinned to null",
);

// A missing leg is neutral, never punitive — the whole reason the half-weight
// penalty was dropped. A company with no valuation must not score below an
// otherwise identical company that has a good one.
{
  const noValuation = computeBoardComposite({ quarterScore: 7.5, growthScore: 7.5, valuationScore: null })!;
  const withGoodValuation = computeBoardComposite({ quarterScore: 7.5, growthScore: 7.5, valuationScore: 9.0 })!;
  const withBadValuation = computeBoardComposite({ quarterScore: 7.5, growthScore: 7.5, valuationScore: 1.0 })!;
  assert.equal(noValuation, 7.5, "no-price row scores on quality alone");
  assert.ok(withGoodValuation > noValuation, "a cheap price should help");
  assert.ok(withBadValuation < noValuation, "a rich price should hurt");
}

// Missing a whole side falls back to the side that exists.
assert.equal(computeBoardComposite({ quarterScore: null, growthScore: null, valuationScore: 6.0 }), 6.0);
assert.equal(computeBoardComposite({ quarterScore: 7.0, growthScore: null, valuationScore: null }), 7.0);
assert.equal(computeBoardComposite({ quarterScore: null, growthScore: null, valuationScore: null }), null);

// Quality is weighted ~2:1 over price in INFLUENCE, which given the measured
// spreads means a lopsided nominal weight. Guard the direction: a full point of
// quality must outweigh a full point of price.
{
  const qualityUp = computeBoardComposite({ quarterScore: 8, growthScore: 8, valuationScore: 5 })!;
  const priceUp = computeBoardComposite({ quarterScore: 7, growthScore: 7, valuationScore: 6 })!;
  assert.ok(qualityUp > priceUp, "a point of quality must beat a point of price");
}

// ---------------------------------------------------------------------------
// The configuration word.
// ---------------------------------------------------------------------------

// No quarter print = no anchor, whatever else is present.
expectRead("no quarter score", { growthScore: 8.5, valuationScore: 7.0 }, "no_read");

// Divergences are checked first — they're what a plain average hides.
expectRead("soft print, strong outlook", { quarterScore: 5.5, growthScore: 8.2, valuationScore: 3.0 }, "outlook_led");
expectRead("strong print, cooling outlook", { quarterScore: 8.1, growthScore: 6.2, valuationScore: 7.0 }, "peaking");

// Quality holding on both legs: the question becomes what you pay.
expectRead("strong and cheap", { quarterScore: 8.0, growthScore: 8.2, valuationScore: 7.0 }, "aligned_cheap");
expectRead("strong and rich", { quarterScore: 8.0, growthScore: 8.2, valuationScore: 2.5 }, "priced_for_it");
expectRead("strong, fairly priced", { quarterScore: 8.0, growthScore: 8.2, valuationScore: 5.0 }, "balanced");

// A missing price read is NOT a fair-value judgement. This is the distinction
// that put 18 companies under the wrong word before the split — every label
// that names a price must require one.
expectRead("strong, no price read", { quarterScore: 8.0, growthScore: 8.2, valuationScore: null }, "unpriced");
expectRead("soft, no price read", { quarterScore: 4.0, growthScore: 6.0, valuationScore: null }, "unpriced");

// Soft on both legs.
expectRead("soft and cheap", { quarterScore: 4.0, growthScore: 6.0, valuationScore: 7.5 }, "cheap_weak");
expectRead("soft and rich", { quarterScore: 4.0, growthScore: 6.0, valuationScore: 1.5 }, "weak_rich");

// The quality-divergence labels are price-agnostic statements, so they still
// stand without a valuation — only the price-naming branches gate on it.
expectRead("outlook-led, no price", { quarterScore: 5.5, growthScore: 8.2, valuationScore: null }, "outlook_led");
expectRead("peaking, no price", { quarterScore: 8.1, growthScore: 6.2, valuationScore: null }, "peaking");

// No label that names a price may be reachable without a valuation read.
// "balanced" is checked separately below — it's the one residual that may stand
// without a price, and only when a quality leg is genuinely mid-band.
const PRICE_NAMING: BoardReadKey[] = ["aligned_cheap", "priced_for_it", "cheap_weak", "weak_rich"];
for (const qtrScore of [3.0, 4.6, 5.5, 6.7, 7.2, 8.4]) {
  for (const growthScore of [null, 6.0, 6.8, 7.2, 7.8, 8.6]) {
    const key = read({ quarterScore: qtrScore, growthScore, valuationScore: null });
    if (key === "balanced") {
      // Only the mid-band residual may say "Balanced" without a price, and it's
      // a statement about quality sitting mid-scale rather than about price.
      const qtrIsMidBand = qtrScore >= 6.5 && qtrScore < 7.0;
      const growthIsMidBand = growthScore != null && growthScore >= 7.0 && growthScore < 7.5;
      assert.ok(
        qtrIsMidBand || growthIsMidBand,
        `qtr ${qtrScore} / growth ${growthScore} with no price must not read "Balanced"`,
      );
    } else {
      assert.ok(
        !PRICE_NAMING.includes(key),
        `qtr ${qtrScore} / growth ${growthScore} with no price reached price-naming "${key}"`,
      );
    }
  }
}

// The mildly-bullish band is neither strong nor soft — it must not trip either
// divergence, or a 6.7 quarter would read as "cracking" by another name.
expectRead("mid-band quarter", { quarterScore: 6.7, growthScore: 7.2, valuationScore: 5.0 }, "balanced");

// The Read can never contradict the columns above it: a row labelled cheap must
// have a valuation in a cheap band.
for (const valuation of [6.0, 7.0, 7.9, 8.0, 9.5]) {
  const key = read({ quarterScore: 8.0, growthScore: 8.2, valuationScore: valuation });
  const band = bandForValuationScore(valuation);
  assert.equal(key, "aligned_cheap", `valuation ${valuation} (${band}) should read aligned_cheap`);
}

// ---------------------------------------------------------------------------
// Scale + ordering plumbing.
// ---------------------------------------------------------------------------

// The stored 0-100 integer must land on the same 0-10 scale as its siblings,
// and its band must match the verdict the pipeline assigns at that score.
assert.equal(toValuationScale(64), 6.4);
assert.equal(toValuationScale(null), null);
assert.equal(bandForValuationScore(toValuationScale(79)!), "undervalued");
assert.equal(bandForValuationScore(toValuationScale(60)!), "undervalued");
assert.equal(bandForValuationScore(toValuationScale(58)!), "fair");
assert.equal(bandForValuationScore(toValuationScale(38)!), "expensive");
assert.equal(bandForValuationScore(toValuationScale(19)!), "richly_priced");

// no_read is "no signal", not "worst signal" — it pins last in both directions.
assert.equal(boardReadSortRank("no_read"), null);
assert.equal(boardReadSortRank(null), null);
assert.equal(boardReadSortRank("aligned_cheap"), 0);

// Every key is in the legend order exactly once, and ranks are strictly ordered.
assert.equal(BOARD_READ_ORDER.length, Object.keys(BOARD_READS).length);
assert.equal(new Set(BOARD_READ_ORDER).size, BOARD_READ_ORDER.length);
BOARD_READ_ORDER.forEach((key, i) => {
  assert.equal(BOARD_READS[key].rank, i, `${key} rank should match its legend position`);
});

console.log("board-read: all assertions passed");
