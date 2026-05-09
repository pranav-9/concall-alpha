"use client";

import * as React from "react";
import { ChevronDown, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
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

// `badgeClass` is the soft variant (low-contrast tint) used in the drawer
// header and section overviews where the badge sits near other muted chips.
//
// `cardBadgeClass` is a higher-contrast variant used on the per-card status
// pill. The card sits on the page's dark surface, where the soft variant's
// `/30`-opacity fills wash out and the user can't tell Active from Met at a
// glance. The card variant uses solid mid-saturation fills with foreground
// text — strong enough to scan, still palette-consistent.
const STATUS_STYLES: Record<
  NormalizedGuidanceStatusKey,
  {
    badgeClass: string;
    cardBadgeClass: string;
    accentClass: string;
  }
> = {
  revised: {
    badgeClass:
      "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
    cardBadgeClass:
      "border-sky-500 bg-sky-500 text-white dark:border-sky-400 dark:bg-sky-500 dark:text-white",
    accentClass: "bg-sky-500",
  },
  delayed: {
    badgeClass:
      "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
    cardBadgeClass:
      "border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-500 dark:text-white",
    accentClass: "bg-amber-500",
  },
  active: {
    badgeClass:
      "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-200",
    cardBadgeClass:
      "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-50",
    accentClass: "bg-slate-500",
  },
  not_yet_clear: {
    badgeClass:
      "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-700/40 dark:bg-zinc-900/30 dark:text-zinc-200",
    cardBadgeClass:
      "border-zinc-300 bg-zinc-200 text-zinc-800 dark:border-zinc-500 dark:bg-zinc-600 dark:text-zinc-50",
    accentClass: "bg-zinc-500",
  },
  met: {
    badgeClass:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
    cardBadgeClass:
      "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-500 dark:text-white",
    accentClass: "bg-emerald-500",
  },
  dropped: {
    badgeClass:
      "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
    cardBadgeClass:
      "border-rose-500 bg-rose-500 text-white dark:border-rose-400 dark:bg-rose-500 dark:text-white",
    accentClass: "bg-rose-500",
  },
  unknown: {
    badgeClass: "border-border bg-muted text-foreground",
    cardBadgeClass: "border-border bg-muted text-foreground",
    accentClass: "bg-muted-foreground",
  },
};

const TRACKER_OVERVIEW_CLASS = `${elevatedBlockClass} p-4`;

const TRACKER_ROOT_CLASS = "space-y-4";

const TRACKER_TRAIL_CLASS = `${nestedDetailClass} px-3 py-2.5`;

const TRACKER_EMPTY_CLASS = `${elevatedBlockClass} p-4`;

const isRevenueGuidanceType = (value: string | null) => {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalized === "revenue";
};

// Prefer latestView (freshest management commentary) over statusReason
// (producer-rationale string). The drawer header still shows statusReason.
const getGuidanceSupportText = (item: NormalizedGuidanceItem) =>
  item.latestView ?? item.statusReason;

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
              <p className="mt-2 text-[11px] font-medium leading-relaxed text-foreground">
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

function GuidanceThreadCard({ item }: { item: NormalizedGuidanceItem }) {
  const supportText = getGuidanceSupportText(item);
  const periodWindowText = getGuidanceWindowText(item);
  const showTrail = item.trail.length > 0;
  const statusStyle = STATUS_STYLES[item.statusKey];

  return (
    <article className={`${nestedDetailClass} relative overflow-hidden p-3`}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-border/60 bg-muted/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {formatTypeChipLabel(item.guidanceType)}
                </span>
                {item.targetPeriod ? (
                  <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Target {item.targetPeriod}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                <p className="text-[13px] font-semibold leading-[1.35] text-foreground">
                  {item.guidanceText}
                </p>
                {supportText ? (
                  <p className="text-[11px] leading-snug text-foreground/70">{supportText}</p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:justify-end">
              <Badge
                variant="outline"
                className={cn(
                  "h-fit shrink-0 px-2 py-0.5 text-[10px] font-semibold",
                  statusStyle.cardBadgeClass,
                )}
              >
                {item.statusLabel}
              </Badge>
              {showTrail ? (
                <Drawer direction="right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DrawerTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Open guidance trail"
                          className="relative size-7 rounded-full border-border/60 bg-background/70 text-muted-foreground shadow-none hover:bg-accent hover:text-foreground"
                        >
                          <History className="size-3.5" />
                          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full border border-background bg-emerald-500 px-1 text-[10px] font-semibold leading-4 text-background">
                            {item.trail.length}
                          </span>
                        </Button>
                      </DrawerTrigger>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      Open trail
                    </TooltipContent>
                  </Tooltip>
                  <DrawerContent className="w-full max-w-xl">
                    <DrawerHeader className="border-b border-border">
                      <DrawerTitle className="text-[14px] leading-snug">
                        {item.guidanceText}
                      </DrawerTitle>
                      <DrawerDescription>
                        <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {item.targetPeriod ? (
                            <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Target {item.targetPeriod}
                            </span>
                          ) : null}
                          {periodWindowText ? (
                            <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {periodWindowText}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {item.trail.length} update{item.trail.length === 1 ? "" : "s"}
                          </span>
                        </span>
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="space-y-3 overflow-y-auto px-4 py-4">
                      <GuidanceTrailContent item={item} />
                    </div>
                    <DrawerFooter className="border-t border-border">
                      <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              ) : null}
            </div>
          </div>

          {showTrail ? null : <GuidanceTrailContent item={item} />}
      </div>
    </article>
  );
}

const ALL_TYPES_FILTER_KEY = "all";

const formatTypeChipLabel = (rawType: string | null) => {
  if (!rawType) return "MISC";
  // Producer's "other" enum surfaces here as a residual bucket
  // (partnerships / milestones the type classifier didn't bin).
  // Rename to "MISC" so users read it as "uncategorised", not as a meaningful
  // category called "Other".
  if (rawType.toLowerCase() === "other") return "MISC";
  return rawType.replace(/[_-]+/g, " ").toUpperCase();
};

export function GuidanceHistorySection({ items }: GuidanceHistorySectionProps) {
  const summaryItems = React.useMemo(
    () => items.filter((item) => !isRevenueGuidanceType(item.guidanceType)),
    [items],
  );
  const revenueItems = React.useMemo(
    () => items.filter((item) => isRevenueGuidanceType(item.guidanceType)),
    [items],
  );

  // Type-filter state (single-select; defaults to "all"). Filter applies
  // globally across both Active and Met columns.
  const [typeFilter, setTypeFilter] = React.useState<string>(ALL_TYPES_FILTER_KEY);

  // Show first 6 cards by default (3 rows on desktop's 2-col grid).
  // The expander reveals all remaining items. Resets to collapsed whenever
  // the filter changes — clicking a filter is a "fresh look" gesture, the
  // user shouldn't see 21 cards expanded just because they had it open
  // before.
  const COLLAPSED_VISIBLE_COUNT = 6;
  const [isExpanded, setIsExpanded] = React.useState<boolean>(false);
  React.useEffect(() => {
    setIsExpanded(false);
  }, [typeFilter]);

  // Counts per type across summaryItems (the unfiltered, non-revenue set).
  // Used to label the filter chips and skip empty types.
  const typeCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    summaryItems.forEach((item) => {
      const key = (item.guidanceType ?? "other").toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        label: formatTypeChipLabel(key),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [summaryItems]);

  // Reset filter to "all" if the current filter no longer has any items
  // (defensive — items can change as the page hydrates).
  React.useEffect(() => {
    if (typeFilter === ALL_TYPES_FILTER_KEY) return;
    if (!typeCounts.some((entry) => entry.key === typeFilter)) {
      setTypeFilter(ALL_TYPES_FILTER_KEY);
    }
  }, [typeFilter, typeCounts]);

  // Filtered slice that drives the status grouping below.
  const filteredItems = React.useMemo(() => {
    if (typeFilter === ALL_TYPES_FILTER_KEY) return summaryItems;
    return summaryItems.filter(
      (item) => (item.guidanceType ?? "other").toLowerCase() === typeFilter,
    );
  }, [summaryItems, typeFilter]);

  // Bucket filteredItems by status — used by the legend chips in the overview
  // band ("Active 14 · Met 7"). Order of statusGroups follows STATUS_ORDER:
  // [revised, delayed, active, not_yet_clear, met, dropped, unknown].
  // For the legend we only care about the count per bucket; render order of
  // the cards themselves is computed in `orderedThreads` below.
  const statusGroups = React.useMemo(() => {
    const groups = new Map<
      NormalizedGuidanceStatusKey,
      { title: string; threads: NormalizedGuidanceItem[] }
    >();

    filteredItems.forEach((item) => {
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
  }, [filteredItems]);

  // Flat ordered list rendered as a 2-col grid:
  //   Active items first, then Met, then any remaining statuses (delayed,
  //   revised, dropped, etc.) in STATUS_ORDER.
  // Within each status bucket, items keep their input-array order — the
  // producer emits guidance_items[] sorted by impact_score descending, so
  // input order IS impact-desc for free (no need to thread impact_score
  // through the normaliser).
  const orderedThreads = React.useMemo(() => {
    const RENDER_STATUS_ORDER: NormalizedGuidanceStatusKey[] = [
      "active",
      "met",
      "revised",
      "delayed",
      "not_yet_clear",
      "dropped",
      "unknown",
    ];
    const out: NormalizedGuidanceItem[] = [];
    RENDER_STATUS_ORDER.forEach((statusKey) => {
      filteredItems.forEach((item) => {
        if (item.statusKey === statusKey) out.push(item);
      });
    });
    return out;
  }, [filteredItems]);

  const totalSourceMentions = React.useMemo(
    () => filteredItems.reduce((count, item) => count + item.sourceMentions.length, 0),
    [filteredItems],
  );

  if (!summaryItems.length) {
    return (
      <div className={TRACKER_EMPTY_CLASS}>
        <p className="text-sm font-medium text-foreground">
          {revenueItems.length > 0
            ? "No qualitative guidance threads tracked yet."
            : "No guidance threads tracked yet."}
        </p>
        {revenueItems.length > 0 ? (
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Revenue guidance is covered in the snapshot panel above.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={TRACKER_ROOT_CLASS}>
      <div className={TRACKER_OVERVIEW_CLASS}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Guidance tracker
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {statusGroups.map((group) => {
                const statusStyle = STATUS_STYLES[group.statusKey];
                return (
                  <span
                    key={group.statusKey}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground"
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusStyle.accentClass)} />
                    <span>{group.title}</span>
                    <span className="text-muted-foreground">{group.threads.length}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {typeCounts.length > 1 ? (
            <div className="border-t border-border/30 pt-3">
              <ToggleGroup
                type="single"
                value={typeFilter}
                onValueChange={(nextValue) => {
                  // ToggleGroup emits "" when the active item is clicked again;
                  // treat that as "show everything" rather than blanking the
                  // selection.
                  if (!nextValue) {
                    setTypeFilter(ALL_TYPES_FILTER_KEY);
                    return;
                  }
                  setTypeFilter(nextValue);
                }}
                variant="outline"
                size="sm"
                // Disable shadow + max-width so chips can wrap freely. `gap-2`
                // gives visible space between adjacent pills since we override
                // the segmented-control styling on each item below.
                className="w-fit max-w-full flex-wrap gap-2 shadow-none data-[variant=outline]:shadow-none"
                aria-label="Filter guidance threads by type"
              >
                {/*
                  The base ToggleGroupItem renders chips as a SEGMENTED CONTROL
                  (shared borders, rounded only at first/last, equal-width via
                  `flex-1`). For a filter bar the chips are conceptually
                  independent and each should size to its label, so we break
                  out of that look:
                  - `!flex-none w-auto min-w-fit` overrides the base `flex-1
                    min-w-0` so each chip sizes to its content. Without this,
                    `flex-1` distributes width evenly and longer labels like
                    "COMMISSIONING" overflow their allocated slot.
                  - `whitespace-nowrap` keeps the LABEL + count on one line.
                  - `rounded-full` overrides `rounded-none first:rounded-l-md last:rounded-r-md`
                  - `border` + `data-[variant=outline]:border` restore borders
                    that segmented styling stripped via `border-l-0`
                  - `px-3.5` gives breathing room so `LABEL <count>` doesn't
                    crowd adjacent chips
                  - `data-[state=on]:bg-foreground / text-background` inverts
                    the chip when active so the selected filter is unambiguous
                  - `[&_span]` adjusts the count's color so it stays legible on
                    the inverted active background
                */}
                <ToggleGroupItem
                  value={ALL_TYPES_FILTER_KEY}
                  aria-label="Show all guidance types"
                  className="!flex-none w-auto min-w-fit rounded-full border px-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap data-[variant=outline]:border data-[variant=outline]:first:border-l data-[variant=outline]:border-l data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:[&_span]:text-background/70"
                >
                  All
                  <span className="ml-1.5 text-muted-foreground">{summaryItems.length}</span>
                </ToggleGroupItem>
                {typeCounts.map((entry) => (
                  <ToggleGroupItem
                    key={entry.key}
                    value={entry.key}
                    aria-label={`Show only ${entry.label} threads`}
                    className="!flex-none w-auto min-w-fit rounded-full border px-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap data-[variant=outline]:border data-[variant=outline]:first:border-l data-[variant=outline]:border-l data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:[&_span]:text-background/70"
                  >
                    {entry.label}
                    <span className="ml-1.5 text-muted-foreground">{entry.count}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ) : null}

          {totalSourceMentions > 0 || revenueItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/30 pt-3">
              {totalSourceMentions > 0 ? (
                <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                  {totalSourceMentions} mention{totalSourceMentions === 1 ? "" : "s"}
                </span>
              ) : null}
              {revenueItems.length > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-medium text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200">
                  {revenueItems.length} revenue separate
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(isExpanded
          ? orderedThreads
          : orderedThreads.slice(0, COLLAPSED_VISIBLE_COUNT)
        ).map((item) => (
          <GuidanceThreadCard key={item.guidanceKey} item={item} />
        ))}
      </div>

      {orderedThreads.length > COLLAPSED_VISIBLE_COUNT ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="rounded-full px-4 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                Show fewer
                <ChevronDown className="ml-1.5 size-3.5 rotate-180 transition-transform" />
              </>
            ) : (
              <>
                Show {orderedThreads.length - COLLAPSED_VISIBLE_COUNT} more
                <ChevronDown className="ml-1.5 size-3.5 transition-transform" />
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
