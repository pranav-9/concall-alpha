/**
 * True when the request carries a Supabase auth cookie. @supabase/ssr stores
 * the session as `sb-<project-ref>-auth-token`, split into `.0`, `.1`, …
 * chunks once it outgrows one cookie. Middleware uses this to skip session
 * refresh for anonymous traffic (the vast majority), which has nothing to
 * refresh. The PKCE `-code-verifier` cookie alone is not a session.
 */
const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export function hasSupabaseAuthCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((name) => AUTH_COOKIE.test(name));
}
