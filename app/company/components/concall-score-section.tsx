"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import ConcallScore from "@/components/concall-score";
import { cn } from "@/lib/utils";
import { BANDS, bandForScore } from "@/lib/score-band";
import {
  classifyTrajectory,
  quarterIndex,
  TRAJECTORIES,
  type TrajectoryResult,
} from "@/lib/score-trajectory";
import { buildNextQuarterWatch } from "@/lib/next-quarter-watch/select";
import type { WatchSwingVar } from "@/lib/next-quarter-watch/types";
import { ChartLineLabel } from "../[code]/chart";
import { NextQuarterWatch } from "./next-quarter-watch";
import { TrendBadge } from "./trend-badge";
import { chipClass } from "./chip-tone";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import {
  normalizeQuarterlyV4Categories,
  type NormalizedQuarterlyV4,
} from "@/lib/quarterly-v4/normalize";
import { V4CategoryCards, V4CoverageStrip, V4LeansStrip } from "./quarterly-v4-section";

import type { ChartDataPoint, QuarterData } from "../types";

type ConcallScoreSectionProps = {
  chartData: ChartDataPoint[];
  detailQuarters: QuarterData[];
  // Forward inputs for the "What to watch next quarter" block (threaded from the
  // page so the block synthesizes without its own fetch). Both optional — the
  // block stays silent when there's nothing to flag.
  growthScore?: number | null;
  swingVars?: WatchSwingVar[];
};

// rationale on the row: new rows are structured {direction, heading, detail};
// legacy rows are flat strings. Both are normalized to RationaleItem for render.
type RationalePointShape = { direction?: string; heading?: string; detail?: string };
type RationaleItem = {
  direction: "positive" | "negative" | "neutral" | null;
  heading: string;
  detail: string;
};

type ConcallDetails = {
  score?: number;
  rationale?: (string | RationalePointShape)[];
  // results_summary / guidance / risks are legacy flat fields: only present on
  // rows scored before the v4 breakdown existed. New rows carry v4_categories
  // instead (cat_1 ⊃ results_summary, cat_2 ⊃ guidance, cat_5 ⊃ risks). Kept here
  // so older quarters still render their stored copy when v4 is absent.
  results_summary?: string[];
  guidance?: string;
  risks?: string[];
  fy?: number;
  qtr?: number;
  v4_categories?: unknown;
  // Per-category leans (-2..+2) the deterministic composite is built from; keyed
  // by v4 cat (cat_1_… etc.). Surfaced as a chip on each addressed v4 card.
  score_breakdown?: Record<string, number>;
};

type DetailQuarterContext = {
  details: ConcallDetails | null;
  risks: string[];
  rationale: RationaleItem[];
  resultsSummary: string[];
  guidance: string | null;
  detailScore: number;
  band: { label: string; tone: string };
  detailQuarterLabel: string;
  v4: NormalizedQuarterlyV4 | null;
};

const parseJsonObject = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" ? value : null;
};

const buildDetailQuarterContext = (quarter: QuarterData): DetailQuarterContext => {
  const details = parseJsonObject(quarter.details) as ConcallDetails | null;
  const risks = Array.isArray(details?.risks) ? (details.risks as string[]) : [];
  const rationale: RationaleItem[] = Array.isArray(details?.rationale)
    ? (details!.rationale as unknown[])
        .map((it): RationaleItem => {
          if (typeof it === "string") return { direction: null, heading: "", detail: it };
          if (it && typeof it === "object") {
            const o = it as RationalePointShape;
            const direction =
              o.direction === "positive" ||
              o.direction === "negative" ||
              o.direction === "neutral"
                ? o.direction
                : null;
            return {
              direction,
              heading: typeof o.heading === "string" ? o.heading : "",
              detail: typeof o.detail === "string" ? o.detail : "",
            };
          }
          return { direction: null, heading: "", detail: String(it) };
        })
        .filter((r) => r.heading || r.detail)
    : [];
  const resultsSummary = Array.isArray(details?.results_summary)
    ? (details.results_summary as string[])
    : [];
  const guidance = typeof details?.guidance === "string" ? details.guidance : null;
  const detailScore = typeof details?.score === "number" ? details.score : quarter.score;
  const band = BANDS[bandForScore(detailScore)];
  const detailQuarterLabel =
    typeof details?.qtr === "number" && typeof details?.fy === "number"
      ? `Q${details.qtr} FY${details.fy}`
      : quarter.quarter_label;
  const v4 = normalizeQuarterlyV4Categories(
    details?.v4_categories ?? null,
    detailQuarterLabel,
    details?.score_breakdown ?? null,
  );

  return {
    details,
    risks,
    rationale,
    resultsSummary,
    guidance,
    detailScore,
    band,
    detailQuarterLabel,
    v4,
  };
};

