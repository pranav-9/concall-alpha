"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type {
  NormalizedGuidanceItem,
  NormalizedGuidanceStatusKey,
} from "@/lib/guidance-tracking/types";

export type GuidanceHistorySectionProps = {
  items: NormalizedGuidanceItem[];
};

const STATUS_STYLES: Record<
  NormalizedGuidanceStatusKey,
  {
    badgeClass: string;
    currentViewClass: string;
    latestMentionClass: string;
    ruleClass: string;
  }
> = {
  revised: {
    badgeClass:
      "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
    currentViewClass:
      "border-sky-200/80 bg-sky-50/80 dark:border-sky-800/40 dark:bg-sky-950/20",
    latestMentionClass:
      "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
    ruleClass: "bg-sky-500/70 dark:bg-sky-400/60",
  },
  delayed: {
    badgeClass:
      "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
    currentViewClass:
      "border-amber-200/80 bg-amber-50/80 dark:border-amber-800/40 dark:bg-amber-950/20",
    latestMentionClass:
      "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
    ruleClass: "bg-amber-500/70 dark:bg-amber-400/60",
  },
  active: {
    badgeClass:
      "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-200",
    currentViewClass:
      "border-slate-200/80 bg-slate-50/70 dark:border-slate-700/40 dark:bg-slate-950/20",
    latestMentionClass:
      "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-200",
    ruleClass: "bg-slate-500/60 dark:bg-slate-400/50",
  },
  not_yet_clear: {
    badgeClass:
      "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-700/40 dark:bg-zinc-900/30 dark:text-zinc-200",
    currentViewClass:
      "border-zinc-200/80 bg-zinc-50/70 dark:border-zinc-700/40 dark:bg-zinc-950/20",
    latestMentionClass:
      "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-700/40 dark:bg-zinc-900/30 dark:text-zinc-200",
    ruleClass: "bg-zinc-500/60 dark:bg-zinc-400/50",
  },
  met: {
    badgeClass:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
    currentViewClass:
      "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-800/40 dark:bg-emerald-950/20",
    latestMentionClass:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
    ruleClass: "bg-emerald-500/70 dark:bg-emerald-400/60",
  },
  dropped: {
    badgeClass:
      "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
    currentViewClass:
      "border-rose-200/80 bg-rose-50/80 dark:border-rose-800/40 dark:bg-rose-950/20",
    latestMentionClass:
      "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
    ruleClass: "bg-rose-500/70 dark:bg-rose-400/60",
  },
  unknown: {
    badgeClass: "border-border bg-muted text-foreground",
    currentViewClass: "border-border/60 bg-muted/40",
    latestMentionClass: "border-border bg-muted text-foreground",
    ruleClass: "bg-border",
  },
};

const formatSlideCount = (value: number) => value.toString().padStart(2, "0");

export function GuidanceHistorySection({ items }: GuidanceHistorySectionProps) {
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = React.useState(1);
  const [totalSlides, setTotalSlides] = React.useState(items.length);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(items.length > 1);

  React.useEffect(() => {
    if (!carouselApi) {
      setCurrentSlide(1);
      setTotalSlides(items.length);
      setCanScrollPrev(false);
      setCanScrollNext(items.length > 1);
      return;
    }

    const updateCarouselState = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap() + 1);
      setTotalSlides(carouselApi.scrollSnapList().length || items.length);
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };

    updateCarouselState();
    carouselApi.on("select", updateCarouselState);
    carouselApi.on("reInit", updateCarouselState);

    return () => {
      carouselApi.off("select", updateCarouselState);
      carouselApi.off("reInit", updateCarouselState);
    };
  }, [carouselApi, items.length]);

  if (!items.length) {
    return (
      <div className="rounded-xl border border-border/50 bg-background/70 p-6 shadow-sm shadow-black/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Management Guidance Tracker
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          No meaningful management guidance tracked yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border/40 pb-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Management Guidance Tracker
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm leading-snug text-foreground/85">
              Current management stance and quarter-by-quarter evolution.
            </p>
            <Badge
              variant="outline"
              className="border-border/70 bg-muted/40 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
            >
              {items.length} tracked
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            {formatSlideCount(currentSlide)} / {formatSlideCount(totalSlides)}
          </div>
          {items.length > 1 && (
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/80 p-1 shadow-sm shadow-black/5">
              <Button
                variant="ghost"
                size="icon-sm"
                className="static translate-x-0 translate-y-0 rounded-full text-foreground hover:bg-accent"
                disabled={!canScrollPrev}
                onClick={() => carouselApi?.scrollPrev()}
              >
                <ArrowLeft />
                <span className="sr-only">Previous slide</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="static translate-x-0 translate-y-0 rounded-full text-foreground hover:bg-accent"
                disabled={!canScrollNext}
                onClick={() => carouselApi?.scrollNext()}
              >
                <ArrowRight />
                <span className="sr-only">Next slide</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <Carousel
        opts={{ align: "start", containScroll: "trimSnaps" }}
        setApi={setCarouselApi}
        className="w-full"
      >
        <CarouselContent className="items-stretch">
          {items.map((item) => {
            const statusStyle = STATUS_STYLES[item.statusKey];
            const metadata = [
              item.guidanceTypeLabel,
              item.firstMentionPeriod ? `First mentioned in ${item.firstMentionPeriod}` : null,
              item.targetPeriod ? `Target: ${item.targetPeriod}` : null,
            ].filter((entry): entry is string => Boolean(entry));

            return (
              <CarouselItem
                key={`${item.guidanceKey}-${item.id}`}
                className="basis-[92%] sm:basis-[86%] md:basis-[78%] lg:basis-1/2"
              >
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-background/85 shadow-sm shadow-black/10">
                  <div className={cn("h-1.5 w-full", statusStyle.ruleClass)} />

                  <div className="flex h-full flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {item.guidanceTypeLabel ?? "Guidance Thread"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-fit text-[11px] font-semibold",
                          statusStyle.badgeClass,
                        )}
                      >
                        {item.statusLabel}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      <p className="text-[14px] font-semibold leading-[1.5] text-foreground sm:text-[15px]">
                        {item.guidanceText}
                      </p>
                      {metadata.length > 0 && (
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {metadata.join(" • ")}
                        </p>
                      )}
                    </div>

                    {item.latestView && (
                      <div
                        className={cn(
                          "mt-4 rounded-xl border p-3",
                          statusStyle.currentViewClass,
                        )}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Current view
                        </p>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/90">
                          {item.latestView}
                        </p>
                      </div>
                    )}

                    {item.statusReason && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Why it changed
                        </p>
                        <p className="text-[12px] leading-relaxed text-muted-foreground">
                          {item.statusReason}
                        </p>
                      </div>
                    )}

                    {item.mentionedPeriods.length > 0 && (
                      <div className="mt-auto pt-4">
                        <div className="border-t border-border/35 pt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Mentioned across
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.mentionedPeriods.map((period, index) => {
                              const isLatestMention =
                                index === item.mentionedPeriods.length - 1;

                              return (
                                <span
                                  key={`${item.guidanceKey}-${period}-${index}`}
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 text-[10px] font-medium",
                                    isLatestMention
                                      ? statusStyle.latestMentionClass
                                      : "border-border/60 bg-muted/35 text-muted-foreground",
                                  )}
                                >
                                  {period}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
