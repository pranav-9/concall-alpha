"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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

const formatAbsoluteValue = (value: number | null | undefined) =>
  value == null ? "—" : valueFormatter.format(value);

const formatPercentValue = (value: number | null | undefined) =>
  value == null ? "—" : `${percentFormatter.format(value)}%`;

const getStableUnitColors = (history: NormalizedHistoricalEconomics) => {
  const orderedUnits: string[] = [];
  const seen = new Set<string>();

  const addUnit = (unit: string) => {
    if (!seen.has(unit)) {
      seen.add(unit);
      orderedUnits.push(unit);
    }
  };

  history.revenueHistoryByUnit?.rows.forEach((row) => addUnit(row.unit));
  history.revenueMixHistoryByUnit?.rows.forEach((row) => addUnit(row.unit));

  return orderedUnits.reduce<Record<string, string>>((acc, unit, index) => {
    acc[unit] = unitPalette[index % unitPalette.length];
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

const getDisplayPeriods = (periods: string[]) => [...periods].reverse();

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

function ConfidenceBadge({ value }: { value: string | null }) {
  if (!value) return null;

  return (
    <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground">
      {value}
    </span>
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

  return (
    <div className="space-y-3 rounded-xl border border-border/25 bg-background/45 p-3">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
          Revenue History by Economic Unit
        </p>
        {module.methodologyNote && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {module.methodologyNote}
          </p>
        )}
      </div>

      <div
        className={`grid grid-cols-1 gap-3 ${
          chartData.length > 0 ? "xl:grid-cols-[minmax(0,1.22fr)_minmax(19rem,0.78fr)]" : ""
        }`}
      >
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
                  className={row.isConsolidated ? "bg-muted/30 font-medium" : undefined}
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
                      <ConfidenceBadge value={row.confidence} />
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

        {chartData.length > 0 && (
          <div className="rounded-xl border border-border/20 bg-background/70 p-3 space-y-3">
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
              className="h-[280px] w-full aspect-auto xl:h-[320px]"
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
      </div>

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
  if (module.rows.length === 0 || module.periods.length === 0) return null;
  const displayPeriods = getDisplayPeriods(module.periods);

  const chartConfig = buildSeriesConfig(
    orderedRows.map((row) => row.unit),
    unitColors,
  );
  const chartData = buildMixChartData(module, orderedRows);

  return (
    <div className="space-y-3 rounded-xl border border-border/25 bg-background/45 p-3">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
          Revenue Mix History by Economic Unit
        </p>
        {module.methodologyNote && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {module.methodologyNote}
          </p>
        )}
      </div>

      <div
        className={`grid grid-cols-1 gap-3 ${
          chartData.length > 0 ? "xl:grid-cols-[minmax(0,1.22fr)_minmax(19rem,0.78fr)]" : ""
        }`}
      >
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
                <TableRow key={`mix-${row.unit}`}>
                  <TableCell className="font-medium">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <UnitLabel
                          unit={row.unit}
                          color={unitColors[row.unit] ?? unitPalette[0]}
                        />
                        <ConfidenceBadge value={row.confidence} />
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

        {chartData.length > 0 && (
          <div className="rounded-xl border border-border/20 bg-background/70 p-3 space-y-3">
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
              className="h-[280px] w-full aspect-auto xl:h-[320px]"
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
      </div>

      <InsightList insights={module.insights} />
    </div>
  );
}

export function HistoricalEconomicsDataPack({
  history,
}: {
  history: NormalizedHistoricalEconomics;
}) {
  const unitColors = getStableUnitColors(history);
  const orderedRevenueHistoryRows = history.revenueHistoryByUnit
    ? getOrderedRevenueHistoryRows(
        history.revenueHistoryByUnit.rows,
        history.revenueHistoryByUnit.periods,
      )
    : [];
  const revenueRowOrderMap = new Map(
    orderedRevenueHistoryRows.map((row, index) => [row.unit, index] as const),
  );
  const orderedRevenueMixRows = history.revenueMixHistoryByUnit
    ? getOrderedRevenueMixRows(
        history.revenueMixHistoryByUnit.rows,
        history.revenueMixHistoryByUnit.periods,
        revenueRowOrderMap,
      )
    : [];

  return (
    <div className="space-y-4">
      {history.revenueHistoryByUnit && (
        <RevenueHistoryModule
          module={history.revenueHistoryByUnit}
          unitColors={unitColors}
          orderedRows={orderedRevenueHistoryRows}
        />
      )}

      {history.revenueMixHistoryByUnit && (
        <RevenueMixHistoryModule
          module={history.revenueMixHistoryByUnit}
          unitColors={unitColors}
          orderedRows={orderedRevenueMixRows}
        />
      )}
    </div>
  );
}
