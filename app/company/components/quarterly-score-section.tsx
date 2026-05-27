"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import ConcallScore from "@/components/concall-score";
import { cn } from "@/lib/utils";
import { BANDS, bandForScore } from "@/lib/score-band";
import { ChartLineLabel } from "../[code]/chart";
import { chipClass } from "./chip-tone";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import {
  normalizeQuarterlyV4Categories,
  type NormalizedQuarterlyV4,
} from "@/lib/quarterly-v4/normalize";
import { V4CategoryCards, V4CoverageStrip } from "./quarterly-v4-section";

import type { ChartDataPoint, QuarterData } from "../types";

type QuarterlyScoreSectionProps = {
  chartData: ChartDataPoint[];
  detailQuarters: QuarterData[];
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
  const v4 = normalizeQuarterlyV4Categories(details?.v4_categories ?? null, detailQuarterLabel);

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
        <span className="text-amber-400/90">⭐</span> 8.5+&nbsp;&nbsp;·&nbsp;&nbsp;
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
}: QuarterlyScoreSectionProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [detailQuarters]);

  const selectedQuarter = detailQuarters[selectedIndex];
  const quarterContext = selectedQuarter ? buildDetailQuarterContext(selectedQuarter) : null;

  const handleQuarterSelect = (quarterLabel: string) => {
    const nextIndex = detailQuarters.findIndex((q) => q.quarter_label === quarterLabel);
    if (nextIndex !== -1) setSelectedIndex(nextIndex);
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

  return (
    <div className="flex flex-col gap-3">
    <div className={`${elevatedBlockClass} p-2.5`}>
      <div className="flex flex-col gap-3">
        {detailQuarters.length > 0 && (
          <div className={`${nestedDetailClass} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2`}>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Quarter
            </span>
            <div
              aria-label="Quarter selector"
              className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
            >
              {detailQuarters.map((quarter, index) => {
                const labelContext = buildDetailQuarterContext(quarter);
                const isActive = index === selectedIndex;
                return (
                  <button
                    key={`${quarter.fy}-${quarter.qtr}-${index}`}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`Select ${labelContext.detailQuarterLabel}`}
                    onClick={() => setSelectedIndex(index)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                      isActive
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {labelContext.detailQuarterLabel}
                    {index === 0 && !isActive && (
                      <span
                        className={cn(
                          chipClass("sky"),
                          "px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em]",
                        )}
                      >
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
          <>
            {/* Body: the verdict — "Why this score" (score circle + reasoning, the
                one second-order read kept) next to the score-trend chart. */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
              <div className={`${nestedDetailClass} flex flex-col p-3`}>
                {/* Title: score circle + sentiment band (derived from the score, no LLM). */}
                <div className="mb-4 flex items-center gap-2.5">
                  <ConcallScore
                    score={quarterContext.detailScore}
                    size="sm"
                    className="shrink-0 shadow-none ring-1"
                  />
                  <span className={`text-[14px] font-semibold ${quarterContext.band.tone}`}>
                    {quarterContext.band.label}
                  </span>
                </div>
                {/* Sub-label introducing the score drivers. */}
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
              {renderChartCard({
                chartData,
                selectedQuarterLabel: selectedQuarter?.quarter_label ?? "",
                onQuarterSelect: handleQuarterSelect,
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
              chartData,
              selectedQuarterLabel: "",
              onQuarterSelect: handleQuarterSelect,
            })}
          </div>
        )}
      </div>
    </div>

      {quarterContext && (
        <details className={`group ${elevatedBlockClass} p-2.5`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-foreground">
                Quarter breakdown by category
              </h3>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {quarterContext.detailQuarterLabel}
            </span>
          </summary>

          {/* First-order extraction: the category cards (cat_1 included). "Why this
              score" + Quarter summary live in the verdict block above; risks is folded
              into cat_5 (Concentration/dependencies). Legacy rows with no v4 keep the
              old flat cards so no data is lost. */}
          <div className="mt-3">
            {quarterContext.v4 && <V4CoverageStrip categories={quarterContext.v4.categories} />}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
              {quarterContext.v4 ? (
                <V4CategoryCards categories={quarterContext.v4.categories} />
              ) : (
                <>
                  {renderCard(cards.resultsSummary)}
                  {renderCard(cards.guidance)}
                  {renderCard(cards.risks)}
                </>
              )}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
