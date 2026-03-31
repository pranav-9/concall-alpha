"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

const formatCompactLabel = (value: string) => value.replace(/_/g, " ").trim();

const formatAbsoluteValue = (value: number | null | undefined) =>
  value == null ? "—" : valueFormatter.format(value);

const formatPercentValue = (value: number | null | undefined) =>
  value == null ? "—" : `${percentFormatter.format(value)}%`;

const formatRangeLabel = (start: string | null, end: string | null) => {
  if (start && end) return `${start} -> ${end}`;
  return start ?? end ?? null;
};

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

const derivePeriods = (history: NormalizedHistoricalEconomics) => {
  const summaryPeriods = history.summary?.periods ?? [];
  if (summaryPeriods.length > 0) return summaryPeriods;
  if ((history.revenueHistoryByUnit?.periods.length ?? 0) > 0) {
    return history.revenueHistoryByUnit?.periods ?? [];
  }
  if ((history.revenueMixHistoryByUnit?.periods.length ?? 0) > 0) {
    return history.revenueMixHistoryByUnit?.periods ?? [];
  }
  return history.revenueSplitHistory
    .map((row) => row.year)
    .filter((value): value is string => Boolean(value));
};

const deriveOverallConfidence = (history: NormalizedHistoricalEconomics) => {
  if (history.summary?.overallConfidence) return history.summary.overallConfidence;

  const confidenceValues = [
    ...(history.revenueHistoryByUnit?.rows.map((row) => row.confidence).filter(Boolean) ?? []),
    ...(history.revenueMixHistoryByUnit?.rows.map((row) => row.confidence).filter(Boolean) ?? []),
  ] as string[];

  const unique = Array.from(new Set(confidenceValues));
  return unique.length === 1 ? unique[0] : null;
};

const deriveMethodologyNote = (history: NormalizedHistoricalEconomics) =>
  history.summary?.methodologyNote ??
  history.revenueHistoryByUnit?.methodologyNote ??
  history.revenueMixHistoryByUnit?.methodologyNote ??
  null;

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

