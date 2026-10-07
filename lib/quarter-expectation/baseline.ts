import { quarterLabelFor } from "@/lib/current-quarter";
import { quarterIndex } from "@/lib/score-trajectory";

import type { ScoreBaselineResult } from "./types";

// The in-line baseline for a quarter: the mean of the four scored quarters
// BEFORE it (the dashed 4Q line the chart already draws, read one step ahead)
// with a band of ± the company's own typical quarter-to-quarter move.
//
// It is a reference, not a forecast — the score reads the call after it
// happens (Journal, 2026-06-12), and the event studies find the post-results
// signal in the score LEVEL, not the quarter-on-quarter surprise. The point
// of writing the baseline down before the call is to make the surprise
// legible afterwards: "scored 7.4 against a 6.8 baseline".
//
// Only rows strictly before the target feed it, so the number does not move
// once the quarter lands (an older quarter being re-scored is the one thing
// that would shift it, and the project avoids re-scoring stored quarters).

export const BASELINE_WINDOW = 4;
// Re-score drift on identical documents is ±0.5 (NEULANDLAB 12-quarter
// study, 2026-06-12): a band narrower than that would call noise a surprise.
export const BASELINE_BAND_FLOOR = 0.5;
// The most recent scored quarter must be within this many quarters of the
// target, else the trail is too old to stand in for "in line".
export const BASELINE_MAX_STALE_QUARTERS = 2;
// A measured swing needs at least this many historical deviations (six
// scored quarters) before it replaces the floor; one deviation is an anecdote.
export const BASELINE_MIN_DEVIATIONS = 2;

export type ScoreRow = {
  fy: number;
  qtr: number;
  score: number | string | null | undefined;
  /** Row id; when two rows share a quarter the higher id wins. */
  id?: number | null;
};

type ScoredQuarter = { index: number; fy: number; qtr: number; score: number };

const round1 = (n: number) => Math.round(n * 10) / 10;

const toScore = (value: unknown): number | null => {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const median = (xs: number[]): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// One scored point per (fy, qtr), ascending. concall_analysis upserts on the
// quarter key so duplicates should not exist, but a stray pair (an unofficial
// and an official row that were never reconciled) must not count twice: the
// higher id — the later write — wins.
export const scoredQuarters = (rows: ScoreRow[]): ScoredQuarter[] => {
  const byIndex = new Map<number, { row: ScoreRow; score: number }>();
  for (const row of rows) {
    if (!Number.isInteger(row.fy) || !Number.isInteger(row.qtr)) continue;
    const score = toScore(row.score);
    if (score == null) continue;
    const index = quarterIndex(row.fy, row.qtr);
    const existing = byIndex.get(index);
    if (!existing || (row.id ?? -Infinity) >= (existing.row.id ?? -Infinity)) {
      byIndex.set(index, { row, score });
    }
  }
  return [...byIndex.entries()]
    .map(([index, { row, score }]) => ({ index, fy: row.fy, qtr: row.qtr, score }))
    .sort((a, b) => a.index - b.index);
};

export function buildScoreBaseline(
  rows: ScoreRow[],
  target: { fy: number; qtr: number },
): ScoreBaselineResult {
  const targetIndex = quarterIndex(target.fy, target.qtr);
  const prior = scoredQuarters(rows).filter((q) => q.index < targetIndex);
  const latest = prior[prior.length - 1] ?? null;
  const latestLabel = latest ? quarterLabelFor(latest.fy, latest.qtr) : null;

  if (prior.length < BASELINE_WINDOW) {
    return { ok: false, miss: { reason: "too_few", scoredQuarters: prior.length, latestLabel } };
  }
  if (latest && targetIndex - latest.index > BASELINE_MAX_STALE_QUARTERS) {
    return { ok: false, miss: { reason: "stale", scoredQuarters: prior.length, latestLabel } };
  }

  const window = prior.slice(-BASELINE_WINDOW);
  const baseline = round1(mean(window.map((q) => q.score)));

  // The band: how far this company's score typically lands from its own
  // trailing-4Q mean, measured over every earlier quarter that had four
  // predecessors. Median, so one wild quarter does not widen it for good.
  const deviations: number[] = [];
  for (let i = BASELINE_WINDOW; i < prior.length; i += 1) {
    const trailing = mean(prior.slice(i - BASELINE_WINDOW, i).map((q) => q.score));
    deviations.push(Math.abs(prior[i].score - trailing));
  }
  const measured = deviations.length >= BASELINE_MIN_DEVIATIONS ? median(deviations) : 0;
  const band = round1(Math.max(BASELINE_BAND_FLOOR, measured));

  return {
    ok: true,
    value: {
      baseline,
      low: round1(Math.max(1, baseline - band)),
      high: round1(Math.min(10, baseline + band)),
      band,
      quarters: window.map((q) => ({ label: quarterLabelFor(q.fy, q.qtr), score: q.score })),
      deviationCount: deviations.length,
    },
  };
}

// For a quarter that HAS a score: how it landed against the baseline that
// stood before it. Powers the "vs in-line baseline" line on every historical
// quarter in the picker, so the comparison outlives the season rollover.
export function scoreVsBaseline(
  rows: ScoreRow[],
  quarter: { fy: number; qtr: number },
): { score: number; baseline: number; band: number; delta: number } | null {
  const index = quarterIndex(quarter.fy, quarter.qtr);
  const scored = scoredQuarters(rows).find((q) => q.index === index);
  if (!scored) return null;
  const result = buildScoreBaseline(rows, quarter);
  if (!result.ok) return null;
  return {
    score: scored.score,
    baseline: result.value.baseline,
    band: result.value.band,
    delta: round1(scored.score - result.value.baseline),
  };
}
