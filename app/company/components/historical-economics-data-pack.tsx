"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiSparkline } from "./kpi-sparkline-lazy";
import { getDeltaToneClass } from "./delta-tone";
// Single source of segment color so a series keeps one hue across the whole
// Business Snapshot section (the mix strip, the card dots, and these charts).
// Colors align by sorted position; exact name-keyed identity across the mix
// strip (which groups to maxSlices + Others) and these ungrouped charts only
// holds for the top series, which is acceptable.
import { colorPalette as unitPalette } from "./business-segment-mix-constants";
import { formatPeriodDelta, getPeriodOverPeriodDelta } from "@/lib/period-delta";
import type {
  NormalizedHistoricalEconomics,
  NormalizedRevenueHistoryBySegment,
  NormalizedRevenueHistoryBySegmentRow,
  NormalizedRevenueMixHistoryBySegment,
  NormalizedRevenueMixHistoryBySegmentRow,
  NormalizedRevenueHistoryByUnit,
  NormalizedRevenueHistoryByUnitRow,
  NormalizedRevenueMixHistoryByUnit,
  NormalizedRevenueMixHistoryByUnitRow,
} from "@/lib/business-snapshot/types";

const valueFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

const formatAbsoluteValue = (value: number | null | undefined) =>
  value == null ? "—" : valueFormatter.format(value);

const formatPercentValue = (value: number | null | undefined) =>
  value == null ? "—" : `${percentFormatter.format(value)}%`;

