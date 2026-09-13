import assert from "node:assert/strict";

import {
  COMPANY_DWELL_MS,
  EMPTY_NUDGE_STATE,
  NUDGE_SNOOZE_MS,
  isCompanyPath,
  isNudgeEligiblePath,
  isNudgeSuppressed,
  nudgeDelayFor,
  parseNudgeState,
  secondPageRuleFires,
} from "../lib/community-nudge";

// ── parseNudgeState: anything malformed is "never seen" ─────────────────────
assert.deepEqual(parseNudgeState(null), EMPTY_NUDGE_STATE);
assert.deepEqual(parseNudgeState(""), EMPTY_NUDGE_STATE);
assert.deepEqual(parseNudgeState("not json"), EMPTY_NUDGE_STATE);
assert.deepEqual(parseNudgeState("null"), EMPTY_NUDGE_STATE);
assert.deepEqual(parseNudgeState("[1,2]"), { dismissedAt: null, clicked: false });
assert.deepEqual(parseNudgeState('{"dismissedAt":"yesterday","clicked":"yes"}'), {
  dismissedAt: null,
  clicked: false,
});
assert.deepEqual(parseNudgeState('{"dismissedAt":1700000000000,"clicked":true}'), {
  dismissedAt: 1_700_000_000_000,
  clicked: true,
});

// ── Eligible paths ───────────────────────────────────────────────────────────
// Home has its own sticky CTA in the same slot; Journal has its own card; auth
// and admin are not the moment.
assert.equal(isNudgeEligiblePath("/"), false);
assert.equal(isNudgeEligiblePath("/blog"), false);
assert.equal(isNudgeEligiblePath("/blog/some-post"), false);
assert.equal(isNudgeEligiblePath("/auth/login"), false);
assert.equal(isNudgeEligiblePath("/admin"), false);
assert.equal(isNudgeEligiblePath("/admin/company-views"), false);
assert.equal(isNudgeEligiblePath("/desk"), true);
assert.equal(isNudgeEligiblePath("/leaderboards"), true);
assert.equal(isNudgeEligiblePath("/company/NEULANDLAB"), true);
assert.equal(isNudgeEligiblePath("/themes"), true);
// A prefix match must not swallow unrelated routes.
assert.equal(isNudgeEligiblePath("/blogroll"), true);
assert.equal(isNudgeEligiblePath("/administer"), true);

assert.equal(isCompanyPath("/company/NEULANDLAB"), true);
assert.equal(isCompanyPath("/company/NEULANDLAB/"), true);
assert.equal(isCompanyPath("/company"), false);
assert.equal(isCompanyPath("/companies"), false);

// ── Suppression: snooze window + retirement ─────────────────────────────────
const now = 1_800_000_000_000;
assert.equal(isNudgeSuppressed(EMPTY_NUDGE_STATE, now), false);
assert.equal(isNudgeSuppressed({ dismissedAt: null, clicked: true }, now), true);
assert.equal(isNudgeSuppressed({ dismissedAt: now - 1000, clicked: false }, now), true);
assert.equal(
  isNudgeSuppressed({ dismissedAt: now - NUDGE_SNOOZE_MS + 1, clicked: false }, now),
  true,
);
assert.equal(
  isNudgeSuppressed({ dismissedAt: now - NUDGE_SNOOZE_MS, clicked: false }, now),
  false,
);
// A clock that went backwards (dismissedAt in the future) still counts as snoozed.
assert.equal(isNudgeSuppressed({ dismissedAt: now + 60_000, clicked: false }, now), true);

// ── Rules ───────────────────────────────────────────────────────────────────
assert.equal(secondPageRuleFires(0), false);
assert.equal(secondPageRuleFires(1), false);
assert.equal(secondPageRuleFires(2), true);
assert.equal(secondPageRuleFires(9), true);

// First pageview of a session on a non-company page: nothing.
assert.equal(nudgeDelayFor("/desk", 1), null);
// First pageview on a company page: arm the dwell timer.
assert.equal(nudgeDelayFor("/company/NEULANDLAB", 1), COMPANY_DWELL_MS);
// Second page anywhere eligible: show at once, even on a company page.
assert.equal(nudgeDelayFor("/desk", 2), 0);
assert.equal(nudgeDelayFor("/company/NEULANDLAB", 2), 0);
// Ineligible paths never fire, however deep the session.
assert.equal(nudgeDelayFor("/", 5), null);
assert.equal(nudgeDelayFor("/blog/post", 5), null);
assert.equal(nudgeDelayFor("/auth/login", 5), null);

console.log("community-nudge: ok");
