// The score board's data layer: the row type the leaderboard and watchlist
// pages build, the derived rank/Read/dim fields, and the sort rules both of the
// board's layouts (phone list, desktop table) share. Pure — no React, no Next —
// so tests/score-board-sort.test.ts can pin the pin-dim-last / null-last /
// default-direction rules the UI relies on.

import {
  boardReadSortRank,
  classifyBoardRead,
  type BoardReadKey,
} from "@/lib/board-read";
import type { ScoreSourceStatus } from "@/lib/score-freshness";
import { computeBoardRanks } from "@/lib/leaderboard-rank";

export type ScoreBoardRow = {
  companyCode: string;
  companyName: string;
  /**
   * The quarter leg the Read ranks on: the RECENCY-WEIGHTED 4Q blend ("latest
   * counts double", lib/quarter-composite). NOT shown as its own column — it is
   * reconstructable as 0.2·latest + 0.8·4Q from the two columns that ARE shown —
   * but it feeds classifyBoardRead (the Read number and its label).
   */
  concallScore: number | null;
  /**
   * The flat trailing 4-quarter mean, shown in the "4Q" column. The stable trail
   * beside the fresh print; does not feed the Read. Null when unscored.
   */
  fourConcallScore: number | null;
  /**
   * The single latest print, shown in the "Latest" column with its quarter label.
   * The freshness / unofficial chips attach to THIS, so a one-quarter badge names
   * the one quarter it describes. Null when unscored.
   */
  latestConcallScore: number | null;
  /** Label of that latest print, e.g. "Q1 FY27". */
  latestQuarterLabel: string | null;
  /**
   * True when the company hasn't reported the board's newest quarter, so its
   * latest print is an older one. The quarter label is shown only then — a
   * current-quarter print rides unlabeled.
   */
  latestIsStale?: boolean;
  growthScore: number | null;
  /** ALREADY rescaled to 0-10 by the data layer (lib/valuation-band). */
  valuationScore: number | null;
  /**
   * Stored composite-cut flag from the data layer. No longer drives greying on
   * THIS board (greying is live now — see coverageCutRank / DerivedRow.dim); kept
   * because the shared row type still carries it for other consumers.
   */
  belowCut: boolean;
  /**
   * Provenance and recency of concallScore. Optional because a watchlisted
   * company with no scored quarter is built here as a placeholder row, and a
   * placeholder has no score to qualify.
   */
  quarterSourceStatus?: ScoreSourceStatus;
  concallScoredWithin24h?: boolean;
  /** ISO; feeds the chip titles only. */
  concallScoredAt?: string | null;
};

export type DerivedRow = ScoreBoardRow & {
  readKey: BoardReadKey;
  readScore: number | null;
  readDescription: string;
  /** Position key for the default sort. See assignEffectiveRanks. */
  effectiveRank: number;
  /**
   * Greyed on this board: its LIVE Read rank is past the coverage line. True only
   * when the caller passes coverageCutRank (the leaderboard); a watchlist omits it,
   * so nothing greys there. Replaces the old stored `belowCut` as the grey source.
   */
  dim: boolean;
};

/**
 * The # column is the board's own ordering of the Read column, computed here
 * rather than read from the stored coverage_rank.
 *
 * Why not the stored rank. coverage_rank is written by a reviewed MANUAL step
 * (concallyser/scripts/compute_composite_score.py), so between runs it's a
 * snapshot of whatever the legs looked like last time. Displayed beside a Read
 * computed live from the current legs, the two disagree: the first build of
 * this board showed rank 6 carrying a Read of 8.5 above rank 1's 8.3, because
 * the stored ranks still came from the old two-leg formula. A board whose rank
 * column contradicts the number it claims to rank on is worse than one with no
 * ranks at all. It also left companies onboarded since the last run with no
 * rank, dangling below the greyed tail with a strong Read.
 *
 * Deriving it means # and Read agree by construction, always, with no compute
 * run required. Greying is now derived from this SAME live rank (dim = rank past
 * coverageCutRank), NOT the stored cut — so a greyed row is always one that ranks
 * below the coverage line on the number the board shows, and can never sit above
 * a kept row it out-scores. The stored `excluded_from_discovery` flag still
 * governs homepage / sectors (lib/coverage-policy.ts); it no longer touches this
 * board. The two sets can differ near the line, which is invisible off-board.
 *
 * It is also what lets a watchlist share this component: the same code numbers
 * 8 rows 1-8 by their Read without needing a universe to rank against.
 *
 * Below-cut rows ARE numbered here (redesign 2026-08-11): the board numbers the
 * whole universe by Read and pins the greyed rows at the bottom, so a greyed row
 * shows its true Read position (e.g. #118) rather than a bare "—". The ranking
 * itself lives in lib/leaderboard-rank computeBoardRanks so the daily snapshot
 * writer (which feeds the Δ column) ranks the identical universe the identical
 * way — otherwise Δ would compare a rank to itself computed two ways.
 */
