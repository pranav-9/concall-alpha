"use client";

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
const CustomLabel = (props: any) => {
  const { x, y, value } = props;
  const isTopScore = value >= 8.5; // Highlight scores 8.5 and above

  return (
    <g>
      <text
        x={x}
        y={y - 20}
        fill="white"
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
      >
        {value.toFixed(1)}
      </text>
      {isTopScore && (
        <text
          x={x + 12}
          y={y - 20}
          fill="#fbbf24"
          textAnchor="start"
          fontSize="14"
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
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = getScoreColor(payload.score);
  return (
    <circle cx={cx} cy={cy} r={5} fill={color} stroke={color} strokeWidth={1} />
  );
};

/**
 * Custom active dot component for hover state
 */
const CustomActiveDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = getScoreColor(payload.score);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={7}
      fill={color}
      stroke={color}
      strokeWidth={2}
      opacity={0.8}
    />
  );
};

export function ChartLineLabel(props: {
  chartData: {
    qtr: string;
    score: number;
  }[];
}) {
  return (
    <Card className="w-full bg-transparent border-0 shadow-none">
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={props.chartData}
            margin={{
              top: 40,
              left: 40,
              right: 40,
              bottom: 20,
            }}
          >
            <CartesianGrid vertical={false} stroke="#374151" />
            <XAxis
              dataKey="qtr"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="#9ca3af"
            />
            <YAxis
              stroke="#9ca3af"
              tickLine={false}
              axisLine={false}
              domain={[0, 10]}
              label={{ value: "Score", angle: -90, position: "insideLeft" }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey="score"
              type="natural"
              stroke="#ffffff"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={<CustomActiveDot />}
            >
              <LabelList dataKey="score" content={<CustomLabel />} />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
