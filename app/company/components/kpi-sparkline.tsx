"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

type KpiSparklinePoint = {
  period: string;
  value: number | null;
};

export function KpiSparkline({
  points,
  ariaLabel,
}: {
  points: KpiSparklinePoint[];
  ariaLabel?: string;
}) {
  const numericPoints = points.filter(
    (point): point is { period: string; value: number } => point.value != null,
  );

  if (numericPoints.length < 2) {
    return (
      <div
        aria-label={ariaLabel ?? "Insufficient data for trend"}
        className="h-7 w-20 rounded-sm bg-muted/40"
      />
    );
  }

  const first = numericPoints[0].value;
  const last = numericPoints[numericPoints.length - 1].value;
  const stroke = last > first ? "#10b981" : last < first ? "#f43f5e" : "#94a3b8";

  return (
    <div className="h-7 w-20" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
