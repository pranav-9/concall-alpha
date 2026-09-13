import assert from "node:assert/strict";

import { isPhoneAppRoute, normalizePhonePathname, PHONE_TABS } from "../lib/phone-chrome";

// The phone "app" chrome (compact top bar + fixed bottom tab bar) is scoped to
// exactly the five reading routes the tab bar navigates between. The gate is an
// EXACT pathname match: a company page, a sector page, or a sub-route keeps the
// pill navbar and hamburger.

// Every tab destination is itself a chrome route — the bar must show where it lands.
for (const tab of PHONE_TABS) {
  assert.equal(isPhoneAppRoute(tab.href), true, `${tab.href} carries the phone chrome`);
}

// Exact match, but tolerant of a trailing slash (skipTrailingSlashRedirect means
// `/sectors/` serves the same route with the slash still in usePathname()).
assert.equal(isPhoneAppRoute("/sector/it"), false, "/sector/[slug] is not /sectors");
assert.equal(isPhoneAppRoute("/sectors/"), true, "trailing slash keeps the chrome");
assert.equal(isPhoneAppRoute("/desk//"), true, "repeated trailing slashes keep the chrome");
assert.equal(normalizePhonePathname("/sectors/"), "/sectors", "normalises the slash away");
assert.equal(normalizePhonePathname("/"), "/", "the root stays the root");
assert.equal(normalizePhonePathname(null), null, "null stays null");
assert.equal(isPhoneAppRoute("/company/E2E"), false, "company pages keep the hamburger");
assert.equal(isPhoneAppRoute("/leaderboards/x"), false, "sub-routes are not gated in");
assert.equal(isPhoneAppRoute("/"), false, "the hero homepage keeps the pill navbar");
assert.equal(isPhoneAppRoute("/blog"), false, "the Journal keeps the pill navbar");

// Null-safe: usePathname can be null during some transitions.
assert.equal(isPhoneAppRoute(null), false, "null pathname -> no chrome");
assert.equal(isPhoneAppRoute(undefined), false, "undefined pathname -> no chrome");
assert.equal(isPhoneAppRoute(""), false, "empty pathname -> no chrome");

console.log("All phone-chrome tests passed.");