type SectionCard = {
  key: string;
  label: string;
  accent: string;
  items?: string[];
  text?: string;
};

const renderCard = (card: SectionCard) => {
  const hasItems = card.items && card.items.length > 0;
  const hasText = !!card.text;

  return (
    <div key={card.key} className={`${nestedDetailClass} p-3`}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${card.accent}`} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {card.label}
        </p>
      </div>
      {hasText ? (
        <p className="text-[12px] leading-snug text-foreground/85">{card.text}</p>
      ) : hasItems ? (
        <ul className="space-y-1.5">
          {card.items!.map((item, itemIndex) => (
            <li
              key={itemIndex}
              className="relative pl-3 text-[12px] leading-snug text-foreground/85"
            >
              <span
                className={`absolute left-0 top-1.5 h-1 w-1 rounded-full ${card.accent}`}
              />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] italic text-muted-foreground">
          No {card.label.toLowerCase()} for this quarter.
        </p>
      )}
    </div>
  );
};

const CHART_RANGES = [12, 24] as const;
type ChartRange = (typeof CHART_RANGES)[number];

// The regime signal lives in the trail, not the single quarter (re-score drift
// is ±0.5; lumpy-delivery businesses chop quarter to quarter). Trailing window
// only — a centered average would imply knowledge of future quarters. Gated so
// a short history can't dress up as a trend.
const ROLLING_WINDOW = 4;
const MIN_QUARTERS_FOR_ROLLING = 8;

const withRollingAverage = (data: ChartDataPoint[]): ChartDataPoint[] => {
  if (data.length < MIN_QUARTERS_FOR_ROLLING) return data;
  return data.map((point, i) => {
    if (i < ROLLING_WINDOW - 1) return { ...point, rollingAvg: null };
    const windowSum = data
      .slice(i - ROLLING_WINDOW + 1, i + 1)
      .reduce((sum, p) => sum + p.score, 0);
    return { ...point, rollingAvg: Math.round((windowSum / ROLLING_WINDOW) * 10) / 10 };
  });
};

const renderChartCard = ({
  chartData,
  selectedQuarterLabel,
  onQuarterSelect,
  range,
  onRangeChange,
  showRangeToggle,
  trajectory,
  title = "Where it's heading",
}: {
  chartData: ChartDataPoint[];
  selectedQuarterLabel: string;
  onQuarterSelect: (label: string) => void;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  showRangeToggle: boolean;
  // Series-level trajectory (as of the latest quarter) — same classification the
  // leaderboard/watchlist Trend column uses. Labels the chart, not a single quarter.
  trajectory: TrajectoryResult;
  title?: string;
}) => (
  <div className={`${nestedDetailClass} flex min-w-0 flex-col gap-2 p-2.5`}>
    {/* Mobile: title row, then the chart, then the legend as a caption.
        Desktop: title + badge left, legend + range toggle right, one row. */}
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
        {trajectory.key !== "no_read" && (
          <TrendBadge
            trajectoryKey={trajectory.key}
            trendChange={trajectory.change}
            trendDescription={trajectory.description}
          />
        )}
      </div>
      <span className="hidden items-center gap-2 text-[10px] text-muted-foreground sm:flex">
        <span>
          <span className="text-amber-400/90">⭐</span> 8.5+&nbsp;&nbsp;·&nbsp;&nbsp;
          {chartData.some((d) => d.rollingAvg != null) && (
            <>
              <span className="tracking-[0.18em]">┄</span> 4Q avg&nbsp;&nbsp;·&nbsp;&nbsp;
            </>
          )}
          {chartData.length === 1 ? "1 quarter" : `${chartData.length} quarters`}
        </span>
        {showRangeToggle && (
          <ChartRangeToggle range={range} onRangeChange={onRangeChange} />
        )}
      </span>
    </div>
    <div className="mx-auto flex w-full max-w-[34rem] justify-center">
      <ChartLineLabel
        chartData={chartData}
        selectedQuarter={selectedQuarterLabel}
        onQuarterSelect={onQuarterSelect}
      />
    </div>
    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground sm:hidden">
      <span>
        {chartData.some((d) => d.rollingAvg != null) && (
          <>
            <span className="tracking-[0.18em]">┄</span> 4Q avg&nbsp;&nbsp;·&nbsp;&nbsp;
          </>
        )}
        {chartData.length === 1 ? "1 quarter" : `${chartData.length} quarters`}
        &nbsp;&nbsp;·&nbsp;&nbsp;tap a dot for detail
      </span>
      {showRangeToggle && <ChartRangeToggle range={range} onRangeChange={onRangeChange} />}
    </div>
  </div>
);

const ChartRangeToggle = ({
  range,
  onRangeChange,
}: {
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}) => (
  <span aria-label="Trend range" className="flex items-center gap-0.5" role="group">
    {CHART_RANGES.map((value) => (
      <button
        key={value}
        type="button"
        aria-pressed={range === value}
        onClick={() => onRangeChange(value)}
        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors ${
          range === value
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        {value}Q
      </button>
    ))}
  </span>
);

export function ConcallScoreSection({
  chartData,
  detailQuarters,
  growthScore,
  swingVars,
}: ConcallScoreSectionProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [range, setRange] = React.useState<ChartRange>(12);
  // Quarter-breakdown disclosure is controlled (not a native <details>) so the
  // leans strip can stay visible while collapsed and a segment click can both
  // expand and focus its category card.
  const [breakdownOpen, setBreakdownOpen] = React.useState(false);
  const [focusCategoryKey, setFocusCategoryKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [detailQuarters]);

  // Collapse + clear the category focus when the quarter changes — the strip
  // (and card set) belongs to the newly selected quarter.
  React.useEffect(() => {
    setBreakdownOpen(false);
    setFocusCategoryKey(null);
  }, [selectedIndex, detailQuarters]);

  const selectedQuarter = detailQuarters[selectedIndex];
  const quarterContext = selectedQuarter ? buildDetailQuarterContext(selectedQuarter) : null;

  // Series-level trajectory, computed the same way as get-concall-data (the
  // leaderboard/watchlist source): scores newest-first, gap detection over the
  // first-4 window (a non-contiguous fy/qtr or a null score withholds event
  // labels). detailQuarters is newest-first (index 0 is "Latest").
  const trajectory = React.useMemo<TrajectoryResult>(() => {
    const window4 = detailQuarters.slice(0, 4);
    let hasGapInWindow = window4.some(
      (q) => typeof q.score !== "number" || !Number.isFinite(q.score),
    );
    for (let i = 0; i < window4.length - 1; i++) {
      if (
        quarterIndex(window4[i].fy, window4[i].qtr) -
          quarterIndex(window4[i + 1].fy, window4[i + 1].qtr) !==
        1
      ) {
        hasGapInWindow = true;
      }
    }
    const scores = detailQuarters
      .map((q) => q.score)
      .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
    return classifyTrajectory(scores, { hasGapInWindow });
  }, [detailQuarters]);

  // "What to watch next quarter": synthesise the latest score, the series
  // trajectory, the forward outlook, and the swing variables. Silent when clean.
  const watchTrajectoryLabel = TRAJECTORIES[trajectory.key].label;
  const watchView = React.useMemo(
    () =>
      buildNextQuarterWatch({
        latestScore:
          typeof detailQuarters[0]?.score === "number" ? detailQuarters[0].score : null,
        growthScore: growthScore ?? null,
        trajectory: {
          key: trajectory.key,
          change: trajectory.change,
          label: TRAJECTORIES[trajectory.key].label,
          description: trajectory.description,
        },
        swingVars: swingVars ?? [],
      }),
    [detailQuarters, growthScore, trajectory, swingVars],
  );

  // chartData is oldest→newest; the range window keeps the most recent N points.
  // Rolling average is computed on the full series first so the line doesn't
  // recompute (and jump) when the range narrows.
  const enrichedChartData = React.useMemo(() => withRollingAverage(chartData), [chartData]);
  const visibleChartData =
    range >= enrichedChartData.length ? enrichedChartData : enrichedChartData.slice(-range);
  const showRangeToggle = chartData.length > CHART_RANGES[0];

  // Selecting a quarter outside the chart window widens it so the highlight is visible.
  const expandRangeFor = (index: number) => {
    if (index >= range) setRange(24);
  };

  const handleQuarterSelect = (quarterLabel: string) => {
    const nextIndex = detailQuarters.findIndex((q) => q.quarter_label === quarterLabel);
    if (nextIndex !== -1) {
      setSelectedIndex(nextIndex);
      expandRangeFor(nextIndex);
    }
  };

  // Net category lean for the selected quarter — summed from the v4
  // score_breakdown (-2..+2 per discussed category) the deterministic
  // composite is built from. Null for legacy rows without a breakdown.
  const leanSummary = React.useMemo(() => {
    const bd = quarterContext?.details?.score_breakdown;
    if (!bd) return null;
    const vals = Object.values(bd).filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
    );
    if (vals.length === 0) return null;
    const net = vals.reduce((a, b) => a + b, 0);
    const pos = vals.filter((v) => v > 0).reduce((a, b) => a + b, 0);
    const neg = vals.filter((v) => v < 0).reduce((a, b) => a + Math.abs(b), 0);
    return { net, pos, neg, count: vals.length };
  }, [quarterContext]);

  // Whether the proportional leans strip has anything to draw — zero-lean and
  // lean-less cats carry no segment, so the strip (and its caption) hide.
  const hasLeanSegments = Boolean(
    quarterContext?.v4?.categories.some(
      (cat) => cat.state === "addressed" && typeof cat.lean === "number" && cat.lean !== 0,
    ),
  );

  const cards: Record<string, SectionCard> = quarterContext
    ? {
        resultsSummary: {
          key: "results-summary",
          label: "Results summary",
          accent: "bg-amber-400/80",
          items: quarterContext.resultsSummary,
        },
        guidance: {
          key: "guidance",
          label: "Guidance",
          accent: "bg-amber-400/80",
          text: quarterContext.guidance ?? undefined,
        },
        risks: {
          key: "risks",
          label: "Risks",
          accent: "bg-amber-400/80",
          items: quarterContext.risks,
        },
      }
    : {};

  return (
    <div className="flex flex-col gap-3">
    <div className={`${elevatedBlockClass} p-2.5`}>
      <div className="flex flex-col gap-3">
        {quarterContext ? (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
              {/* LEFT — Where it sits: verdict (circle + band) → lean meter → rationale. */}
              <div className={`${nestedDetailClass} flex flex-col gap-3 p-3`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Where it sits
                    </p>
                  </div>
                  {/* Quarter picker — the full label list lives here (and via
                     chart dot/axis clicks), replacing the old chip row. */}
                  <select
                    aria-label="Select quarter"
                    value={selectedIndex}
                    onChange={(e) => {
                      const index = Number(e.target.value);
                      setSelectedIndex(index);
                      expandRangeFor(index);
                    }}
                    className="h-7 cursor-pointer rounded-md border border-border/60 bg-background px-2 text-[11px] font-medium text-foreground shadow-none transition-colors hover:bg-accent"
                  >
                    {detailQuarters.map((quarter, index) => (
                      <option key={`${quarter.fy}-${quarter.qtr}-${index}`} value={index}>
                        {buildDetailQuarterContext(quarter).detailQuarterLabel}
                        {index === 0 ? " · latest" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <ConcallScore
                    score={quarterContext.detailScore}
                    size="md"
                    className="shrink-0 shadow-none ring-1"
                  />
                  <div>
                    <div className={`text-[18px] font-bold ${quarterContext.band.tone}`}>
                      {quarterContext.band.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Band {BANDS[bandForScore(quarterContext.detailScore)].description} · fixed cuts
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col border-t border-border/40 pt-3">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Why this score
                  </p>
                  {quarterContext.rationale.length > 0 ? (
                    <ul className="flex flex-1 flex-col justify-between gap-3">
                      {quarterContext.rationale.map((item, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-[12px] leading-snug text-foreground/85"
                        >
                          {item.direction === "positive" ? (
                            <ArrowUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          ) : item.direction === "negative" ? (
                            <ArrowDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                          ) : (
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400/80" />
                          )}
                          <span>
                            {item.heading && (
                              <span className="font-semibold text-foreground">{item.heading}</span>
                            )}
                            {item.heading && item.detail ? " — " : ""}
                            {item.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] italic text-muted-foreground">
                      No rationale for this quarter.
                    </p>
                  )}
                </div>
              </div>
              {renderChartCard({
                chartData: visibleChartData,
                selectedQuarterLabel: selectedQuarter?.quarter_label ?? "",
                onQuarterSelect: handleQuarterSelect,
                range,
                onRangeChange: setRange,
                showRangeToggle,
                trajectory,
              })}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div
              className={`${nestedDetailClass} flex items-center justify-center p-4 text-[11px] text-muted-foreground`}
            >
              No quarterly context available.
            </div>
            {renderChartCard({
              chartData: visibleChartData,
              selectedQuarterLabel: "",
              onQuarterSelect: handleQuarterSelect,
              range,
              onRangeChange: setRange,
              showRangeToggle,
              trajectory,
            })}
          </div>
        )}
      </div>
    </div>

      {quarterContext && (
        <div className={`${elevatedBlockClass} p-2.5`}>
          <button
            type="button"
            onClick={() => setBreakdownOpen((open) => !open)}
            aria-expanded={breakdownOpen}
            className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
          >
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="text-[13px] font-semibold text-foreground">
                <span className="sm:hidden">Category breakdown</span>
                <span className="hidden sm:inline">Quarter breakdown by category</span>
              </h3>
              {leanSummary && (
                <span
                  className={cn(
                    chipClass(leanSummary.net >= 0 ? "emerald" : "rose"),
                    "px-2 py-0.5 text-[10px]",
                  )}
                >
                  Net {leanSummary.net >= 0 ? "+" : "−"}
                  {Math.abs(leanSummary.net)} · {leanSummary.count} discussed
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              {/* The quarter is already chosen above; only desktop has room to echo it. */}
              <span className="hidden tabular-nums sm:inline">{quarterContext.detailQuarterLabel}</span>
              <span className="font-medium text-foreground/80">
                {breakdownOpen ? "Collapse" : "Expand"}
              </span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", breakdownOpen && "rotate-180")}
              />
            </span>
          </button>

          {/* The leans strip lives here (moved from the verdict card) so the
              quarter's category tilt reads at a glance even while collapsed. */}
          {quarterContext.v4 && hasLeanSegments && (
            <div className="mt-2.5 space-y-1.5">
              <V4LeansStrip
                categories={quarterContext.v4.categories}
                onSelect={(key) => {
                  setBreakdownOpen(true);
                  setFocusCategoryKey(key);
                  requestAnimationFrame(() => {
                    document
                      .getElementById(`v4-cat-${key}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  });
                }}
              />
              <p className="text-[10px] text-muted-foreground">
                Select a category to open its detail; expand for all cards.
              </p>
            </div>
          )}

          {/* First-order extraction: the category cards (cat_1 included). "Why this
              score" + Quarter summary live in the verdict block above; risks is folded
              into cat_5 (Concentration/dependencies). Legacy rows with no v4 keep the
              old flat cards so no data is lost. */}
          {breakdownOpen && (
            <div className="mt-3">
              {quarterContext.v4 && <V4CoverageStrip categories={quarterContext.v4.categories} />}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
                {quarterContext.v4 ? (
                  <V4CategoryCards
                    categories={quarterContext.v4.categories}
                    focusKey={focusCategoryKey}
                  />
                ) : (
                  <>
                    {renderCard(cards.resultsSummary)}
                    {renderCard(cards.guidance)}
                    {renderCard(cards.risks)}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <NextQuarterWatch view={watchView} trajectoryLabel={watchTrajectoryLabel} />
    </div>
  );
}
