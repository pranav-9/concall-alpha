// Shared Trend cell: trajectory label + Δ, plus an optional inline sparkline
// for the score path's SHAPE. Consumed by the leaderboard (text-only) and the
// watchlist (with sparkline). Single source of the Trend visual so the two
// tables never drift. Vocabulary + colours come from lib/score-trajectory.

import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { TRAJECTORIES, type TrajectoryKey } from "@/lib/score-trajectory";
import type { ScorePoint } from "@/lib/score-path";
import { KpiSparkline } from "./kpi-sparkline";

const TREND_ICONS: Record<TrajectoryKey, LucideIcon> = {
  climbing: TrendingUp,
  inflecting_up: TrendingUp,
  recovering: TrendingUp,
  strong_steady: Minus,
  steady: Minus,
  drifting: Minus,
  choppy: Activity,
  weak_stuck: Minus,
  cracking: TrendingDown,
  worsening: TrendingDown,
  no_read: Minus,
};

export function TrendBadge({
  trajectoryKey,
  trendChange,
  trendDescription,
  scorePath,
}: {
  trajectoryKey?: TrajectoryKey | null;
  trendChange?: number | null;
  trendDescription?: string | null;
  /** Oldest -> newest. When 2+ real points exist, renders an inline sparkline
   * next to the label. Omit for a text-only cell (the leaderboard). */
  scorePath?: ScorePoint[];
}) {
  if (!trajectoryKey || trajectoryKey === "no_read") {
    return (
      <span className="text-muted-foreground" title={TRAJECTORIES.no_read.definition}>
        —
      </span>
    );
  }

  const def = TRAJECTORIES[trajectoryKey];
  const Icon = TREND_ICONS[trajectoryKey];
  const deltaLabel =
    typeof trendChange === "number" && Number.isFinite(trendChange)
      ? `${trendChange >= 0 ? "+" : ""}${trendChange.toFixed(1)}`
      : null;
  const hasSparkline = !!scorePath && scorePath.filter((p) => p.value != null).length >= 2;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] ${def.textClass}`}
      title={`${def.label} — ${trendDescription ?? def.definition}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="font-medium">{def.cellLabel}</span>
      {deltaLabel && <span className="tabular-nums">{deltaLabel}</span>}
      {hasSparkline && (
        <KpiSparkline
          points={scorePath!}
          className="h-6 w-16 shrink-0"
          ariaLabel={`${def.label} score trajectory`}
        />
      )}
    </span>
  );
}
