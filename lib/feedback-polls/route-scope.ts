// Banner visibility allowlist. Banner renders only on content/research routes.
// Locked in /plan-eng-review (D1). Other routes (admin, auth, requests, etc.)
// must never show the poll banner.

const ROUTE_PREFIXES = ["/company/", "/leaderboard", "/sector"];

export function isBannerRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
