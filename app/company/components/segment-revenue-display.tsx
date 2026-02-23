"use client";

import { SegmentRevenue } from "../types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SegmentRevenueDisplayProps {
  revenues: SegmentRevenue[];
}

export function SegmentRevenueDisplay({
  revenues,
}: SegmentRevenueDisplayProps) {
  if (!revenues || revenues.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No segment revenue data available
      </div>
    );
  }

  // Group by financial year and segment
  const groupedData = revenues.reduce((acc, item) => {
    const fy = item.financial_year;
    const fyIndex = acc.findIndex((d) => d.fy === fy);

    // Extract year from FY format (e.g., "FY2025" -> 2025)
    const fyNum = parseInt(fy.replace(/[^\d]/g, ""), 10);

    if (fyIndex === -1) {
      acc.push({
        fy: fy,
        fyNum: fyNum,
      } as Record<string, string | number>);
    }

    const fyObj = acc.find((d) => d.fy === fy);
    if (fyObj) {
      const value = item.revenue_absolute_calculated || 0;
      fyObj[item.segment_name] = value;
    }

    return acc;
  }, [] as Record<string, string | number>[]);

  // Sort by financial year ascending (numerically)
  groupedData.sort((a, b) => (a.fyNum as number) - (b.fyNum as number));

  // Get unique segment names
  const segmentNames = Array.from(new Set(revenues.map((r) => r.segment_name)));

  // Color palette for different segments
  const colors = [
    "#10B981",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#F97316",
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={groupedData}
        margin={{ top: 12, right: 16, left: 10, bottom: 12 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="fy"
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
          label={{
            value: "Financial Year",
            position: "insideBottomRight",
            offset: -6,
          }}
        />
        <YAxis
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
          label={{ value: "Revenue", angle: -90, position: "insideLeft" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1F2937",
            border: "1px solid #374151",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#F3F4F6" }}
          formatter={(value: number | string) =>
            typeof value === "number" ? value.toFixed(2) : value
          }
        />
        <Legend
          wrapperStyle={{ paddingTop: "8px", fontSize: "11px" }}
          iconType="line"
        />
        {segmentNames.map((segment, idx) => (
          <Line
            key={segment}
            type="monotone"
            dataKey={segment}
            stroke={colors[idx % colors.length]}
            strokeWidth={1.75}
            dot={{ fill: colors[idx % colors.length], r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={true}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
