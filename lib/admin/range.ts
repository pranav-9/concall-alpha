// The admin panel's one time control. Every section reads the same `?range=`
// query so the picker in the shell can link between sections without losing
// it. Pure: no Next.js or Supabase imports (tests/admin-metrics.test.ts).

export type RangeKey = "7d" | "30d" | "90d" | "all";

export const RANGE_OPTIONS: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
  { key: "all", label: "All", days: null },
];

export const DEFAULT_RANGE: RangeKey = "7d";

/** The chart never draws more than this many days, even on "All". */
export const CHART_MAX_DAYS = 90;
/** MAU needs 29 extra days of rows before the first charted day. */
export const ACTIVE_VISITOR_LOOKBACK_DAYS = 29;

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseRange(value: string | string[] | undefined | null): RangeKey {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "7d" || v === "30d" || v === "90d" || v === "all" ? v : DEFAULT_RANGE;
}

export function rangeDays(range: RangeKey): number | null {
  return RANGE_OPTIONS.find((o) => o.key === range)?.days ?? null;
}

export function rangeLabel(range: RangeKey): string {
  switch (range) {
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    case "all":
      return "All time";
  }
}

/** "vs prior 7d" — the comparison window's name; null on All (no prior window). */
export function priorLabel(range: RangeKey): string | null {
  const days = rangeDays(range);
  return days == null ? null : `vs prior ${days}d`;
}

export type RangeWindow = {
  range: RangeKey;
  /** Start of the current window; null = unbounded (All). */
  startIso: string | null;
  /** Start of the equally long window just before `startIso`; null on All. */
  priorStartIso: string | null;
  /** First day the chart draws. */
  chartStartIso: string;
  /**
   * Earliest row the visitor series needs: the chart start minus the MAU
   * lookback, or the prior window's start, whichever is earlier — so the prior
   * period's unique visitors come out of the same fetch.
   */
  fetchStartIso: string;
};

export function resolveWindow(range: RangeKey, now: Date = new Date()): RangeWindow {
  const nowMs = now.getTime();
  const days = rangeDays(range);
  const startMs = days == null ? null : nowMs - days * DAY_MS;
  const priorStartMs = days == null || startMs == null ? null : startMs - days * DAY_MS;
  const chartStartMs = startMs ?? nowMs - CHART_MAX_DAYS * DAY_MS;
  const lookbackMs = chartStartMs - ACTIVE_VISITOR_LOOKBACK_DAYS * DAY_MS;
  const fetchStartMs = Math.min(lookbackMs, priorStartMs ?? lookbackMs);

  return {
    range,
    startIso: startMs == null ? null : new Date(startMs).toISOString(),
    priorStartIso: priorStartMs == null ? null : new Date(priorStartMs).toISOString(),
    chartStartIso: new Date(chartStartMs).toISOString(),
    fetchStartIso: new Date(fetchStartMs).toISOString(),
  };
}

/** `/admin/companies?range=30d` — the shell's section links carry the range. */
export function adminHref(path: string, range: RangeKey): string {
  return range === DEFAULT_RANGE ? path : `${path}?range=${range}`;
}
