"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  NormalizedGuidanceItem,
  NormalizedGuidanceStatusKey,
} from "@/lib/guidance-tracking/types";

export type GuidanceHistorySectionProps = {
  items: NormalizedGuidanceItem[];
};

const GUIDANCE_ROOT_CLASS =
  "space-y-4 rounded-[1.4rem] border border-border/30 bg-gradient-to-br from-amber-50/22 via-background/92 to-background/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_18px_32px_-28px_rgba(15,23,42,0.2)] backdrop-blur-sm dark:from-amber-950/18 dark:via-background/86 dark:to-background/72";

const GUIDANCE_GROUP_CLASS =
  "rounded-2xl border border-border/25 bg-gradient-to-br from-background/96 via-background/92 to-amber-50/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_14px_24px_-24px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:from-background/90 dark:via-background/84 dark:to-amber-950/12";

const GUIDANCE_THREAD_CARD_CLASS =
  "relative overflow-hidden rounded-2xl border border-border/25 bg-gradient-to-br from-background/96 via-background/92 to-muted/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_14px_24px_-24px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:from-background/88 dark:via-background/82 dark:to-background/70";

const GUIDANCE_TRAIL_CARD_CLASS =
  "rounded-xl border border-border/25 bg-gradient-to-br from-background/95 via-background/88 to-muted/14 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:from-background/86 dark:via-background/80 dark:to-background/68";

const GUIDANCE_EMPTY_STATE_CLASS =
  "rounded-2xl border border-border/25 bg-gradient-to-br from-background/96 via-background/90 to-amber-50/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] backdrop-blur-sm dark:from-background/88 dark:via-background/82 dark:to-amber-950/12";

const STATUS_STYLES: Record<
  NormalizedGuidanceStatusKey,
  {
    badgeClass: string;
    accentClass: string;
  }
> = {
  revised: {
    badgeClass:
      "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
    accentClass: "bg-sky-500",
  },
  delayed: {
    badgeClass:
      "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
    accentClass: "bg-amber-500",
  },
  active: {
    badgeClass:
      "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-200",
    accentClass: "bg-slate-500",
  },
  not_yet_clear: {
    badgeClass:
      "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-700/40 dark:bg-zinc-900/30 dark:text-zinc-200",
    accentClass: "bg-zinc-500",
  },
  met: {
    badgeClass:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
    accentClass: "bg-emerald-500",
  },
  dropped: {
    badgeClass:
      "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
    accentClass: "bg-rose-500",
  },
  unknown: {
    badgeClass: "border-border bg-muted text-foreground",
    accentClass: "bg-muted-foreground",
  },
};

const getTrailMentionBadgeClass = (mentionType: string | null) => {
  const normalized = mentionType?.trim().toLowerCase().replace(/\s+/g, "_");

  switch (normalized) {
    case "first_mention":
      return "border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-200 dark:border-blue-700/40";
    case "repeat":
      return "border-border/60 bg-muted/60 text-foreground";
    case "update":
      return "border-amber-200 bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-200 dark:border-amber-700/40";
    case "revision":
      return "border-sky-200 bg-sky-100 text-sky-700 dark:bg-sky-900/35 dark:text-sky-200 dark:border-sky-700/40";
    case "met":
      return "border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200 dark:border-emerald-700/40";
    default:
      return "border-border/60 bg-muted/60 text-foreground";
  }
};

const getGuidanceSupportText = (item: NormalizedGuidanceItem) =>
  item.statusReason ?? item.latestView;

const getGuidanceMentionCount = (item: NormalizedGuidanceItem) => {
  if (item.sourceMentions.length > 0) return item.sourceMentions.length;
  if (item.trail.length > 0) return item.trail.length;
  return item.mentionedPeriods.length;
};

