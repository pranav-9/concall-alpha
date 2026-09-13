// Engagement nudge for the Telegram group — the pure decision logic.
//
// The join link sat only on the Journal and in the footer, which 30 days of
// PostHog put at ~3% of visits (company pages: 1092 views / 365 visitors;
// Journal: 21 / 15). The nudge is the mobile-first answer (70% of visitors are
// on a phone, where the navbar link hides behind the menu): a dismissible pill
// that appears only after the reader has shown some engagement, never on a
// cold first pageview. Two rules, either one fires it:
//
//   second_page   — the second pageview of this browser session
//   company_dwell — COMPANY_DWELL_MS on a company page
//
// Dismiss snoozes it for NUDGE_SNOOZE_DAYS; a click retires it for good. The
// component (components/community-nudge.tsx) owns storage and timers; this
// module owns the rules so they can be unit-tested without a DOM.

export const NUDGE_SNOOZE_DAYS = 14;
export const NUDGE_SNOOZE_MS = NUDGE_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
/** How long on a company page before the dwell rule fires. */
export const COMPANY_DWELL_MS = 25_000;
/** Pageviews in this session before the second-page rule fires. */
export const SECOND_PAGE_THRESHOLD = 2;

export const NUDGE_STORAGE_KEY = "community-nudge:v1";
export const NUDGE_SESSION_KEY = "community-nudge:pages";

export type NudgeState = {
  /** Epoch ms of the last dismiss, or null if never dismissed. */
  dismissedAt: number | null;
  /** True once the reader has clicked through — never show again. */
  clicked: boolean;
};

export const EMPTY_NUDGE_STATE: NudgeState = { dismissedAt: null, clicked: false };

/** Parse a stored state blob defensively — anything malformed is "never seen". */
export function parseNudgeState(raw: string | null): NudgeState {
  if (!raw) return EMPTY_NUDGE_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<NudgeState> | null;
    if (!parsed || typeof parsed !== "object") return EMPTY_NUDGE_STATE;
    const dismissedAt =
      typeof parsed.dismissedAt === "number" && Number.isFinite(parsed.dismissedAt)
        ? parsed.dismissedAt
        : null;
    return { dismissedAt, clicked: parsed.clicked === true };
  } catch {
    return EMPTY_NUDGE_STATE;
  }
}

/** Pages where the nudge must not appear: the Journal already carries its own
 *  join card, the homepage has its own sticky CTA on the same edge, and auth /
 *  admin flows are not the moment. */
export function isNudgeEligiblePath(pathname: string): boolean {
  if (pathname === "/") return false;
  return !/^\/(blog|auth|admin)(\/|$)/.test(pathname);
}

export function isCompanyPath(pathname: string): boolean {
  return /^\/company\/[^/]+/.test(pathname);
}

/** Is the reader inside a snooze window or retired? */
export function isNudgeSuppressed(state: NudgeState, now: number): boolean {
  if (state.clicked) return true;
  if (state.dismissedAt == null) return false;
  return now - state.dismissedAt < NUDGE_SNOOZE_MS;
}

/** The second-page rule: fires on the Nth pageview of the session. */
export function secondPageRuleFires(sessionPageviews: number): boolean {
  return sessionPageviews >= SECOND_PAGE_THRESHOLD;
}

/** Given the page and session, how long to wait before showing — or null for
 *  "not on this page". Zero means show at once (second-page rule); a positive
 *  delay means arm the company-dwell timer. */
export function nudgeDelayFor(pathname: string, sessionPageviews: number): number | null {
  if (!isNudgeEligiblePath(pathname)) return null;
  if (secondPageRuleFires(sessionPageviews)) return 0;
  if (isCompanyPath(pathname)) return COMPANY_DWELL_MS;
  return null;
}
