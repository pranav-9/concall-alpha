"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { NormalizedRevenueBreakdownItem } from "@/lib/business-snapshot/types";
import { colorPalette, maxSlices } from "./business-segment-mix-constants";
import { snapshotSubsectionClass } from "./surface-tokens";

type SegmentMixDatum = {
  name: string;
  value: number;
  color: string;
  isGrouped: boolean;
  groupedCount: number | null;
};

type BusinessSegmentMixDonutChartProps = {
  segments: NormalizedRevenueBreakdownItem[];
  className?: string;
};

const pctFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

const formatPct = (value: number) => `${pctFormatter.format(value)}%`;

const buildChartData = (segments: NormalizedRevenueBreakdownItem[]) => {
  const sortedSegments = [...segments]
    .filter((segment) => typeof segment.revenueSharePercent === "number" && segment.revenueSharePercent > 0)
    .sort((a, b) => (b.revenueSharePercent ?? 0) - (a.revenueSharePercent ?? 0));

  const visibleSegments = sortedSegments.slice(0, maxSlices);
  const groupedSegments = sortedSegments.slice(maxSlices);

  const chartData: SegmentMixDatum[] = visibleSegments.map((segment, index) => ({
    name: segment.name,
    value: segment.revenueSharePercent ?? 0,
    color: colorPalette[index % colorPalette.length],
    isGrouped: false,
    groupedCount: null,
  }));

  const groupedValue = groupedSegments.reduce(
    (total, segment) => total + (segment.revenueSharePercent ?? 0),
    0,
  );

  if (groupedValue > 0) {
    chartData.push({
      name: "Others",
      value: groupedValue,
      color: "#94a3b8",
      isGrouped: true,
      groupedCount: groupedSegments.length,
    });
  }

  return {
    chartData,
    knownShareTotal: sortedSegments.reduce(
      (total, segment) => total + (segment.revenueSharePercent ?? 0),
      0,
    ),
  };
};

function SegmentMixTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: SegmentMixDatum;
  }>;
}) {
  if (!active || !payload?.length) return null;

  const datum = payload[0]?.payload;
  if (!datum) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      <p className="font-medium text-foreground">{datum.name}</p>
      <p className="mt-1 text-muted-foreground">
        {formatPct(datum.value)} of disclosed mix
      </p>
      {datum.isGrouped && datum.groupedCount != null ? (
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {datum.groupedCount} grouped segment{datum.groupedCount === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

export function BusinessSegmentMixDonutChart({
  segments,
  className,
}: BusinessSegmentMixDonutChartProps) {
  const { chartData, knownShareTotal } = buildChartData(segments);

  if (chartData.length < 2) {
    return null;
  }

  return (
    <div
      className={cn(
        snapshotSubsectionClass,
        "flex h-full min-h-0 flex-col p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
            Revenue Mix
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Based on disclosed revenue-share data.
          </p>
        </div>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        <div className="relative mx-auto w-full max-w-[18rem] flex-1 min-h-[16rem]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<SegmentMixTooltip />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="66%"
                outerRadius="88%"
                paddingAngle={3}
                cornerRadius={10}
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Disclosed total
            </span>
            <span className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {formatPct(knownShareTotal)}
            </span>
            <span className="mt-1 text-[10px] leading-tight text-muted-foreground">
              of segment mix
            </span>
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Hover the donut for exact values. Tail segments are grouped into Others after the top five.
        </p>
      </div>
    </div>
  );
}
