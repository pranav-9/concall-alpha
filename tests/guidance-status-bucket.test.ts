import assert from "node:assert/strict";

import {
  STATUS_TO_BUCKET,
  bucketOf,
} from "../app/company/components/guidance-history-section";
import type { NormalizedGuidanceStatusKey } from "../lib/guidance-tracking/types";

// The 5-bucket delivery language collapses the 8-key status vocabulary.
// Pin every mapping so a schema-side status addition can't silently fall
// through to the wrong bucket.
const EXPECTED: Record<NormalizedGuidanceStatusKey, string> = {
  met: "delivered",
  active: "on_track",
  revised: "revised",
  delayed: "revised",
  missed: "missed",
  dropped: "missed",
  not_yet_clear: "too_early",
  unknown: "too_early",
};

for (const [key, bucket] of Object.entries(EXPECTED)) {
  assert.equal(
    STATUS_TO_BUCKET[key as NormalizedGuidanceStatusKey],
    bucket,
    `status "${key}" should map to bucket "${bucket}"`,
  );
}

// Every status key maps somewhere — no undefined holes.
assert.equal(Object.keys(STATUS_TO_BUCKET).length, Object.keys(EXPECTED).length);

// bucketOf falls back to too_early for a status key outside the map.
assert.equal(
  bucketOf({ statusKey: "someday_new_status" as NormalizedGuidanceStatusKey }),
  "too_early",
);

console.log("guidance-status-bucket: all assertions passed");
