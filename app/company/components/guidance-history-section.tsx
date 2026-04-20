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

const STATUS_ORDER: NormalizedGuidanceStatusKey[] = [
  "revised",
  "delayed",
  "active",
  "not_yet_clear",
  "met",
  "dropped",
  "unknown",
];

const STATUS_ORDER_INDEX = new Map<NormalizedGuidanceStatusKey, number>(
  STATUS_ORDER.map((status, index) => [status, index]),
);

const STATUS_STYLES: Record<
  NormalizedGuidanceStatusKey,
  {
    badgeClass: string;
    accentClass: string;
    shellClass: string;
  }
> = {
  revised: {
    badgeClass:
      "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
    accentClass: "bg-sky-500",
    shellClass:
      "border-sky-200/40 bg-gradient-to-br from-sky-50/16 via-background/96 to-background/82 dark:border-sky-700/28 dark:from-sky-950/18 dark:via-background/88 dark:to-background/72",
  },
  delayed: {
    badgeClass:
      "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
    accentClass: "bg-amber-500",
    shellClass:
      "border-amber-200/40 bg-gradient-to-br from-amber-50/16 via-background/96 to-background/82 dark:border-amber-700/28 dark:from-amber-950/18 dark:via-background/88 dark:to-background/72",
  },
  active: {
    badgeClass:
      "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-200",
    accentClass: "bg-slate-500",
    shellClass:
      "border-slate-200/35 bg-gradient-to-br from-slate-50/14 via-background/96 to-background/82 dark:border-slate-700/28 dark:from-slate-950/18 dark:via-background/88 dark:to-background/72",
  },
  not_yet_clear: {
    badgeClass:
      "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-700/40 dark:bg-zinc-900/30 dark:text-zinc-200",
    accentClass: "bg-zinc-500",
    shellClass:
      "border-zinc-200/35 bg-gradient-to-br from-zinc-50/14 via-background/96 to-background/82 dark:border-zinc-700/28 dark:from-zinc-950/18 dark:via-background/88 dark:to-background/72",
  },
  met: {
    badgeClass:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
    accentClass: "bg-emerald-500",
    shellClass:
      "border-emerald-200/40 bg-gradient-to-br from-emerald-50/16 via-background/96 to-background/82 dark:border-emerald-700/28 dark:from-emerald-950/18 dark:via-background/88 dark:to-background/72",
  },
  dropped: {
    badgeClass:
      "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
    accentClass: "bg-rose-500",
    shellClass:
      "border-rose-200/40 bg-gradient-to-br from-rose-50/16 via-background/96 to-background/82 dark:border-rose-700/28 dark:from-rose-950/18 dark:via-background/88 dark:to-background/72",
  },
  unknown: {
    badgeClass: "border-border bg-muted text-foreground",
    accentClass: "bg-muted-foreground",
    shellClass:
      "border-border/35 bg-gradient-to-br from-background/96 via-background/92 to-muted/18",
  },
};

const STATUS_SUMMARY_BY_KEY: Record<NormalizedGuidanceStatusKey, string> = {
  revised: "Management has already reframed this thread.",
  delayed: "The original timing moved later than expected.",
  active: "Still open and being monitored.",
  not_yet_clear: "Direction remains ambiguous.",
  met: "The thread appears to have resolved as expected.",
  dropped: "Guidance was withdrawn or reset.",
  unknown: "The status could not be classified cleanly.",
};

const TRACKER_OVERVIEW_CLASS =
  "rounded-[1.45rem] border border-amber-200/35 bg-gradient-to-br from-amber-50/24 via-background/96 to-background/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_18px_34px_-30px_rgba(15,23,42,0.22)] backdrop-blur-sm dark:border-amber-700/20 dark:from-amber-950/16 dark:via-background/88 dark:to-background/74";

const TRACKER_ROOT_CLASS = "space-y-4";

const TRACKER_METRIC_CLASS =
  "rounded-2xl border border-border/30 bg-background/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] backdrop-blur-sm dark:bg-background/70";

