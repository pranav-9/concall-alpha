"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

const unitPalette = [
  "#2563eb",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
];

const valueFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

const formatCompactLabel = (value: string) => value.replace(/_/g, " ").trim();

const formatAbsoluteValue = (value: number | null | undefined) =>
  value == null ? "—" : valueFormatter.format(value);

const formatPercentValue = (value: number | null | undefined) =>
  value == null ? "—" : `${percentFormatter.format(value)}%`;

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

const getDisplayPeriods = (periods: string[]) => periods;

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

  return [...rows].sort((a, b) => {
    const revenueDelta = latestValue(b) - latestValue(a);
    if (revenueDelta !== 0) return revenueDelta;
    return a.segment.localeCompare(b.segment);
  });
};

const getOrderedRevenueMixSegmentRows = (
  rows: NormalizedRevenueMixHistoryBySegmentRow[],
  periods: string[],
  rowOrderMap: Map<string, number>,
) =>
  [...rows].sort((a, b) => {
    const aOrder = rowOrderMap.get(a.segment);
    const bOrder = rowOrderMap.get(b.segment);

    if (aOrder != null && bOrder != null) {
      return aOrder - bOrder;
    }
    if (aOrder != null) return -1;
    if (bOrder != null) return 1;

    const latestValue = (row: NormalizedRevenueMixHistoryBySegmentRow) => {
      for (let index = periods.length - 1; index >= 0; index -= 1) {
        const value = row.mixPercentByYear[periods[index]];
        if (typeof value === "number") {
          return value;
        }
      }
      return row.latestMixPercent ?? Number.NEGATIVE_INFINITY;
    };

    const mixDelta = latestValue(b) - latestValue(a);
    if (mixDelta !== 0) return mixDelta;
    return a.segment.localeCompare(b.segment);
  });

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
        {insights.slice(0, 3).map((insight, index) => (
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

function UnitLegend({
  units,
  unitColors,
}: {
  units: string[];
  unitColors: Record<string, string>;
}) {
  if (units.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {units.map((unit, index) => (
        <div key={`${unit}-${index}`} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: unitColors[unit] ?? unitPalette[index % unitPalette.length] }}
          />
          <span className="text-[11px] leading-snug text-muted-foreground">{unit}</span>
        </div>
      ))}
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
  const displayPeriods = getDisplayPeriods(module.periods);

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
  const latestPeriod = module.periods[module.periods.length - 1] ?? null;

  return (
    <div className="space-y-3 rounded-xl border border-border/25 bg-background/45 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
            Revenue History by Economic Unit
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Largest unit first. Latest periods shown left to right{latestPeriod ? ` through ${latestPeriod}` : ""}.
          </p>
        </div>
        {hasGraphView && (
          <ViewToggle value={activeView} onValueChange={setActiveView} />
        )}
      </div>

      {activeView === "table" || !hasGraphView ? (
        <div className="rounded-xl border border-border/20 bg-background/70 p-2">
          <Table>
            <TableHeader className="bg-muted/45">
              <TableRow>
                <TableHead>Unit</TableHead>
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
                  {displayPeriods.map((period) => (
                    <TableCell key={`${row.unit}-${period}`} className="text-right text-[12px]">
                      {formatAbsoluteValue(row.valuesByPeriod[period])}
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
        </div>
      ) : (
        <div className="rounded-xl border border-sky-200/40 bg-sky-50/35 p-3 space-y-3 dark:border-sky-700/25 dark:bg-sky-950/10">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Chart View
            </p>
            <UnitLegend
              units={chartRows.map((row) => row.unit)}
              unitColors={unitColors}
            />
          </div>
          <ChartContainer
            className="h-[300px] w-full aspect-auto xl:h-[340px]"
            config={chartConfig}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
              barCategoryGap="18%"
              maxBarSize={56}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(value: number) => formatAbsoluteValue(value)}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              {chartRows.map((row, index) => (
                <Bar
                  key={`series_${index}`}
                  dataKey={`series_${index}`}
                  stackId="revenue"
                  fill={unitColors[row.unit] ?? unitPalette[index % unitPalette.length]}
                  radius={index === chartRows.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
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
}: {
  module: NormalizedRevenueMixHistoryByUnit;
  unitColors: Record<string, string>;
  orderedRows: NormalizedRevenueMixHistoryByUnitRow[];
}) {
  const [activeView, setActiveView] = useState<"table" | "graph">("table");
  if (module.rows.length === 0 || module.periods.length === 0) return null;
  const displayPeriods = getDisplayPeriods(module.periods);

  const chartConfig = buildSeriesConfig(
    orderedRows.map((row) => row.unit),
    unitColors,
  );
  const chartData = buildMixChartData(module, orderedRows);
  const hasGraphView = chartData.length > 0;
  const latestPeriod = module.periods[module.periods.length - 1] ?? null;

  return (
    <div className="space-y-3 rounded-xl border border-border/25 bg-background/45 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
            Revenue Mix History by Economic Unit
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Largest unit first. Mix columns read left to right{latestPeriod ? ` through ${latestPeriod}` : ""}.
          </p>
          {module.methodologyNote && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {module.methodologyNote}
            </p>
          )}
        </div>
        {hasGraphView && (
          <ViewToggle value={activeView} onValueChange={setActiveView} />
        )}
      </div>

      {activeView === "table" || !hasGraphView ? (
        <div className="rounded-xl border border-border/20 bg-background/70 p-2">
          <Table>
            <TableHeader className="bg-muted/45">
              <TableRow>
                <TableHead>Unit</TableHead>
                {displayPeriods.map((period) => (
                  <TableHead key={period} className="text-right">
                    {period}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedRows.map((row) => (
                <TableRow
                  key={`mix-${row.unit}`}
                  className="odd:bg-background/70 even:bg-muted/15"
                >
                  <TableCell className="font-medium">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <UnitLabel
                          unit={row.unit}
                          color={unitColors[row.unit] ?? unitPalette[0]}
                        />
                      </div>
                      {row.direction && (
                        <p className="max-w-[16rem] text-[11px] leading-relaxed text-muted-foreground">
                          {row.direction}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  {displayPeriods.map((period) => (
                    <TableCell key={`${row.unit}-${period}`} className="text-right text-[12px]">
                      {formatPercentValue(row.mixByPeriod[period])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl border border-sky-200/40 bg-sky-50/35 p-3 space-y-3 dark:border-sky-700/25 dark:bg-sky-950/10">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Chart View
            </p>
            <UnitLegend
              units={orderedRows.map((row) => row.unit)}
              unitColors={unitColors}
            />
          </div>
          <ChartContainer
            className="h-[300px] w-full aspect-auto xl:h-[340px]"
            config={chartConfig}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
              barCategoryGap="18%"
              maxBarSize={56}
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
              {orderedRows.map((row, index) => (
                <Bar
                  key={`series_${index}`}
                  dataKey={`series_${index}`}
                  stackId="mix"
                  fill={unitColors[row.unit] ?? unitPalette[index % unitPalette.length]}
                  radius={index === module.rows.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
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
  const chartConfig = buildSeriesConfig(
    orderedRows.map((row) => row.segment),
    unitColors,
  );
  const chartData = buildRevenueSegmentChartData(displayPeriods, orderedRows);
  const hasGraphView = chartData.length > 0;
  const latestPeriod = module.latestPeriod ?? module.years[module.years.length - 1] ?? null;

  return (
    <div className="space-y-3 rounded-xl border border-border/25 bg-background/45 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
            Revenue History by Segment
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Largest segment first. Periods shown left to right
            {latestPeriod ? ` through ${latestPeriod}` : ""}.
          </p>
        </div>
        {hasGraphView && (
          <ViewToggle value={activeView} onValueChange={setActiveView} />
        )}
      </div>

      {activeView === "table" || !hasGraphView ? (
        <div className="rounded-xl border border-border/20 bg-background/70 p-2">
          <Table>
            <TableHeader className="bg-muted/45">
              <TableRow>
                <TableHead>Segment</TableHead>
                {displayPeriods.map((period) => (
                  <TableHead key={period} className="text-right">
                    {period}
                  </TableHead>
                ))}
                <TableHead className="sticky right-0 z-10 bg-muted/45 text-right shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                  Growth
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedRows.map((row) => (
                <TableRow
                  key={`segment-${row.segment}`}
                  className="odd:bg-background/70 even:bg-muted/15"
                >
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <UnitLabel
                          unit={row.segment}
                          color={unitColors[row.segment] ?? unitPalette[0]}
                          muted={false}
                        />
                        {row.comparabilityLabel && (
                          <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                            {formatCompactLabel(row.comparabilityLabel)}
                          </span>
                        )}
                      </div>
                      {(row.growthMetricPeriod || row.latestPeriodRevenue != null) && (
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          {[
                            row.growthMetricPeriod
                              ? formatCompactLabel(row.growthMetricPeriod)
                              : null,
                            row.latestPeriodRevenue != null
                              ? `${formatAbsoluteValue(row.latestPeriodRevenue)} latest`
                              : null,
                          ]
                            .filter((value): value is string => Boolean(value))
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  {displayPeriods.map((period) => (
                    <TableCell key={`${row.segment}-${period}`} className="text-right text-[12px]">
                      {formatAbsoluteValue(row.revenueByYear[period])}
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
        </div>
      ) : (
        <div className="rounded-xl border border-sky-200/40 bg-sky-50/35 p-3 space-y-3 dark:border-sky-700/25 dark:bg-sky-950/10">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Chart View
            </p>
            <UnitLegend
              units={orderedRows.map((row) => row.segment)}
              unitColors={unitColors}
            />
          </div>
          <ChartContainer
            className="h-[300px] w-full aspect-auto xl:h-[340px]"
            config={chartConfig}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
              barCategoryGap="18%"
              maxBarSize={56}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(value: number) => formatAbsoluteValue(value)}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              {orderedRows.map((row, index) => (
                <Bar
                  key={`series_${index}`}
                  dataKey={`series_${index}`}
                  stackId="revenue"
                  fill={unitColors[row.segment] ?? unitPalette[index % unitPalette.length]}
                  radius={index === orderedRows.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
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
}: {
  module: NormalizedRevenueMixHistoryBySegment;
  unitColors: Record<string, string>;
  orderedRows: NormalizedRevenueMixHistoryBySegmentRow[];
}) {
  const [activeView, setActiveView] = useState<"table" | "graph">("table");
  if (module.rows.length === 0 || module.years.length === 0) return null;

  const displayPeriods = module.years;
  const chartConfig = buildSeriesConfig(
    orderedRows.map((row) => row.segment),
    unitColors,
  );
  const chartData = buildMixSegmentChartData(displayPeriods, orderedRows);
  const hasGraphView = chartData.length > 0;
  const latestPeriod = module.latestPeriod ?? module.years[module.years.length - 1] ?? null;

  return (
    <div className="space-y-3 rounded-xl border border-border/25 bg-background/45 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
            Revenue Mix History by Segment
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Largest segment first. Mix columns read left to right
            {latestPeriod ? ` through ${latestPeriod}` : ""}.
          </p>
        </div>
        {hasGraphView && (
          <ViewToggle value={activeView} onValueChange={setActiveView} />
        )}
      </div>

      {activeView === "table" || !hasGraphView ? (
        <div className="rounded-xl border border-border/20 bg-background/70 p-2">
          <Table>
            <TableHeader className="bg-muted/45">
              <TableRow>
                <TableHead>Segment</TableHead>
                {displayPeriods.map((period) => (
                  <TableHead key={period} className="text-right">
                    {period}
                  </TableHead>
                ))}
                <TableHead className="sticky right-0 z-10 bg-muted/45 text-right shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                  Latest Mix
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedRows.map((row) => (
                <TableRow
                  key={`mix-${row.segment}`}
                  className="odd:bg-background/70 even:bg-muted/15"
                >
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <UnitLabel
                          unit={row.segment}
                          color={unitColors[row.segment] ?? unitPalette[0]}
                        />
                        {row.comparabilityLabel && (
                          <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                            {formatCompactLabel(row.comparabilityLabel)}
                          </span>
                        )}
                      </div>
                      {row.directionLabel && (
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          {formatCompactLabel(row.directionLabel)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  {displayPeriods.map((period) => (
                    <TableCell key={`${row.segment}-${period}`} className="text-right text-[12px]">
                      {formatPercentValue(row.mixPercentByYear[period])}
                    </TableCell>
                  ))}
                  <TableCell className="sticky right-0 bg-background/95 text-right text-[12px] shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                    <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground">
                      {formatPercentValue(
                        row.latestMixPercent ??
                          getLatestNumericValue(displayPeriods, row.mixPercentByYear),
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl border border-sky-200/40 bg-sky-50/35 p-3 space-y-3 dark:border-sky-700/25 dark:bg-sky-950/10">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Chart View
            </p>
            <UnitLegend
              units={orderedRows.map((row) => row.segment)}
              unitColors={unitColors}
            />
          </div>
          <ChartContainer
            className="h-[300px] w-full aspect-auto xl:h-[340px]"
            config={chartConfig}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
              barCategoryGap="18%"
              maxBarSize={56}
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
              {orderedRows.map((row, index) => (
                <Bar
                  key={`series_${index}`}
                  dataKey={`series_${index}`}
                  stackId="mix"
                  fill={unitColors[row.segment] ?? unitPalette[index % unitPalette.length]}
                  radius={index === orderedRows.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
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

      {history.revenueMixHistoryBySegment ? (
        <RevenueMixHistorySegmentModule
          module={history.revenueMixHistoryBySegment}
          unitColors={unitColors}
          orderedRows={orderedRevenueMixRows as NormalizedRevenueMixHistoryBySegmentRow[]}
        />
      ) : history.revenueMixHistoryByUnit ? (
        <RevenueMixHistoryModule
          module={history.revenueMixHistoryByUnit}
          unitColors={unitColors}
          orderedRows={orderedRevenueMixRows as NormalizedRevenueMixHistoryByUnitRow[]}
        />
      ) : null}
    </div>
  );
}
