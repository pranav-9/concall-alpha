export type RankedItem<T> = T & { leaderboardRank: number };

// The Overall board's live ranking, in ONE place so the board (client) and the
// daily snapshot writer (server, lib/leaderboard-snapshot.ts) can never rank the
// same universe differently — if they did, the Δ column would compare a rank to
// itself computed two ways and show phantom movement.
//
// Ranks by Read (descending), tie-broken by name for stability. A row with no
// Read is unranked (it can't hold a position on a missing number). UNLIKE the old
// behaviour, below-cut rows ARE ranked here: the redesigned board numbers the
// whole universe 1..N and pins the below-cut ones at the bottom (dimmed), rather
// than leaving them numberless — so a greyed row shows its true Read position.
export type RankableRow = {
  companyCode: string;
  companyName: string;
  readScore: number | null;
  /** Below the coverage cut. Greyed rows are numbered AFTER all kept rows. */
  belowCut?: boolean;
};

export function computeBoardRanks(rows: ReadonlyArray<RankableRow>): Map<string, number> {
  const ordered = [...rows].sort((a, b) => {
    // Kept rows first, then the below-cut tail: the # runs 1..K over the ranked
    // set and continues K+1..N over the pinned greyed tail, so numbers are
    // monotonic down the page. Ranking the whole universe by Read alone put a
    // greyed row that out-ranks kept ones on the live Read (the cut is a stored
    // 4Q composite, the Read is the live recency blend) at a LOW number sitting
    // visually below a higher one — a rendering fault the pin can't hide.
    const acut = a.belowCut ? 1 : 0;
    const bcut = b.belowCut ? 1 : 0;
    if (acut !== bcut) return acut - bcut;
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
