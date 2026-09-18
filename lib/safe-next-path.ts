/**
 * Same-site guard for the `next` return path carried through login, sign-up,
 * the Google OAuth callback and the email-confirm route. One rule, one place:
 * every hop that redirects to or links with a caller-supplied `next` goes
 * through here, so a crafted link can't bounce a freshly-authenticated user
 * to another origin.
 *
 * Accepts only a path on this site ("/company/X#moat-analysis"). Rejects
 * absolute and protocol-relative URLs, backslashes (browsers read "/\" as
 * "//"), control characters (the URL parser strips tabs/newlines, turning
 * "/\t/evil.com" into "//evil.com") and percent-encoded forms of the same.
 */
const PROBE_ORIGIN = "http://same-site.invalid";

export function isSafeNextPath(next: string | null | undefined): next is string {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return false;
  if (!next.startsWith("/") || next.startsWith("//")) return false;
  if (next.includes("\\")) return false;
  for (let i = 0; i < next.length; i += 1) {
    if (next.charCodeAt(i) < 0x20 || next.charCodeAt(i) === 0x7f) return false;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return false;
  }
  if (decoded.startsWith("//") || decoded.includes("\\")) return false;

  try {
    return new URL(next, PROBE_ORIGIN).origin === PROBE_ORIGIN;
  } catch {
    return false;
  }
}

/** The caller-supplied `next` when it is a safe same-site path, else `fallback`. */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  return isSafeNextPath(next) ? next : fallback;
}

/** Paths that must never be a post-auth destination (you'd land back on a form). */
function isAuthPath(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

/**
 * Href for a Sign in / Sign up link that returns the reader to where they were.
 * The marketing hero ("/") and the auth pages themselves carry no `next`, so
 * those keep the default landing.
 */
export function authHrefWithNext(
  base: "/auth/login" | "/auth/sign-up",
  currentPath: string | null | undefined,
): string {
  if (!isSafeNextPath(currentPath) || currentPath === "/" || isAuthPath(currentPath)) return base;
  return `${base}?next=${encodeURIComponent(currentPath)}`;
}
