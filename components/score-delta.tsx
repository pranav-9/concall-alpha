const DELTA_EPSILON = 0.05;

export function ScoreDelta({
  score,
  priorScore,
  className = "text-[10px]",
}: {
  score: number;
  priorScore: number | null;
  className?: string;
}) {
  if (priorScore == null) return null;
  const delta = score - priorScore;
  if (Math.abs(delta) < DELTA_EPSILON) {
    return (
      <span className={`${className} font-medium text-muted-foreground`}>
        no change
      </span>
    );
  }
  const isUp = delta > 0;
  const arrow = isUp ? "▲" : "▼";
  const tone = isUp
    ? "text-emerald-700 dark:text-emerald-300"
    : "text-rose-700 dark:text-rose-300";
  return (
    <span
      className={`${className} font-semibold tabular-nums ${tone}`}
      title={`Previous: ${priorScore.toFixed(1)}`}
    >
      {arrow} {Math.abs(delta).toFixed(1)}
    </span>
  );
}
