// The phone "app" chrome — a compact house-skin top bar plus the fixed bottom
// tab bar — is scoped to the reading routes the tab bar navigates between.
// Every other route keeps the pill navbar and hamburger below `sm`. One list so
// the navbar (app/(hero)/navbar.tsx), the tab bar (components/mobile-tab-bar.tsx)
// and the community nudge agree on where the chrome is.

/** The four direct tabs, in bar order. The fifth slot is "Other" (a sheet). */
export const PHONE_TABS = [
  { href: "/desk", label: "Desk" },
  { href: "/announcements", label: "Filings" },
  { href: "/leaderboards", label: "Ranking" },
  { href: "/blog", label: "Journal" },
] as const;

/**
 * Destinations behind the "Other" tab. They still carry the phone chrome when
 * landed on (the bar must show where it navigates to), with "Other" lit.
 * Signed-in-only entries (Watchlists) and the Telegram link are added by the
 * component, not here — this list is the route gate.
 */
export const PHONE_MORE_LINKS = [
  { href: "/themes", label: "Themes", blurb: "Hot themes and who is in them" },
  { href: "/sectors", label: "Sectors", blurb: "Every sector, ranked" },
] as const;

export type PhoneTabHref = (typeof PHONE_TABS)[number]["href"];
export type PhoneMoreHref = (typeof PHONE_MORE_LINKS)[number]["href"];

const PHONE_MORE_ROUTES: ReadonlySet<string> = new Set(PHONE_MORE_LINKS.map((l) => l.href));
const PHONE_APP_ROUTES: ReadonlySet<string> = new Set([
  ...PHONE_TABS.map((t) => t.href),
  ...PHONE_MORE_ROUTES,
]);

/**
 * `/leaderboards/` → `/leaderboards`. next.config sets skipTrailingSlashRedirect
 * (for the PostHog /ingest rewrite), so a shared link with a slash renders the
 * route with the slash still in usePathname(); the chrome must not vanish on it.
 */
export function normalizePhonePathname(pathname: string | null | undefined): string | null {
  if (pathname == null) return null;
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Exact-route match after normalisation: `/sectors` and `/sectors/` yes, `/sector/it` no. */
export function isPhoneAppRoute(pathname: string | null | undefined): boolean {
  const key = normalizePhonePathname(pathname);
  return key != null && PHONE_APP_ROUTES.has(key);
}

/** True on a route reached through the "Other" sheet — lights that tab. */
export function isPhoneMoreRoute(pathname: string | null | undefined): boolean {
  const key = normalizePhonePathname(pathname);
  return key != null && PHONE_MORE_ROUTES.has(key);
}