const formatMixDeltaLabel = (value: number | null | undefined) => {
  if (value == null) return "—";
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}pp`;
};

const getStableSeriesColors = (labels: string[]) => {
  const orderedLabels: string[] = [];
  const seen = new Set<string>();

  labels.forEach((label) => {
    if (!seen.has(label)) {
      seen.add(label);
      orderedLabels.push(label);
    }
  });

  return orderedLabels.reduce<Record<string, string>>((acc, label, index) => {
    acc[label] = unitPalette[index % unitPalette.length];
    return acc;
  }, {});
};

const buildSeriesConfig = (
  units: string[],
  unitColors: Record<string, string>,
): ChartConfig =>
  units.reduce<ChartConfig>((acc, unit, index) => {
    acc[`series_${index}`] = {
      label: unit,
      color: unitColors[unit] ?? unitPalette[index % unitPalette.length],
    };
    return acc;
  }, {});

const buildRevenueChartData = (
  module: NormalizedRevenueHistoryByUnit,
  chartRows: NormalizedRevenueHistoryByUnitRow[],
) =>
  module.periods.map((period) => {
    const row: Record<string, string | number | null> = { period };
    chartRows.forEach((item, index) => {
      row[`series_${index}`] = item.valuesByPeriod[period] ?? null;
    });
    return row;
  });

const buildMixChartData = (
  module: NormalizedRevenueMixHistoryByUnit,
  rows: NormalizedRevenueMixHistoryByUnitRow[],
) =>
  module.periods.map((period) => {
    const row: Record<string, string | number | null> = { period };
    rows.forEach((item, index) => {
      row[`series_${index}`] = item.mixByPeriod[period] ?? null;
    });
    return row;
  });

const buildRevenueSegmentChartData = (
  periods: string[],
  rows: NormalizedRevenueHistoryBySegmentRow[],
) =>
  periods.map((period) => {
    const row: Record<string, string | number | null> = { period };
    rows.forEach((item, index) => {
      row[`series_${index}`] = item.revenueByYear[period] ?? null;
    });
    return row;
  });

const buildMixSegmentChartData = (
  periods: string[],
  rows: NormalizedRevenueMixHistoryBySegmentRow[],
) =>
  periods.map((period) => {
    const row: Record<string, string | number | null> = { period };
    rows.forEach((item, index) => {
      row[`series_${index}`] = item.mixPercentByYear[period] ?? null;
    });
    return row;
  });


// Index of the last point with a real value, so a series is labelled at the
// end of its drawn line (Tufte: direct labels beat a detached colour key).
const getLastValidIndex = (
  rows: Array<Record<string, string | number | null>>,
  dataKey: string,
) => {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (typeof rows[i][dataKey] === "number") return i;
  }
  return -1;
};

const truncateSeriesLabel = (label: string) =>
  label.length > 14 ? `${label.slice(0, 13)}…` : label;

const renderEndLineLabel = (
  props: { x?: number; y?: number; index?: number },
  label: string,
  color: string,
  lastIndex: number,
) => {
  const { x, y, index } = props;
  if (index !== lastIndex || x == null || y == null) {
    return <g key={`end-label-${index}`} />;
  }
  return (
    <text
      key={`end-label-${index}`}
      x={x + 4}
      y={y}
      dy={3}
      fontSize={10}
      fontWeight={500}
      fill={color}
      textAnchor="start"
    >
      {truncateSeriesLabel(label)}
    </text>
  );
};

const getCagrDisplayClassName = (value: number | null | undefined) => {
  if (value == null) {
    return "border-border/60 bg-muted/60 text-muted-foreground";
  }
  if (value > 0) {
    return "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200";
  }
  if (value < 0) {
    return "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200";
  }
  return "border-border/60 bg-muted/60 text-foreground";
};

const getLatestNumericValue = (
  periods: string[],
  valuesByPeriod: Record<string, number | null>,
) => {
  for (let index = periods.length - 1; index >= 0; index -= 1) {
    const value = valuesByPeriod[periods[index]];
    if (typeof value === "number") {
      return value;
    }
  }
  return Number.NEGATIVE_INFINITY;
};

const getPeriodOverPeriodPpChange = (
  periods: string[],
  valuesByPeriod: Record<string, number | null>,
  period: string,
) => {
  const periodIndex = periods.indexOf(period);
  if (periodIndex <= 0) return null;

  const currentValue = valuesByPeriod[periods[periodIndex]];
  const previousValue = valuesByPeriod[periods[periodIndex - 1]];

  if (typeof currentValue !== "number" || typeof previousValue !== "number") {
    return null;
  }

  return currentValue - previousValue;
};

const getOrderedRevenueHistoryRows = (
  rows: NormalizedRevenueHistoryByUnitRow[],
  periods: string[],
) => {
  const consolidatedRows = rows.filter((row) => row.isConsolidated);
  const unitRows = rows.filter((row) => !row.isConsolidated);

  unitRows.sort((a, b) => {
    const revenueDelta =
      getLatestNumericValue(periods, b.valuesByPeriod) -
      getLatestNumericValue(periods, a.valuesByPeriod);
    if (revenueDelta !== 0) return revenueDelta;
    return a.unit.localeCompare(b.unit);
  });

  return [...unitRows, ...consolidatedRows];
};

const getOrderedRevenueMixRows = (
  rows: NormalizedRevenueMixHistoryByUnitRow[],
  periods: string[],
  rowOrderMap: Map<string, number>,
) =>
  [...rows].sort((a, b) => {
    const aOrder = rowOrderMap.get(a.unit);
    const bOrder = rowOrderMap.get(b.unit);

    if (aOrder != null && bOrder != null) {
      return aOrder - bOrder;
    }
    if (aOrder != null) return -1;
    if (bOrder != null) return 1;

    const mixDelta =
      getLatestNumericValue(periods, b.mixByPeriod) -
      getLatestNumericValue(periods, a.mixByPeriod);
    if (mixDelta !== 0) return mixDelta;
    return a.unit.localeCompare(b.unit);
  });

const getOrderedRevenueHistorySegmentRows = (
  rows: NormalizedRevenueHistoryBySegmentRow[],
  periods: string[],
) => {
  const latestValue = (row: NormalizedRevenueHistoryBySegmentRow) => {
    for (let index = periods.length - 1; index >= 0; index -= 1) {
      const value = row.revenueByYear[periods[index]];
      if (typeof value === "number") {
        return value;
      }
    }
    return row.latestPeriodRevenue ?? Number.NEGATIVE_INFINITY;
  };

  const segments = rows.filter((row) => !row.isTotal);
  const totals = rows.filter((row) => row.isTotal);

  segments.sort((a, b) => {
    const revenueDelta = latestValue(b) - latestValue(a);
    if (revenueDelta !== 0) return revenueDelta;
    return a.segment.localeCompare(b.segment);
  });

  // Total/consolidated rows are demoted to the end, never ranked as the
  // "largest segment".
  return [...segments, ...totals];
};

const getOrderedRevenueMixSegmentRows = (
  rows: NormalizedRevenueMixHistoryBySegmentRow[],
  periods: string[],
  rowOrderMap: Map<string, number>,
) => {
  const latestValue = (row: NormalizedRevenueMixHistoryBySegmentRow) => {
    for (let index = periods.length - 1; index >= 0; index -= 1) {
      const value = row.mixPercentByYear[periods[index]];
      if (typeof value === "number") {
        return value;
      }
    }
    return row.latestMixPercent ?? Number.NEGATIVE_INFINITY;
  };

  const segments = rows.filter((row) => !row.isTotal);
  const totals = rows.filter((row) => row.isTotal);

  segments.sort((a, b) => {
    const aOrder = rowOrderMap.get(a.segment);
    const bOrder = rowOrderMap.get(b.segment);

    if (aOrder != null && bOrder != null) {
      return aOrder - bOrder;
    }
    if (aOrder != null) return -1;
    if (bOrder != null) return 1;

    const mixDelta = latestValue(b) - latestValue(a);
    if (mixDelta !== 0) return mixDelta;
    return a.segment.localeCompare(b.segment);
  });

  return [...segments, ...totals];
};

function ViewToggle({
  value,
  onValueChange,
}: {
  value: "table" | "graph";
  onValueChange: (value: "table" | "graph") => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue === "table" || nextValue === "graph") {
          onValueChange(nextValue);
        }
      }}
      variant="outline"
      size="sm"
      className="w-fit"
    >
      <ToggleGroupItem value="table" aria-label="Show table view">
        Table
      </ToggleGroupItem>
      <ToggleGroupItem value="graph" aria-label="Show graph view">
        Graph
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function InsightList({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Investor takeaways
      </p>
      <ul className="space-y-1.5">
        {insights.slice(0, 6).map((insight, index) => (
          <li key={index} className="relative pl-3 text-[12px] leading-relaxed text-foreground">
            <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-sky-500/70" />
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnitLabel({
  unit,
  color,
  muted = false,
}: {
  unit: string;
  color: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{unit}</span>
    </div>
  );
}

function RevenueHistoryModule({
  module,
  unitColors,
  orderedRows,
}: {
  module: NormalizedRevenueHistoryByUnit;
  unitColors: Record<string, string>;
  orderedRows: NormalizedRevenueHistoryByUnitRow[];
}) {
  const [activeView, setActiveView] = useState<"table" | "graph">("table");
  if (module.rows.length === 0 || module.periods.length === 0) return null;
  const displayPeriods = module.periods;

  const chartRows =
    orderedRows.filter((row) => !row.isConsolidated).length > 0
      ? orderedRows.filter((row) => !row.isConsolidated)
      : orderedRows;
  const chartConfig = buildSeriesConfig(
    chartRows.map((row) => row.unit),
    unitColors,
  );
  const chartData = buildRevenueChartData(module, chartRows);
  const hasGraphView = chartData.length > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border/25 bg-background/45 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
            Revenue Trend by Economic Unit
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Largest unit first.
          </p>
        </div>
        {hasGraphView && (
          <ViewToggle value={activeView} onValueChange={setActiveView} />
        )}
      </div>

      {activeView === "table" || !hasGraphView ? (
        <Table className="tabular-nums">
          <TableHeader className="bg-muted/45">
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Trend
              </TableHead>
              {displayPeriods.map((period) => (
                <TableHead key={period} className="text-right">
                  {period}
                </TableHead>
              ))}
              <TableHead className="sticky right-0 z-10 bg-muted/45 text-right shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                CAGR
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedRows.map((row) => (
              <TableRow
                key={`revenue-${row.unit}`}
                className={
                  row.isConsolidated
                    ? "bg-muted/30 font-medium"
                    : "odd:bg-background/70 even:bg-muted/15"
                }
              >
                <TableCell className="font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    <UnitLabel
                      unit={row.unit}
                      color={unitColors[row.unit] ?? unitPalette[0]}
                      muted={false}
                    />
                    {row.isConsolidated && (
                      <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                        Consolidated
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <KpiSparkline
                    ariaLabel={`${row.unit} trend across ${displayPeriods.length} periods`}
                    points={displayPeriods.map((period) => ({
                      period,
                      value: row.valuesByPeriod[period] ?? null,
                    }))}
                  />
                </TableCell>
                {displayPeriods.map((period) => (
                  <TableCell key={`${row.unit}-${period}`} className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[12px]">
                        {formatAbsoluteValue(row.valuesByPeriod[period])}
                      </span>
                      {(() => {
                        const delta = getPeriodOverPeriodDelta(
                          displayPeriods,
                          row.valuesByPeriod,
                          period,
                        );
                        const formatted = formatPeriodDelta(delta);
                        if (!formatted) {
                          return (
                            <span className="text-[10px] leading-none text-muted-foreground">
                              &nbsp;
                            </span>
                          );
                        }
                        return (
                          <span
                            className={`text-[10px] leading-none ${getDeltaToneClass(
                              formatted.toneValue,
                            )}`}
                          >
                            {formatted.label}
                          </span>
                        );
                      })()}
                    </div>
                  </TableCell>
                ))}
                <TableCell className="sticky right-0 bg-background/95 text-right text-[12px] shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getCagrDisplayClassName(
                      row.cagrPercent,
                    )}`}
                  >
                    {formatPercentValue(row.cagrPercent)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-xl border border-sky-200/40 bg-sky-50/35 p-3 space-y-3 dark:border-sky-700/25 dark:bg-sky-950/10">
          <ChartContainer
            className="h-[300px] w-full aspect-auto xl:h-[340px]"
            config={chartConfig}
          >
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, right: 84, left: 0, bottom: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                domain={[0, "auto"]}
                tickFormatter={(value: number) => formatAbsoluteValue(value)}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              {chartRows.map((row, index) => {
                const color =
                  unitColors[row.unit] ?? unitPalette[index % unitPalette.length];
                const lastIndex = getLastValidIndex(chartData, `series_${index}`);
                return (
                  <Line
                    key={`series_${index}`}
                    dataKey={`series_${index}`}
                    type="linear"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    label={(labelProps: { x?: number; y?: number; index?: number }) =>
                      renderEndLineLabel(labelProps, row.unit, color, lastIndex)
                    }
                  />
                );
              })}
            </LineChart>
          </ChartContainer>
        </div>
      )}

      <InsightList insights={module.insights} />
    </div>
  );
}

