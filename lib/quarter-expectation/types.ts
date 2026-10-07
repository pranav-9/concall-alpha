import { z } from "zod";

import type { ReportingQuarter } from "@/lib/current-quarter";
import type { WatchItem, WatchLean } from "@/lib/next-quarter-watch/types";

// "What to expect" for the quarter in reporting season (lib/current-quarter
// currentReportingQuarter), rendered at the top of the ConcallScore section.
// Everything here is DERIVED from promoted rows the company page already
// reads — a baseline from the score trail, the issuer's own guide, and a
// templated list of what the call is due to update on. Nothing is predicted
// and nothing is curated per company.

// One row of concallyser's `quarter_calendar` (sql/create_quarter_calendar_table.sql):
// the exchange board-meeting date for the results and the Reg-30 call invite.
export const quarterCalendarRowSchema = z.object({
  company_code: z.string(),
  fy: z.number().int(),
  qtr: z.number().int().min(1).max(4),
  results_date: z.string().nullable(),
  call_date: z.string().nullable(),
  call_time: z.string().nullable(),
  call_status: z.enum(["parsed", "unreadable"]).nullable(),
  call_source_url: z.string().nullable(),
});
export type QuarterCalendarRow = z.infer<typeof quarterCalendarRowSchema>;

export type ExpectationCalendar = {
  /** YYYY-MM-DD, the board meeting that approves the results. */
  resultsDate: string | null;
  callDate: string | null;
  /** HH:MM[:SS] IST. */
  callTime: string | null;
  callUrl: string | null;
  /** An invite was filed but its date could not be read. */
  callUnreadable: boolean;
};

// The in-line baseline: what the score would print if the quarter lands in
// line with the trail. See baseline.ts for the rule.
export type ScoreBaseline = {
  baseline: number;
  low: number;
  high: number;
  /** Half-width of the band (± around the baseline). */
  band: number;
  /** The quarters averaged, oldest → newest. */
  quarters: { label: string; score: number }[];
  /** How many historical deviations the band was measured over; 0 = floor only. */
  deviationCount: number;
};

export type ScoreBaselineMiss = {
  reason: "too_few" | "stale";
  scoredQuarters: number;
  latestLabel: string | null;
};

export type ScoreBaselineResult =
  | { ok: true; value: ScoreBaseline }
  | { ok: false; miss: ScoreBaselineMiss };

// What the call is due to update on. `kind` fixes the order of precedence
// (updates.ts); `sectionId` points at the tab the item came from.
export type ExpectedUpdateKind = "due" | "progress" | "catalyst" | "variable" | "fix";

export type ExpectedUpdate = {
  kind: ExpectedUpdateKind;
  heading: string;
  detail: string | null;
  sectionId: string;
  tone: "caution" | "neutral";
};

// One attributed line of the earnings column. `source` names where the number
// came from so the card never shows an unattributed figure.
export type ExpectedEarningsLine = {
  source: "guide";
  /** "Revenue" | "EBITDA margin" … (the guide's metric label). */
  metricLabel: string;
  /** The guided value as the producer wrote it, e.g. "+20%" | "24–25%". */
  valueLabel: string;
  /** "FY27" | "Q2 FY27". */
  horizonLabel: string | null;
  /** Whole company or a named segment. */
  segment: string | null;
  sectionId: string;
};

export type ExpectedEarnings = {
  lines: ExpectedEarningsLine[];
};

export type QuarterExpectationState = "upcoming" | "landed";

export type QuarterExpectation = {
  target: ReportingQuarter;
  state: QuarterExpectationState;
  calendar: ExpectationCalendar | null;
  baseline: ScoreBaselineResult;
  /** The target quarter's score once it has landed. */
  landedScore: number | null;
  /** Null when no substrate yields a line (the column is omitted). */
  earnings: ExpectedEarnings | null;
  updates: ExpectedUpdate[];
};

// The divergence / falling-trajectory read that used to be the whole "What to
// watch next quarter" block. It is computed client-side (it needs the series
// trajectory) and rendered as the card's setup chip.
export type ExpectationSetup = {
  items: WatchItem[];
  lean: WatchLean;
};
