import assert from "node:assert/strict";

import {
  BASELINE_BAND_FLOOR,
  buildScoreBaseline,
  scoredQuarters,
  scoreVsBaseline,
  type ScoreRow,
} from "../lib/quarter-expectation/baseline";

// Build a dense fy/qtr series ending at the quarter before `target`.
const series = (scores: number[], endFy = 2027, endQtr = 1): ScoreRow[] => {
  const rows: ScoreRow[] = [];
  let fy = endFy;
  let qtr = endQtr;
  for (let i = scores.length - 1; i >= 0; i -= 1) {
    rows.push({ fy, qtr, score: scores[i], id: i + 1 });
    qtr -= 1;
    if (qtr === 0) {
      qtr = 4;
      fy -= 1;
    }
  }
  return rows.reverse();
};

const Q2FY27 = { fy: 2027, qtr: 2 };

// Four prior quarters: baseline is their mean, band is the floor.
{
  const r = buildScoreBaseline(series([6.0, 7.0, 6.5, 7.5]), Q2FY27);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.baseline, 6.8);
    assert.equal(r.value.band, BASELINE_BAND_FLOOR);
    assert.equal(r.value.low, 6.3);
    assert.equal(r.value.high, 7.3);
    assert.equal(r.value.deviationCount, 0);
    assert.deepEqual(
      r.value.quarters.map((q) => q.label),
      ["Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27"],
    );
  }
}

// Fewer than four scored quarters: no baseline, the count is reported.
{
  const r = buildScoreBaseline(series([6.0, 7.0, 6.5]), Q2FY27);
  assert.ok(!r.ok);
  if (!r.ok) {
    assert.equal(r.miss.reason, "too_few");
    assert.equal(r.miss.scoredQuarters, 3);
    assert.equal(r.miss.latestLabel, "Q1 FY27");
  }
}

// Null scores are skipped, not counted as zero.
{
  const rows = series([6.0, 7.0, 6.5, 7.5]);
  rows[1].score = null;
  const r = buildScoreBaseline(rows, Q2FY27);
  assert.ok(!r.ok);
  if (!r.ok) assert.equal(r.miss.scoredQuarters, 3);
}

// Only quarters BEFORE the target count: the target's own row (landed) and
// anything after it are ignored, so the baseline is stable once the quarter lands.
{
  const rows = [...series([6.0, 7.0, 6.5, 7.5]), { fy: 2027, qtr: 2, score: 9.0, id: 99 }];
  const r = buildScoreBaseline(rows, Q2FY27);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.baseline, 6.8);
  const vs = scoreVsBaseline(rows, Q2FY27);
  assert.ok(vs);
  assert.equal(vs?.score, 9.0);
  assert.equal(vs?.delta, 2.2);
}

// A quarter with no score has no vs-baseline read.
assert.equal(scoreVsBaseline(series([6.0, 7.0, 6.5, 7.5]), Q2FY27), null);

// Duplicate rows on one quarter (an unreconciled unofficial + official pair):
// the higher id wins, the quarter counts once.
{
  const rows = series([6.0, 7.0, 6.5, 7.5]);
  rows.push({ fy: 2027, qtr: 1, score: 5.5, id: 50 }); // official re-score, newer id
  const q = scoredQuarters(rows);
  assert.equal(q.length, 4);
  assert.equal(q[q.length - 1].score, 5.5);
  const r = buildScoreBaseline(rows, Q2FY27);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.baseline, 6.3); // (6+7+6.5+5.5)/4 = 6.25 → 6.3
}

// String scores (PostgREST numeric) parse.
{
  const rows = series([6.0, 7.0, 6.5, 7.5]).map((r) => ({ ...r, score: String(r.score) }));
  const r = buildScoreBaseline(rows, Q2FY27);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.baseline, 6.8);
}

// A gap is tolerated (the last four SCORED quarters), but a trail whose latest
// quarter is more than two quarters old is stale.
{
  const rows = series([6.0, 7.0, 6.5, 7.5], 2026, 4); // ends Q4 FY26, target Q2 FY27 → 2 quarters gap
  const r = buildScoreBaseline(rows, Q2FY27);
  assert.ok(r.ok);
  const stale = buildScoreBaseline(series([6.0, 7.0, 6.5, 7.5], 2026, 3), Q2FY27); // 3 quarters gap
  assert.ok(!stale.ok);
  if (!stale.ok) {
    assert.equal(stale.miss.reason, "stale");
    assert.equal(stale.miss.latestLabel, "Q3 FY26");
  }
}

// The band widens to the company's own median deviation when history has it,
// and never drops below the floor.
{
  // 8 quarters: deviations measured at i=4..7 against each trailing 4Q mean.
  const scores = [5.0, 5.0, 5.0, 5.0, 7.0, 5.0, 5.0, 5.0];
  // i=4: |7-5|=2; i=5: |5-5.5|=0.5; i=6: |5-5.5|=0.5; i=7: |5-5.5|=0.5 → median 0.5
  const r = buildScoreBaseline(series(scores), Q2FY27);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.deviationCount, 4);
    assert.equal(r.value.band, 0.5);
  }
  const choppy = [5.0, 8.0, 5.0, 8.0, 5.0, 8.0, 5.0, 8.0];
  // trailing means are 6.5; every deviation 1.5 → band 1.5
  const c = buildScoreBaseline(series(choppy), Q2FY27);
  assert.ok(c.ok);
  if (c.ok) {
    assert.equal(c.value.band, 1.5);
    assert.equal(c.value.baseline, 6.5);
    assert.equal(c.value.low, 5.0);
    assert.equal(c.value.high, 8.0);
  }
}

// One deviation is not enough history to measure a swing: floor applies.
{
  const r = buildScoreBaseline(series([5.0, 5.0, 5.0, 5.0, 9.0]), Q2FY27);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.deviationCount, 1);
    assert.equal(r.value.band, BASELINE_BAND_FLOOR);
  }
}

// Band is clamped to the 1–10 scale.
{
  const r = buildScoreBaseline(series([9.8, 9.9, 9.9, 10.0]), Q2FY27);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.high, 10);
}

// Rows arrive newest-first from the panel; order does not matter.
{
  const rows = series([6.0, 7.0, 6.5, 7.5]).reverse();
  const r = buildScoreBaseline(rows, Q2FY27);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.baseline, 6.8);
}

console.log("quarter-expectation-baseline: ok");
