"use client";

import { useEffect, useState, type ComponentProps } from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
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
import { chartColorFor } from "@/components/concall-score";
import { BANDS, SCORE_BAND_RANGES, type BandKey } from "@/lib/score-band";

const chartConfig = {
  score: {
    label: "Score",
    color: "#ffffff",
  },
  rollingAvg: {
    label: "4-qtr avg",
    color: "#94a3b8",
  },
} satisfies ChartConfig;

// Background zone bands — compact labels + a readable text tint per theme.
// Fill comes from each band's chartHex, so the zones stay on the platform's
// diverging teal<->red ramp (strongest band = deepest tint, like the mockup).
const ZONE_LABELS: Partial<Record<BandKey, string>> = {
  strongly_bullish: "STRONGLY BULLISH ≥ 8",
  bullish: "BULLISH 7–8",
  mildly_bullish: "MILDLY BULLISH 6.5–7",
  neutral: "NEUTRAL 4.5–6.5",
  mildly_bearish: "MILDLY BEARISH 3–4.5",
  strongly_bearish: "STRONGLY BEARISH < 3",
};

const ZONE_LABEL_HEX: Partial<Record<BandKey, { light: string; dark: string }>> = {
  strongly_bullish: { light: "#0f766e", dark: "#5eead4" },
  bullish: { light: "#0d9488", dark: "#2dd4bf" },
  mildly_bullish: { light: "#0d9488", dark: "#99f6e4" },
  neutral: { light: "#b45309", dark: "#fbbf24" },
  mildly_bearish: { light: "#c2410c", dark: "#fb923c" },
  strongly_bearish: { light: "#b91c1c", dark: "#f87171" },
};

const ZoneLabel = (props: {
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  text: string;
  fill: string;
}) => {
  const vb = props.viewBox;
  if (!vb || typeof vb.x !== "number" || typeof vb.y !== "number") return <g />;
  // A band clipped to a thin sliver by the fitted y-domain can't fit a label.
  if (typeof vb.height !== "number" || vb.height < 18) return <g />;
  return (
    <text
      x={vb.x + 6}
      y={vb.y + 13}
      fill={props.fill}
      fontSize={9}
      fontWeight={700}
      letterSpacing="0.06em"
    >
      {props.text}
    </text>
  );
};

type ChartPoint = {
  qtr: string;
  score: number;
  rollingAvg?: number | null;
};

type ChartLineLabelProps = {
  chartData: ChartPoint[];
  selectedQuarter?: string | null;
  onQuarterSelect?: (quarterLabel: string) => void;
};

/**
 * Custom label component that shows score and star for high scores
 */
