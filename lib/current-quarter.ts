import { inferFyQtrFromEventDate } from "@/lib/nse-event-calendar";

export type ReportingQuarter = { fy: number; qtr: number; label: string };

export const quarterLabelFor = (fy: number, qtr: number): string => {
  // fy is stored as 4-digit year (e.g. 2027); display as 2-digit "FY27".
  const short = fy >= 2000 ? fy - 2000 : fy;
  return `Q${qtr} FY${String(short).padStart(2, "0")}`;
};

// The quarter whose results are currently in reporting season (Indian FY,
// Apr–Mar). Jul 2026 → { fy: 2027, qtr: 1, label: "Q1 FY27" }, matching
// concall_analysis.fy/qtr. Flips on Jan/Apr/Jul/Oct 1 regardless of whether
// any results have landed yet.
export function currentReportingQuarter(today: Date = new Date()): ReportingQuarter {
  const { fy, qtr } = inferFyQtrFromEventDate(today);
  return { fy, qtr, label: quarterLabelFor(fy, qtr) };
}
