import assert from "node:assert/strict";

import { authHrefWithNext, isSafeNextPath, safeNextPath } from "../lib/safe-next-path";

// Same-site paths pass, hash and query included (the gate returns to a tab).
for (const ok of [
  "/",
  "/watchlists",
  "/company/NAVINFLUOR",
  "/company/NAVINFLUOR#guidance-history",
  "/leaderboards?tab=growth",
  "/company/M%26M",
]) {
  assert.equal(isSafeNextPath(ok), true, ok);
  assert.equal(safeNextPath(ok, "/fallback"), ok);
}

// Anything that can leave the origin is refused and falls back.
for (const bad of [
  null,
  undefined,
  "",
  "watchlists",
  "https://evil.com",
  "http://evil.com/company/X",
  "//evil.com",
  "///evil.com",
  "/\\evil.com",
  "/\\/evil.com",
  "\\\\evil.com",
  "/%2F%2Fevil.com".replace("/%2F", "%2F"), // "%2F%2Fevil.com" — no leading slash
  "/%2Fevil.com", // decodes to "//evil.com"
  "/%5Cevil.com", // decodes to "/\evil.com"
  "/\t/evil.com", // URL parser strips the tab -> "//evil.com"
  "/\n/evil.com",
  "javascript:alert(1)",
  "/%E0%A4%A", // malformed escape
  `/${"a".repeat(2100)}`,
]) {
  assert.equal(isSafeNextPath(bad), false, String(bad));
  assert.equal(safeNextPath(bad, "/fallback"), "/fallback");
}

// Navbar links carry the current page, except from the hero and the auth pages.
assert.equal(
  authHrefWithNext("/auth/login", "/company/HFCL"),
  "/auth/login?next=%2Fcompany%2FHFCL",
);
assert.equal(
  authHrefWithNext("/auth/sign-up", "/company/HFCL#moat-analysis"),
  "/auth/sign-up?next=%2Fcompany%2FHFCL%23moat-analysis",
);
assert.equal(authHrefWithNext("/auth/sign-up", "/"), "/auth/sign-up");
assert.equal(authHrefWithNext("/auth/login", "/auth/sign-up"), "/auth/login");
assert.equal(authHrefWithNext("/auth/login", "/auth"), "/auth/login");
assert.equal(authHrefWithNext("/auth/login", null), "/auth/login");
assert.equal(authHrefWithNext("/auth/login", "//evil.com"), "/auth/login");
// "/authors" is not an auth path.
assert.equal(authHrefWithNext("/auth/login", "/authors"), "/auth/login?next=%2Fauthors");

console.log("safe-next-path: ok");
