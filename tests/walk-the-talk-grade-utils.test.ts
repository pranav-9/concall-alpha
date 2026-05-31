import assert from "node:assert/strict";

import {
  computeTier,
  countsForGrade,
  isOnTime,
  MIN_COMMITMENTS_FOR_GRADE,
} from "../lib/walk-the-talk/grade-utils";

// Lightweight runner matching tests/recent-score-updates.test.ts.
const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

// ===========================================================================
// isOnTime — single-status rule (no slippage with Phase 6 source)
// ===========================================================================

test("isOnTime — only 'met' is on-time", () => {
  assert.equal(isOnTime("met"), true);
  assert.equal(isOnTime("missed"), false);
  assert.equal(isOnTime("delayed"), false);
  assert.equal(isOnTime("dropped"), false);
  assert.equal(isOnTime("revised"), false);
  assert.equal(isOnTime("active"), false);
  assert.equal(isOnTime("not_yet_clear"), false);
  assert.equal(isOnTime("unknown"), false);
});

// ===========================================================================
// countsForGrade
// ===========================================================================

test("countsForGrade — decided outcomes count: met, missed, delayed, dropped, revised", () => {
  assert.equal(countsForGrade("met"), true);
  assert.equal(countsForGrade("missed"), true);
  assert.equal(countsForGrade("delayed"), true);
  assert.equal(countsForGrade("dropped"), true);
  assert.equal(countsForGrade("revised"), true);
});

test("countsForGrade — undecided/unknown don't count: active, not_yet_clear, unknown", () => {
  assert.equal(countsForGrade("active"), false);
  assert.equal(countsForGrade("not_yet_clear"), false);
  assert.equal(countsForGrade("unknown"), false);
});

// ===========================================================================
// computeTier — boundary conditions
// ===========================================================================

test("computeTier — 90% boundary is reliable (inclusive)", () => {
  assert.equal(computeTier(9, 10), "reliable");
  assert.equal(computeTier(18, 20), "reliable");
  assert.equal(computeTier(100, 100), "reliable");
});

test("computeTier — 75-89% is mixed", () => {
  assert.equal(computeTier(75, 100), "mixed");
  assert.equal(computeTier(89, 100), "mixed");
});

test("computeTier — 50-74% is erratic", () => {
  assert.equal(computeTier(50, 100), "erratic");
  assert.equal(computeTier(74, 100), "erratic");
});

test("computeTier — <50% is weak", () => {
  assert.equal(computeTier(49, 100), "weak");
  assert.equal(computeTier(0, 100), "weak");
});

test("computeTier — total < MIN_COMMITMENTS_FOR_GRADE is not_enough_data", () => {
  assert.equal(MIN_COMMITMENTS_FOR_GRADE, 3);
  assert.equal(computeTier(0, 0), "not_enough_data");
  assert.equal(computeTier(1, 1), "not_enough_data");
  assert.equal(computeTier(2, 2), "not_enough_data");
});

test("computeTier — exactly MIN_COMMITMENTS_FOR_GRADE renders a tier", () => {
  assert.equal(computeTier(3, 3), "reliable"); // 100%
  assert.equal(computeTier(1, 3), "erratic"); // 33%
  assert.equal(computeTier(0, 3), "weak"); // 0%
});

console.log("\nAll grade-utils tests passed.");
