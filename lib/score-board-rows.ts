// Quarter substrate (getConcallData) + growth + valuation -> the four parallel
// 0-10 scores the board renders. Shared by the leaderboard "Overall" tab and the
// watchlist so the two can't drift on the parts a reader would notice most: the
// trailing-4Q quarter leg and the valuation rescale.
//
// The Quarter column shows the STANDING quarter score — the trailing 4-quarter
// mean (getConcallData's "Latest 4Q Avg", one definition in lib/quarter-composite,
// shared with compute_composite_score.py's coverage cut). The single latest print
// rides alongside as `latestQuarterScore`, the "this quarter" marker the freshness
// chips attach to, so a one-quarter badge never sits atop a four-quarter number.
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
    // The standing quarter leg: the trailing 4-quarter mean getConcallData
    // computed under "Latest 4Q Avg" (lib/quarter-composite). It is robust to a
    // company not having reported the board's newest quarter yet — the average
    // still stands on the quarters it does have — so the old single-quarter
    // stale fallback is no longer needed here.
    const quarterScore = toNumericValue(row["Latest 4Q Avg"]);

    // The single latest print, carried separately as the "this quarter" marker.
    // It is the board's newest quarter for this company, or its own newest when
    // it hasn't reported that quarter yet — the same record the freshness /
    // unofficial chips below qualify.
    const boardScore = latestLabel ? toNumericValue(row[latestLabel]) : null;
    const ownScore = toNumericValue(row.ownLatestScore);
    const latestQuarterScore = boardScore ?? ownScore;
    const latestQuarterLabel =
      boardScore != null ? latestLabel : (row.ownLatestQuarterLabel ?? null);

    return {
      companyCode: code,
      companyName: nameByCode.get(code) ?? code,
      quarterScore,
      latestQuarterScore,
      latestQuarterLabel,
      growthScore: growthScoreByCode.get(code) ?? null,
      // getConcallData already applies the publish + staleness gates; this only
      // moves the stored 0-100 integer onto the board's 0-10 scale.
      valuationScore: toValuationScale(toNumericValue(row.valuationScore)),
      belowCut: row.belowCut === true,
      // These describe the single latest print (latestQuarterScore above), which
      // is the quarter the chips name — getConcallData resolves them against that
      // same record.
      quarterSourceStatus: row.latestSourceStatus ?? null,
      quarterScoredWithin24h: row.scoredWithin24h === true,
      quarterScoredAt: row.latestScoredAt ?? null,
    };
  });
}
