import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "concall-alpha";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts";

// ChartContainer supplies the recharts theme (muted axis ticks, border-tinted
// grid) plus a ResponsiveContainer, and turns each `config` key into a
// `--color-<key>` CSS variable — which is why every series reads its stroke or
// fill as `var(--color-<key>)` rather than a literal hex. The house pattern is
// app/company/[code]/chart.tsx (score history) and
// app/company/components/historical-economics-data-pack.tsx (revenue series).
// Colours come from the platform's diverging teal<->red score ramp
// (lib/score-band.ts chartHex).

const SCORE_HISTORY = [
  { quarter: "Q2 FY25", score: 6.8, rollingAvg: null },
  { quarter: "Q3 FY25", score: 7.1, rollingAvg: null },
  { quarter: "Q4 FY25", score: 6.9, rollingAvg: null },
  { quarter: "Q1 FY26", score: 7.4, rollingAvg: 7.05 },
  { quarter: "Q2 FY26", score: 7.9, rollingAvg: 7.33 },
  { quarter: "Q3 FY26", score: 7.6, rollingAvg: 7.45 },
  { quarter: "Q4 FY26", score: 8.0, rollingAvg: 7.73 },
  { quarter: "Q1 FY27", score: 8.2, rollingAvg: 7.93 },
];

const scoreConfig = {
  score: { label: "ConcallScore", color: "#0f766e" },
  rollingAvg: { label: "4-quarter average", color: "#94a3b8" },
};

// The canonical usage: eight quarters of ConcallScore for one company, on the
// fixed 0-10 scale so two companies' charts stay comparable.
export const ScoreHistory = () => (
  <ChartContainer config={scoreConfig} className="!aspect-[2.6/1] w-full">
    <LineChart
      accessibilityLayer
      data={SCORE_HISTORY}
      margin={{ top: 16, right: 20, left: 4, bottom: 8 }}
    >
      <CartesianGrid vertical={false} />
      <XAxis dataKey="quarter" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={32}
        domain={[0, 10]}
        ticks={[0, 2, 4, 6, 8, 10]}
      />
      <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
      <Line
        dataKey="score"
        type="natural"
        stroke="var(--color-score)"
        strokeWidth={3}
        dot={{ r: 3.5, fill: "var(--color-score)", strokeWidth: 0 }}
        activeDot={{ r: 5 }}
        isAnimationActive={false}
      />
    </LineChart>
  </ChartContainer>
);

// The same series with its derived trail: the raw quarter stays the primary
// datum (solid), the rolling average is dashed and muted because it is
// computed, not reported.
export const WithRollingAverage = () => (
  <ChartContainer config={scoreConfig} className="h-[300px] w-full aspect-auto">
    <LineChart
      accessibilityLayer
      data={SCORE_HISTORY}
      margin={{ top: 16, right: 20, left: 4, bottom: 8 }}
    >
      <ReferenceArea y1={8} y2={10} fill="#0f766e" fillOpacity={0.07} stroke="none" />
      <ReferenceArea y1={4.5} y2={6.5} fill="#f59e0b" fillOpacity={0.07} stroke="none" />
      <CartesianGrid vertical={false} />
      <XAxis dataKey="quarter" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={32}
        domain={[4, 10]}
        ticks={[4, 5, 6, 7, 8, 9, 10]}
      />
      <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
      <ChartLegend content={<ChartLegendContent />} />
      <Line
        dataKey="rollingAvg"
        type="monotone"
        stroke="var(--color-rollingAvg)"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        dot={false}
        activeDot={false}
        connectNulls={false}
        isAnimationActive={false}
      />
      <Line
        dataKey="score"
        type="natural"
        stroke="var(--color-score)"
        strokeWidth={3}
        dot={{ r: 3.5, fill: "var(--color-score)", strokeWidth: 0 }}
        activeDot={{ r: 5 }}
        isAnimationActive={false}
      />
    </LineChart>
  </ChartContainer>
);

const segmentConfig = {
  cms: { label: "Custom manufacturing (CMS)", color: "#0f766e" },
  gds: { label: "Generic drug substances", color: "#5eead4" },
};

const SEGMENT_REVENUE = [
  { period: "FY23", cms: 611, gds: 566 },
  { period: "FY24", cms: 927, gds: 620 },
  { period: "FY25", cms: 1004, gds: 651 },
  { period: "FY26", cms: 1152, gds: 693 },
];

// Segment revenue in Rs crore — the same container hosting a categorical
// series instead of a score line.
export const SegmentRevenue = () => (
  <ChartContainer config={segmentConfig} className="h-[300px] w-full aspect-auto">
    <BarChart
      accessibilityLayer
      data={SEGMENT_REVENUE}
      margin={{ top: 16, right: 12, left: 4, bottom: 8 }}
    >
      <CartesianGrid vertical={false} />
      <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis tickLine={false} axisLine={false} width={44} />
      <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
      <ChartLegend content={<ChartLegendContent />} />
      <Bar dataKey="cms" fill="var(--color-cms)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      <Bar dataKey="gds" fill="var(--color-gds)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
    </BarChart>
  </ChartContainer>
);
