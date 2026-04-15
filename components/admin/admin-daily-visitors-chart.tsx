"use client";

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
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

export type DailyActiveVisitorPoint = {
  date: string;
  visitors: number;
};

const chartConfig = {
  visitors: {
    label: "Visitors",
    color: "hsl(var(--foreground))",
  },
} satisfies ChartConfig;

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatLongDate(value: unknown) {
  if (typeof value !== "string") return "";
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdminDailyVisitorsChart({
  data,
}: {
  data: DailyActiveVisitorPoint[];
}) {
  const hasData = data.some((point) => point.visitors > 0);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Daily Active Visitors
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Distinct visitors by day for the selected range.
        </p>
      </div>

      {hasData ? (
        <div className="px-2 py-4 sm:px-4">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[260px] w-full"
          >
            <LineChart
              accessibilityLayer
              data={data}
              margin={{ left: 8, right: 16, top: 12, bottom: 4 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tickMargin={8}
                tickFormatter={formatShortDate}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={formatLongDate}
                  />
                }
              />
              <Line
                dataKey="visitors"
                type="monotone"
                stroke="var(--color-visitors)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      ) : (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          No visitor activity found for this range.
        </div>
      )}
    </div>
  );
}