function RevenueMixHistoryModule({
  module,
  unitColors,
  orderedRows,
  bare = false,
}: {
  module: NormalizedRevenueMixHistoryByUnit;
  unitColors: Record<string, string>;
  orderedRows: NormalizedRevenueMixHistoryByUnitRow[];
  bare?: boolean;
}) {
  const [activeView, setActiveView] = useState<"table" | "graph">("table");
  if (module.rows.length === 0 || module.periods.length === 0) return null;
  const displayPeriods = module.periods;

  const chartConfig = buildSeriesConfig(
    orderedRows.map((row) => row.unit),
    unitColors,
  );
  const chartData = buildMixChartData(module, orderedRows);
  const hasGraphView = chartData.length > 0;

  const computeMixDelta = (row: NormalizedRevenueMixHistoryByUnitRow) => {
    if (displayPeriods.length === 0) return null;
    const firstValue = row.mixByPeriod[displayPeriods[0]];
    const latestValue = row.mixByPeriod[displayPeriods[displayPeriods.length - 1]];
    if (typeof firstValue !== "number" || typeof latestValue !== "number") return null;
    return latestValue - firstValue;
  };

  return (
    <div
      className={
        bare
          ? "space-y-3"
          : "space-y-3 rounded-xl border border-border/25 bg-background/45 p-3"
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        {bare ? (
          module.methodologyNote ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {module.methodologyNote}
            </p>
          ) : (
            <span />
          )
        ) : (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
              Mix Shift by Economic Unit
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Largest unit first.
            </p>
            {module.methodologyNote && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {module.methodologyNote}
              </p>
            )}
          </div>
        )}
        {hasGraphView && (
          <ViewToggle value={activeView} onValueChange={setActiveView} />
        )}
      </div>

      {activeView === "table" || !hasGraphView ? (
        <Table className="tabular-nums">
          <TableHeader className="bg-muted/45">
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Trend
              </TableHead>
              {displayPeriods.map((period) => (
                <TableHead key={period} className="text-right">
                  {period}
                </TableHead>
              ))}
              <TableHead className="sticky right-0 z-10 bg-muted/45 text-right shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                Net Δ
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedRows.map((row) => {
              const delta = computeMixDelta(row);
              return (
                <TableRow
                  key={`mix-${row.unit}`}
                  className="odd:bg-background/70 even:bg-muted/15"
                >
                  <TableCell className="font-medium">
                    <UnitLabel
                      unit={row.unit}
                      color={unitColors[row.unit] ?? unitPalette[0]}
                    />
                  </TableCell>
                  <TableCell>
                    <KpiSparkline
                      ariaLabel={`${row.unit} mix trend across ${displayPeriods.length} periods`}
                      points={displayPeriods.map((period) => ({
                        period,
                        value: row.mixByPeriod[period] ?? null,
                      }))}
                    />
                  </TableCell>
                  {displayPeriods.map((period) => {
                    const ppDelta = getPeriodOverPeriodPpChange(
                      displayPeriods,
                      row.mixByPeriod,
                      period,
                    );
                    const rounded = ppDelta == null ? null : Math.round(ppDelta);
                    return (
                      <TableCell key={`${row.unit}-${period}`} className="text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[12px]">
                            {formatPercentValue(row.mixByPeriod[period])}
                          </span>
                          {rounded == null ? (
                            <span className="text-[10px] leading-none text-muted-foreground">
                              &nbsp;
                            </span>
                          ) : rounded === 0 ? (
                            <span className="text-[10px] leading-none text-muted-foreground">
                              0pp
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] leading-none ${
                                rounded > 0
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-rose-700 dark:text-rose-300"
                              }`}
                            >
                              <span aria-hidden="true">
                                {rounded > 0 ? "▲" : "▼"}
                              </span>
                              <span>
                                {rounded > 0 ? "+" : ""}
                                {rounded}pp
                              </span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="sticky right-0 bg-background/95 text-right text-[12px] shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getCagrDisplayClassName(
                        delta,
                      )}`}
                    >
                      {formatMixDeltaLabel(delta)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-xl border border-sky-200/40 bg-sky-50/35 p-3 space-y-3 dark:border-sky-700/25 dark:bg-sky-950/10">
          <ChartContainer
            className="h-[300px] w-full aspect-auto xl:h-[340px]"
            config={chartConfig}
          >
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, right: 84, left: 0, bottom: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value: number) => `${value}%`}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              {orderedRows.map((row, index) => {
                const color =
                  unitColors[row.unit] ?? unitPalette[index % unitPalette.length];
                const lastIndex = getLastValidIndex(chartData, `series_${index}`);
                return (
                  <Line
                    key={`series_${index}`}
                    dataKey={`series_${index}`}
                    type="linear"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    label={(labelProps: { x?: number; y?: number; index?: number }) =>
                      renderEndLineLabel(labelProps, row.unit, color, lastIndex)
                    }
                  />
                );
              })}
            </LineChart>
          </ChartContainer>
        </div>
      )}

      <InsightList insights={module.insights} />
    </div>
  );
}

function RevenueHistorySegmentModule({
  module,
  unitColors,
  orderedRows,
}: {
  module: NormalizedRevenueHistoryBySegment;
  unitColors: Record<string, string>;
  orderedRows: NormalizedRevenueHistoryBySegmentRow[];
}) {
  const [activeView, setActiveView] = useState<"table" | "graph">("table");
  if (module.rows.length === 0 || module.years.length === 0) return null;

  const displayPeriods = module.years;
  const chartRows = orderedRows.filter((row) => !row.isTotal);
  const chartConfig = buildSeriesConfig(
    chartRows.map((row) => row.segment),
    unitColors,
  );
  const chartData = buildRevenueSegmentChartData(displayPeriods, chartRows);
  const hasGraphView = chartData.length > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border/25 bg-background/45 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
            Revenue Trend by Segment
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Largest segment first.
          </p>
        </div>
        {hasGraphView && (
          <ViewToggle value={activeView} onValueChange={setActiveView} />
        )}
      </div>

      {activeView === "table" || !hasGraphView ? (
        <Table className="tabular-nums">
          <TableHeader className="bg-muted/45">
            <TableRow>
              <TableHead>Segment</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Trend
              </TableHead>
              {displayPeriods.map((period) => (
                <TableHead key={period} className="text-right">
                  {period}
                </TableHead>
              ))}
              <TableHead className="sticky right-0 z-10 bg-muted/45 text-right shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                CAGR
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedRows.map((row) => (
              <TableRow
                key={`segment-${row.segment}`}
                className={
                  row.isTotal
                    ? "bg-muted/30 font-medium"
                    : "odd:bg-background/70 even:bg-muted/15"
                }
              >
                <TableCell className="font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    <UnitLabel
                      unit={row.segment}
                      color={unitColors[row.segment] ?? unitPalette[0]}
                      muted={false}
                    />
                    {row.isTotal && (
                      <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                        Total
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <KpiSparkline
                    ariaLabel={`${row.segment} trend across ${displayPeriods.length} periods`}
                    points={displayPeriods.map((period) => ({
                      period,
                      value: row.revenueByYear[period] ?? null,
                    }))}
                  />
                </TableCell>
                {displayPeriods.map((period) => (
                  <TableCell key={`${row.segment}-${period}`} className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[12px]">
                        {formatAbsoluteValue(row.revenueByYear[period])}
                      </span>
                      {(() => {
                        const delta = getPeriodOverPeriodDelta(
                          displayPeriods,
                          row.revenueByYear,
                          period,
                        );
                        const formatted = formatPeriodDelta(delta);
                        if (!formatted) {
                          return (
                            <span className="text-[10px] leading-none text-muted-foreground">
                              &nbsp;
                            </span>
                          );
                        }

                        return (
                          <span
                            className={`text-[10px] leading-none ${getDeltaToneClass(
                              formatted.toneValue,
                            )}`}
                          >
                            {formatted.label}
                          </span>
                        );
                      })()}
                    </div>
                  </TableCell>
                ))}
                <TableCell className="sticky right-0 bg-background/95 text-right text-[12px] shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getCagrDisplayClassName(
                      row.growthMetricPercent,
                    )}`}
                  >
                    {formatPercentValue(row.growthMetricPercent)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-xl border border-sky-200/40 bg-sky-50/35 p-3 space-y-3 dark:border-sky-700/25 dark:bg-sky-950/10">
          <ChartContainer
            className="h-[300px] w-full aspect-auto xl:h-[340px]"
            config={chartConfig}
          >
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, right: 84, left: 0, bottom: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                domain={[0, "auto"]}
                tickFormatter={(value: number) => formatAbsoluteValue(value)}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              {chartRows.map((row, index) => {
                const color =
                  unitColors[row.segment] ?? unitPalette[index % unitPalette.length];
                const lastIndex = getLastValidIndex(chartData, `series_${index}`);
                return (
                  <Line
                    key={`series_${index}`}
                    dataKey={`series_${index}`}
                    type="linear"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    label={(labelProps: { x?: number; y?: number; index?: number }) =>
                      renderEndLineLabel(labelProps, row.segment, color, lastIndex)
                    }
                  />
                );
              })}
            </LineChart>
          </ChartContainer>
        </div>
      )}

      <InsightList insights={module.insights} />
    </div>
  );
}

function RevenueMixHistorySegmentModule({
  module,
  unitColors,
  orderedRows,
  bare = false,
}: {
  module: NormalizedRevenueMixHistoryBySegment;
  unitColors: Record<string, string>;
  orderedRows: NormalizedRevenueMixHistoryBySegmentRow[];
  bare?: boolean;
}) {
  const [activeView, setActiveView] = useState<"table" | "graph">("table");
  if (module.rows.length === 0 || module.years.length === 0) return null;

  const displayPeriods = module.years;
  const chartRows = orderedRows.filter((row) => !row.isTotal);
  const chartConfig = buildSeriesConfig(
    chartRows.map((row) => row.segment),
    unitColors,
  );
  const chartData = buildMixSegmentChartData(displayPeriods, chartRows);
  const hasGraphView = chartData.length > 0;

  const computeMixDelta = (row: NormalizedRevenueMixHistoryBySegmentRow) => {
    if (displayPeriods.length === 0) return null;
    const firstValue = row.mixPercentByYear[displayPeriods[0]];
    const latestValue =
      row.mixPercentByYear[displayPeriods[displayPeriods.length - 1]] ??
      row.latestMixPercent;
    if (typeof firstValue !== "number" || typeof latestValue !== "number") return null;
    return latestValue - firstValue;
  };

  return (
    <div
      className={
        bare
          ? "space-y-3"
          : "space-y-3 rounded-xl border border-border/25 bg-background/45 p-3"
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        {bare ? (
          <span />
        ) : (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
              Mix Shift by Segment
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Largest segment first.
            </p>
          </div>
        )}
        {hasGraphView && (
          <ViewToggle value={activeView} onValueChange={setActiveView} />
        )}
      </div>

      {activeView === "table" || !hasGraphView ? (
        <Table className="tabular-nums">
          <TableHeader className="bg-muted/45">
            <TableRow>
              <TableHead>Segment</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Trend
              </TableHead>
              {displayPeriods.map((period) => (
                <TableHead key={period} className="text-right">
                  {period}
                </TableHead>
              ))}
              <TableHead className="sticky right-0 z-10 bg-muted/45 text-right shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                Net Δ
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedRows.map((row) => {
              const delta = computeMixDelta(row);
              return (
                <TableRow
                  key={`mix-${row.segment}`}
                  className={
                    row.isTotal
                      ? "bg-muted/30 font-medium"
                      : "odd:bg-background/70 even:bg-muted/15"
                  }
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      <UnitLabel
                        unit={row.segment}
                        color={unitColors[row.segment] ?? unitPalette[0]}
                      />
                      {row.isTotal && (
                        <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                          Total
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <KpiSparkline
                      ariaLabel={`${row.segment} mix trend across ${displayPeriods.length} periods`}
                      points={displayPeriods.map((period) => ({
                        period,
                        value: row.mixPercentByYear[period] ?? null,
                      }))}
                    />
                  </TableCell>
                  {displayPeriods.map((period) => {
                    const ppDelta = getPeriodOverPeriodPpChange(
                      displayPeriods,
                      row.mixPercentByYear,
                      period,
                    );
                    const rounded =
                      ppDelta == null ? null : Math.round(ppDelta);
                    return (
                      <TableCell key={`${row.segment}-${period}`} className="text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[12px]">
                            {formatPercentValue(row.mixPercentByYear[period])}
                          </span>
                          {rounded == null ? (
                            <span className="text-[10px] leading-none text-muted-foreground">
                              &nbsp;
                            </span>
                          ) : rounded === 0 ? (
                            <span className="text-[10px] leading-none text-muted-foreground">
                              0pp
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] leading-none ${
                                rounded > 0
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-rose-700 dark:text-rose-300"
                              }`}
                            >
                              <span aria-hidden="true">
                                {rounded > 0 ? "▲" : "▼"}
                              </span>
                              <span>
                                {rounded > 0 ? "+" : ""}
                                {rounded}pp
                              </span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="sticky right-0 bg-background/95 text-right text-[12px] shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getCagrDisplayClassName(
                        delta,
                      )}`}
                    >
                      {formatMixDeltaLabel(delta)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-xl border border-sky-200/40 bg-sky-50/35 p-3 space-y-3 dark:border-sky-700/25 dark:bg-sky-950/10">
          <ChartContainer
            className="h-[300px] w-full aspect-auto xl:h-[340px]"
            config={chartConfig}
          >
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, right: 84, left: 0, bottom: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value: number) => `${value}%`}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              {chartRows.map((row, index) => {
                const color =
                  unitColors[row.segment] ?? unitPalette[index % unitPalette.length];
                const lastIndex = getLastValidIndex(chartData, `series_${index}`);
                return (
                  <Line
                    key={`series_${index}`}
                    dataKey={`series_${index}`}
                    type="linear"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    label={(labelProps: { x?: number; y?: number; index?: number }) =>
                      renderEndLineLabel(labelProps, row.segment, color, lastIndex)
                    }
                  />
                );
              })}
            </LineChart>
          </ChartContainer>
        </div>
      )}

      <InsightList insights={module.insights} />
    </div>
  );
}

export function HistoricalEconomicsDataPack({
  history,
}: {
  history: NormalizedHistoricalEconomics;
}) {
  const revenueHistorySource =
    history.revenueHistoryBySegment ?? history.revenueHistoryByUnit ?? null;
  const revenueMixHistorySource =
    history.revenueMixHistoryBySegment ?? history.revenueMixHistoryByUnit ?? null;

  const orderedRevenueHistoryRows = history.revenueHistoryBySegment
      ? getOrderedRevenueHistorySegmentRows(
          history.revenueHistoryBySegment.rows,
          history.revenueHistoryBySegment.years,
        )
      : history.revenueHistoryByUnit
      ? getOrderedRevenueHistoryRows(
          history.revenueHistoryByUnit.rows,
          history.revenueHistoryByUnit.periods,
        )
      : [];

  const revenueRowOrderMap = new Map(
    orderedRevenueHistoryRows.map((row, index) => [
      "segment" in row ? row.segment : row.unit,
      index,
    ] as const),
  );

  const orderedRevenueMixRows = history.revenueMixHistoryBySegment
    ? getOrderedRevenueMixSegmentRows(
        history.revenueMixHistoryBySegment.rows,
        history.revenueMixHistoryBySegment.years,
        revenueRowOrderMap,
      )
    : history.revenueMixHistoryByUnit
      ? getOrderedRevenueMixRows(
          history.revenueMixHistoryByUnit.rows,
          history.revenueMixHistoryByUnit.periods,
          revenueRowOrderMap,
        )
      : [];

  const seriesLabels = [
    ...(revenueHistorySource
      ? orderedRevenueHistoryRows.map((row) => ("segment" in row ? row.segment : row.unit))
      : []),
    ...(revenueMixHistorySource
      ? orderedRevenueMixRows.map((row) => ("segment" in row ? row.segment : row.unit))
      : []),
  ];
  const unitColors = getStableSeriesColors(seriesLabels);

  return (
    <div className="space-y-4">
      {history.revenueHistoryBySegment ? (
        <RevenueHistorySegmentModule
          module={history.revenueHistoryBySegment}
          unitColors={unitColors}
          orderedRows={orderedRevenueHistoryRows as NormalizedRevenueHistoryBySegmentRow[]}
        />
      ) : history.revenueHistoryByUnit ? (
        <RevenueHistoryModule
          module={history.revenueHistoryByUnit}
          unitColors={unitColors}
          orderedRows={orderedRevenueHistoryRows as NormalizedRevenueHistoryByUnitRow[]}
        />
      ) : null}

      {revenueMixHistorySource ? (
        <details className="group/mix-drawer rounded-xl border border-border/25 bg-background/45">
          <summary className="list-none cursor-pointer p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
                  {history.revenueMixHistoryBySegment
                    ? "Mix Shift by Segment"
                    : "Mix Shift by Economic Unit"}
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  How the revenue mix is shifting across periods.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-muted/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                <span className="group-open/mix-drawer:hidden">Show</span>
                <span className="hidden group-open/mix-drawer:inline">Hide</span>
              </span>
            </div>
          </summary>
          <div className="border-t border-border/35 p-3">
            {history.revenueMixHistoryBySegment ? (
              <RevenueMixHistorySegmentModule
                module={history.revenueMixHistoryBySegment}
                unitColors={unitColors}
                orderedRows={orderedRevenueMixRows as NormalizedRevenueMixHistoryBySegmentRow[]}
                bare
              />
            ) : history.revenueMixHistoryByUnit ? (
              <RevenueMixHistoryModule
                module={history.revenueMixHistoryByUnit}
                unitColors={unitColors}
                orderedRows={orderedRevenueMixRows as NormalizedRevenueMixHistoryByUnitRow[]}
                bare
              />
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
