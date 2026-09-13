import assert from "node:assert/strict";

import {
  COMPANY_DWELL_MS,
  EMPTY_NUDGE_STATE,
  NUDGE_LAST_PATH_KEY,
  NUDGE_SESSION_KEY,
  NUDGE_SHOWN_KEY,
  NUDGE_SNOOZE_DAYS,
  NUDGE_SNOOZE_MS,
  NUDGE_STORAGE_KEY,
  SECOND_PAGE_THRESHOLD,
  isCompanyPath,
  isNudgeEligiblePath,
  isNudgeSuppressed,
  nextSessionPageviews,
  nudgeDelayFor,
  parseNudgeState,
  secondPageRuleFires,
} from "../lib/community-nudge";

// ── Tunables and keys: pin them so a drift is a deliberate edit ──────────────
assert.equal(NUDGE_SNOOZE_DAYS, 14);
assert.equal(NUDGE_SNOOZE_MS, 14 * 24 * 60 * 60 * 1000);
assert.equal(COMPANY_DWELL_MS, 25_000);
assert.equal(SECOND_PAGE_THRESHOLD, 2);
assert.equal(
  new Set([NUDGE_STORAGE_KEY, NUDGE_SESSION_KEY, NUDGE_LAST_PATH_KEY, NUDGE_SHOWN_KEY]).size,
  4,
);

// ── parseNudgeState: anything malformed is "never seen" ─────────────────────
assert.deepEqual(parseNudgeState(null), EMPTY_NUDGE_STATE);
assert.deepEqual(parseNudgeState(""), EMPTY_NUDGE_STATE);
assert.deepEqual(parseNudgeState("not json"), EMPTY_NUDGE_STATE);
assert.deepEqual(parseNudgeState("null"), EMPTY_NUDGE_STATE);
// A JSON primitive is not a state object.
assert.deepEqual(parseNudgeState("42"), EMPTY_NUDGE_STATE);
assert.deepEqual(parseNudgeState("true"), EMPTY_NUDGE_STATE);
assert.deepEqual(parseNudgeState('"x"'), EMPTY_NUDGE_STATE);
// A non-finite timestamp is discarded, the rest of the blob survives.
assert.deepEqual(parseNudgeState('{"dismissedAt":1e999,"clicked":true}'), {
  dismissedAt: null,
  clicked: true,
});
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
// A dismiss stamped in the future (clock skew, hand edit) would snooze forever
// under plain subtraction; it counts as expired instead.
assert.equal(isNudgeSuppressed({ dismissedAt: now + 60_000, clicked: false }, now), false);
assert.equal(isNudgeSuppressed({ dismissedAt: 9e15, clicked: false }, now), false);
// Clicked wins over any timestamp.
assert.equal(isNudgeSuppressed({ dismissedAt: now + 60_000, clicked: true }, now), true);

// ── Session pageview counter: never poisoned by a bad stored value ──────────
assert.equal(nextSessionPageviews(null), 1);
assert.equal(nextSessionPageviews(""), 1);
assert.equal(nextSessionPageviews("0"), 1);
assert.equal(nextSessionPageviews("1"), 2);
assert.equal(nextSessionPageviews("7"), 8);
assert.equal(nextSessionPageviews("2.9"), 3);
assert.equal(nextSessionPageviews("abc"), 1);
assert.equal(nextSessionPageviews("NaN"), 1);
assert.equal(nextSessionPageviews("Infinity"), 1);
assert.equal(nextSessionPageviews("-3"), 1);

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