const TRACKER_GROUP_CLASS =
  "relative overflow-hidden rounded-[1.45rem] border border-border/30 bg-gradient-to-br from-background/97 via-background/92 to-background/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_14px_26px_-24px_rgba(15,23,42,0.18)] backdrop-blur-sm";

const TRACKER_TRAIL_CLASS =
  "rounded-xl border border-border/30 bg-gradient-to-br from-background/96 via-background/92 to-muted/16 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:from-background/88 dark:via-background/82 dark:to-background/70";

const TRACKER_EMPTY_CLASS =
  "rounded-[1.45rem] border border-border/30 bg-gradient-to-br from-background/96 via-background/92 to-amber-50/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_18px_34px_-30px_rgba(15,23,42,0.2)] backdrop-blur-sm dark:from-background/88 dark:via-background/84 dark:to-amber-950/12";

const isRevenueGuidanceType = (value: string | null) => {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalized === "revenue";
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
    return mentionCountLabel ? `${periodLabel} | ${mentionCountLabel}` : periodLabel;
  }

  if (item.firstMentionPeriod || item.latestMentionPeriod) {
    const periodLabel = item.firstMentionPeriod ?? item.latestMentionPeriod;
    return mentionCountLabel ? `${periodLabel} | ${mentionCountLabel}` : periodLabel;
  }

  return mentionCountLabel;
};

const getGuidanceWindowText = (item: NormalizedGuidanceItem) => {
  if (item.firstMentionPeriod && item.latestMentionPeriod) {
    return item.firstMentionPeriod === item.latestMentionPeriod
      ? item.latestMentionPeriod
      : `${item.firstMentionPeriod} -> ${item.latestMentionPeriod}`;
  }

  return item.latestMentionPeriod ?? item.firstMentionPeriod ?? item.targetPeriod;
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

function GuidanceMetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
}) {
  return (
    <div className={TRACKER_METRIC_CLASS}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-semibold leading-tight text-foreground">{value}</p>
      {helper ? (
        <p className="mt-1 text-[11px] leading-snug text-foreground/70">{helper}</p>
      ) : null}
    </div>
  );
}

