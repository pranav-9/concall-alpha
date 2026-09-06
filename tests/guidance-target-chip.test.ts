import assert from "node:assert/strict";

import {
  QUALITATIVE_TARGET_CHIP_MAX,
  qualitativeTargetChip,
} from "../lib/guidance-tracking/target-chip";

assert.equal(QUALITATIVE_TARGET_CHIP_MAX, 24);

// Short qualitative targets render verbatim.
assert.equal(qualitativeTargetChip("double-digit"), "double-digit");
assert.equal(qualitativeTargetChip("mid-teens"), "mid-teens");

// Exactly at the cap still renders in full (the old code sliced anything > 20).
const atCap = "a".repeat(QUALITATIVE_TARGET_CHIP_MAX);
assert.equal(qualitativeTargetChip(atCap), atCap);

// Past the cap the chip is dropped — never a sliced "growth is already …" stub.
const long = "growth is already preordained by the pipeline";
assert.equal(qualitativeTargetChip(long), null);
assert.equal(qualitativeTargetChip("a".repeat(QUALITATIVE_TARGET_CHIP_MAX + 1)), null);

// Whitespace is trimmed before the length check; blank → null.
assert.equal(qualitativeTargetChip("  mid-teens  "), "mid-teens");
assert.equal(qualitativeTargetChip("   "), null);

console.log("guidance-target-chip: all assertions passed");
