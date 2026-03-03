export type RankedItem<T> = T & { leaderboardRank: number };

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
