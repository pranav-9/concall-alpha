// Build-time shim for @/lib/analytics.
//
// The real module reads `process.env.NEXT_PUBLIC_POSTHOG_KEY` at module scope,
// which throws in a browser IIFE. It reaches this bundle only through
// SectionCard -> section-helpfulness-footer. Product analytics has no meaning
// inside a design tool, so every call is a no-op; the Proxy keeps that true for
// event names added later without needing this file updated.
export type AnalyticsProps = Record<string, unknown>;
export type LeaderboardBoard = "overall" | "quarter" | "growth" | "moat" | "watchlist";
export type WatchlistSource = "company_page" | "leaderboard" | "watchlist" | "other";

const noop = () => {};

export const analytics: Record<string, (...args: unknown[]) => void> = new Proxy(
  {},
  { get: () => noop },
) as Record<string, (...args: unknown[]) => void>;

export function identifyUser(_distinctId: string, _props?: AnalyticsProps) {}
export function setPersonProps(_props?: AnalyticsProps) {}
export function resetIdentity() {}
