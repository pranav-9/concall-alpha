import { KpiSparkline } from "concall-alpha";

// The portal's smallest chart: a bare recharts line, no axes, no grid, no
// tooltip — the SHAPE of a series inside one table cell. It appears in the Key
// Variables metric table, the historical-economics data pack, the segment
// history panel, the quarter tracker, and inline inside TrendBadge.
//
// Three behaviours worth knowing before reaching for it:
//   · stroke colour is decided by LAST vs FIRST value only — teal up, rose down,
//     slate flat. It is direction, not judgement: a falling leverage series
//     draws rose while being the good outcome.
//   · nulls are drawn as GAPS (connectNulls is off), so a missing quarter reads
//     as missing instead of being interpolated away.
//   · a dot anchors the last real value, so the eye finds where the series
//     landed even when the tail is null.
//
// It sizes itself to its wrapper (default h-7 w-20); pass className to fit the
// cell you are putting it in.

type Metric = {
  metric: string;
  values: (number | null)[];
  format: (value: number) => string;
};

const PERIODS = ["Q1 FY26", "Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27"];

const METRICS: Metric[] = [
  {
    metric: "Revenue (₹ cr)",
    values: [348, 372, 401, 396, 438],
    format: (v) => v.toFixed(0),
  },
  {
    metric: "Gross margin (%)",
    values: [61.2, 62.0, 63.4, 62.8, 64.1],
    format: (v) => v.toFixed(1),
  },
  {
    metric: "CMS share of revenue (%)",
    values: [48, 51, 53, 52, 56],
    format: (v) => v.toFixed(0),
  },
  {
    metric: "Net debt / EBITDA (x)",
    values: [0.9, 0.8, 0.7, 0.7, 0.6],
    format: (v) => v.toFixed(1),
  },
  {
    metric: "Employee cost (₹ cr)",
    values: [62, 65, null, 69, 71],
    format: (v) => v.toFixed(0),
  },
];

const toPoints = (values: (number | null)[]) =>
  PERIODS.map((period, i) => ({ period, value: values[i] }));

/**
 * Canonical: the Trend column of the Key Variables metric table. One sparkline
 * per metric, at its default size, beside the numbers it summarises.
 */
export const MetricTableTrendColumn = () => (
  <div className="rounded-xl border border-border/20 bg-background/25 p-1">
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border/20">
            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Metric
            </th>
            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Trend
            </th>
            {PERIODS.map((period) => (
              <th
                key={period}
                className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                {period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map((row) => (
            <tr key={row.metric} className="border-b border-border/20 last:border-b-0">
              <td className="px-3 py-2 text-[12px] font-medium text-foreground">{row.metric}</td>
              <td className="px-3 py-2">
                <KpiSparkline
                  ariaLabel={`${row.metric} trend across ${PERIODS.length} quarters`}
                  points={toPoints(row.values)}
                />
              </td>
              {row.values.map((value, i) => (
                <td
                  key={PERIODS[i]}
                  className="px-3 py-2 text-right text-[12px] tabular-nums text-foreground/85"
                >
                  {value == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    row.format(value)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/**
 * Direction sets the stroke, and only direction: last vs first. Falling leverage
 * draws rose even though it is the good outcome — pair the sparkline with a
 * label, never let colour carry the verdict on its own.
 */
export const DirectionSetsTheStroke = () => (
  <div className="space-y-3">
    {[
      {
        label: "Revenue (₹ cr) — rising",
        note: "438 vs 348 over five quarters",
        values: [348, 372, 401, 396, 438] as (number | null)[],
      },
      {
        label: "Net debt / EBITDA (x) — falling",
        note: "0.6 vs 0.9: rose stroke, better business",
        values: [0.9, 0.8, 0.7, 0.7, 0.6] as (number | null)[],
      },
      {
        label: "Realisation (₹/kg) — flat",
        note: "ends where it started",
        values: [412, 418, 409, 415, 412] as (number | null)[],
      },
    ].map((series) => (
      <div
        key={series.label}
        className="flex items-center justify-between gap-4 rounded-md border border-border/25 bg-background/45 px-3 py-2.5"
      >
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-foreground">{series.label}</p>
          <p className="text-[11px] text-muted-foreground">{series.note}</p>
        </div>
        <KpiSparkline
          points={toPoints(series.values)}
          ariaLabel={series.label}
          className="h-10 w-40 shrink-0"
        />
      </div>
    ))}
  </div>
);

/**
 * A quarter the pipeline never scored. The line breaks rather than bridging the
 * hole, and the end dot still marks the last real point — the reader sees the
 * gap instead of a straight line through it.
 */
export const SeriesWithAGap = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/25 bg-background/45 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-foreground">MTAR Technologies · ConcallScore</p>
        <p className="text-[11px] text-muted-foreground">
          Q3 FY26 has no scored call — the call was an analyst meet, not an earnings call.
        </p>
      </div>
      <KpiSparkline
        points={toPoints([7.4, 7.5, null, 7.6, 7.8])}
        ariaLabel="MTAR Technologies score trajectory with one unscored quarter"
        className="h-10 w-40 shrink-0"
      />
    </div>
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/25 bg-background/45 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-foreground">HFCL · Employee cost (₹ cr)</p>
        <p className="text-[11px] text-muted-foreground">
          Trailing null: the dot anchors the last quarter that actually reported.
        </p>
      </div>
      <KpiSparkline
        points={toPoints([62, 65, 67, 69, null])}
        ariaLabel="HFCL employee cost with a missing latest quarter"
        className="h-10 w-40 shrink-0"
      />
    </div>
  </div>
);

/**
 * Fewer than two real points: the component draws a muted placeholder block at
 * exactly the size the chart would have taken, so a newly-onboarded company's
 * table keeps its column widths and row heights.
 */
export const NotEnoughPoints = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/25 bg-background/45 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-foreground">
          Kaynes Micro Electronics · ConcallScore
        </p>
        <p className="text-[11px] text-muted-foreground">
          One scored quarter since onboarding — nothing to draw yet.
        </p>
      </div>
      <KpiSparkline
        points={toPoints([null, null, null, null, 7.1])}
        ariaLabel="Insufficient data for trend"
        className="h-10 w-40 shrink-0"
      />
    </div>
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/25 bg-background/45 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-foreground">Timex Group India · Gross margin</p>
        <p className="text-[11px] text-muted-foreground">
          The placeholder at the inline size the watchlist Trend cell uses.
        </p>
      </div>
      <KpiSparkline
        points={toPoints([null, null, null, null, null])}
        ariaLabel="Insufficient data for trend"
        className="h-6 w-16 shrink-0"
      />
    </div>
  </div>
);
