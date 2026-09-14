import assert from "node:assert/strict";
import test from "node:test";

import { buildGuidanceRecord, guidanceRecordCaption } from "../lib/desk-featured/guidance-record";
import type { GuidanceVerdict, ResolvedOutcome } from "../lib/guidance-tracking/verdict";

// Only the four fields the record reads; `live` just needs a length.
function verdict(bars: ResolvedOutcome[], liveCount: number, metCount: number, countedCount: number) {
  return {
    bars,
    live: Array.from({ length: liveCount }) as GuidanceVerdict["live"],
    metCount,
    countedCount,
  };
}

test("marks group kept, slipped, missed, then live — whatever order the bars came in", () => {
  const record = buildGuidanceRecord(verdict(["missed", "met", "delayed", "met", "dropped", "revised"], 2, 2, 6));
  assert.deepEqual(record?.marks, ["met", "met", "slipped", "slipped", "missed", "missed", "live", "live"]);
});

test("counts mirror the verdict's track record, not the number of marks", () => {
  const record = buildGuidanceRecord(verdict(["met", "met", "missed"], 4, 2, 3));
  assert.equal(record?.metCount, 2);
  assert.equal(record?.gradedCount, 3);
  assert.equal(record?.liveCount, 4);
  assert.equal(guidanceRecordCaption(record!), "2 of 3 met · 4 live");
});

test("an unclear outcome is neither drawn nor counted", () => {
  const record = buildGuidanceRecord(verdict(["met", "unclear"], 0, 1, 1));
  assert.deepEqual(record?.marks, ["met"]);
  assert.equal(guidanceRecordCaption(record!), "1 of 1 met");
});

test("a company with only live commitments still gets a record", () => {
  const record = buildGuidanceRecord(verdict([], 3, 0, 0));
  assert.deepEqual(record?.marks, ["live", "live", "live"]);
  assert.equal(guidanceRecordCaption(record!), "Nothing resolved yet · 3 live");
});

test("nothing tracked means no record at all, not an empty row", () => {
  assert.equal(buildGuidanceRecord(verdict([], 0, 0, 0)), null);
  assert.equal(buildGuidanceRecord(verdict(["unclear"], 0, 0, 0)), null);
});
