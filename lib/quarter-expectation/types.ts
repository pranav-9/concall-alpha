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

// One row of concallyser's `quarterly_financials` (sql/create_quarterly_financials_table.sql):
// Screener's quarterly P&L, consolidated where it exists, standalone otherwise.
export const quarterlyFinancialsRowSchema = z.object({
  company_code: z.string(),
  fy: z.number().int(),
  qtr: z.number().int().min(1).max(4),
  period_end: z.string(),
  basis: z.enum(["consolidated", "standalone"]),
  revenue_cr: z.coerce.number().nullable(),
  opm_pct: z.coerce.number().nullable(),
  net_profit_cr: z.coerce.number().nullable(),
});
export type QuarterlyFinancialsRow = z.infer<typeof quarterlyFinancialsRowSchema>;

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
export type ExpectedUpdateKind = "due" | "progress" | "catalyst" | "variable" | "fix" | "filing";

// Which way the item leans going in: a raised guide, a catalyst or a good
// filing is upside; an overdue commitment, a lowered guide, a bad filing or
// last call's negative read is downside; a watch trigger or a guide due now
// is open — it could print either way.
export type ExpectedUpdateLean = "upside" | "downside" | "open";

export type ExpectedUpdate = {
  kind: ExpectedUpdateKind;
  heading: string;
  detail: string | null;
  sectionId: string;
  tone: "caution" | "neutral";
  lean: ExpectedUpdateLean;
  /** YYYY-MM-DD the item carries a date of its own (a filing's date); null otherwise. */
  dated: string | null;
};

// A material exchange filing inside the target quarter's window, the shape
// the server threads in from bse_announcements (lib/exchange-desk/types.ts).
export type ExpectationFiling = {
  id: string;
  /** ISO timestamp the filing was made. */
  filedAt: string;
  /** The classifier's one-liner. */
  summary: string;
  category: string;
  impact: "transformative" | "positive" | "neutral" | "negative" | "severe";
};

// One attributed line of the earnings column. `source` names where the number
// came from so the card never shows an unattributed figure.
export type ExpectedEarningsLine = {
  source: "guide";
  /** The guide's family, so the card can drop a line the table already sized. */
  family: "growth" | "margin" | "yield";
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

// The issuer's growth guide applied to the year-ago quarter: what the quarter
// prints if the FY guide holds evenly. A range when the guide is a range.
export type ImpliedQuarter = {
  yearAgoLabel: string;
  yearAgoRevenueCr: number;
  guidePctLo: number;
  guidePctHi: number;
  revenueLoCr: number;
  revenueHiCr: number;
  /** From a margin guide (percent level), when one exists. */
  opmLo: number | null;
  opmHi: number | null;
};

// How the business has actually been running: the last four reported
// quarters' average YoY revenue growth and average OPM.
export type RunRate = {
  revenueYoyPct: number;
  /** Quarter pairs the YoY average was taken over. */
  yoyPairs: number;
  opmPct: number | null;
  /** Average YoY net-profit growth over the same window; null under two positive pairs. */
  netProfitYoyPct: number | null;
  latestLabel: string;
};

// One row of the expectations table: a range for the target quarter against
// the year-ago quarter, with the source the range came from. Rupee rows
// change in percent; the margin row changes in basis points.
export type ExpectationRowKey = "revenue" | "ebitda_margin" | "ebitda" | "net_profit";
export type ExpectationRowSource = "guide" | "run_rate" | "guide_run_rate" | "implied";

export type ExpectationRow = {
  key: ExpectationRowKey;
  label: string;
  unit: "cr" | "pct";
  lo: number;
  hi: number;
  /** The year-ago quarter's print, same unit. */
  yearAgo: number;
  change: { unit: "pct" | "bps"; lo: number; hi: number };
  source: ExpectationRowSource;
  /** The tab the figure traces to; null for a computed row. */
  sectionId: string | null;
};

export type ExpectedEarnings = {
  lines: ExpectedEarningsLine[];
  /** Screener basis of the figures below; null when no financials exist. */
  basis: "consolidated" | "standalone" | null;
  implied: ImpliedQuarter | null;
  runRate: RunRate | null;
  /** The expectations table; empty when the year-ago quarter is not on file. */
  rows: ExpectationRow[];
  /** "Q2 FY26" — the quarter every row compares against; null without financials. */
  yearAgoLabel: string | null;
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
