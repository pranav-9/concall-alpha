"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ListChecks, TrendingUp } from "lucide-react";
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
import { buildQuarterExpectationView, type QuarterExpectationData } from "@/lib/quarter-expectation/build";
import { scoreVsBaseline } from "@/lib/quarter-expectation/baseline";
import { buildQuarterResults, type QuarterFinancialsPoint } from "@/lib/quarter-results";
import type { QuarterHighlight } from "@/lib/key-variables-snapshot/highlights";
import { normalizeSourceStatus } from "@/lib/score-freshness";
import { ChartLineLabel } from "../[code]/chart";
import { QuarterExpectationCard } from "./quarter-expectation-card";
import { QuarterHighlights } from "./quarter-highlights";
import { QuarterResultsTable } from "./quarter-results-table";
import { ScoreBreakdownTiles } from "./score-breakdown-tiles";
import { TrendBadge } from "./trend-badge";
import { chipClass } from "./chip-tone";
import { nestedDetailClass } from "./surface-tokens";
import {
  normalizeQuarterlyV4Categories,
  type NormalizedQuarterlyV4,
} from "@/lib/quarterly-v4/normalize";
import { V4CategoryCards } from "./quarterly-v4-section";

import type { ChartDataPoint, QuarterData } from "../types";

type ConcallScoreSectionProps = {
  chartData: ChartDataPoint[];
  detailQuarters: QuarterData[];
  // Forward inputs, threaded from the page so the section synthesizes without
  // its own fetch: the growth score feeds the score-vs-outlook setup chip; the
  // expectation data (calendar, issuer guide, what to listen for) is built
  // server-side in ConcallScorePanel. Both optional — the card and the chip
  // stay quiet when there's nothing to say.
  growthScore?: number | null;
  expectation?: QuarterExpectationData | null;
  // The reported quarterly P&L (quarterly_financials, newest first) behind the
  // Results card; the card is omitted for a quarter with no row.
  financials?: QuarterFinancialsPoint[];
  // The deep-tracked key variables, slimmed for the Top highlights strip.
  // Company-level, so drawn only on the latest quarter.
  highlights?: QuarterHighlight[];
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
  fy: number;
  qtr: number;
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
  const fy = typeof details?.fy === "number" ? details.fy : quarter.fy;
  const qtr = typeof details?.qtr === "number" ? details.qtr : quarter.qtr;
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
    fy,
    qtr,
    v4,
  };
};

// "Q2 FY2027" → "Q2 FY27": the section names quarters the short way everywhere.
const shortQuarterLabel = (label: string) => label.replace(/FY(\d{2})(\d{2})\b/, "FY$2");

type SectionCard = {
  key: string;
  label: string;
  accent: string;
  items?: string[];
  text?: string;
};