const CustomLabel = (props: {
  x: number;
  y: number;
  value: number;
  index?: number;
  chartData: ChartPoint[];
  mobile: boolean;
  fill: string;
  showStar: boolean;
}) => {
  const { x, y, value, index = 0, chartData, mobile, fill, showStar } = props;
  const isTopScore = value >= 8.5; // Highlight scores 8.5 and above

  if (!shouldShowLabel(index, chartData, mobile)) {
    return null;
  }

  const labelYOffset = mobile ? 12 : value >= 9.0 ? 20 : 16;

  return (
    <g>
      <text
        x={x}
        y={y - labelYOffset}
        fill={fill}
        textAnchor="middle"
        fontSize={mobile ? "10" : "11"}
        fontWeight="bold"
      >
        {value.toFixed(1)}
      </text>
      {isTopScore && showStar && (
        <text
          x={x + 10}
          y={y - labelYOffset}
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

function isLocalExtreme(index: number, data: ChartPoint[]) {
  if (index <= 0 || index >= data.length - 1) return false;
  const prev = data[index - 1]?.score;
  const curr = data[index]?.score;
  const next = data[index + 1]?.score;
  if (
    typeof prev !== "number" ||
    typeof curr !== "number" ||
    typeof next !== "number"
  ) {
    return false;
  }
  return (curr > prev && curr > next) || (curr < prev && curr < next);
}

function shouldShowLabel(index: number, data: ChartPoint[], mobile: boolean) {
  const lastIndex = data.length - 1;
  if (index === 0 || index === lastIndex) return true;

  if (mobile) {
    return index % 2 === 0;
  }

  if (isLocalExtreme(index, data)) return true;

  const interval = data.length > 12 ? 3 : data.length >= 10 ? 2 : 1;
  if (interval === 1) return true;
  return index % interval === 0;
}

/**
 * Custom dot component that colors based on score
 */
const CustomDot = (props: {
  cx: number;
  cy: number;
  payload: { score: number; qtr?: string };
  mobile?: boolean;
  selectedQuarter?: string | null;
  onQuarterSelect?: (quarterLabel: string) => void;
}) => {
  const { cx, cy, payload, mobile, selectedQuarter, onQuarterSelect } = props;
  const color = chartColorFor(payload.score);
  const isSelected = payload.qtr === selectedQuarter;
  const quarterLabel = typeof payload.qtr === "string" ? payload.qtr : null;

  return (
    <g
      key={`dot-${cx}-${cy}`}
      className={quarterLabel && onQuarterSelect ? "cursor-pointer" : undefined}
      onClick={quarterLabel && onQuarterSelect ? () => onQuarterSelect(quarterLabel) : undefined}
    >
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={mobile ? 7 : 8.5}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={1.75}
          opacity={0.8}
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? (mobile ? 4.5 : 5.5) : mobile ? 3 : 4}
        fill={color}
        stroke={isSelected ? "#0f172a" : color}
        strokeWidth={isSelected ? 1.5 : 1}
      />
    </g>
  );
};

const CustomXAxisTick = (props: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  isDark: boolean;
  selectedQuarter?: string | null;
  onQuarterSelect?: (quarterLabel: string) => void;
}) => {
  const { x = 0, y = 0, payload, isDark, selectedQuarter, onQuarterSelect } = props;
  const value = typeof payload?.value === "string" ? payload.value : "";
  const isSelected = value === selectedQuarter;
  const fill = isSelected
    ? isDark
      ? "#e0f2fe"
      : "#0f172a"
    : isDark
      ? "#94a3b8"
      : "#64748b";

  return (
    <g
      transform={`translate(${x},${y})`}
      className={value && onQuarterSelect ? "cursor-pointer" : undefined}
      onClick={value && onQuarterSelect ? () => onQuarterSelect(value) : undefined}
    >
      <text
        x={0}
        y={16}
        textAnchor="middle"
        fill={fill}
        fontSize={11}
        fontWeight={isSelected ? 700 : 500}
      >
        {value}
      </text>
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
  const color = chartColorFor(payload.score);
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

export function ChartLineLabel({
  chartData,
  selectedQuarter,
  onQuarterSelect,
}: ChartLineLabelProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const updateMobile = () => setIsMobile(mobileQuery.matches);
    updateMobile();
    mobileQuery.addEventListener("change", updateMobile);

    // The active theme is next-themes' class on <html> (attribute="class"),
    // NOT the OS preference — an OS-dark user browsing the site in light mode
    // otherwise gets the dark palette (near-white line + labels) on a white
    // card. Observe the class so the in-app theme toggle repaints the chart.
    const root = document.documentElement;
    const updateDark = () => setIsDark(root.classList.contains("dark"));
    updateDark();
    const observer = new MutationObserver(updateDark);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      mobileQuery.removeEventListener("change", updateMobile);
      observer.disconnect();
    };
  }, []);

  const axisStroke = isDark ? "#94a3b8" : "#475569";
  const gridStroke = isDark ? "#334155" : "#cbd5e1";
  const lineStroke = isDark ? "#e2e8f0" : "#0f172a";
  const labelFill = isDark ? "#e2e8f0" : "#1e293b";
  const denseDesktop = !isMobile && chartData.length >= 10;
  const showStar = !isMobile && chartData.length <= 10;

  // Fit the y-axis to the data (scores cluster high) so quarter-to-quarter
  // movement is legible, instead of a fixed 0-10 that flattens the trend.
  const scores = chartData.map((d) => d.score).filter((n) => Number.isFinite(n));
  const dataMin = scores.length ? Math.min(...scores) : 0;
  const dataMax = scores.length ? Math.max(...scores) : 10;
  const yMin = Math.max(0, Math.floor(dataMin) - 1);
  const yMax = Math.min(10, Math.ceil(dataMax) + 1);
  const yTicks: number[] = [];
  for (let t = yMin; t <= yMax; t += 1) yTicks.push(t);

  // Sentiment zones clipped to the fitted y-domain; bands fully outside it drop.
  const zones = SCORE_BAND_RANGES.map((z) => ({
    ...z,
    y1: Math.max(z.min, yMin),
    y2: Math.min(z.max, yMax),
  })).filter((z) => z.y2 > z.y1);

  return (
    <Card className="w-full bg-transparent border-0 shadow-none">
      <CardContent className="pt-0 px-0">
        <ChartContainer config={chartConfig} className="!aspect-[2.6/1]">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: isMobile ? 14 : 18,
              left: isMobile ? 8 : 22,
              right: isMobile ? 8 : 22,
              bottom: 12,
            }}
          >
            {zones.map((z) => {
              const labelText = ZONE_LABELS[z.key];
              const labelHex = ZONE_LABEL_HEX[z.key];
              return (
                <ReferenceArea
                  key={z.key}
                  y1={z.y1}
                  y2={z.y2}
                  fill={BANDS[z.key].chartHex}
                  fillOpacity={isDark ? 0.1 : 0.07}
                  stroke="none"
                  ifOverflow="hidden"
                  label={
                    !isMobile && labelText && labelHex
                      ? (labelProps: {
                          viewBox?: {
                            x?: number;
                            y?: number;
                            width?: number;
                            height?: number;
                          };
                        }) => (
                          <ZoneLabel
                            viewBox={labelProps.viewBox}
                            text={labelText}
                            fill={isDark ? labelHex.dark : labelHex.light}
                          />
                        )
                      : undefined
                  }
                />
              );
            })}
            <CartesianGrid vertical={false} stroke={gridStroke} />
            {selectedQuarter && (
              <ReferenceLine
                x={selectedQuarter}
                stroke="#38bdf8"
                strokeDasharray="3 4"
                strokeOpacity={0.45}
              />
            )}
            <XAxis
              dataKey="qtr"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={isMobile ? 24 : denseDesktop ? 28 : 8}
              interval={isMobile || denseDesktop ? "preserveStartEnd" : 0}
              stroke={axisStroke}
              tick={(tickProps) => (
                <CustomXAxisTick
                  {...tickProps}
                  isDark={isDark}
                  selectedQuarter={selectedQuarter}
                  onQuarterSelect={onQuarterSelect}
                />
              )}
            />
            <YAxis
              stroke={axisStroke}
              tickLine={false}
              axisLine={false}
              domain={[yMin, yMax]}
              ticks={isMobile ? [yMin, Math.round((yMin + yMax) / 2), yMax] : yTicks}
              width={isMobile ? 28 : 40}
              label={
                isMobile
                  ? undefined
                  : { value: "Score", angle: -90, position: "insideLeft" }
              }
            />
            <ChartTooltip
              cursor={false}
              content={(tooltipProps) => {
                // The rolling line is null for the first 3 quarters; drop those
                // entries so the tooltip doesn't show a label with no value.
                const p = tooltipProps as ComponentProps<typeof ChartTooltipContent>;
                const payload = Array.isArray(p.payload)
                  ? p.payload.filter((item) => item.value != null)
                  : p.payload;
                return <ChartTooltipContent {...p} payload={payload} indicator="line" />;
              }}
            />
            {/* Rolling trail under the raw line: derived, so dashed + muted, no
                dots, not selectable. The raw quarter stays the primary datum. */}
            {chartData.some((d) => d.rollingAvg != null) && (
              <Line
                dataKey="rollingAvg"
                type="monotone"
                stroke={isDark ? "#94a3b8" : "#64748b"}
                strokeOpacity={0.65}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
              />
            )}
            <Line
              dataKey="score"
              type="natural"
              stroke={lineStroke}
              strokeWidth={isMobile ? 2.5 : 3}
              dot={(dotProps: unknown) => {
                const p = dotProps as {
                  cx?: number;
                  cy?: number;
                  payload?: { score?: number; qtr?: string };
                };
                if (typeof p.cx !== "number" || typeof p.cy !== "number") {
                  return <g />;
                }
                return (
                    <CustomDot
                      key={`dot-${p.cx}-${p.cy}-${Number(p.payload?.score ?? 0)}`}
                      cx={p.cx}
                      cy={p.cy}
                      payload={{
                        score: Number(p.payload?.score ?? 0),
                        qtr:
                          typeof p.payload?.qtr === "string"
                            ? p.payload.qtr
                            : undefined,
                      }}
                      mobile={isMobile}
                      selectedQuarter={selectedQuarter}
                      onQuarterSelect={onQuarterSelect}
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
                      chartData={chartData}
                      mobile={isMobile}
                      fill={labelFill}
                      showStar={showStar}
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
