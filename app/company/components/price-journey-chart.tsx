"use client";

import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PHASE_HEX } from "@/lib/price-phases/palette";
import type { PhaseKind } from "@/lib/price-phases/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Band = { startMs: number; endMs: number; kind: PhaseKind; n: number };

function timeTicks(lo: number, hi: number): { ticks: number[]; monthly: boolean } {
  const years = (hi - lo) / (365.25 * 86_400_000);
  const first = new Date(lo);
  const ticks: number[] = [];
  if (years < 2.5) {
    // quarterly: Jan / Apr / Jul / Oct
    const d = new Date(Date.UTC(first.getUTCFullYear(), Math.ceil(first.getUTCMonth() / 3) * 3, 1));
    for (; d.getTime() <= hi; d.setUTCMonth(d.getUTCMonth() + 3)) ticks.push(d.getTime());
    return { ticks, monthly: true };
  }
  const step = years > 8 ? 2 : 1;
  for (let y = first.getUTCFullYear() + 1; Date.UTC(y, 0, 1) <= hi; y += step) ticks.push(Date.UTC(y, 0, 1));
  return { ticks, monthly: false };
}

function logTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e += 1) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= lo && v <= hi) out.push(v);
    }
  }
  // keep the axis readable: at most five labels
  return out.length > 5 ? out.filter((_, i) => i % Math.ceil(out.length / 5) === 0) : out;
}

const rupees = (v: number) =>
  v >= 1000 ? `₹${Math.round(v).toLocaleString("en-IN")}` : v >= 10 ? `₹${Math.round(v)}` : `₹${v.toFixed(1)}`;

export function PriceJourneyChart({
  series,
  bands,
  pivots,
  ariaLabel,
}: {
  series: { t: number; price: number }[];
  bands: Band[];
  pivots: { t: number; price: number }[];
  ariaLabel: string;
}) {
  const prices = series.map((p) => p.price);
  const lo = Math.min(...prices) * 0.88;
  const hi = Math.max(...prices) * 1.12;
  const x0 = series[0].t;
  const x1 = series[series.length - 1].t;
  const { ticks, monthly } = timeTicks(x0, x1);

  return (
    <div className="h-56 w-full text-foreground sm:h-64" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 18, right: 8, bottom: 0, left: 0 }}>
          {bands.map((b) => (
            <ReferenceArea
              key={`band-${b.startMs}`}
              x1={b.startMs}
              x2={b.endMs}
              fill={PHASE_HEX[b.kind]}
              fillOpacity={0.13}
              stroke="none"
              ifOverflow="hidden"
              label={{ value: String(b.n), position: "insideTop", fontSize: 10, fill: "currentColor", opacity: 0.6, offset: -14 }}
            />
          ))}
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[x0, x1]}
            ticks={ticks}
            tickFormatter={(t: number) => {
              const d = new Date(t);
              const yy = String(d.getUTCFullYear()).slice(2);
              return monthly ? `${MONTHS[d.getUTCMonth()]} ’${yy}` : `’${yy}`;
            }}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
            tickLine={false}
            axisLine={{ stroke: "currentColor", strokeOpacity: 0.15 }}
          />
          <YAxis
            scale="log"
            domain={[lo, hi]}
            allowDataOverflow
            ticks={logTicks(lo, hi)}
            tickFormatter={rupees}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: "currentColor", strokeOpacity: 0.25 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as { t: number; price: number } | undefined) : undefined;
              if (!p) return null;
              const d = new Date(p.t);
              return (
                <div className="rounded-md border border-border/40 bg-background/95 px-2 py-1 text-xs shadow-sm">
                  <span className="text-muted-foreground">
                    {d.getUTCDate()} {MONTHS[d.getUTCMonth()]} {d.getUTCFullYear()}
                  </span>{" "}
                  <span className="font-medium tabular-nums">{rupees(p.price)}</span>
                </div>
              );
            }}
          />
          <Line
            dataKey="price"
            type="linear"
            dot={false}
            stroke="currentColor"
            strokeOpacity={0.85}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          {pivots.map((p) => (
            <ReferenceDot key={`pivot-${p.t}`} x={p.t} y={p.price} r={3} fill="currentColor" stroke="none" ifOverflow="visible" />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
