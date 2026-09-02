import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  BOARD_READS,
  BOARD_READ_ORDER,
  boardReadSortRank,
  classifyBoardRead,
  computeBoardComposite,
  MISSING_VALUATION_ANCHOR,
  PRICE_WEIGHT,
  QUALITY_WEIGHT,
  type BoardReadInput,
  type BoardReadKey,
} from "../lib/board-read";
import { bandForValuationScore, toValuationScale } from "../lib/valuation-band";

const read = (input: Partial<BoardReadInput>): BoardReadKey =>
  classifyBoardRead({
    concallScore: null,
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
    computeBoardComposite({ concallScore: 8.0, growthScore: 8.4, valuationScore: 6.2 })!.toFixed(2),
  ),
  7.96,
);

// Full-precision fixture generated from the live legs by the Python script's own
// code path (see the file's _comment). Deliberately NOT the numbers printed in
// the dry-run report — those are rounded to one decimal for display, and
// comparing against them passes a formula that is quietly wrong in the third
// place. Regenerate via the 3-step ritual in compute_composite_score.py's weight-change comment if the weights
// change on the Python side.
const crossImpl = JSON.parse(
  readFileSync(new URL("./fixtures/composite-score-cross-impl.json", import.meta.url), "utf8"),
) as {
  quality_weight: number;
  price_weight: number;
  missing_valuation_anchor: number;
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
assert.equal(
  crossImpl.missing_valuation_anchor,
  MISSING_VALUATION_ANCHOR,
  "MISSING_VALUATION_ANCHOR has drifted from compute_composite_score.py",
);
assert.ok(crossImpl.rows.length >= 10, "fixture should cover a spread of leg shapes");

let checkedMissingValuation = 0;
let checkedNoRead = 0;
for (const row of crossImpl.rows) {
  const got = computeBoardComposite({
    concallScore: row.qtr,
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

// TODOS #40 (2026-08-15): a missing valuation imputes the fair midpoint
// (MISSING_VALUATION_ANCHOR), never the company's own quality. The old
// quality-only fallback let a no-valuation company out-rank an identical one
// holding a merely-mediocre valuation (GRSE over JSLL, live in the fixture).
{
  const noValuation = computeBoardComposite({ concallScore: 7.5, growthScore: 7.5, valuationScore: null })!;
  const anchored = computeBoardComposite({ concallScore: 7.5, growthScore: 7.5, valuationScore: 5.0 })!;
  const withGoodValuation = computeBoardComposite({ concallScore: 7.5, growthScore: 7.5, valuationScore: 9.0 })!;
  const withMediocreValuation = computeBoardComposite({ concallScore: 7.5, growthScore: 7.5, valuationScore: 6.2 })!;
  const withBadValuation = computeBoardComposite({ concallScore: 7.5, growthScore: 7.5, valuationScore: 1.0 })!;
  assert.equal(noValuation, anchored, "no-valuation must equal an explicit fair-midpoint valuation");
  assert.ok(withGoodValuation > noValuation, "a cheap price should help");
  assert.ok(withBadValuation < noValuation, "a rich price should hurt");
  assert.ok(
    withMediocreValuation > noValuation,
    "the GRSE bug: a mediocre-but-above-fair valuation must BEAT having no valuation at all",
  );
  // Boundary: a valuation of 0 is a REAL (worst-possible) price, not a missing one —
  // pins `price != null` against a `price ||` refactor that would silently impute.
  const withZeroValuation = computeBoardComposite({ concallScore: 7.5, growthScore: 7.5, valuationScore: 0 })!;
  assert.equal(withZeroValuation, 0.88 * 7.5);
  assert.ok(withZeroValuation < noValuation, "a zero valuation must score BELOW a missing one");
}

// No quality side falls back to price alone (the anchor applies only to the
// valuation leg); quality-present rows are anchored, not quality-alone.
assert.equal(computeBoardComposite({ concallScore: null, growthScore: null, valuationScore: 6.0 }), 6.0);
assert.equal(
  computeBoardComposite({ concallScore: 7.0, growthScore: null, valuationScore: null }),
  0.88 * 7.0 + 0.12 * 5.0,
);
assert.equal(computeBoardComposite({ concallScore: null, growthScore: null, valuationScore: null }), null);

// Quality is weighted ~2:1 over price in INFLUENCE, which given the measured
// spreads means a lopsided nominal weight. Guard the direction: a full point of
// quality must outweigh a full point of price.
{
  const qualityUp = computeBoardComposite({ concallScore: 8, growthScore: 8, valuationScore: 5 })!;
  const priceUp = computeBoardComposite({ concallScore: 7, growthScore: 7, valuationScore: 6 })!;
  assert.ok(qualityUp > priceUp, "a point of quality must beat a point of price");
}

// ---------------------------------------------------------------------------
// The configuration word.
// ---------------------------------------------------------------------------

// No quarter print = no anchor, whatever else is present.
expectRead("no quarter score", { growthScore: 8.5, valuationScore: 7.0 }, "no_read");

// Divergences are checked first — they're what a plain average hides.
expectRead("soft print, strong outlook", { concallScore: 5.5, growthScore: 8.2, valuationScore: 3.0 }, "outlook_led");
expectRead("strong print, cooling outlook", { concallScore: 8.1, growthScore: 6.2, valuationScore: 7.0 }, "peaking");

// Quality holding on both legs: the question becomes what you pay.
expectRead("strong and cheap", { concallScore: 8.0, growthScore: 8.2, valuationScore: 7.0 }, "aligned_cheap");
expectRead("strong and rich", { concallScore: 8.0, growthScore: 8.2, valuationScore: 2.5 }, "priced_for_it");
// Split 2026-08-13: strong-on-both-legs at a fair price is its own read, not
// "Balanced" — the old gloss called this quality "middling".
expectRead("strong, fairly priced", { concallScore: 8.0, growthScore: 8.2, valuationScore: 5.0 }, "quality_fair");

// A missing price read is NOT a fair-value judgement. This is the distinction
// that put 18 companies under the wrong word before the split — every label
// that names a price must require one.
expectRead("strong, no price read", { concallScore: 8.0, growthScore: 8.2, valuationScore: null }, "unpriced");
expectRead("soft, no price read", { concallScore: 4.0, growthScore: 6.0, valuationScore: null }, "unpriced");

// Soft on both legs.
expectRead("soft and cheap", { concallScore: 4.0, growthScore: 6.0, valuationScore: 7.5 }, "cheap_weak");
expectRead("soft and rich", { concallScore: 4.0, growthScore: 6.0, valuationScore: 1.5 }, "weak_rich");

// The quality-divergence labels are price-agnostic statements, so they still
// stand without a valuation — only the price-naming branches gate on it.
expectRead("outlook-led, no price", { concallScore: 5.5, growthScore: 8.2, valuationScore: null }, "outlook_led");
expectRead("peaking, no price", { concallScore: 8.1, growthScore: 6.2, valuationScore: null }, "peaking");

// No label that names a price may be reachable without a valuation read. Since
// the 2026-08-13 residual reroute this includes "balanced" itself (its gloss
// asserts a fair price): with no valuation, the only reachable words are the
// price-agnostic divergences, "No price read", and "No read".
const PRICE_AGNOSTIC: BoardReadKey[] = ["outlook_led", "peaking", "unpriced", "no_read"];
for (const qtrScore of [3.0, 4.6, 5.5, 6.7, 7.2, 8.4]) {
  for (const growthScore of [null, 6.0, 6.8, 7.2, 7.8, 8.6]) {
    const key = read({ concallScore: qtrScore, growthScore, valuationScore: null });
    assert.ok(
      PRICE_AGNOSTIC.includes(key),
      `qtr ${qtrScore} / growth ${growthScore} with no price reached price-naming "${key}"`,
    );
  }
}

// The mildly-bullish band is neither strong nor soft — it must not trip either
// divergence, or a 6.7 quarter would read as "cracking" by another name.
expectRead("mid-band quarter", { concallScore: 6.7, growthScore: 7.2, valuationScore: 5.0 }, "balanced");

// The residual makes the same price check as every other branch (2026-08-13):
// a mid-quality row with an extreme price must not shrug it off as "Balanced",
// or the Read contradicts the Valuation cell beside it. "Mid quality" means a
// mildly_bullish quarter (6.7) — neither STRONG_QTR nor SOFT_QTR — so no
// divergence or strong/soft-both family fires and the row lands in the residual.
expectRead("mid quality, cheap", { concallScore: 6.7, growthScore: 7.8, valuationScore: 6.2 }, "cheap_forming");
expectRead("mid quality, rich", { concallScore: 6.7, growthScore: 7.1, valuationScore: 2.6 }, "priced_ahead");
expectRead("mid quality, no price", { concallScore: 6.7, growthScore: 7.2, valuationScore: null }, "unpriced");
// A strong print with a moderate outlook is the "Peaking" divergence, not the
// residual (2026-09-02): moderate growth (5.8–6.4) counts as the cooling side of
// a divergence (in SOFT_GROWTH, mirroring `neutral` in SOFT_QTR), so it fires
// before any price check — the rich price never reaches a label.
expectRead("strong print, moderate outlook", { concallScore: 7.5, growthScore: 6.2, valuationScore: 1.8 }, "peaking");

// The Read can never contradict the columns above it: a row labelled cheap must
// have a valuation in a cheap band.
for (const valuation of [6.0, 7.0, 7.9, 8.0, 9.5]) {
  const key = read({ concallScore: 8.0, growthScore: 8.2, valuationScore: valuation });
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