function RevenueHistoryModule({
  module,
  unitColors,
}: {
  module: NormalizedRevenueHistoryByUnit;
  unitColors: Record<string, string>;
}) {
  if (module.rows.length === 0 || module.periods.length === 0) return null;

  const chartRows =
    module.rows.filter((row) => !row.isConsolidated).length > 0
      ? module.rows.filter((row) => !row.isConsolidated)
      : module.rows;
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
          chartData.length > 0 ? "xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]" : ""
        }`}
      >
        <div className="rounded-xl border border-border/20 bg-background/70 p-2">
          <Table>
            <TableHeader className="bg-muted/45">
              <TableRow>
                <TableHead>Unit</TableHead>
                {module.periods.map((period) => (
                  <TableHead key={period} className="text-right">
                    {period}
                  </TableHead>
                ))}
                <TableHead className="text-right">CAGR</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {module.rows.map((row) => (
                <TableRow
                  key={`revenue-${row.unit}`}
                  className={row.isConsolidated ? "bg-muted/30 font-medium" : undefined}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
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
                  {module.periods.map((period) => (
                    <TableCell key={`${row.unit}-${period}`} className="text-right text-[12px]">
                      {formatAbsoluteValue(row.valuesByPeriod[period])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-[12px]">
                    {formatPercentValue(row.cagrPercent)}
                  </TableCell>
                  <TableCell className="text-[12px]">
                    {row.confidence ? (
                      <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground">
                        {row.confidence}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {chartData.length > 0 && (
          <div className="rounded-xl border border-border/20 bg-background/70 p-3">
            <ChartContainer
              className="min-h-[260px] w-full xl:min-h-[320px]"
              config={chartConfig}
            >
              <BarChart accessibilityLayer data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(value: number) => formatAbsoluteValue(value)}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
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
}: {
  module: NormalizedRevenueMixHistoryByUnit;
  unitColors: Record<string, string>;
}) {
  if (module.rows.length === 0 || module.periods.length === 0) return null;

  const chartConfig = buildSeriesConfig(
    module.rows.map((row) => row.unit),
    unitColors,
  );
  const chartData = buildMixChartData(module, module.rows);

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
          chartData.length > 0 ? "xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]" : ""
        }`}
      >
        <div className="rounded-xl border border-border/20 bg-background/70 p-2">
          <Table>
            <TableHeader className="bg-muted/45">
              <TableRow>
                <TableHead>Unit</TableHead>
                {module.periods.map((period) => (
                  <TableHead key={period} className="text-right">
                    {period}
                  </TableHead>
                ))}
                <TableHead>Direction</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {module.rows.map((row) => (
                <TableRow key={`mix-${row.unit}`}>
                  <TableCell className="font-medium">
                    <UnitLabel unit={row.unit} color={unitColors[row.unit] ?? unitPalette[0]} />
                  </TableCell>
                  {module.periods.map((period) => (
                    <TableCell key={`${row.unit}-${period}`} className="text-right text-[12px]">
                      {formatPercentValue(row.mixByPeriod[period])}
                    </TableCell>
                  ))}
                  <TableCell className="text-[12px] whitespace-normal">
                    {row.direction ?? "—"}
                  </TableCell>
                  <TableCell className="text-[12px]">
                    {row.confidence ? (
                      <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground">
                        {row.confidence}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {chartData.length > 0 && (
          <div className="rounded-xl border border-border/20 bg-background/70 p-3">
            <ChartContainer
              className="min-h-[260px] w-full xl:min-h-[320px]"
              config={chartConfig}
            >
              <BarChart accessibilityLayer data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={[0, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                {module.rows.map((row, index) => (
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
  const summaryCagr = history.summary?.companyRevenueCagr ?? history.companyRevenueCagr3y;
  const periods = derivePeriods(history);
  const overallConfidence = deriveOverallConfidence(history);
  const methodologyNote = deriveMethodologyNote(history);
  const periodCoverage =
    periods.length > 1 ? `${periods[0]} -> ${periods[periods.length - 1]}` : periods[0] ?? null;
  const unitColors = getStableUnitColors(history);

  return (
    <div className="space-y-4">
      {(summaryCagr || periodCoverage || overallConfidence || methodologyNote) && (
        <div className="rounded-xl border border-border/20 bg-background/55 p-3">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            {summaryCagr && (
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Company Revenue CAGR
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  {summaryCagr.cagrPercent != null && (
                    <p className="text-[20px] font-semibold leading-none text-foreground">
                      {formatPercentValue(summaryCagr.cagrPercent)}
                    </p>
                  )}
                  {formatRangeLabel(summaryCagr.startYear, summaryCagr.endYear) && (
                    <span className="text-[11px] text-muted-foreground">
                      {formatRangeLabel(summaryCagr.startYear, summaryCagr.endYear)}
                    </span>
                  )}
                </div>
                {(summaryCagr.scope || summaryCagr.basis) && (
                  <p className="text-[10px] text-muted-foreground">
                    {[summaryCagr.scope, summaryCagr.basis]
                      .filter((value): value is string => Boolean(value))
                      .map((value) => formatCompactLabel(value))
                      .join(" · ")}
                  </p>
                )}
              </div>
            )}

            {periodCoverage && (
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Period Coverage
                </p>
                <p className="text-[14px] font-medium leading-snug text-foreground">
                  {periodCoverage}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {periods.length} period{periods.length === 1 ? "" : "s"} tracked
                </p>
              </div>
            )}

            {overallConfidence && (
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Confidence
                </p>
                <span className="inline-flex rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground">
                  {overallConfidence}
                </span>
              </div>
            )}
          </div>

          {methodologyNote && (
            <p className="mt-3 border-t border-border/25 pt-3 text-[11px] leading-relaxed text-muted-foreground">
              {methodologyNote}
            </p>
          )}
        </div>
      )}

      {history.revenueHistoryByUnit && (
        <RevenueHistoryModule
          module={history.revenueHistoryByUnit}
          unitColors={unitColors}
        />
      )}

      {history.revenueMixHistoryByUnit && (
        <RevenueMixHistoryModule
          module={history.revenueMixHistoryByUnit}
          unitColors={unitColors}
        />
      )}
    </div>
  );
}
