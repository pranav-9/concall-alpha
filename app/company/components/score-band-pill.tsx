// Shared Band pill: the score's verdict (Strongly Bullish ... Strongly Bearish)
// as a coloured dot + word. This is the LEVEL signal — orthogonal to Trend
// (direction). Single source so the leaderboard and watchlist render it the
// same. Vocabulary + colours come from lib/score-band.

import { BANDS, bandForScore } from "@/lib/score-band";

export function ScoreBandPill({ score }: { score: number | null | undefined }) {
  if (score == null || !Number.isFinite(score)) {
    return <span className="text-muted-foreground">—</span>;
  }

  const band = BANDS[bandForScore(score)];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${band.barClass}`} />
      <span className={`text-[12px] font-medium ${band.textClass}`}>{band.label}</span>
    </span>
  );
}
