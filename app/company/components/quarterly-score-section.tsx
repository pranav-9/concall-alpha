"use client";

import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import ConcallScore from "@/components/concall-score";
import { ChartLineLabel } from "../[code]/chart";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import type { ChartDataPoint, QuarterData } from "../types";

type TrendInfo = {
  direction: "improving" | "declining" | "stable";
  description: string;
};

type QuarterlyScoreSectionProps = {
  chartData: ChartDataPoint[];
  detailQuarters: QuarterData[];
  trend: TrendInfo;
};

type ConcallDetails = {
  score?: number;
  category?: string;
  rationale?: string[];
  quarter_summary?: string[];
  results_summary?: string[];
  guidance?: string;
  risks?: string[];
  fy?: number;
  qtr?: number;
  confidence?: number;
};

type DetailQuarterContext = {
  details: ConcallDetails | null;
  risks: string[];
  rationale: string[];
  quarterSummary: string[];
  resultsSummary: string[];
  guidance: string | null;
  category: string | null;
  confidence: number | null;
  detailScore: number;
  detailQuarterLabel: string;
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
  const rationale = Array.isArray(details?.rationale) ? (details.rationale as string[]) : [];
  const quarterSummary = Array.isArray(details?.quarter_summary)
    ? (details.quarter_summary as string[])
    : [];
  const resultsSummary = Array.isArray(details?.results_summary)
    ? (details.results_summary as string[])
    : [];
  const guidance = typeof details?.guidance === "string" ? details.guidance : null;
  const category = typeof details?.category === "string" ? details.category : null;
  const confidence = typeof details?.confidence === "number" ? details.confidence : null;
  const detailScore = typeof details?.score === "number" ? details.score : quarter.score;
  const detailQuarterLabel =
    typeof details?.qtr === "number" && typeof details?.fy === "number"
      ? `Q${details.qtr} FY${details.fy}`
      : quarter.quarter_label;

  return {
    details,
    risks,
    rationale,
    quarterSummary,
    resultsSummary,
    guidance,
    category,
    confidence,
    detailScore,
    detailQuarterLabel,
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

const renderTrendBanner = (trend: TrendInfo) => (
  <div
    className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-1.5 ${
      trend.direction === "improving"
        ? "border-emerald-300/50 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10"
        : trend.direction === "declining"
          ? "border-red-300/50 bg-red-50/70 dark:border-red-500/30 dark:bg-red-500/10"
          : "border-amber-300/50 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
    }`}
  >
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {trend.direction === "improving" ? (
        <>
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Improving
          </span>
        </>
      ) : trend.direction === "declining" ? (
        <>
          <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
            Declining
          </span>
        </>
      ) : (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Stable
        </span>
      )}
    </span>
    <span className="text-[11px] leading-snug text-foreground/85">{trend.description}</span>
  </div>
);

const renderChartCard = ({
  chartData,
  selectedQuarterLabel,
  onQuarterSelect,
}: {
  chartData: ChartDataPoint[];
  selectedQuarterLabel: string;
  onQuarterSelect: (label: string) => void;
}) => (
  <div className={`${nestedDetailClass} flex min-w-0 flex-col gap-2 p-2.5`}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Score trend
      </p>
      <span className="text-[10px] text-muted-foreground">
        {chartData.length === 1 ? "1 quarter" : `${chartData.length} quarters`}
      </span>
    </div>
    <div className="mx-auto flex w-full max-w-[34rem] justify-center">
      <ChartLineLabel
        chartData={chartData}
        selectedQuarter={selectedQuarterLabel}
        onQuarterSelect={onQuarterSelect}
      />
    </div>
  </div>
);

export function QuarterlyScoreSection({
  chartData,
  detailQuarters,
  trend,
}: QuarterlyScoreSectionProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [detailQuarters]);

  const selectedQuarter = detailQuarters[selectedIndex];
  const quarterContext = selectedQuarter ? buildDetailQuarterContext(selectedQuarter) : null;
  const isLatest = selectedIndex === 0;

  const handleQuarterSelect = (quarterLabel: string) => {
    const nextIndex = detailQuarters.findIndex((q) => q.quarter_label === quarterLabel);
    if (nextIndex !== -1) setSelectedIndex(nextIndex);
  };

  const cards: Record<string, SectionCard> = quarterContext
    ? {
        quarterSummary: {
          key: "quarter-summary",
          label: "Quarter summary",
          accent: "bg-sky-400/80",
          items: quarterContext.quarterSummary,
        },
        rationale: {
          key: "rationale",
          label: "Rationale",
          accent: "bg-emerald-400/80",
          items: quarterContext.rationale,
        },
        resultsSummary: {
          key: "results-summary",
          label: "Results summary",
          accent: "bg-violet-400/80",
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
          accent: "bg-rose-400/80",
          items: quarterContext.risks,
        },
      }
    : {};

  return (
    <div className={`${elevatedBlockClass} p-2.5`}>
      <div className="flex flex-col gap-3">
        {detailQuarters.length > 0 && (
          <div className={`${nestedDetailClass} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2`}>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Quarter
            </span>
            <div
              role="tablist"
              aria-label="Select quarter"
              className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
            >
              {detailQuarters.map((quarter, index) => {
                const labelContext = buildDetailQuarterContext(quarter);
                const isActive = index === selectedIndex;
                return (
                  <button
                    key={`${quarter.fy}-${quarter.qtr}-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedIndex(index)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                      isActive
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {labelContext.detailQuarterLabel}
                    {index === 0 && !isActive && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        Latest
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {quarterContext ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
            <div className="flex min-w-0 flex-col gap-3">
              {renderTrendBanner(trend)}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <ConcallScore
                  score={quarterContext.detailScore}
                  size="sm"
                  className="shrink-0 shadow-none ring-1"
                />
                <h3 className="text-[18px] font-semibold leading-tight text-foreground sm:text-[20px]">
                  {quarterContext.detailQuarterLabel}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  {isLatest && (
                    <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/40 dark:text-blue-300">
                      Latest
                    </span>
                  )}
                  {quarterContext.category && (
                    <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-foreground/80">
                      {quarterContext.category}
                    </span>
                  )}
                  {typeof quarterContext.confidence === "number" && (
                    <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Confidence {(quarterContext.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              {renderCard(cards.quarterSummary)}
            </div>

            {renderChartCard({
              chartData,
              selectedQuarterLabel: selectedQuarter?.quarter_label ?? "",
              onQuarterSelect: handleQuarterSelect,
            })}

            {renderCard(cards.rationale)}
            {renderCard(cards.resultsSummary)}
            {renderCard(cards.guidance)}
            {renderCard(cards.risks)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div
              className={`${nestedDetailClass} flex items-center justify-center p-4 text-[11px] text-muted-foreground`}
            >
              No quarterly context available.
            </div>
            {renderChartCard({
              chartData,
              selectedQuarterLabel: "",
              onQuarterSelect: handleQuarterSelect,
            })}
          </div>
        )}
      </div>
    </div>
  );
}
