import { inferFyQtrFromEventDate } from "@/lib/nse-event-calendar";

export type ReportingQuarter = { fy: number; qtr: number; label: string };

// fy is stored as a 4-digit year (e.g. 2027); display as 2-digit "FY27".
// The 2000 epoch lives here only — anything else rendering an FY label reads
// it through this, so a heading and the quarter chips beside it can't drift.
export const fyLabelFor = (fy: number): string =>
  `FY${String(fy >= 2000 ? fy - 2000 : fy).padStart(2, "0")}`;

export const quarterLabelFor = (fy: number, qtr: number): string =>
  `Q${qtr} ${fyLabelFor(fy)}`;

// The quarter whose results are currently in reporting season (Indian FY,
// Apr–Mar). Jul 2026 → { fy: 2027, qtr: 1, label: "Q1 FY27" }, matching
// concall_analysis.fy/qtr. Flips on Jan/Apr/Jul/Oct 1 regardless of whether
// any results have landed yet.
export function currentReportingQuarter(today: Date = new Date()): ReportingQuarter {
  const { fy, qtr } = inferFyQtrFromEventDate(today);
  return { fy, qtr, label: quarterLabelFor(fy, qtr) };
}
