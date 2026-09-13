// The phone "app" chrome — a compact house-skin top bar plus the fixed bottom
// tab bar — is scoped to the five reading routes the tab bar navigates between.
// Every other route keeps the pill navbar and hamburger below `sm`. One list so
// the navbar (app/(hero)/navbar.tsx), the tab bar (components/mobile-tab-bar.tsx)
// and the community nudge agree on where the chrome is.

export const PHONE_TABS = [
  { href: "/desk", label: "Desk" },
  { href: "/announcements", label: "Filings" },
  { href: "/themes", label: "Themes" },
  { href: "/leaderboards", label: "Ranking" },
  { href: "/sectors", label: "Sectors" },
] as const;

export type PhoneTabHref = (typeof PHONE_TABS)[number]["href"];

const PHONE_APP_ROUTES: ReadonlySet<string> = new Set(PHONE_TABS.map((t) => t.href));

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
