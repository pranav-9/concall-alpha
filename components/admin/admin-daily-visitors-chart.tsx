"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

import type { ActiveVisitorPoint } from "@/lib/admin/metrics";
import { cn } from "@/lib/utils";

import { AdminNote } from "./shell";
import { EYEBROW } from "./tokens";

export type { ActiveVisitorPoint };

type Metric = "dau" | "wau" | "mau";

const METRICS: { key: Metric; label: string; blurb: string }[] = [
  { key: "dau", label: "DAU", blurb: "distinct visitors that day" },
  { key: "wau", label: "WAU", blurb: "distinct visitors in the 7 days ending that day" },
  { key: "mau", label: "MAU", blurb: "distinct visitors in the 30 days ending that day" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(value: string) {
  const [, m, d] = value.split("-").map(Number);
  return Number.isFinite(m) && Number.isFinite(d) ? `${d} ${MONTHS[m - 1]}` : value;
}

function ChartTip({ active, payload, label, metric }: TooltipProps<number, string> & { metric: Metric }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as ActiveVisitorPoint;
  return (
    <div className="rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] px-2.5 py-2 text-[12px] text-[var(--ink)] shadow-sm">
      <p className="house-data text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
        {typeof label === "string" ? shortDate(label) : ""}
      </p>
      <p className="house-data mt-1">
        <span className="text-[var(--signal)]">{METRICS.find((m) => m.key === metric)?.label}</span>{" "}
        {point[metric].toLocaleString("en-IN")}
      </p>
      <p className="house-data mt-0.5 text-[11px] text-[var(--ink-soft)]">
        D {point.dau} · W {point.wau} · M {point.mau}
      </p>
    </div>
  );
}

export function AdminDailyVisitorsChart({
  data,
  capped = false,
}: {
  data: ActiveVisitorPoint[];
  /** True when the row fetch hit its cap, so the earliest days are undercounted. */
  capped?: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("dau");
  const hasData = data.some((p) => p.dau > 0 || p.wau > 0 || p.mau > 0);
  const latest = data[data.length - 1];

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <h2 className={EYEBROW}>Active visitors</h2>
          {latest ? (
            <span className="house-data text-[11px] text-[var(--ink-soft)]">
              today · D {latest.dau} · W {latest.wau} · M {latest.mau}
            </span>
          ) : null}
        </div>
        <div className="flex rounded-[4px] border border-[var(--rule)] p-0.5" role="tablist" aria-label="Metric">
          {METRICS.map((m) => {
            const active = m.key === metric;
            return (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={active}
                title={m.blurb}
                onClick={() => setMetric(m.key)}
                className={cn(
                  "house-data rounded-[3px] px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] transition-colors",
                  active ? "bg-[var(--mark)] text-[#101a18]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {hasData ? (
        <div className="px-2 pb-3 pt-4 sm:px-3">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tickMargin={8}
                  tickFormatter={shortDate}
                  tick={{ fill: "var(--ink-soft)", fontSize: 10, fontFamily: "var(--font-data)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={34}
                  allowDecimals={false}
                  tick={{ fill: "var(--ink-soft)", fontSize: 10, fontFamily: "var(--font-data)" }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--rule)" }}
                  content={(props) => <ChartTip {...(props as TooltipProps<number, string>)} metric={metric} />}
                />
                <Line
                  dataKey={metric}
                  type="monotone"
                  stroke="var(--signal)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--signal)", stroke: "var(--paper-2)" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {capped ? (
            <AdminNote className="px-2 pt-2">
              The row fetch hit its cap, so the earliest days on the left are undercounted.
            </AdminNote>
          ) : null}
        </div>
      ) : (
        <p className="px-4 py-8 text-[13px] text-[var(--ink-soft)]">No visitor activity in this range.</p>
      )}
    </section>
  );
}
