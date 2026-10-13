import { addDays, istDateOf, seasonWindow, type ISODate } from "@/app/quarter-tracker/season";
import type { ReportingQuarter } from "@/lib/current-quarter";

// The navbar's "Results" pill: how many companies report today and how many
// have declared so far this season, read off `quarter_calendar` (the same rows
// /quarter-tracker draws its season chart from). Whole universe, like the
// tracker — it answers "who has reported", not "who ranks".

export type ResultsPulse = {
  label: string;
  /** Companies whose results date is today (IST). */
  today: number;
  /** Companies whose results date is today or earlier. */
  declared: number;
};

/** The pill stays up a week past the SEBI deadline so late filers still show. */
const SEASON_TAIL_DAYS = 7;

export function isResultsSeason(q: Pick<ReportingQuarter, "fy" | "qtr">, today: ISODate): boolean {
  const { start, deadline } = seasonWindow(q);
  return today >= start && today <= addDays(deadline, SEASON_TAIL_DAYS);
}

export function countResults(
  resultsDates: (string | null | undefined)[],
  today: ISODate,
): Pick<ResultsPulse, "today" | "declared"> {
  let todayCount = 0;
  let declared = 0;
  for (const raw of resultsDates) {
    const day = istDateOf(raw);
    if (!day || day > today) continue;
    declared += 1;
    if (day === today) todayCount += 1;
  }
  return { today: todayCount, declared };
}
