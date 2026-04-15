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
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

export type ActiveVisitorPoint = {
  date: string;
  dau: number;
  wau: number;
  mau: number;
};

type ActiveVisitorMetric = "dau" | "wau" | "mau";

const metricLabels: Record<ActiveVisitorMetric, string> = {
  dau: "DAU",
  wau: "WAU",
  mau: "MAU",
};

const chartConfig = {
  dau: {
    label: "DAU",
    color: "hsl(var(--foreground))",
  },
  wau: {
    label: "WAU",
    color: "hsl(var(--foreground))",
  },
  mau: {
    label: "MAU",
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
  data: ActiveVisitorPoint[];
}) {
  const [metric, setMetric] = useState<ActiveVisitorMetric>("dau");
  const hasData = data.some(
    (point) => point.dau > 0 || point.wau > 0 || point.mau > 0,
  );

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Active Visitors
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Daily, weekly, and monthly active visitors.
          </p>
        </div>
        <div className="flex w-fit rounded-full border border-border bg-muted/40 p-1">
          {(Object.keys(metricLabels) as ActiveVisitorMetric[]).map((key) => {
            const active = key === metric;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMetric(key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {metricLabels[key]}
              </button>
            );
          })}
        </div>
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
                    nameKey={metric}
                    labelFormatter={formatLongDate}
                  />
                }
              />
              <Line
                dataKey={metric}
                type="monotone"
                stroke={`var(--color-${metric})`}
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
