import { daysBetween, istToday } from "@/lib/calendar-format";
import { quarterLabelFor, type ReportingQuarter } from "@/lib/current-quarter";
import { quarterIndex } from "@/lib/score-trajectory";

import { buildScoreBaseline, scoredQuarters, type ScoreRow } from "./baseline";
import type { ExpectationCalendar, ExpectedEarnings, ExpectedUpdate, ScoreBaselineResult } from "./types";

// The server-built half: what the ConcallScore panel computes from the
// calendar, guidance, growth and key-variable rows and threads to the client
// chunk. Small and serialisable — never the rows themselves.
export type QuarterExpectationData = {
  target: ReportingQuarter;
  calendar: ExpectationCalendar | null;
  earnings: ExpectedEarnings | null;
  updates: ExpectedUpdate[];
};

// upcoming — results not out (or no date known); the full card.
// pending  — the results date has passed and no score exists yet (the SEBI
//            transcript window); the card keeps the list, drops the number.
// landed   — the target quarter is scored; the card steps aside and the
//            "vs 4Q avg" line in "Where it sits" carries the comparison.
export type QuarterExpectationState = "upcoming" | "pending" | "landed";

export type QuarterExpectationView = QuarterExpectationData & {
  state: QuarterExpectationState;
  baseline: ScoreBaselineResult;
  landedScore: number | null;
  /** The quarter before the target that was never scored (e.g. after a rollover). */
  unscoredPriorLabel: string | null;
  /** Days from today (IST) to the results date; negative once past. */
  daysToResults: number | null;
  /** No date, no list, no guide, no baseline: render the one-line form, not a box. */
  empty: boolean;
};

export function buildQuarterExpectationView(
  data: QuarterExpectationData,
  rows: ScoreRow[],
  today: string = istToday(),
): QuarterExpectationView {
  const { target } = data;
  const targetIndex = quarterIndex(target.fy, target.qtr);
  const scored = scoredQuarters(rows);
  const landed = scored.find((q) => q.index === targetIndex) ?? null;
  const resultsDate = data.calendar?.resultsDate ?? null;
  const daysToResults = resultsDate ? daysBetween(today, resultsDate) : null;

  const state: QuarterExpectationState = landed
    ? "landed"
    : daysToResults != null && daysToResults < 0
      ? "pending"
      : "upcoming";

  const baseline = buildScoreBaseline(rows, target);

  const prior = target.qtr === 1 ? { fy: target.fy - 1, qtr: 4 } : { fy: target.fy, qtr: target.qtr - 1 };
  const hasPrior = scored.some((q) => q.fy === prior.fy && q.qtr === prior.qtr);
  const unscoredPriorLabel =
    !landed && scored.length > 0 && !hasPrior ? quarterLabelFor(prior.fy, prior.qtr) : null;

  const empty =
    state !== "landed" &&
    !resultsDate &&
    data.updates.length === 0 &&
    data.earnings == null &&
    !baseline.ok;

  return {
    ...data,
    state,
    baseline,
    landedScore: landed?.score ?? null,
    unscoredPriorLabel,
    daysToResults,
    empty,
  };
}
