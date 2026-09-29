import "server-only";

// Builds the watchlist board from the substrate the page already fetched —
// the quarter rows (getConcallData), company names + coverage, latest growth
// scores — plus the four categorical signals fetched here for just the list's
// codes. Shared by the watchlist page and the dev preview
// (app/dev/watchlist-board) so the two can't drift.

import type { CompanyRow } from "@/app/company/leaderboard-table";
import type { ScoreBoardRow } from "@/components/score-board-table";
import { BOARD_READS, classifyBoardRead } from "@/lib/board-read";
import { isAdmittedLargeCap, type CoverageFields } from "@/lib/coverage-policy";
import { computeBoardRanks, type RankableRow } from "@/lib/leaderboard-rank";
import { buildReadDistribution, type ReadDistribution } from "@/lib/read-distribution";
import { buildScoreBoardRows } from "@/lib/score-board-rows";
import { fetchWatchlistSignals } from "@/lib/watchlist-signals";

export type CompanyNameRow = CoverageFields & {
  code: string;
  name?: string | null;
};

export type GrowthRankRow = {
  company?: string | null;
  growth_score?: string | number | null;
  run_timestamp?: string | null;
};

const toNumeric = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export type WatchlistBoard = {
  tableRows: ScoreBoardRow[];
  /** UPPERCASE code → live rank on the leaderboard's Overall board. */
  overallRankByCode: Record<string, number>;
  readDistribution: ReadDistribution | null;
};

export async function buildWatchlistBoard({
  watchlistCodes,
  rows,
  latestLabel,
  companyNameRows,
  growthRows,
}: {
  /** UPPERCASE codes, in list order. */
  watchlistCodes: string[];
  rows: CompanyRow[];
  latestLabel: string | null;
  companyNameRows: CompanyNameRow[];
  growthRows: GrowthRankRow[];
}): Promise<WatchlistBoard> {
  // The four categorical columns, for just these codes (moat, forensic tally,
  // guidance strength, credibility). A failed read empties its column, never
  // the board.
  const signalsByCode = await fetchWatchlistSignals(watchlistCodes);

  const latestGrowthByCompany = new Map<string, GrowthRankRow>();
  growthRows.forEach((row) => {
    const key = (row.company ?? "").trim().toUpperCase();
    if (!key || latestGrowthByCompany.has(key)) return;
    latestGrowthByCompany.set(key, row);
  });

  const growthScoreByCode = new Map<string, number | null>();
  latestGrowthByCompany.forEach((row, companyCode) => {
    growthScoreByCode.set(companyCode, toNumeric(row.growth_score));
  });

  const companyNameByCode = new Map<string, string>();
  const coverageByCode = new Map<string, CompanyNameRow>();
  companyNameRows.forEach((row) => {
    const code = row.code.toUpperCase();
    companyNameByCode.set(code, row.name?.trim() || row.code);
    coverageByCode.set(code, row);
  });

  // Same builder the leaderboard's Overall tab uses, so the four columns mean
  // exactly the same thing on both surfaces — including the stale-quarter
  // fallback and the 0-100 -> 0-10 valuation rescale.
  const boardRowsByCode = new Map(
    buildScoreBoardRows(rows, latestLabel, growthScoreByCode, companyNameByCode).map(
      (row) => [row.companyCode, row],
    ),
  );

  // A watchlisted company with no scored quarter at all never reaches
  // getConcallData's output, so it needs a placeholder row rather than silently
  // disappearing from a list the user built by hand.
  const tableRows: ScoreBoardRow[] = watchlistCodes.map((companyCode) => {
    const base: ScoreBoardRow = boardRowsByCode.get(companyCode) ?? {
        companyCode,
        companyName: companyNameByCode.get(companyCode) ?? companyCode,
        concallScore: null,
        fourConcallScore: null,
        latestConcallScore: null,
        latestQuarterLabel: null,
        growthScore: growthScoreByCode.get(companyCode) ?? null,
        valuationScore: null,
        belowCut: false,
      };
    const coverage = coverageByCode.get(companyCode);
    return {
      ...base,
      signals: signalsByCode[companyCode],
      largeCap: coverage != null && isAdmittedLargeCap(coverage),
    };
  });

  // Summarised in the Read column's own configuration vocabulary — the same line
  // the leaderboard runs above its Overall board.
  const reads = tableRows.map((row) =>
    classifyBoardRead({
      concallScore: row.concallScore,
      growthScore: row.growthScore,
      valuationScore: row.valuationScore,
    }),
  );

  // The reference population for the curve AND the overall-rank chips. Only the
  // ADMISSION gate applies: large caps are outside the positioning entirely, but
  // the below-the-cut tail is still ours and belongs in a picture of the universe
  // — the same population the leaderboard's Overall board renders
  // (excludeLargeCaps + includeBelowCut). Note this is the covered universe, not
  // the watchlist's own peers: a holding that's a large cap still gets a needle,
  // it just isn't in the shape (and carries no overall rank).
  const universeReadScores: number[] = [];
  const universeRankableRows: RankableRow[] = [];
  boardRowsByCode.forEach((row, code) => {
    if (isAdmittedLargeCap(coverageByCode.get(code))) return;
    const read = classifyBoardRead({
      concallScore: row.concallScore,
      growthScore: row.growthScore,
      valuationScore: row.valuationScore,
    });
    universeRankableRows.push({
      companyCode: code,
      companyName: row.companyName,
      readScore: read.key === "no_read" ? null : read.score,
      growthScore: row.growthScore,
    });
    // "Has a read" is the same test the summary line above the board uses, so
    // the two counts on this page can't mean different things.
    if (read.key === "no_read" || read.score == null) return;
    universeReadScores.push(read.score);
  });
  // Each holding's live # on the leaderboard's Overall board — the same ranking
  // fn over the same universe, so the chip can never disagree with the board. A
  // plain Record: it crosses into the client table component.
  const overallRankByCode = Object.fromEntries(computeBoardRanks(universeRankableRows));

  const readDistribution = buildReadDistribution(
    universeReadScores,
    tableRows.map((row, i) => ({
      code: row.companyCode,
      name: row.companyName,
      score: reads[i].key === "no_read" ? null : reads[i].score,
      readLabel: BOARD_READS[reads[i].key].label,
    })),
  );

  return { tableRows, overallRankByCode, readDistribution };
}
