// "Leaderboard movers · this week" on the desk (2026-10-29 redesign): the
// companies whose Overall-board rank moved most between the newest daily rank
// snapshot and the one a week before it (leaderboard_rank_snapshot, written by
// the /leaderboards render — see lib/leaderboard-snapshot.ts).
//
// Pure, so it is testable without the server-only snapshot read. Only
// discovery-listed companies can move here (the caller passes that set): a
// below-cut name sits in the board's greyed tail and is not a desk name.

export type RankMap = Readonly<Record<string, number>>;

export type MoverCompany = {
  code: string;
  name: string;
  latestScore: number | null;
};

export type Mover = MoverCompany & {
  /** Places moved: positive = climbed (rank number fell), negative = slipped. */
  delta: number;
  rank: number;
  priorRank: number;
};

export type LeaderboardMovers = { climbing: Mover[]; slipping: Mover[] };

export const MOVERS_PER_SIDE = 3;

/**
 * The biggest climbs and slips, `perSide` each. A company needs a rank in BOTH
 * snapshots (a newcomer has no prior place to move from) and a non-zero move.
 * Ties go to the better current rank, then the code, so the pick is stable.
 */
export function computeMovers(args: {
  latest: RankMap;
  prior: RankMap;
  companies: readonly MoverCompany[];
  perSide?: number;
}): LeaderboardMovers {
  const { latest, prior, companies, perSide = MOVERS_PER_SIDE } = args;
  const moves: Mover[] = [];
  const seen = new Set<string>();
  for (const company of companies) {
    const code = company.code.toUpperCase();
    if (seen.has(code)) continue;
    seen.add(code);
    const rank = latest[code];
    const priorRank = prior[code];
    if (!Number.isFinite(rank) || !Number.isFinite(priorRank)) continue;
    const delta = priorRank - rank;
    if (delta === 0) continue;
    moves.push({ ...company, delta, rank, priorRank });
  }

  const tie = (a: Mover, b: Mover) => a.rank - b.rank || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
  const climbing = moves
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta || tie(a, b))
    .slice(0, perSide);
  const slipping = moves
    .filter((m) => m.delta < 0)
    .sort((a, b) => a.delta - b.delta || tie(a, b))
    .slice(0, perSide);
  return { climbing, slipping };
}