function assignEffectiveRanks(
  rows: Array<Omit<DerivedRow, "effectiveRank" | "dim">>,
  coverageCutRank?: number,
): DerivedRow[] {
  const rankByCode = computeBoardRanks(rows);
  return rows.map((row) => {
    const effectiveRank = rankByCode.get(row.companyCode) ?? Number.POSITIVE_INFINITY;
    return {
      ...row,
      effectiveRank,
      // Greyed = ranks past the coverage line on the LIVE Read. An unranked row
      // (no Read → effectiveRank Infinity) greys too: it is not in the top N.
      // coverageCutRank absent (a watchlist) → nothing greys.
      dim: coverageCutRank != null && effectiveRank > coverageCutRank,
    };
  });
}

export function deriveRows(rows: ScoreBoardRow[], coverageCutRank?: number): DerivedRow[] {
  return assignEffectiveRanks(
    rows.map((row) => {
      const read = classifyBoardRead({
        concallScore: row.concallScore,
        growthScore: row.growthScore,
        valuationScore: row.valuationScore,
      });
      return {
        ...row,
        readKey: read.key,
        readScore: read.score,
        readDescription: read.description,
      };
    }),
    coverageCutRank,
  );
}


export type SortKey = "coverageRank" | "companyName" | "latestScore" | "fourQScore" | "growthScore" | "valuationScore" | "read";
export type SortDirection = "asc" | "desc";
export type SortState = { key: SortKey; direction: SortDirection };

export const defaultDirectionForKey = (key: SortKey): SortDirection =>
  key === "companyName" || key === "coverageRank" ? "asc" : "desc";

const compareText = (a: string, b: string, direction: SortDirection) => {
  const diff = a.trim().localeCompare(b.trim(), undefined, { sensitivity: "base" });
  return direction === "asc" ? diff : -diff;
};

// Null is "we don't have this", never "zero" — unscored rows sort last in BOTH
// directions rather than leading an ascending sort with a phantom low score.
const compareNumber = (
  a: number | null | undefined,
  b: number | null | undefined,
  direction: SortDirection,
) => {
  const av = typeof a === "number" && Number.isFinite(a) ? a : null;
  const bv = typeof b === "number" && Number.isFinite(b) ? b : null;
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return direction === "asc" ? av - bv : bv - av;
};

export function sortRows(rows: DerivedRow[], sort: SortState) {
  const byName = (a: DerivedRow, b: DerivedRow) =>
    compareText(a.companyName, b.companyName, "asc");
  return [...rows].sort((a, b) => {
    // Greyed rows (dim = ranked past the coverage line) pin to the bottom under
    // EVERY sort key and direction — they are not part of the ranked hundred, so
    // they aren't competing for a position in it. Doing this only on the default
    // sort would put the greyed tail back in the middle the moment a reader
    // sorted by Quarter, which is the confusion this pin exists to remove. No-op
    // on a watchlist, which never sets dim.
    if (a.dim !== b.dim) return a.dim ? 1 : -1;
    let diff = 0;
    switch (sort.key) {
      case "coverageRank": {
        // effectiveRank, not coverageRank: an as-yet-unranked company sits where
        // its Read puts it rather than dangling below the greyed tail.
        const ar = a.effectiveRank;
        const br = b.effectiveRank;
        diff = ar === br ? 0 : sort.direction === "asc" ? ar - br : br - ar;
        // Unranked greyed rows (no Read → effectiveRank = Infinity) tie here and
        // would fall through to the alphabetical byName tie-breaker — the greyed
        // tail read as A→Z, not worst-to-best. Order any such tie by Read (desc)
        // so the tail matches every other block on the default sort.
        if (diff === 0 && a.dim && b.dim) {
          diff = compareNumber(a.readScore, b.readScore, "desc");
        }
        break;
      }
      case "companyName":
        diff = compareText(a.companyName, b.companyName, sort.direction);
        if (diff === 0) diff = compareText(a.companyCode, b.companyCode, "asc");
        break;
      case "latestScore":
        diff = compareNumber(a.latestConcallScore, b.latestConcallScore, sort.direction);
        break;
      case "fourQScore":
        diff = compareNumber(a.fourConcallScore, b.fourConcallScore, sort.direction);
        break;
      case "growthScore":
        diff = compareNumber(a.growthScore, b.growthScore, sort.direction);
        break;
      case "valuationScore":
        diff = compareNumber(a.valuationScore, b.valuationScore, sort.direction);
        break;
      case "read": {
        // Sorted on the composite, so Read and the # column agree by construction.
        diff = compareNumber(a.readScore, b.readScore, sort.direction);
        if (diff === 0) {
          // Within an identical composite, the better-aligned configuration first.
          const ar = boardReadSortRank(a.readKey);
          const br = boardReadSortRank(b.readKey);
          if (ar == null && br != null) diff = 1;
          else if (ar != null && br == null) diff = -1;
          else if (ar != null && br != null) diff = ar - br;
        }
        break;
      }
    }
    return diff !== 0 ? diff : byName(a, b);
  });
}

