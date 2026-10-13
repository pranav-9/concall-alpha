import { unstable_cache } from "next/cache";

import { istToday, type ISODate } from "@/app/quarter-tracker/season";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { logger } from "@/lib/logger";
import { createPublicReadClient } from "@/lib/supabase/public-read";

import { countResults, isResultsSeason, type ResultsPulse } from "./count";

// `today` is an argument so it is part of the cache key: a day rollover can't
// serve yesterday's "N today" for a revalidate window.
const getCachedCounts = unstable_cache(
  async (fy: number, qtr: number, today: ISODate) => {
    const { data, error } = await createPublicReadClient()
      .from("quarter_calendar")
      .select("results_date")
      .eq("fy", fy)
      .eq("qtr", qtr)
      .not("results_date", "is", null);
    // Throw rather than cache an empty pulse for five minutes.
    if (error) throw error;
    return countResults((data ?? []).map((r) => r.results_date as string | null), today);
  },
  ["results-pulse-v1"],
  { revalidate: 300 },
);

/** Null outside results season or when the read fails — the pill then doesn't render. */
export async function getResultsPulse(now: Date = new Date()): Promise<ResultsPulse | null> {
  const quarter = currentReportingQuarter(now);
  const today = istToday(now);
  if (!isResultsSeason(quarter, today)) return null;
  try {
    const counts = await getCachedCounts(quarter.fy, quarter.qtr, today);
    return { label: quarter.label, ...counts };
  } catch (error) {
    logger.warn("results-pulse: quarter_calendar read failed", { error });
    return null;
  }
}
