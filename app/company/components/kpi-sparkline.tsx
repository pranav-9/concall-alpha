"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

type KpiSparklinePoint = {
  period: string;
  value: number | null;
};

export function KpiSparkline({
  points,
  ariaLabel,
  className = "h-7 w-20",
}: {
  points: KpiSparklinePoint[];
  ariaLabel?: string;
  /** Wrapper sizing override; defaults to the KPI-row size. The watchlist
   * Trend cell passes a smaller box for the inline sparkline. */
  className?: string;
}) {
  const numericPoints = points.filter(
    (point): point is { period: string; value: number } => point.value != null,
  );

  if (numericPoints.length < 2) {
    return (
      <div
        aria-label={ariaLabel ?? "Insufficient data for trend"}
        className={`${className} rounded-sm bg-muted/40`}
      />
    );
  }

  const first = numericPoints[0].value;
  const last = numericPoints[numericPoints.length - 1].value;
  const stroke = last > first ? "#10b981" : last < first ? "#f43f5e" : "#94a3b8";

  // Index of the last real value within the full (null-inclusive) array — the
  // sparkline anchors a dot there so the eye sees where the series landed.
  let lastNumericIndex = -1;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].value != null) {
      lastNumericIndex = i;
      break;
    }
  }

  return (
    <div className={className} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 3, bottom: 2, left: 2 }}>
          <Line
            type="linear"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.5}
            isAnimationActive={false}
            connectNulls={false}
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const { cx, cy, index } = props;
              if (index !== lastNumericIndex || cx == null || cy == null) {
                return <g key={`sparkline-dot-${index}`} />;
              }
              return (
                <circle
                  key={`sparkline-dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={2}
                  fill={stroke}
                  stroke="none"
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
