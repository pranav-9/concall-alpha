import assert from "node:assert/strict";

import { buildQuarterExpectationView, type QuarterExpectationData } from "../lib/quarter-expectation/build";
import type { ScoreRow } from "../lib/quarter-expectation/baseline";

const Q2 = { fy: 2027, qtr: 2, label: "Q2 FY27" };
const Q3 = { fy: 2027, qtr: 3, label: "Q3 FY27" };
const TODAY = "2026-10-07";

const rows = (scores: number[], endFy = 2027, endQtr = 1): ScoreRow[] => {
  const out: ScoreRow[] = [];
  let fy = endFy;
  let qtr = endQtr;
  for (let i = scores.length - 1; i >= 0; i -= 1) {
    out.push({ fy, qtr, score: scores[i], id: i + 1 });
    qtr -= 1;
    if (qtr === 0) {
      qtr = 4;
      fy -= 1;
    }
  }
  return out;
};

const data = (overrides: Partial<QuarterExpectationData> = {}): QuarterExpectationData => ({
  target: Q2,
  calendar: null,
  earnings: null,
  updates: [],
  ...overrides,
});
const calendar = (resultsDate: string | null) => ({
  resultsDate,
  callDate: null,
  callTime: null,
  callUrl: null,
  callUnreadable: false,
});

// Upcoming: a future results date, four prior scores → baseline, not empty.
{
  const v = buildQuarterExpectationView(data({ calendar: calendar("2026-10-23") }), rows([6, 7, 6.5, 7.5]), TODAY);
  assert.equal(v.state, "upcoming");
  assert.equal(v.daysToResults, 16);
  assert.ok(v.baseline.ok);
  assert.equal(v.landedScore, null);
  assert.equal(v.unscoredPriorLabel, null);
  assert.equal(v.empty, false);
}

// Results day itself is still "upcoming" (Today); the day after is pending.
{
  assert.equal(buildQuarterExpectationView(data({ calendar: calendar(TODAY) }), rows([6, 7, 6.5, 7.5]), TODAY).state, "upcoming");
  const v = buildQuarterExpectationView(data({ calendar: calendar("2026-10-06") }), rows([6, 7, 6.5, 7.5]), TODAY);
  assert.equal(v.state, "pending");
  assert.equal(v.daysToResults, -1);
}

// Landed: the target has a score; the baseline still reads the four BEFORE it.
{
  const v = buildQuarterExpectationView(
    data({ calendar: calendar("2026-10-06") }),
    [...rows([6, 7, 6.5, 7.5]), { fy: 2027, qtr: 2, score: 7.4, id: 9 }],
    TODAY,
  );
  assert.equal(v.state, "landed");
  assert.equal(v.landedScore, 7.4);
  assert.ok(v.baseline.ok && v.baseline.value.baseline === 6.8);
  assert.equal(v.empty, false);
}

// Jan 1 rollover: target is Q3, Q2 was never scored → the gap is named and the
// baseline (last four scored: Q2 FY26…Q1 FY27) is still usable.
{
  const v = buildQuarterExpectationView(data({ target: Q3 }), rows([6, 7, 6.5, 7.5]), "2027-01-05");
  assert.equal(v.state, "upcoming");
  assert.equal(v.unscoredPriorLabel, "Q2 FY27");
  assert.ok(v.baseline.ok);
}

// A brand-new company with no scores: no gap to name, no baseline, and with
// nothing else to show the card collapses to its one-line form.
{
  const v = buildQuarterExpectationView(data(), [], TODAY);
  assert.equal(v.unscoredPriorLabel, null);
  assert.ok(!v.baseline.ok);
  assert.equal(v.empty, true);
  // A date alone is enough to render the box.
  assert.equal(buildQuarterExpectationView(data({ calendar: calendar("2026-10-23") }), [], TODAY).empty, false);
  // So is a single listen-for item.
  assert.equal(
    buildQuarterExpectationView(
      data({ updates: [{ kind: "variable", heading: "x", detail: null, sectionId: "key-variables", tone: "neutral" }] }),
      [],
      TODAY,
    ).empty,
    false,
  );
}

console.log("quarter-expectation-build: ok");