const getGuidanceMentionSummaryText = (item: NormalizedGuidanceItem) => {
  const mentionCount = getGuidanceMentionCount(item);
  const mentionCountLabel =
    mentionCount > 0 ? `${mentionCount} mention${mentionCount === 1 ? "" : "s"}` : null;

  if (item.firstMentionPeriod && item.latestMentionPeriod) {
    const periodLabel =
      item.firstMentionPeriod === item.latestMentionPeriod
        ? item.firstMentionPeriod
        : `${item.firstMentionPeriod} -> ${item.latestMentionPeriod}`;
    return mentionCountLabel ? `${periodLabel} · ${mentionCountLabel}` : periodLabel;
  }

  if (item.firstMentionPeriod || item.latestMentionPeriod) {
    const periodLabel = item.firstMentionPeriod ?? item.latestMentionPeriod;
    return mentionCountLabel ? `${periodLabel} · ${mentionCountLabel}` : periodLabel;
  }

  return mentionCountLabel;
};

const isRevenueGuidanceType = (value: string | null) => {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalized === "revenue";
};

function GuidanceTrailContent({ item }: { item: NormalizedGuidanceItem }) {
  if (item.trail.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/45 bg-background/40 px-3 py-2.5 text-[11px] text-muted-foreground dark:bg-background/30">
        No quarter-by-quarter trail available yet for this guidance thread.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {item.trail.map((trailItem, idx) => {
        const sourceMeta = [
          trailItem.documentLabel,
          trailItem.documentType,
          trailItem.sourceReference,
        ].filter((entry): entry is string => Boolean(entry));

        return (
          <div
            key={`${item.guidanceKey}-trail-${trailItem.positionInStory ?? idx}`}
            className={cn(
              GUIDANCE_TRAIL_CARD_CLASS,
              idx > 0 && "mt-2",
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              {trailItem.quarter && (
                <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-foreground">
                  {trailItem.quarter}
                </span>
              )}
              {trailItem.mentionType && (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5",
                    getTrailMentionBadgeClass(trailItem.mentionType),
                  )}
                >
                  {trailItem.mentionType}
                </span>
              )}
              {typeof trailItem.confidence === "number" && (
                <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-muted-foreground">
                  {(trailItem.confidence * 100).toFixed(0)}% conf
                </span>
              )}
            </div>

            {trailItem.summary && (
              <p className="mt-2 text-[11.5px] font-medium leading-relaxed text-foreground">
                {trailItem.summary}
              </p>
            )}

            {trailItem.excerpt && (
              <p className="mt-2 border-l-2 border-border/45 pl-2.5 text-[11px] italic leading-relaxed text-foreground/86">
                “{trailItem.excerpt}”
              </p>
            )}

            {sourceMeta.length > 0 && (
              <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                {sourceMeta.join(" · ")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GuidanceThreadCard({
  item,
  index,
}: {
  item: NormalizedGuidanceItem;
  index: number;
}) {
  const statusStyle = STATUS_STYLES[item.statusKey];
  const supportText = getGuidanceSupportText(item);
  const mentionSummaryText = getGuidanceMentionSummaryText(item);
  const showTrail = item.trail.length > 0;

  return (
    <article className={GUIDANCE_THREAD_CARD_CLASS}>
      <div className={cn("absolute inset-x-0 top-0 h-1", statusStyle.accentClass)} />

      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-[10px] font-semibold text-muted-foreground">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-border/60 bg-muted/35 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {item.guidanceTypeLabel ?? "Guidance"}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "h-fit shrink-0 px-2 py-0.5 text-[9px] font-semibold",
                statusStyle.badgeClass,
              )}
            >
              {item.statusLabel}
            </Badge>
            {mentionSummaryText && (
              <span className="rounded-full border border-border/50 bg-background/85 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                {mentionSummaryText}
              </span>
            )}
          </div>

          <p className="mt-2 text-[13px] font-semibold leading-[1.3] text-foreground">
            {item.guidanceText}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-foreground/70">
            {supportText ?? "Open to view the quarter-by-quarter guidance trail."}
          </p>

          {showTrail ? (
            <details className="group mt-3 rounded-xl border border-border/25 bg-gradient-to-br from-background/94 via-background/88 to-background/72 p-2.5 dark:from-background/86 dark:via-background/80 dark:to-background/68">
              <summary className="list-none cursor-pointer">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/35 bg-background/70 px-3 py-2 transition-colors hover:bg-background/80 dark:bg-background/55 dark:hover:bg-background/65">
                  <div className="space-y-0.5">
                    <span className="block text-[11px] font-medium text-foreground">
                      Open full trail
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {item.trail.length} update{item.trail.length === 1 ? "" : "s"} tracked
                    </span>
                  </div>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/85 text-muted-foreground transition-colors group-open:bg-accent/70 group-open:text-foreground">
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </span>
                </div>
              </summary>
              <div className="mt-3">
                <GuidanceTrailContent item={item} />
              </div>
            </details>
          ) : (
            <div className="mt-3">
              <GuidanceTrailContent item={item} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function GuidanceThreadGroup({
  title,
  threads,
}: {
  title: string;
  threads: NormalizedGuidanceItem[];
}) {
  if (threads.length === 0) return null;

  const visibleThreads = threads.slice(0, 3);
  const extraThreads = threads.slice(3);

  return (
    <section className={GUIDANCE_GROUP_CLASS}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        <span className="text-[10px] text-muted-foreground">{threads.length} tracked</span>
      </div>

      <div className="mt-3 space-y-3">
        {visibleThreads.map((item, index) => (
          <GuidanceThreadCard key={`${item.guidanceKey}-summary`} item={item} index={index} />
        ))}
      </div>

      {extraThreads.length > 0 && (
        <details className="group mt-3 rounded-xl border border-border/25 bg-background/60 p-2.5">
          <summary className="list-none cursor-pointer">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/75 px-3 py-2 transition-colors hover:bg-muted/35">
              <div>
                <p className="text-[12px] font-medium leading-tight text-foreground">
                  <span className="group-open:hidden">
                    Show remaining {extraThreads.length} thread{extraThreads.length === 1 ? "" : "s"}
                  </span>
                  <span className="hidden group-open:inline">
                    Hide remaining thread{extraThreads.length === 1 ? "" : "s"}
                  </span>
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Expand to view the rest of the tracked management guidance.
                </p>
              </div>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/85 text-muted-foreground transition-colors group-open:bg-accent/70 group-open:text-foreground">
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </span>
            </div>
          </summary>

          <div className="mt-3 space-y-3">
            {extraThreads.map((item, index) => (
              <GuidanceThreadCard
                key={`${item.guidanceKey}-extra`}
                item={item}
                index={visibleThreads.length + index}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

export function GuidanceHistorySection({ items }: GuidanceHistorySectionProps) {
  const summaryItems = items.filter((item) => !isRevenueGuidanceType(item.guidanceType));
  const statusGroups = React.useMemo(() => {
    const groups = new Map<
      NormalizedGuidanceStatusKey,
      { title: string; threads: NormalizedGuidanceItem[] }
    >();

    summaryItems.forEach((item) => {
      const existing = groups.get(item.statusKey);
      if (existing) {
        existing.threads.push(item);
        return;
      }

      groups.set(item.statusKey, {
        title: item.statusLabel,
        threads: [item],
      });
    });

    return Array.from(groups.entries()).map(([statusKey, group]) => ({
      statusKey,
      title: group.title,
      threads: group.threads,
    }));
  }, [summaryItems]);

  if (!items.length) {
    return (
      <div className={GUIDANCE_EMPTY_STATE_CLASS}>
        <p className="text-sm text-muted-foreground">
          No meaningful management guidance tracked yet.
        </p>
      </div>
    );
  }

  return (
    <div className={GUIDANCE_ROOT_CLASS}>
      {statusGroups.map((group) => (
        <GuidanceThreadGroup key={group.statusKey} title={group.title} threads={group.threads} />
      ))}
    </div>
  );
}
