"use client";

import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ChartLineLabel } from "../[code]/chart";
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
  const risks = Array.isArray(details?.risks) ? (details.risks as string[]).slice(0, 2) : [];
  const rationale = Array.isArray(details?.rationale)
    ? (details.rationale as string[]).slice(0, 2)
    : [];
  const quarterSummary = Array.isArray(details?.quarter_summary)
    ? (details.quarter_summary as string[]).slice(0, 2)
    : [];
  const resultsSummary = Array.isArray(details?.results_summary)
    ? (details.results_summary as string[]).slice(0, 2)
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

export function QuarterlyScoreSection({
  chartData,
  detailQuarters,
  trend,
}: QuarterlyScoreSectionProps) {
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>();
  const [selectedQuarterLabel, setSelectedQuarterLabel] = React.useState(
    detailQuarters[0]?.quarter_label ?? "",
  );
  const [selectedQuarterIndex, setSelectedQuarterIndex] = React.useState(0);

  React.useEffect(() => {
    if (detailQuarters.length === 0) {
      setSelectedQuarterLabel("");
      setSelectedQuarterIndex(0);
      return;
    }

    setSelectedQuarterLabel(detailQuarters[0].quarter_label);
    setSelectedQuarterIndex(0);
    carouselApi?.scrollTo(0);
  }, [carouselApi, detailQuarters]);

  React.useEffect(() => {
    if (!carouselApi) return;

    const syncFromCarousel = () => {
      const nextIndex = carouselApi.selectedScrollSnap();
      setSelectedQuarterIndex(nextIndex);
      setSelectedQuarterLabel(detailQuarters[nextIndex]?.quarter_label ?? "");
    };

    syncFromCarousel();
    carouselApi.on("select", syncFromCarousel);
    carouselApi.on("reInit", syncFromCarousel);

    return () => {
      carouselApi.off("select", syncFromCarousel);
      carouselApi.off("reInit", syncFromCarousel);
    };
  }, [carouselApi, detailQuarters]);

  const handleQuarterSelect = (quarterLabel: string) => {
    const nextIndex = detailQuarters.findIndex((quarter) => quarter.quarter_label === quarterLabel);
    if (nextIndex === -1) return;

    setSelectedQuarterLabel(quarterLabel);
    setSelectedQuarterIndex(nextIndex);
    carouselApi?.scrollTo(nextIndex);
  };

  const canBrowseQuarters = detailQuarters.length > 1;
  const currentPositionLabel = `${String(selectedQuarterIndex + 1).padStart(2, "0")} / ${String(
    detailQuarters.length,
  ).padStart(2, "0")}`;

  return (
    <div className="rounded-[1.35rem] border border-amber-200/20 bg-gradient-to-br from-background/96 via-background/98 to-muted/10 p-2.5 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.28)] dark:border-amber-700/18 dark:from-background/90 dark:via-background/88 dark:to-background/76">
      <div className="flex flex-col gap-3">
        <div
          className={`grid gap-2 rounded-xl border px-2.5 py-2 shadow-sm shadow-black/10 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center ${
            trend.direction === "improving"
              ? "border-emerald-300/60 bg-gradient-to-r from-emerald-100/90 via-background/92 to-background/78 dark:border-emerald-500/40 dark:from-emerald-500/18 dark:via-background/82 dark:to-background/70"
              : trend.direction === "declining"
                ? "border-red-300/60 bg-gradient-to-r from-red-100/90 via-background/92 to-background/78 dark:border-red-500/40 dark:from-red-500/18 dark:via-background/82 dark:to-background/70"
                : "border-amber-300/60 bg-gradient-to-r from-amber-100/90 via-background/92 to-background/78 dark:border-amber-500/40 dark:from-amber-500/18 dark:via-background/82 dark:to-background/70"
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border/45 bg-background/90 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:bg-background/78">
            {trend.direction === "improving" ? (
              <>
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Trend: Improving
                </span>
              </>
            ) : trend.direction === "declining" ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-[11px] font-semibold text-red-700 dark:text-red-300">
                  Trend: Declining
                </span>
              </>
            ) : (
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                ↔ Trend: Stable
              </span>
            )}
          </div>
          <div className="rounded-lg border border-border/20 bg-background/70 px-3 py-1.5">
            <span className="block text-[11px] leading-snug text-foreground/88">
              {trend.description}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.82fr)_minmax(24rem,1.18fr)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-amber-200/20 bg-background/78 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_20px_-22px_rgba(15,23,42,0.16)] dark:border-amber-700/18 dark:bg-background/80">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Score trend
              </p>
              <span className="text-[10px] text-muted-foreground">12 quarters</span>
            </div>
            <div className="mx-auto flex w-full max-w-[34rem] justify-center">
              <ChartLineLabel
                chartData={chartData}
                selectedQuarter={selectedQuarterLabel}
                onQuarterSelect={handleQuarterSelect}
              />
            </div>
            <p className="text-[10px] text-center text-muted-foreground">
              Latest 12 quarters, oldest to newest. Click a point to inspect that quarter.
            </p>
          </div>

          <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-amber-200/20 bg-background/90 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_16px_26px_-24px_rgba(15,23,42,0.18)] dark:border-amber-700/18 dark:bg-background/84">
            {detailQuarters.length > 0 ? (
              <Carousel setApi={setCarouselApi} opts={{ align: "start" }} className="min-w-0 w-full">
                <CarouselContent className="ml-0">
                  {detailQuarters.map((quarter, index) => {
                  const quarterContext = buildDetailQuarterContext(quarter);
                  const isLatest = index === 0;
                  const hasVisibleContext =
                    quarterContext.quarterSummary.length > 0 || quarterContext.rationale.length > 0;

                  return (
                    <CarouselItem
                      key={`${quarter.fy}-${quarter.qtr}-${index}`}
                      className="basis-full pl-0"
                    >
                      <div className="space-y-4 px-1 pb-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Quarter
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-[18px] font-semibold leading-tight text-foreground sm:text-[20px]">
                                {quarterContext.detailQuarterLabel}
                              </h3>
                              {isLatest && (
                                <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/40 dark:text-blue-300">
                                  Latest
                                </span>
                              )}
                              {quarterContext.category && (
                                <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {quarterContext.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-start gap-2 rounded-xl border border-border/40 bg-background/70 px-2.5 py-1.5">
                            <span className="pt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Score
                            </span>
                            <ConcallScore
                              score={quarterContext.detailScore}
                              size="md"
                              className="ring-[2px] shadow-none"
                            />
                          </div>
                        </div>

                        {hasVisibleContext ? (
                          <div className="space-y-3">
                            {quarterContext.quarterSummary.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Quarter summary
                                </p>
                                <ul className="space-y-1.5">
                                  {quarterContext.quarterSummary.map((item, itemIndex) => (
                                    <li
                                      key={itemIndex}
                                      className="relative pl-3 text-[12px] leading-snug text-foreground/90 line-clamp-2"
                                    >
                                      <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {quarterContext.rationale.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Rationale
                                </p>
                                <ul className="space-y-1.5">
                                  {quarterContext.rationale.map((item, itemIndex) => (
                                    <li
                                      key={itemIndex}
                                      className="relative pl-3 text-[12px] leading-snug text-foreground/85 line-clamp-2"
                                    >
                                      <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            No additional context available for this quarter.
                          </p>
                        )}

                        {quarterContext.details && (
                          <Drawer direction="right">
                            <div className="pt-1">
                              <DrawerTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 rounded-full border-border/60 bg-background/70 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-none hover:bg-accent"
                                >
                                  Show details
                                </Button>
                              </DrawerTrigger>
                            </div>
                            <DrawerContent>
                              <DrawerHeader>
                                <DrawerTitle>{quarterContext.detailQuarterLabel} details</DrawerTitle>
                                <DrawerDescription>
                                  Full quarter context from concall analysis details.
                                </DrawerDescription>
                              </DrawerHeader>
                              <div className="max-h-[75vh] space-y-4 overflow-y-auto px-4 pb-4 text-sm text-foreground">
                                <div className="flex flex-wrap items-center gap-2">
                                  <ConcallScore score={quarterContext.detailScore} size="sm" />
                                  {isLatest && (
                                    <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-700/50 dark:bg-blue-900/40 dark:text-blue-300">
                                      Latest
                                    </span>
                                  )}
                                  {quarterContext.category && (
                                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-foreground">
                                      {quarterContext.category}
                                    </span>
                                  )}
                                  {typeof quarterContext.confidence === "number" && (
                                    <span className="text-[11px] text-muted-foreground">
                                      Confidence: {(quarterContext.confidence * 100).toFixed(0)}%
                                    </span>
                                  )}
                                </div>

                                {quarterContext.quarterSummary.length > 0 && (
                                  <div className="space-y-1.5">
                                    <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
                                      Quarter summary
                                    </p>
                                    <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-muted-foreground">
                                      {quarterContext.quarterSummary.map((item, itemIndex) => (
                                        <li
                                          key={itemIndex}
                                          className="text-xs leading-snug text-foreground/80"
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {quarterContext.resultsSummary.length > 0 && (
                                  <div className="space-y-1.5">
                                    <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
                                      Results summary
                                    </p>
                                    <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-muted-foreground">
                                      {quarterContext.resultsSummary.map((item, itemIndex) => (
                                        <li
                                          key={itemIndex}
                                          className="text-xs leading-snug text-foreground/80"
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {quarterContext.rationale.length > 0 && (
                                  <div className="space-y-1.5">
                                    <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
                                      Rationale
                                    </p>
                                    <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-muted-foreground">
                                      {quarterContext.rationale.map((item, itemIndex) => (
                                        <li
                                          key={itemIndex}
                                          className="text-xs leading-snug text-foreground/80"
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {quarterContext.guidance && (
                                  <div className="space-y-1.5">
                                    <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
                                      Guidance
                                    </p>
                                    <p className="text-xs leading-relaxed text-foreground/80">
                                      {quarterContext.guidance}
                                    </p>
                                  </div>
                                )}

                                {quarterContext.risks.length > 0 && (
                                  <div className="space-y-1.5">
                                    <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
                                      Risks
                                    </p>
                                    <ul className="mt-1 space-y-1 list-disc pl-4 marker:text-muted-foreground">
                                      {quarterContext.risks.map((item, itemIndex) => (
                                        <li
                                          key={itemIndex}
                                          className="text-xs leading-snug text-foreground/80"
                                        >
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                              <DrawerFooter>
                                <DrawerClose asChild>
                                  <Button variant="outline">Close</Button>
                                </DrawerClose>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                        )}
                      </div>
                    </CarouselItem>
                  );
                })}
                </CarouselContent>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/30 pt-2">
                  <p className="text-[10px] text-muted-foreground">
                    {canBrowseQuarters
                      ? "Latest quarter shown first. Use arrows or the chart to browse earlier quarters."
                      : "Latest quarter context."}
                  </p>
                  {canBrowseQuarters && (
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {currentPositionLabel}
                      </span>
                      <CarouselPrevious className="static size-8 translate-x-0 translate-y-0 border border-border bg-background text-foreground shadow-sm hover:bg-accent disabled:opacity-40" />
                      <CarouselNext className="static size-8 translate-x-0 translate-y-0 border border-border bg-background text-foreground shadow-sm hover:bg-accent disabled:opacity-40" />
                    </div>
                  )}
                </div>
              </Carousel>
            ) : (
              <div className="rounded-xl border border-dashed border-border/50 bg-muted/30 p-3 text-[11px] text-muted-foreground">
                No quarterly context available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