function GuidanceTrailContent({ item }: { item: NormalizedGuidanceItem }) {
  if (item.trail.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/45 bg-background/42 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground dark:bg-background/30">
        No quarter-by-quarter trail is available yet for this guidance thread.
      </div>
    );
  }

  return (
    <ol className="space-y-2.5">
      {item.trail.map((trailItem, idx) => {
        const sourceMeta = [
          trailItem.documentLabel,
          trailItem.documentType,
          trailItem.sourceReference,
        ].filter((entry): entry is string => Boolean(entry));

        return (
          <li key={`${item.guidanceKey}-trail-${trailItem.positionInStory ?? idx}`} className={TRACKER_TRAIL_CLASS}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                {trailItem.quarter ? (
                  <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-foreground">
                    {trailItem.quarter}
                  </span>
                ) : null}
                {trailItem.mentionType ? (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5",
                      getTrailMentionBadgeClass(trailItem.mentionType),
                    )}
                  >
                    {trailItem.mentionType}
                  </span>
                ) : null}
                {typeof trailItem.confidence === "number" ? (
                  <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-muted-foreground">
                    {(trailItem.confidence * 100).toFixed(0)}% conf
                  </span>
                ) : null}
              </div>

              {sourceMeta.length > 0 ? (
                <p className="max-w-[20rem] text-[10px] leading-snug text-muted-foreground sm:text-right">
                  {sourceMeta.join(" | ")}
                </p>
              ) : null}
            </div>

            {trailItem.summary ? (
              <p className="mt-2 text-[11.5px] font-medium leading-relaxed text-foreground">
                {trailItem.summary}
              </p>
            ) : null}

            {trailItem.excerpt ? (
              <p className="mt-2 border-l-2 border-border/45 pl-2.5 text-[11px] italic leading-relaxed text-foreground/85">
                &ldquo;{trailItem.excerpt}&rdquo;
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
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
  const periodWindowText = getGuidanceWindowText(item);
  const showTrail = item.trail.length > 0;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border/25 bg-gradient-to-br from-background/96 via-background/92 to-muted/14 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_14px_24px_-24px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:from-background/88 dark:via-background/82 dark:to-background/70">
      <div className={cn("absolute inset-x-0 top-0 h-1", statusStyle.accentClass)} />

      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-[10px] font-semibold text-muted-foreground">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0 space-y-2">
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
                {item.targetPeriod ? (
                  <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                    Target {item.targetPeriod}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                <p className="text-[13px] font-semibold leading-[1.35] text-foreground">
                  {item.guidanceText}
                </p>
                <p className="text-[11px] leading-snug text-foreground/70">
                  {supportText ?? "Open the trail to inspect the quarterly revisions."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
              {mentionSummaryText ? (
                <span className="rounded-full border border-border/50 bg-background/85 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                  {mentionSummaryText}
                </span>
              ) : null}
              {typeof item.confidence === "number" ? (
                <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[9px] text-muted-foreground">
                  {(item.confidence * 100).toFixed(0)}% conf
                </span>
              ) : null}
              {item.trail.length > 0 ? (
                <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[9px] text-muted-foreground">
                  {item.trail.length} trail{item.trail.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </div>

          {showTrail ? (
            <details className="group rounded-xl border border-border/25 bg-gradient-to-br from-background/94 via-background/90 to-background/74 p-2.5 dark:from-background/86 dark:via-background/80 dark:to-background/68">
              <summary className="list-none cursor-pointer">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/35 bg-background/72 px-3 py-2 transition-colors hover:bg-background/82 dark:bg-background/55 dark:hover:bg-background/65">
                  <div className="space-y-0.5">
                    <span className="block text-[11px] font-medium text-foreground">
                      Open full trail
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {periodWindowText ? `${periodWindowText} | ` : ""}
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
            <GuidanceTrailContent item={item} />
          )}
        </div>
      </div>
    </article>
  );
}

function GuidanceStatusGroup({
  statusKey,
  title,
  threads,
}: {
  statusKey: NormalizedGuidanceStatusKey;
  title: string;
  threads: NormalizedGuidanceItem[];
}) {
  if (threads.length === 0) return null;

  const statusStyle = STATUS_STYLES[statusKey];
  const visibleThreads = threads.slice(0, 3);
  const extraThreads = threads.slice(3);
  const latestPeriod =
    threads[0]?.latestMentionPeriod ?? threads[0]?.targetPeriod ?? threads[0]?.firstMentionPeriod ?? null;
  const trailCount = threads.reduce((count, thread) => count + thread.trail.length, 0);

  return (
    <section className={cn(TRACKER_GROUP_CLASS, statusStyle.shellClass)}>
      <div className={cn("absolute inset-x-0 top-0 h-1", statusStyle.accentClass)} />

      <div className="relative flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusStyle.accentClass)} />
              <p className="min-w-0 text-[13px] font-semibold leading-tight text-foreground">
                {title}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "h-fit px-2 py-0.5 text-[9px] font-semibold",
                  statusStyle.badgeClass,
                )}
              >
                {threads.length} tracked
              </Badge>
            </div>
            <p className="max-w-3xl text-[11px] leading-snug text-foreground/70">
              {STATUS_SUMMARY_BY_KEY[statusKey]}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {latestPeriod ? (
              <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                Latest {latestPeriod}
              </span>
            ) : null}
            <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              {trailCount} trail point{trailCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {visibleThreads.map((item, index) => (
            <GuidanceThreadCard
              key={`${item.guidanceKey}-summary`}
              item={item}
              index={index}
            />
          ))}
        </div>

        {extraThreads.length > 0 ? (
          <details className="group rounded-2xl border border-border/25 bg-background/60 p-2.5">
            <summary className="list-none cursor-pointer">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/75 px-3 py-2 transition-colors hover:bg-muted/35">
                <div>
                  <p className="text-[12px] font-medium leading-tight text-foreground">
                    <span className="group-open:hidden">
                      Show remaining {extraThreads.length} thread
                      {extraThreads.length === 1 ? "" : "s"}
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
        ) : null}
      </div>
    </section>
  );
}

export function GuidanceHistorySection({ items }: GuidanceHistorySectionProps) {
  const summaryItems = React.useMemo(
    () => items.filter((item) => !isRevenueGuidanceType(item.guidanceType)),
    [items],
  );
  const revenueItems = React.useMemo(
    () => items.filter((item) => isRevenueGuidanceType(item.guidanceType)),
    [items],
  );

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

    return Array.from(groups.entries())
      .map(([statusKey, group]) => ({
        statusKey,
        title: group.title,
        threads: group.threads,
      }))
      .sort((a, b) => {
        const aIndex = STATUS_ORDER_INDEX.get(a.statusKey) ?? STATUS_ORDER.length;
        const bIndex = STATUS_ORDER_INDEX.get(b.statusKey) ?? STATUS_ORDER.length;
        return aIndex - bIndex;
      });
  }, [summaryItems]);

  const trackerStats = React.useMemo(() => {
    const totalSourceMentions = summaryItems.reduce(
      (count, item) => count + item.sourceMentions.length,
      0,
    );
    const totalTrailPoints = summaryItems.reduce((count, item) => count + item.trail.length, 0);
    const latestPeriod =
      summaryItems[0]?.latestMentionPeriod ??
      summaryItems[0]?.targetPeriod ??
      summaryItems[0]?.firstMentionPeriod ??
      null;

    return {
      latestPeriod,
      totalSourceMentions,
      totalTrailPoints,
    };
  }, [summaryItems]);

  if (!summaryItems.length) {
    return (
      <div className={TRACKER_EMPTY_CLASS}>
        <p className="text-sm font-medium text-foreground">
          No non-revenue guidance threads are tracked yet.
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          {revenueItems.length > 0
            ? "Revenue guidance is summarized in the snapshot panel above, so this tracker stays focused on management threads with a quarter-by-quarter trail."
            : "We have not tracked meaningful management guidance for this company yet."}
        </p>
      </div>
    );
  }

  return (
    <div className={TRACKER_ROOT_CLASS}>
      <div className={TRACKER_OVERVIEW_CLASS}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Guidance tracker
            </p>
            <p className="max-w-3xl text-[13px] leading-snug text-foreground/80">
              Management guidance grouped by outcome, with the latest language, the revision trail,
              and the source depth all in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              {summaryItems.length} tracked
            </span>
            {trackerStats.latestPeriod ? (
              <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                Latest {trackerStats.latestPeriod}
              </span>
            ) : null}
            {revenueItems.length > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-medium text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200">
                {revenueItems.length} revenue item{revenueItems.length === 1 ? "" : "s"} separate
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <GuidanceMetricCard
            label="Tracked threads"
            value={summaryItems.length}
            helper="Non-revenue guidance threads"
          />
          <GuidanceMetricCard
            label="Source mentions"
            value={trackerStats.totalSourceMentions}
            helper="Mentions across filings and transcripts"
          />
          <GuidanceMetricCard
            label="Trail points"
            value={trackerStats.totalTrailPoints}
            helper="Quarter-level updates in the trail"
          />
          <GuidanceMetricCard
            label="Latest period"
            value={trackerStats.latestPeriod ?? "—"}
            helper="Most recent tracked window"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {statusGroups.map((group) => {
            const statusStyle = STATUS_STYLES[group.statusKey];

            return (
              <Badge
                key={group.statusKey}
                variant="outline"
                className={cn(
                  "h-fit gap-1.5 px-2.5 py-1 text-[10px] font-semibold",
                  statusStyle.badgeClass,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", statusStyle.accentClass)} />
                <span>{group.title}</span>
                <span className="opacity-70">{group.threads.length}</span>
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {statusGroups.map((group) => (
          <GuidanceStatusGroup
            key={group.statusKey}
            statusKey={group.statusKey}
            title={group.title}
            threads={group.threads}
          />
        ))}
      </div>
    </div>
  );
}
