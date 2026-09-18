import assert from "node:assert/strict";

import { hasSupabaseAuthCookie } from "../lib/supabase/auth-cookie";

// Anonymous traffic: middleware must skip the refresh entirely.
assert.equal(hasSupabaseAuthCookie([]), false);
assert.equal(hasSupabaseAuthCookie(["visitor_id", "ph_phc_abc_posthog", "_ga"]), false);
// The PKCE verifier alone is a login in flight, not a session.
assert.equal(hasSupabaseAuthCookie(["sb-abcdefgh-auth-token-code-verifier"]), false);
assert.equal(hasSupabaseAuthCookie(["sb-auth-token"]), false);
assert.equal(hasSupabaseAuthCookie(["xsb-abcdefgh-auth-token"]), false);

// A session cookie, whole or chunked.
assert.equal(hasSupabaseAuthCookie(["sb-abcdefgh-auth-token"]), true);
assert.equal(hasSupabaseAuthCookie(["visitor_id", "sb-abcdefgh-auth-token.0"]), true);
assert.equal(hasSupabaseAuthCookie(["sb-abcdefgh-auth-token.1"]), true);

console.log("auth-cookie: ok");
