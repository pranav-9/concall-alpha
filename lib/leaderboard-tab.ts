// Single source of truth for the leaderboard board tabs. Both the server page
// (computing the default tab from ?tab) and the client tab strip (reconciling
// the visible tab when the URL changes) resolve through here, so adding a fifth
// board is a one-place change instead of a change-two-places trap.

export const LEADERBOARD_TABS = ["overall", "quarter", "growth", "moat"] as const;
export type LeaderboardTab = (typeof LEADERBOARD_TABS)[number];

export const DEFAULT_LEADERBOARD_TAB: LeaderboardTab = "overall";

// Resolve a raw ?tab value to a canonical board. "sentiment" is a back-compat
// alias for the prior default (Quarter) so old bookmarks still land right;
// anything unknown or absent falls back to Overall.
export function resolveLeaderboardTab(
  param: string | null | undefined,
): LeaderboardTab {
  if (param === "quarter" || param === "sentiment") return "quarter";
  if (param === "growth") return "growth";
  if (param === "moat") return "moat";
  return DEFAULT_LEADERBOARD_TAB;
}
