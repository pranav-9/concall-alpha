// Builds the per-company score path the watchlist sparkline renders. The
// trajectory engine (lib/score-trajectory) already classifies direction; this
// gives the reader the SHAPE the label compresses away ("staircase vs spike").
//
// getConcallData() rows carry one column per quarter keyed by label, and
// quarterLabels comes back LATEST-FIRST. The sparkline reads left-to-right like
// a chart, so this reverses to oldest -> newest. Non-numeric cells (missing
// quarter, unscored) become null; KpiSparkline draws across them with a gap.

export type ScorePoint = { period: string; value: number | null };

export function buildScorePath(
  row: Record<string, unknown>,
  quarterLabels: readonly string[],
): ScorePoint[] {
  return [...quarterLabels].reverse().map((label) => {
    const v = row[label];
    return {
      period: label,
      value: typeof v === "number" && Number.isFinite(v) ? v : null,
    };
  });
}
