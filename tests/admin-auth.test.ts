import assert from "node:assert/strict";

import {
  ADMIN_SESSION_SECONDS,
  createAdminAccessToken,
  hasAdminAccess,
  isValidAdminPasscode,
} from "../lib/admin-auth";

const ENV = { ADMIN_PANEL_PASSCODE: "open-sesame", SUPABASE_SERVICE_ROLE_KEY: "service-role-secret" };
const NOW = Date.parse("2026-10-08T10:00:00.000Z");

// ── the hole this closes ─────────────────────────────────────────────────────

assert.equal(hasAdminAccess("1", NOW, ENV), false, "the old constant cookie value no longer unlocks");
assert.equal(hasAdminAccess(undefined, NOW, ENV), false);
assert.equal(hasAdminAccess("", NOW, ENV), false);

// ── round trip ───────────────────────────────────────────────────────────────

const token = createAdminAccessToken(NOW, ENV);
assert.ok(token, "a token is minted when both secrets are set");
assert.match(token!, /^v1\.\d+\.[A-Za-z0-9_-]+$/);
assert.equal(hasAdminAccess(token!, NOW, ENV), true);
assert.equal(hasAdminAccess(token!, NOW + 60 * 60 * 1000, ENV), true, "still valid an hour later");

// ── forgery and tampering ────────────────────────────────────────────────────

const [, issuedAt, sig] = token!.split(".");
assert.equal(hasAdminAccess(`v1.${Number(issuedAt) + 3600}.${sig}`, NOW, ENV), false, "moving the issue time breaks the signature");
assert.equal(hasAdminAccess(`v1.${issuedAt}.${sig.slice(0, -1)}A`, NOW, ENV), false, "a flipped signature character fails");
assert.equal(hasAdminAccess(`v1.${issuedAt}.`, NOW, ENV), false, "an empty signature fails");
assert.equal(hasAdminAccess(`v2.${issuedAt}.${sig}`, NOW, ENV), false, "unknown version fails");
assert.equal(hasAdminAccess(`v1.${issuedAt}.${sig}.extra`, NOW, ENV), false, "extra segments fail");
assert.equal(hasAdminAccess(`v1.1e9.${sig}`, NOW, ENV), false, "a non-integer issue time fails");

// ── expiry ───────────────────────────────────────────────────────────────────

const expiry = NOW + ADMIN_SESSION_SECONDS * 1000;
assert.equal(hasAdminAccess(token!, expiry, ENV), true, "valid at exactly the session length");
assert.equal(hasAdminAccess(token!, expiry + 1000, ENV), false, "a copied cookie dies after the session length");
assert.equal(hasAdminAccess(createAdminAccessToken(NOW + 30_000, ENV)!, NOW, ENV), true, "small clock skew is tolerated");
assert.equal(hasAdminAccess(createAdminAccessToken(NOW + 10 * 60_000, ENV)!, NOW, ENV), false, "a token from the far future is not");

// ── rotation and missing secrets ─────────────────────────────────────────────

assert.equal(hasAdminAccess(token!, NOW, { ...ENV, ADMIN_PANEL_PASSCODE: "new-passcode" }), false, "changing the passcode signs everyone out");
assert.equal(hasAdminAccess(token!, NOW, { ...ENV, SUPABASE_SERVICE_ROLE_KEY: "rotated" }), false, "rotating the service-role key signs everyone out");
assert.equal(createAdminAccessToken(NOW, { ADMIN_PANEL_PASSCODE: "x" }), null, "no token without the service-role key");
assert.equal(hasAdminAccess(token!, NOW, { ADMIN_PANEL_PASSCODE: "open-sesame" }), false, "no access without the service-role key");
assert.equal(hasAdminAccess(token!, NOW, {}), false);

// ── passcode check ───────────────────────────────────────────────────────────

assert.equal(isValidAdminPasscode("open-sesame", ENV), true);
assert.equal(isValidAdminPasscode("open-sesamE", ENV), false);
assert.equal(isValidAdminPasscode("open", ENV), false);
assert.equal(isValidAdminPasscode("", ENV), false);
assert.equal(isValidAdminPasscode("anything", {}), false, "no passcode configured = nothing unlocks");

console.log("admin-auth: ok");