// Legacy rows (scored before the v4 breakdown) keep their flat cards.
const renderCard = (card: SectionCard) => {
  const hasItems = card.items && card.items.length > 0;
  const hasText = !!card.text;

  return (
    <div key={card.key} className={`${nestedDetailClass} p-3`}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${card.accent}`} />
        <h4 className="text-[13px] font-semibold leading-tight text-foreground">{card.label}</h4>
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

const dataFont = "font-[family-name:var(--font-data)] tabular-nums";
const displayFont = "font-[family-name:var(--font-display)] font-bold";

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

// The trail card: title + quarter count, the trajectory badge, the band
// legend, the range toggle, then the chart. Dots and axis labels select a quarter.
const ScoreTrailCard = ({
  chartData,
  totalQuarters,
  selectedQuarterLabel,
  onQuarterSelect,
  range,
  onRangeChange,
  showRangeToggle,
  trajectory,
}: {
  chartData: ChartDataPoint[];
  totalQuarters: number;
  selectedQuarterLabel: string;
  onQuarterSelect: (label: string) => void;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  showRangeToggle: boolean;
  // Series-level trajectory (as of the latest quarter) — same classification the
  // leaderboard/watchlist Trend column uses. Labels the chart, not a single quarter.
  trajectory: TrajectoryResult;
}) => {
  const hasRolling = chartData.some((d) => d.rollingAvg != null);
  return (
    <div className={cn(nestedDetailClass, "flex min-w-0 flex-col gap-2 p-3 sm:p-4")}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-[15px] font-semibold leading-tight text-foreground">Score trail</h3>
          <span className={cn(chipClass("slate"), dataFont, "px-2 py-0.5 text-[10px]")}>
            {totalQuarters === 1 ? "1 quarter" : `${totalQuarters} quarters`}
          </span>
          {trajectory.key !== "no_read" && (
            <TrendBadge
              trajectoryKey={trajectory.key}
              trendChange={trajectory.change}
              trendDescription={trajectory.description}
            />
          )}
        </div>
        {showRangeToggle && (
          <div className="hidden sm:block">
            <ChartRangeToggle range={range} onRangeChange={onRangeChange} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-teal-700" aria-hidden /> strongly bullish ≥8
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-teal-500" aria-hidden /> bullish ≥7
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-amber-400" aria-hidden /> neutral
        </span>
        {hasRolling && (
          <span>
            <span className="tracking-[0.16em]">┄</span> 4Q avg
          </span>
        )}
      </div>
      <div className="mx-auto flex w-full max-w-[34rem] justify-center">
        <ChartLineLabel
          chartData={chartData}
          selectedQuarter={selectedQuarterLabel}
          onQuarterSelect={onQuarterSelect}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground sm:hidden">
        <span>tap a dot for that quarter</span>
        {showRangeToggle && <ChartRangeToggle range={range} onRangeChange={onRangeChange} />}
      </div>
    </div>
  );
};

export function ConcallScoreSection({
  chartData,
  detailQuarters,
  growthScore,
  expectation,
  financials = [],
  highlights = [],
}: ConcallScoreSectionProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [range, setRange] = React.useState<ChartRange>(12);
  const [focusCategoryKey, setFocusCategoryKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [detailQuarters]);

  // Clear the category focus when the quarter changes — the card set belongs
  // to the newly selected quarter.
  React.useEffect(() => {
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

  // The setup read heading into the next call: score-vs-outlook divergence
  // and a falling trajectory, rendered as chips on the expectation card.
  // Silent when clean (same gate as the old "What to watch" block).
  const setup = React.useMemo(
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
        swingVars: [],
      }),
    [detailQuarters, growthScore, trajectory],
  );

  // "Before the Qn FYxx call": the server-built expectation data plus the
  // client-side state (upcoming / pending / landed) and the trail baseline,
  // both read off the rows already in hand. Client-only (this chunk is
  // ssr:false), so "today" is the browser's IST date.
  const expectationView = React.useMemo(
    () => (expectation ? buildQuarterExpectationView(expectation, detailQuarters) : null),
    [expectation, detailQuarters],
  );
  const lastQuarterForCard = React.useMemo(() => {
    const latest = detailQuarters[0];
    if (!latest) return null;
    const ctx = buildDetailQuarterContext(latest);
    return { label: ctx.detailQuarterLabel, rationale: ctx.rationale };
  }, [detailQuarters]);

  // How the selected quarter landed against the four scored quarters before
  // it — the same 4Q average the chart's dashed line draws, read one step
  // ahead. Within the band (the company's usual swing, floored at the ±0.5
  // re-score drift) it is "in line", not a surprise.
  const vsBaseline = React.useMemo(
    () => (selectedQuarter ? scoreVsBaseline(detailQuarters, selectedQuarter) : null),
    [detailQuarters, selectedQuarter],
  );
  const selectedSourceStatus = normalizeSourceStatus(
    (selectedQuarter?.details as { scoring_meta?: { source_status?: unknown } } | null | undefined)
      ?.scoring_meta?.source_status,
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

  // Lean streak per category for the selected quarter: how many consecutive,
  // contiguous quarters (walking older from the selected one) leaned the same
  // WAY. Surfaces as "· 3rd quarter in line" on the card chip. A quarter gap
  // or a missing breakdown ends the streak — no inference across holes.
  const leanStreaks = React.useMemo(() => {
    const breakdownAt = (i: number): Record<string, unknown> | null => {
      const d = parseJsonObject(detailQuarters[i]?.details) as ConcallDetails | null;
      const bd = d?.score_breakdown;
      return bd && typeof bd === "object" ? (bd as Record<string, unknown>) : null;
    };
    const out: Record<string, number> = {};
    const selected = breakdownAt(selectedIndex);
    if (!selected) return out;
    for (const [key, lean] of Object.entries(selected)) {
      if (typeof lean !== "number" || !Number.isInteger(lean)) continue;
      const sign = Math.sign(lean);
      let n = 1;
      for (let i = selectedIndex + 1; i < detailQuarters.length; i++) {
        const prev = detailQuarters[i - 1];
        const cur = detailQuarters[i];
        if (quarterIndex(prev.fy, prev.qtr) - quarterIndex(cur.fy, cur.qtr) !== 1) break;
        const v = breakdownAt(i)?.[key];
        if (typeof v !== "number" || !Number.isInteger(v) || Math.sign(v) !== sign) break;
        n++;
      }
      out[key] = n;
    }
    return out;
  }, [detailQuarters, selectedIndex]);

  // The scored quarter's reported P&L, when a row is on file for it.
  const results = React.useMemo(
    () => (quarterContext ? buildQuarterResults(financials, quarterContext.fy, quarterContext.qtr) : null),
    [financials, quarterContext],
  );

  const focusCategory = (key: string) => {
    setFocusCategoryKey(key);
    requestAnimationFrame(() => {
      document.getElementById(`v4-cat-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

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

  const quarterPicker = (
    <select
      aria-label="Select quarter"
      value={selectedIndex}
      onChange={(e) => {
        const index = Number(e.target.value);
        setSelectedIndex(index);
        expandRangeFor(index);
      }}
      className={cn(
        dataFont,
        "h-8 cursor-pointer rounded-md border border-border/60 bg-background px-2.5 text-[11.5px] font-medium text-foreground shadow-none transition-colors hover:bg-accent",
      )}
    >
      {detailQuarters.map((quarter, index) => (
        <option key={`${quarter.fy}-${quarter.qtr}-${index}`} value={index}>
          {shortQuarterLabel(buildDetailQuarterContext(quarter).detailQuarterLabel)}
          {index === 0 ? " · latest" : ""}
        </option>
      ))}
    </select>
  );

  const trailCard = (
    <ScoreTrailCard
      chartData={visibleChartData}
      totalQuarters={chartData.length}
      selectedQuarterLabel={selectedQuarter?.quarter_label ?? ""}
      onQuarterSelect={handleQuarterSelect}
      range={range}
      onRangeChange={setRange}
      showRangeToggle={showRangeToggle}
      trajectory={trajectory}
    />
  );

  if (!quarterContext) {
    return (
      <div className="flex flex-col gap-3">
        {expectationView && (
          <QuarterExpectationCard view={expectationView} setup={setup} lastQuarter={lastQuarterForCard} />
        )}
        <div className={cn(nestedDetailClass, "p-4 text-[12px] text-muted-foreground")}>
          No scored quarter yet.
        </div>
        {trailCard}
      </div>
    );
  }

  const band = BANDS[bandForScore(quarterContext.detailScore)];
  const [leadRationale, ...otherRationale] = quarterContext.rationale;
  const headline = leadRationale?.heading || leadRationale?.detail || null;
  const headlineDetail = leadRationale?.heading ? leadRationale.detail : null;
  const quarterLabel = shortQuarterLabel(quarterContext.detailQuarterLabel);
  const isLatest = selectedIndex === 0;

  return (
    <div className="flex flex-col gap-4">
      {expectationView && (
        <QuarterExpectationCard view={expectationView} setup={setup} lastQuarter={lastQuarterForCard} />
      )}

      {/* The verdict band: the quarter's lead reason as the headline, the score
          and its band on the right, the other reasons underneath. The wash is
          the band's own colour (lib/score-band), the one place score colour
          is allowed to tint a surface. */}
      <section
        aria-label={`${quarterLabel} verdict`}
        className={cn("rounded-xl border p-4 sm:p-5", band.washClass)}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(dataFont, "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground")}>
              {quarterLabel}
              {isLatest ? " · latest" : ""}
            </span>
            {selectedSourceStatus === "unofficial" && (
              <span className={cn(chipClass("amber"), "px-1.5 py-0 text-[9px] uppercase tracking-[0.14em]")}>
                unofficial · re-score pending
              </span>
            )}
          </div>
          {quarterPicker}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            {headline ? (
              <h3
                className={cn(
                  displayFont,
                  "text-pretty text-[21px] leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[26px]",
                )}
              >
                {headline}
              </h3>
            ) : (
              <h3 className={cn(displayFont, "text-[21px] leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[26px]")}>
                {band.label}
              </h3>
            )}
            {headlineDetail && (
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-foreground/75">{headlineDetail}</p>
            )}
            {otherRationale.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2 border-t border-border/30 pt-3">
                {otherRationale.map((item, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-foreground/85">
                    {item.direction === "positive" ? (
                      <ArrowUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="positive" />
                    ) : item.direction === "negative" ? (
                      <ArrowDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" aria-label="negative" />
                    ) : (
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400/80" aria-hidden />
                    )}
                    <span>
                      {item.heading && <span className="font-semibold text-foreground">{item.heading}</span>}
                      {item.heading && item.detail ? " — " : ""}
                      {item.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-3 lg:flex-col lg:items-center lg:pl-4 lg:text-center">
            <ConcallScore score={quarterContext.detailScore} size="lg" className="shrink-0 shadow-none ring-[3px]" />
            <div className="lg:mt-1">
              <div className={cn("text-[15px] font-bold leading-tight", band.tone)}>{band.label}</div>
              <div className={cn(dataFont, "mt-0.5 text-[11px] text-muted-foreground")}>
                {vsBaseline ? (
                  Math.abs(vsBaseline.delta) <= vsBaseline.band ? (
                    <span>In line with its 4Q avg ({vsBaseline.baseline.toFixed(1)})</span>
                  ) : (
                    <span>
                      <span className={vsBaseline.delta > 0 ? "text-emerald-500" : "text-rose-500"}>
                        {vsBaseline.delta > 0 ? "+" : "−"}
                        {Math.abs(vsBaseline.delta).toFixed(1)}
                      </span>{" "}
                      vs its 4Q avg ({vsBaseline.baseline.toFixed(1)})
                    </span>
                  )
                ) : (
                  <span>Trail too short to compare</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reported numbers beside the trail. Without a P&L row the trail takes the row. */}
      <div className={cn("grid grid-cols-1 gap-3", results && "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-stretch")}>
        {results && <QuarterResultsTable results={results} quarterLabel={quarterLabel} />}
        {trailCard}
      </div>

      {isLatest && <QuarterHighlights highlights={highlights} />}

      {quarterContext.v4 ? (
        <>
          <ScoreBreakdownTiles categories={quarterContext.v4.categories} onSelect={focusCategory} />
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h3 className="text-[15px] font-semibold leading-tight text-foreground">What the call said</h3>
              <span className={cn(chipClass("slate"), dataFont, "px-2 py-0.5 text-[10px]")}>{quarterLabel}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
              <V4CategoryCards
                categories={quarterContext.v4.categories}
                focusKey={focusCategoryKey}
                streaks={leanStreaks}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h3 className="text-[15px] font-semibold leading-tight text-foreground">What the call said</h3>
            <span className={cn(chipClass("slate"), dataFont, "px-2 py-0.5 text-[10px]")}>{quarterLabel}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
            {renderCard(cards.resultsSummary)}
            {renderCard(cards.guidance)}
            {renderCard(cards.risks)}
          </div>
        </div>
      )}
    </div>
  );
}
