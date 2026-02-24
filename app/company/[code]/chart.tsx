"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  score: {
    label: "Score",
    color: "#ffffff",
  },
} satisfies ChartConfig;

/**
 * Get dot color based on score value - granular 5-10 spectrum
 * More sensitive to changes in the typical range where most scores concentrate
 */
function getScoreColor(score: number): string {
  // Granular scoring from 5 to 10
  if (score >= 9.5) return "#065f46"; // Dark Emerald - Extremely Bullish
  if (score >= 9.0) return "#047857"; // Deep Emerald - Very Strongly Bullish
  if (score >= 8.5) return "#059669"; // Emerald - Strongly Bullish
  if (score >= 8.0) return "#10b981"; // Light Emerald - Bullish
  if (score >= 7.5) return "#34d399"; // Mint Green - Mildly Bullish Strong
  if (score >= 7.0) return "#6ee7b7"; // Cyan Green - Mildly Bullish
  if (score >= 6.5) return "#a7f3d0"; // Light Cyan - Neutral Positive
  if (score >= 6.0) return "#fbbf24"; // Amber - Neutral
  if (score >= 5.5) return "#f59e0b"; // Dark Amber - Neutral Negative
  if (score >= 5.0) return "#f97316"; // Orange - Mildly Bearish
  if (score >= 4.5) return "#ea580c"; // Dark Orange - Bearish
  if (score >= 4.0) return "#dc2626"; // Red - Strongly Bearish
  return "#7f1d1d"; // Dark Red - Extremely Bearish
}

/**
 * Custom label component that shows score and star for high scores
 */
const CustomLabel = (props: {
  x: number;
  y: number;
  value: number;
  index?: number;
  totalPoints: number;
  mobile: boolean;
  fill: string;
}) => {
  const { x, y, value, index = 0, totalPoints, mobile, fill } = props;
  const isTopScore = value >= 8.5; // Highlight scores 8.5 and above
  const isLatestPoint = index === totalPoints - 1;
  const isAlternatePoint = index % 2 === 0;

  // Keep mobile chart clean: show labels on alternate points, always include latest.
  if (mobile && !isAlternatePoint && !isLatestPoint) {
    return null;
  }

  return (
    <g>
      <text
        x={x}
        y={mobile ? y - 12 : y - 16}
        fill={fill}
        textAnchor="middle"
        fontSize={mobile ? "10" : "11"}
        fontWeight="bold"
      >
        {value.toFixed(1)}
      </text>
      {isTopScore && !mobile && (
        <text
          x={x + 10}
          y={y - 16}
          fill="#fbbf24"
          textAnchor="start"
          fontSize="12"
          fontWeight="bold"
        >
          ⭐
        </text>
      )}
    </g>
  );
};

/**
 * Custom dot component that colors based on score
 */
const CustomDot = (props: {
  cx: number;
  cy: number;
  payload: { score: number };
  mobile?: boolean;
}) => {
  const { cx, cy, payload, mobile } = props;
  const color = getScoreColor(payload.score);
  return (
    <g key={`dot-${cx}-${cy}`}>
      <circle
        cx={cx}
        cy={cy}
        r={mobile ? 3 : 4}
        fill={color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

/**
 * Custom active dot component for hover state
 */
const CustomActiveDot = (props: {
  cx: number;
  cy: number;
  payload: { score: number };
  mobile?: boolean;
}) => {
  const { cx, cy, payload, mobile } = props;
  const color = getScoreColor(payload.score);
  return (
    <g key={`active-dot-${cx}-${cy}`}>
      <circle
        cx={cx}
        cy={cy}
        r={mobile ? 5 : 6}
        fill={color}
        stroke={color}
        strokeWidth={2}
        opacity={0.8}
      />
    </g>
  );
};

export function ChartLineLabel(props: {
  chartData: {
    qtr: string;
    score: number;
  }[];
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      setIsMobile(mobileQuery.matches);
      setIsDark(darkQuery.matches);
    };
    update();
    mobileQuery.addEventListener("change", update);
    darkQuery.addEventListener("change", update);
    return () => {
      mobileQuery.removeEventListener("change", update);
      darkQuery.removeEventListener("change", update);
    };
  }, []);

  const axisStroke = isDark ? "#94a3b8" : "#475569";
  const gridStroke = isDark ? "#334155" : "#cbd5e1";
  const lineStroke = isDark ? "#e2e8f0" : "#0f172a";
  const labelFill = isDark ? "#e2e8f0" : "#1e293b";

  return (
    <Card className="w-full bg-transparent border-0 shadow-none">
      <CardContent className="pt-0 px-0">
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={props.chartData}
            margin={{
              top: isMobile ? 18 : 24,
              left: isMobile ? 8 : 28,
              right: isMobile ? 8 : 28,
              bottom: 16,
            }}
          >
            <CartesianGrid vertical={false} stroke={gridStroke} />
            <XAxis
              dataKey="qtr"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={isMobile ? 24 : 8}
              interval={isMobile ? "preserveStartEnd" : 0}
              stroke={axisStroke}
            />
            <YAxis
              stroke={axisStroke}
              tickLine={false}
              axisLine={false}
              domain={[0, 10]}
              width={isMobile ? 28 : 40}
              label={
                isMobile
                  ? undefined
                  : { value: "Score", angle: -90, position: "insideLeft" }
              }
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey="score"
              type="natural"
              stroke={lineStroke}
              strokeWidth={isMobile ? 2.5 : 3}
              dot={(dotProps: unknown) => {
                const p = dotProps as {
                  cx?: number;
                  cy?: number;
                  payload?: { score?: number };
                };
                if (typeof p.cx !== "number" || typeof p.cy !== "number") {
                  return <g />;
                }
                return (
                  <CustomDot
                    key={`dot-${p.cx}-${p.cy}-${Number(p.payload?.score ?? 0)}`}
                    cx={p.cx}
                    cy={p.cy}
                    payload={{ score: Number(p.payload?.score ?? 0) }}
                    mobile={isMobile}
                  />
                );
              }}
              activeDot={(dotProps: unknown) => {
                const p = dotProps as {
                  cx?: number;
                  cy?: number;
                  payload?: { score?: number };
                };
                if (typeof p.cx !== "number" || typeof p.cy !== "number") {
                  return <g />;
                }
                return (
                  <CustomActiveDot
                    key={`active-dot-${p.cx}-${p.cy}-${Number(
                      p.payload?.score ?? 0
                    )}`}
                    cx={p.cx}
                    cy={p.cy}
                    payload={{ score: Number(p.payload?.score ?? 0) }}
                    mobile={isMobile}
                  />
                );
              }}
            >
              <LabelList
                dataKey="score"
                content={(labelProps) => {
                  const p = labelProps as {
                    x?: number | string;
                    y?: number | string;
                    value?: number | string;
                    index?: number;
                  };
                  const x = typeof p.x === "number" ? p.x : Number(p.x);
                  const y = typeof p.y === "number" ? p.y : Number(p.y);
                  const value =
                    typeof p.value === "number" ? p.value : Number(p.value);

                  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(value)) {
                    return <g />;
                  }

                  return (
                    <CustomLabel
                      x={x}
                      y={y}
                      value={value}
                      index={p.index}
                      totalPoints={props.chartData.length}
                      mobile={isMobile}
                      fill={labelFill}
                    />
                  );
                }}
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
