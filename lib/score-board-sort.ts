// The score board's data layer: the row type the leaderboard and watchlist
// pages build, the derived rank/Read fields, and the sort rules both of the
// board's layouts (phone list, desktop table) share. Pure — no React, no Next —
// so tests/score-board-sort.test.ts can pin the unranked-last / null-last /
// default-direction rules the UI relies on.

import {
  boardReadSortRank,
  classifyBoardRead,
  type BoardReadKey,
} from "@/lib/board-read";
import type { ScoreSourceStatus } from "@/lib/score-freshness";
import { computeBoardRanks } from "@/lib/leaderboard-rank";
import {
  forensicSortScore,
  guidanceSortScore,
  managementSortScore,
  moatSortScore,
  type BoardSignals,
} from "@/lib/board-signals";

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
   * Provenance and recency of concallScore. Optional because a watchlisted
   * company with no scored quarter is built here as a placeholder row, and a
   * placeholder has no score to qualify.
   */
  quarterSourceStatus?: ScoreSourceStatus;
  concallScoredWithin24h?: boolean;
  /** ISO; feeds the chip titles only. */
  concallScoredAt?: string | null;
  /**
   * The four categorical columns of the watchlist layout (Moat / Checks /
   * Guidance / Management). Only the watchlist page builds them; the
   * leaderboard's rows leave this undefined and its board never renders them.
   */
  signals?: BoardSignals;
  /**
   * Admitted as a large cap, so the company sits outside the ranked universe
   * — the watchlist prints "large cap · unranked" beside the ticker instead of
   * an overall rank.
   */
  largeCap?: boolean;
};

export type DerivedRow = ScoreBoardRow & {
  readKey: BoardReadKey;
  readScore: number | null;
  readDescription: string;
  /** Position key for the default sort. See assignEffectiveRanks. */
  effectiveRank: number;
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
 * rank.
 *
 * Deriving it means # and Read agree by construction, always, with no compute
 * run required. It is also what lets a watchlist share this component: the same
 * code numbers 8 rows 1-8 by their Read without needing a universe to rank
 * against.
 *
 * The ranking itself lives in lib/leaderboard-rank computeBoardRanks so the
 * daily snapshot writer (which feeds the Δ column) ranks the identical universe
 * the identical way — otherwise Δ would compare a rank to itself computed two
 * ways. A row with no Read is unranked (effectiveRank = Infinity).
 */
function assignEffectiveRanks(
  rows: Array<Omit<DerivedRow, "effectiveRank">>,
): DerivedRow[] {
  const rankByCode = computeBoardRanks(rows);
  return rows.map((row) => ({
    ...row,
    effectiveRank: rankByCode.get(row.companyCode) ?? Number.POSITIVE_INFINITY,
  }));
}

export function deriveRows(rows: ScoreBoardRow[]): DerivedRow[] {
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
  );
}


export type SortKey =
  | "coverageRank"
  | "companyName"
  | "latestScore"
  | "fourQScore"
  | "growthScore"
  | "valuationScore"
  | "read"
  // The watchlist layout's categorical columns. Each sorts on a numeric
  // "better first" score from lib/board-signals, so desc = best first like
  // every score column, and a row without the signal sorts last both ways.
  | "moat"
  | "checks"
  | "guidance"
  | "management";
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
    let diff = 0;
    switch (sort.key) {
      case "coverageRank": {
        // effectiveRank, not coverageRank: an as-yet-unranked company sits where
        // its Read puts it. An unranked row (no Read → Infinity) is "no rank",
        // not "the worst rank", so it sorts last in BOTH directions, like a null
        // score; unranked rows then fall to the name tie-break.
        const ar = Number.isFinite(a.effectiveRank) ? a.effectiveRank : null;
        const br = Number.isFinite(b.effectiveRank) ? b.effectiveRank : null;
        diff = compareNumber(ar, br, sort.direction);
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
      case "moat":
        diff = compareNumber(
          moatSortScore(a.signals?.moat),
          moatSortScore(b.signals?.moat),
          sort.direction,
        );
        break;
      case "checks":
        diff = compareNumber(
          forensicSortScore(a.signals?.forensics),
          forensicSortScore(b.signals?.forensics),
          sort.direction,
        );
        break;
      case "guidance":
        diff = compareNumber(
          guidanceSortScore(a.signals?.guidance),
          guidanceSortScore(b.signals?.guidance),
          sort.direction,
        );
        break;
      case "management":
        diff = compareNumber(
          managementSortScore(a.signals?.management),
          managementSortScore(b.signals?.management),
          sort.direction,
        );
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

