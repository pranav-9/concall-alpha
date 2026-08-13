// The leaderboard "Overall" board rows (Quarter / Growth / Valuation, the inputs
// to Read), assembled once per request. This is the same build app/leaderboards
// runs — getConcallData (quarter substrate) + fetchLeaderboardData (growth) fed
// through buildScoreBoardRows — factored out so /themes can filter it to a theme's
// members without a second, drifting assembly.
//
// Wrapped in React `cache()` for REQUEST-scoped dedupe only. getConcallData is
// now cross-request cached internally (public-read client + unstable_cache,
// 2026-08-13), so the quarter substrate is cheap here; fetchLeaderboardData
// still uses the cookie-based server client, which unstable_cache forbids
// inside its callback. Moving it onto createPublicReadClient and caching the
// whole assembly is the remaining half of the tracked fast-follow — see
// TODOS.md. Until then /themes pays a growth+moat fetch per request.

import { cache } from "react";

import { getConcallData } from "@/app/company/get-concall-data";
import { fetchLeaderboardData } from "@/app/leaderboards/data";
import { buildScoreBoardRows } from "@/lib/score-board-rows";
import type { ScoreBoardRow } from "@/components/score-board-table";

export const getOverallBoardRows = cache(async (): Promise<ScoreBoardRow[]> => {
  const [{ rows, latestLabel }, { growthScoreByCode, nameByCode }] = await Promise.all([
    // Same gates as the Overall tab: large caps out, below-cut tail kept (greyed).
    getConcallData({ excludeLargeCaps: true, includeBelowCut: true }),
    fetchLeaderboardData(),
  ]);

  return buildScoreBoardRows(rows, latestLabel ?? null, growthScoreByCode, nameByCode);
});
