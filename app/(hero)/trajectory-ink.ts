// One ink per trajectory family, so the hero plate and the wall colour the same
// shape the same way. Families collapse the 11-label taxonomy down to the four
// readings a glance can hold; the label itself carries the precision.

import { TRAJECTORY_ORDER, type TrajectoryKey } from "@/lib/score-trajectory";

export type InkFamily = "signal" | "neutral" | "warn" | "alarm";

const FAMILY_BY_KEY: Record<TrajectoryKey, InkFamily> = {
  climbing: "signal",
  inflecting_up: "signal",
  recovering: "signal",
  strong_steady: "signal",
  steady: "neutral",
  drifting: "neutral",
  no_read: "neutral",
  choppy: "warn",
  weak_stuck: "warn",
  cracking: "alarm",
  worsening: "alarm",
};

export const INK: Record<InkFamily, string> = {
  signal: "var(--signal)",
  neutral: "var(--ink-soft)",
  warn: "var(--warn)",
  alarm: "var(--alarm)",
};

export const FAMILY_LABEL: Record<InkFamily, string> = {
  signal: "Improving or holding strong",
  neutral: "Range-bound",
  warn: "Unstable or stuck low",
  alarm: "Breaking down",
};

/** Family order for the legend — best reading first, matching trajectory rank. */
export const FAMILY_ORDER: InkFamily[] = ["signal", "neutral", "warn", "alarm"];

export function trajectoryInk(key: TrajectoryKey): InkFamily {
  return FAMILY_BY_KEY[key] ?? "neutral";
}

/** Trajectory labels belonging to a family, best first — powers the legend. */
export function familyTrajectories(family: InkFamily): TrajectoryKey[] {
  return TRAJECTORY_ORDER.filter((key) => FAMILY_BY_KEY[key] === family);
}
