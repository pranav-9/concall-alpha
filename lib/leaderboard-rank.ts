export type RankedItem<T> = T & { leaderboardRank: number };

// How many companies the Overall board keeps "in" before it greys the tail.
// Mirrors compute_composite_score.py's --target and the "handpicked ~100"
// positioning — but the board applies it to the LIVE Read rank, so a greyed row
// is always one that ranks below this line on the number the board actually
// shows. The stored `excluded_from_discovery` flag still governs homepage /
// sectors (lib/coverage-policy.ts); the two sets can differ near the line, and
// that's fine — the board is the only surface that shows ranks side by side, so
// it's the only one that needs the live version.
export const COVERAGE_BOARD_SIZE = 100;

// The Overall board's live ranking, in ONE place so the board (client) and the
// daily snapshot writer (server, lib/leaderboard-snapshot.ts) can never rank the
// same universe differently — if they did, the Δ column would compare a rank to
// itself computed two ways and show phantom movement.
//
// Ranks the whole universe by Read (descending), tie-broken by CODE for
// cross-runtime stability. A row with no Read is unranked (it can't hold a
// position on a missing number). NOT tiered by the stored cut anymore (removed
// 2026-08-12): tiering pinned a high-Read below-cut row to a low number that then
// sat visually above a kept row it out-scored. Greying now keys off THIS live
// rank (rank > COVERAGE_BOARD_SIZE), so a greyed row is always the lowest-ranked
// and the bottom-pin has nothing to hide.
export type RankableRow = {
  companyCode: string;
  companyName: string;
  readScore: number | null;
};

export function computeBoardRanks(rows: ReadonlyArray<RankableRow>): Map<string, number> {
  const ordered = [...rows].sort((a, b) => {
    const av = a.readScore ?? Number.NEGATIVE_INFINITY;
    const bv = b.readScore ?? Number.NEGATIVE_INFINITY;
    if (av !== bv) return bv - av;
    // Tie-break on CODE with a byte compare, NOT companyName.localeCompare:
    // this fn runs on Node (the snapshot writer) and in the browser (the live
    // board), and localeCompare can order two equal-Read companies differently
    // across those runtimes — which would surface as a permanent Δ = ±1 with no
    // real movement. A code byte-compare is identical everywhere.
    if (a.companyCode === b.companyCode) return 0;
    return a.companyCode < b.companyCode ? -1 : 1;
  });
  const rankByCode = new Map<string, number>();
  let position = 0;
  for (const row of ordered) {
    if (row.readScore == null) continue; // unscored: no position on a missing number
    position += 1;
    rankByCode.set(row.companyCode, position);
  }
  return rankByCode;
}

export function assignCompetitionRanks<T>(
  items: T[],
  getScore: (item: T) => number | null,
): RankedItem<T>[] {
  let previousScore: number | null = null;
  let previousRank = 0;

  return items.map((item, index) => {
    const score = getScore(item);
    let leaderboardRank = index + 1;

    if (score != null) {
      if (previousScore != null && score === previousScore) {
        leaderboardRank = previousRank;
      } else {
        leaderboardRank = index + 1;
      }
      previousScore = score;
      previousRank = leaderboardRank;
    }

    return {
      ...item,
      leaderboardRank,
    };
  });
}
