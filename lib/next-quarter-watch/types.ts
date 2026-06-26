import type { TrajectoryKey } from "@/lib/score-trajectory";

// "What to watch next quarter" — a downstream SYNTHESIS over data already on the
// Quarter Score page. It is NOT a numeric prediction; it names the open
// questions heading into next quarter and stays SILENT when there's nothing to
// flag. Two of its three inputs (trajectory, score-vs-forward divergence) are
// cross-quarter / cross-phase, so this can only live downstream of scoring.

export type WatchKind = "divergence" | "trajectory" | "swing";
export type WatchTone = "caution" | "neutral";

export type WatchItem = {
  kind: WatchKind;
  heading: string;
  detail: string;
  tone: WatchTone;
};

// Only emitted when the block renders (i.e. a concern fired). Never a number.
export type WatchLean = "cautious" | null;

export type WatchView = {
  items: WatchItem[]; // empty => nothing flagged; the caller shows a quiet one-liner
  lean: WatchLean;
};

// A swing variable to monitor — from key_variables_snapshot.deep_treatment.
// Enriches a concern; on its own it does NOT trigger the block (every company
// has swing variables, so that would never be silent).
export type WatchSwingVar = {
  variable: string;
  note: string | null; // why_it_matters_now ?? trend_interpretation ?? current_read
};

// The series-level trajectory (lib/score-trajectory classifyTrajectory result).
export type WatchTrajectory = {
  key: TrajectoryKey;
  change: number;
  label: string; // TRAJECTORIES[key].label
  description: string;
};

export type BuildWatchInput = {
  latestScore: number | null;
  growthScore: number | null;
  trajectory: WatchTrajectory | null;
  swingVars: WatchSwingVar[];
};
