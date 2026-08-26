// The leaderboard "Overall" board rows (Quarter / Growth / Valuation, the inputs
// to Read), assembled once per request. This is the same build app/leaderboards
// runs — getConcallData (quarter substrate) + fetchLeaderboardData (growth) fed
// through buildScoreBoardRows — factored out so /themes can filter it to a theme's
// members without a second, drifting assembly.
//
// Wrapped in React `cache()` for REQUEST-scoped dedupe only. Both legs are now
// cross-request cached internally on the public-read client + unstable_cache:
// getConcallData (quarter substrate, 2026-08-13) and fetchLeaderboardData's
// company+growth reads (leaderboard-substrate-v1, 2026-08-26 — this closed the
// /themes + /leaderboards + /how-scores-work + Overview-board TTFB). It's called
// with { includeMoat: false } so the uncached ~600KB moat payload fetch is
// skipped entirely; only the cached growth leg is read. So this whole assembly
// runs off warm caches, and the React cache() here just dedupes within a request.

import { cache } from "react";

import { getConcallData } from "@/app/company/get-concall-data";
import { fetchLeaderboardData } from "@/app/leaderboards/data";
import { buildScoreBoardRows } from "@/lib/score-board-rows";
import type { ScoreBoardRow } from "@/components/score-board-table";

export const getOverallBoardRows = cache(async (): Promise<ScoreBoardRow[]> => {
  const [{ rows, latestLabel }, { growthScoreByCode, nameByCode }] = await Promise.all([
    // Same gates as the Overall tab: large caps out, below-cut tail kept (greyed).
    getConcallData({ excludeLargeCaps: true, includeBelowCut: true }),
    // The Overall board carries no moat column, so skip the ~2.8s moat payload
    // fetch — only growthScoreByCode + nameByCode are read below.
    fetchLeaderboardData({ includeMoat: false }),
  ]);

  return buildScoreBoardRows(rows, latestLabel ?? null, growthScoreByCode, nameByCode);
});
