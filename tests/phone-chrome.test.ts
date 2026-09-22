import assert from "node:assert/strict";

import {
  isPhoneAppRoute,
  isPhoneMoreRoute,
  normalizePhonePathname,
  PHONE_MORE_LINKS,
  PHONE_TABS,
} from "../lib/phone-chrome";

// The phone "app" chrome (compact top bar + fixed bottom tab bar) is scoped to
// exactly the reading routes the tab bar navigates between — the four direct
// tabs plus the destinations behind "Other". The gate is an EXACT pathname
// match: a company page, a sector page, or a sub-route keeps the pill navbar
// and hamburger.

// The bar is four direct tabs + "Other" = five slots.
assert.equal(PHONE_TABS.length, 4, "four direct tabs; the fifth slot is Other");
assert.deepEqual(
  PHONE_TABS.map((t) => t.label),
  ["Desk", "Filings", "Ranking", "Journal"],
  "tab order is Desk / Filings / Ranking / Journal",
);

// Every tab destination is itself a chrome route — the bar must show where it lands.
for (const tab of PHONE_TABS) {
  assert.equal(isPhoneAppRoute(tab.href), true, `${tab.href} carries the phone chrome`);
  assert.equal(isPhoneMoreRoute(tab.href), false, `${tab.href} is a direct tab, not Other`);
}
// ...and so is everything behind "Other", with the Other tab lit.
for (const link of PHONE_MORE_LINKS) {
  assert.equal(isPhoneAppRoute(link.href), true, `${link.href} carries the phone chrome`);
  assert.equal(isPhoneMoreRoute(link.href), true, `${link.href} lights the Other tab`);
}

// Exact match, but tolerant of a trailing slash (skipTrailingSlashRedirect means
// `/sectors/` serves the same route with the slash still in usePathname()).
assert.equal(isPhoneAppRoute("/sector/it"), false, "/sector/[slug] is not /sectors");
assert.equal(isPhoneAppRoute("/sectors/"), true, "trailing slash keeps the chrome");
assert.equal(isPhoneMoreRoute("/sectors/"), true, "trailing slash keeps Other lit");
assert.equal(isPhoneAppRoute("/desk//"), true, "repeated trailing slashes keep the chrome");
assert.equal(normalizePhonePathname("/sectors/"), "/sectors", "normalises the slash away");
assert.equal(normalizePhonePathname("/"), "/", "the root stays the root");
assert.equal(normalizePhonePathname(null), null, "null stays null");
assert.equal(isPhoneAppRoute("/company/E2E"), false, "company pages keep the hamburger");
assert.equal(isPhoneAppRoute("/leaderboards/x"), false, "sub-routes are not gated in");
assert.equal(isPhoneAppRoute("/"), false, "the hero homepage keeps the pill navbar");
assert.equal(isPhoneAppRoute("/blog"), true, "the Journal index is the Journal tab");
assert.equal(isPhoneAppRoute("/blog/some-post"), false, "a Journal post keeps the pill navbar");
assert.equal(isPhoneAppRoute("/watchlists"), false, "Watchlists (reached via Other) keeps the hamburger");

// Null-safe: usePathname can be null during some transitions.
assert.equal(isPhoneAppRoute(null), false, "null pathname -> no chrome");
assert.equal(isPhoneAppRoute(undefined), false, "undefined pathname -> no chrome");
assert.equal(isPhoneAppRoute(""), false, "empty pathname -> no chrome");
assert.equal(isPhoneMoreRoute(null), false, "null pathname -> Other not lit");

console.log("All phone-chrome tests passed.");
