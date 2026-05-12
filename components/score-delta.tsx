const DELTA_EPSILON = 0.05;

export function ScoreDelta({
  score,
  priorScore,
  priorLabel,
  missingLabel,
  className = "text-[10px]",
  inlineSuffix = true,
}: {
  score: number;
  priorScore: number | null;
  priorLabel?: string | null;
  missingLabel?: string;
  className?: string;
  inlineSuffix?: boolean;
}) {
  if (priorScore == null) {
    if (!missingLabel) return null;
    return (
      <span className={`${className} font-medium text-muted-foreground`}>
        {missingLabel}
      </span>
    );
  }
  const delta = score - priorScore;
  const priorTitle = priorLabel
    ? `Previous (${priorLabel}): ${priorScore.toFixed(1)}`
    : `Previous: ${priorScore.toFixed(1)}`;
  const suffix = inlineSuffix && priorLabel ? ` vs ${priorLabel}` : "";
  if (Math.abs(delta) < DELTA_EPSILON) {
    return (
      <span
        className={`${className} font-medium text-muted-foreground`}
        title={priorTitle}
      >
        no change{suffix}
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
      title={priorTitle}
    >
      {arrow} {Math.abs(delta).toFixed(1)}
      {suffix}
    </span>
  );
}
