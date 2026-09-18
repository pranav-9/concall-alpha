import assert from "node:assert/strict";

import {
  AUTH_INTENT_TTL_MS,
  NEW_USER_WINDOW_MS,
  encodeAuthIntent,
  isNewUser,
  parseAuthIntent,
} from "../lib/auth-intent";

const NOW = Date.parse("2026-09-18T12:00:00Z");

// Round trip, with and without the gate's company/section.
const gate = { method: "google", source: "gate", companyCode: "HFCL", sectionId: "moat-analysis", at: NOW - 60_000 } as const;
assert.deepEqual(parseAuthIntent(encodeAuthIntent(gate), NOW), gate);
const plain = { method: "email", source: "auth_page", at: NOW } as const;
assert.deepEqual(parseAuthIntent(encodeAuthIntent(plain), NOW), {
  ...plain,
  companyCode: undefined,
  sectionId: undefined,
});

// Garbage never parses.
for (const raw of [null, undefined, "", "not json", "null", "[]", "42", "{}"]) {
  assert.equal(parseAuthIntent(raw, NOW), null, String(raw));
}
assert.equal(parseAuthIntent(JSON.stringify({ ...plain, method: "github" }), NOW), null);
assert.equal(parseAuthIntent(JSON.stringify({ ...plain, source: "navbar" }), NOW), null);
assert.equal(parseAuthIntent(JSON.stringify({ ...plain, at: "now" }), NOW), null);

// An abandoned attempt must not credit a login 40 minutes later; nor may a
// marker from the future (clock change).
assert.notEqual(parseAuthIntent(JSON.stringify({ ...plain, at: NOW - AUTH_INTENT_TTL_MS }), NOW), null);
assert.equal(parseAuthIntent(JSON.stringify({ ...plain, at: NOW - AUTH_INTENT_TTL_MS - 1 }), NOW), null);
assert.equal(parseAuthIntent(JSON.stringify({ ...plain, at: NOW - 40 * 60_000 }), NOW), null);
assert.equal(parseAuthIntent(JSON.stringify({ ...plain, at: NOW + 1 }), NOW), null);

// Non-string company/section are dropped, not trusted.
assert.deepEqual(parseAuthIntent(JSON.stringify({ ...plain, companyCode: 7, sectionId: {} }), NOW), {
  ...plain,
  companyCode: undefined,
  sectionId: undefined,
});

// New vs returning: 10 minutes from created_at.
assert.equal(isNewUser("2026-09-18T11:59:00Z", NOW), true);
assert.equal(isNewUser(new Date(NOW - NEW_USER_WINDOW_MS).toISOString(), NOW), true);
assert.equal(isNewUser(new Date(NOW - NEW_USER_WINDOW_MS - 1000).toISOString(), NOW), false);
assert.equal(isNewUser("2026-03-01T00:00:00Z", NOW), false);
assert.equal(isNewUser("2026-09-18T12:05:00Z", NOW), false); // created "in the future"
assert.equal(isNewUser(null, NOW), false);
assert.equal(isNewUser("garbage", NOW), false);

console.log("auth-intent: ok");
