// Quarter substrate (getConcallData) + growth + valuation -> the four parallel
// 0-10 scores the board renders. Shared by the leaderboard "Overall" tab and the
// watchlist so the two can't drift on the parts a reader would notice most: the
// stale-quarter fallback and the valuation rescale.
//
// Moat and guidance are deliberately absent — the moat rating is categorical and
// can't share the number+band format, so it keeps its own leaderboard tab. See
// components/score-board-table.tsx.

import type { CompanyRow } from "@/app/company/leaderboard-table";
import type { ScoreBoardRow } from "@/components/score-board-table";
import { toValuationScale } from "@/lib/valuation-band";

const toNumericValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export function buildScoreBoardRows(
  rows: CompanyRow[],
  latestLabel: string | null,
  growthScoreByCode: Map<string, number | null>,
  nameByCode: Map<string, string>,
): ScoreBoardRow[] {
  return rows.map((row) => {
    const code = String(row.company).toUpperCase();
    // A company that hasn't reported the board's latest quarter yet would show a
    // bare "—", which empties the column at the start of every earnings season.
    // Fall back to its own newest quarter and label it, the same way the
    // /company board does (app/company/leaderboard-table.tsx).
    const boardScore = latestLabel ? toNumericValue(row[latestLabel]) : null;
    const ownScore = toNumericValue(row.ownLatestScore);
    const isStale = boardScore == null && ownScore != null;
    return {
      companyCode: code,
      companyName: nameByCode.get(code) ?? code,
      quarterScore: boardScore ?? ownScore,
      quarterAsOf: isStale ? (row.ownLatestQuarterLabel ?? null) : null,
      growthScore: growthScoreByCode.get(code) ?? null,
      // getConcallData already applies the publish + staleness gates; this only
      // moves the stored 0-100 integer onto the board's 0-10 scale.
      valuationScore: toValuationScale(toNumericValue(row.valuationScore)),
      belowCut: row.belowCut === true,
    };
  });
}
