"use client";

import * as React from "react";
import { ChevronDown, History, LayoutGrid, TableProperties } from "lucide-react";
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
} from "@/components/ui/drawer";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  currentFiscalYear,
  extractFyYear,
  extractPercentRange,
  formatAbsoluteAmount,
  isHistoricalGuidanceItem,
  isReasoningProse,
} from "@/lib/guidance-tracking/normalize";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import type {
  NormalizedGuidanceItem,
  NormalizedGuidanceStatusKey,
} from "@/lib/guidance-tracking/types";

export type GuidanceHistorySectionProps = {
  items: NormalizedGuidanceItem[];
  // Snapshot-scoped provenance (PR2 item 16). Heterogeneous because
  // legacy snapshots stored a list of chunk ids; PR2-onwards stores
  // objects with source_doc_id / period_label / fy / qtr / doc_type /
  // url / local_path. The section renders only well-shaped entries and
  // skips the rest.
  sourceFiles?: unknown[];
};

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
    // Dashed-border / transparent fill to signal "unresolved" — distinct
    // from the solid-slate Active pill at a glance.
    cardBadgeClass:
      "border-dashed border-zinc-400 bg-transparent text-zinc-700 dark:border-zinc-500 dark:bg-transparent dark:text-zinc-300",
    accentClass: "bg-zinc-500",
  },
  met: {
    badgeClass:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
    cardBadgeClass:
      "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-500 dark:text-white",
    accentClass: "bg-emerald-500",
  },
  missed: {
    // Distinct from `dropped` (which is rose/red) — missed is an outcome
    // event (target not achieved) while dropped is a withdrawal. Use a
    // warmer red-orange so the eye can tell them apart on the page.
    badgeClass:
      "border-red-200 bg-red-100 text-red-800 dark:border-red-700/40 dark:bg-red-900/30 dark:text-red-200",
    cardBadgeClass:
      "border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-600 dark:text-white",
    accentClass: "bg-red-600",
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

// Top-level family tabs. Today only "growth" populates — the rest render
// "Coming soon" so the user can see what's planned. The schema currently
// only emits `guidanceFamily: "growth"`; margins / capex / others will be
// new families added later (no production threads in those buckets yet).
type FamilyTabId = "growth" | "margins" | "capex" | "others";

const FAMILY_TABS: ReadonlyArray<{ id: FamilyTabId; label: string }> = [
  { id: "growth", label: "Growth" },
  { id: "margins", label: "Margins" },
  { id: "capex", label: "CapEx" },
  { id: "others", label: "Others" },
] as const;

// Which family does a thread belong to? Today every thread comes back as
// "growth", but the function is forward-compatible: when the schema starts
// emitting margin/capex/etc., this is the single switch that routes them
// to the right tab.
const familyOfItem = (item: NormalizedGuidanceItem): FamilyTabId => {
  switch (item.guidanceFamily) {
    case "growth":
      return "growth";
    default:
      return "others";
  }
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

  return item.latestMentionPeriod ?? item.firstMentionPeriod ?? item.horizonLabel;
};

// Both NormalizedGuidanceItem and NormalizedGuidanceTrailItem carry the
// same value-shape fields (PR2 added trail-level value+horizon). Defining
// the badge formatters against this minimal projection lets the trail UI
// render its own per-step badges with the same logic that the top-level
// row uses, without copy-pasting.
type ValueBadgeFields = {
  valuePercent: number | null;
  valueText: string | null;
  valueKind: "percent" | "absolute" | null;
  numericValue: number | null;
  unit: string | null;
};

// Format a unit string for display ("INRcr" → "₹__cr", "USDmn" → "$__M").
// Returns the symbol prefix and suffix; caller assembles "<symbol><num><suffix>".
const formatUnitParts = (unit: string | null): { symbol: string; suffix: string } => {
  if (!unit) return { symbol: "", suffix: "" };
  const u = unit.toLowerCase();
  if (u === "inrcr") return { symbol: "₹", suffix: "cr" };
  if (u === "inrlakh" || u === "inrlakhs") return { symbol: "₹", suffix: "L" };
  if (u === "inr") return { symbol: "₹", suffix: "" };
  if (u === "usdmn" || u === "usdm") return { symbol: "$", suffix: "M" };
  if (u === "usdbn" || u === "usdb") return { symbol: "$", suffix: "B" };
  if (u === "usd") return { symbol: "$", suffix: "" };
  return { symbol: "", suffix: u };
};

// Split the value into two display badges: percent (velocity) and target
// (destination). Prefers the PR2 structured fields (value_kind +
// numeric_value + unit) when present; falls back to value_text parsing
// (extractPercentRange / formatAbsoluteAmount) for legacy / partial rows.
//
// Mutual-exclusion rule: when value_kind is "percent" the target badge
// returns null; when "absolute" the percent badge returns null. Without
// value_kind we use the text-parsing path which has its own muting logic.
const formatPercentBadge = (item: ValueBadgeFields): string | null => {
  // PR2 structured path — only renders when LLM tagged value_kind="percent".
  if (item.valueKind === "percent") {
    // Prefer the verbatim range from value_text ("20-25%") when present —
    // it carries uncertainty information the midpoint hides.
    const range = extractPercentRange(item.valueText);
    if (range) return range;
    if (typeof item.numericValue === "number" && Number.isFinite(item.numericValue)) {
      const rounded = Math.round(item.numericValue * 10) / 10;
      const display = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
      return `${display}%`;
    }
  }
  // Legacy / null value_kind path: parse from value_text.
  if (item.valueKind == null) {
    const range = extractPercentRange(item.valueText);
    if (range) return range;
    if (typeof item.valuePercent === "number" && Number.isFinite(item.valuePercent)) {
      const rounded = Math.round(item.valuePercent * 10) / 10;
      const display = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
      return `${display}%`;
    }
  }
  return null;
};

const formatTargetBadge = (item: ValueBadgeFields): string | null => {
  // PR2 structured path — render the absolute target with proper unit.
  if (item.valueKind === "absolute") {
    if (typeof item.numericValue === "number" && Number.isFinite(item.numericValue)) {
      const { symbol, suffix } = formatUnitParts(item.unit);
      const n = item.numericValue;
      // Try to recover a range from value_text first ("₹600-825cr"); if
      // present, use it verbatim rather than collapsing to the midpoint.
      const absolute = formatAbsoluteAmount(item.valueText);
      if (absolute) return absolute;
      const rounded = Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1);
      return `${symbol}${rounded}${suffix}`;
    }
    // numeric_value missing — fall through to value_text parsing below.
  }
  if (!item.valueText) return null;
  if (isReasoningProse(item.valueText)) return null;
  const absolute = formatAbsoluteAmount(item.valueText);
  if (absolute) return absolute;
  // If the percent column already renders, don't repeat the same number here
  // as a narrative form ("approximately 15%").
  if (typeof item.valuePercent === "number" && Number.isFinite(item.valuePercent)) {
    return null;
  }
  // Qualitative-only fallback ("double-digit", "mid-teens").
  return item.valueText.length > 20 ? `${item.valueText.slice(0, 18)}…` : item.valueText;
};

// Drawer header keeps a single combined badge for back-compat (header is
// already chip-dense; not worth splitting into two there).
const formatValueBadge = (item: NormalizedGuidanceItem): string | null =>
  formatPercentBadge(item) ?? formatTargetBadge(item);

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
          <li key={`${item.guidanceKey}-trail-${idx}`} className={TRACKER_TRAIL_CLASS}>
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
                {/* Per-step horizon — only renders when the trail entry
                   carries its own horizon (set by the synthesizer when this
                   step references a specific FY distinct from the thread's
                   canonical horizon). Lets the reader see "in this quarter
                   management was talking about FY27" at a glance. */}
                {trailItem.horizonLabel ? (
                  <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-muted-foreground">
                    {trailItem.horizonLabel}
                  </span>
                ) : null}
                {/* Per-step % growth — emerald, mirrors the top-level
                   % growth column. Renders the value committed AT THIS
                   step (revisions show 12% then 15% etc.). */}
                {(() => {
                  const pct = formatPercentBadge(trailItem);
                  if (!pct) return null;
                  return (
                    <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                      {pct}
                    </span>
                  );
                })()}
                {/* Per-step absolute target — sky, mirrors the Target column. */}
                {(() => {
                  const tgt = formatTargetBadge(trailItem);
                  if (!tgt) return null;
                  return (
                    <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 font-semibold text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
                      {tgt}
                    </span>
                  );
                })()}
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

function GuidanceThreadCard({
  item,
  currentFy,
  onSelect,
}: {
  item: NormalizedGuidanceItem;
  currentFy: string;
  onSelect: (item: NormalizedGuidanceItem) => void;
}) {
  const supportText = getGuidanceSupportText(item);
  const statusStyle = STATUS_STYLES[item.statusKey];
  const percentBadge = formatPercentBadge(item);
  const targetBadge = formatTargetBadge(item);
  const isHistorical = isHistoricalGuidanceItem(item, currentFy);

  return (
    <article
      onClick={() => onSelect(item)}
      className={cn(
        nestedDetailClass,
        "relative cursor-pointer overflow-hidden p-3 transition-colors hover:bg-muted/30",
        isHistorical && "opacity-70",
      )}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-border/60 bg-muted/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {item.metricLabel ?? "—"}
              </span>
              {item.segment ? (
                <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {item.segment}
                </span>
              ) : null}
              {item.horizonLabel ? (
                <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {item.horizonLabel}
                </span>
              ) : null}
              {percentBadge ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                  {percentBadge}
                </span>
              ) : null}
              {targetBadge ? (
                <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
                  {targetBadge}
                </span>
              ) : null}
              {isHistorical ? (
                <span className="px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                  Past
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
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <History className="size-3" />
              {item.trail.length}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function GuidanceTableRow({
  item,
  currentFy,
  onSelect,
  showSegmentColumn,
}: {
  item: NormalizedGuidanceItem;
  currentFy: string;
  onSelect: (item: NormalizedGuidanceItem) => void;
  showSegmentColumn: boolean;
}) {
  const statusStyle = STATUS_STYLES[item.statusKey];
  const percentBadge = formatPercentBadge(item);
  const targetBadge = formatTargetBadge(item);
  const isHistorical = isHistoricalGuidanceItem(item, currentFy);

  return (
    <tr
      onClick={() => onSelect(item)}
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/30",
        isHistorical && "opacity-70",
      )}
    >
      <td className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {item.metricLabel ?? "—"}
      </td>
      {showSegmentColumn ? (
        <td className="px-3 py-2.5 text-[12px] leading-snug text-foreground">
          {item.segment ?? <span className="text-muted-foreground/60">—</span>}
        </td>
      ) : null}
      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] leading-snug text-foreground">
        {item.horizonLabel ?? <span className="text-muted-foreground/60">—</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-[12px]">
        {percentBadge ? (
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
            {percentBadge}
          </span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-[12px]">
        {targetBadge ? (
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
            {targetBadge}
          </span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "h-fit shrink-0 px-2 py-0.5 text-[10px] font-semibold",
              statusStyle.cardBadgeClass,
            )}
          >
            {item.statusLabel}
          </Badge>
          {isHistorical ? (
            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
              Past
            </span>
          ) : null}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right">
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <History className="size-3" />
          {item.trail.length}
        </span>
      </td>
    </tr>
  );
}

function GuidanceDrawerBody({ item }: { item: NormalizedGuidanceItem }) {
  const supportText = getGuidanceSupportText(item);
  const periodWindowText = getGuidanceWindowText(item);
  const valueBadge = formatValueBadge(item);

  return (
    <>
      <DrawerHeader className="border-b border-border">
        <DrawerTitle className="text-[14px] leading-snug">
          {item.guidanceText}
        </DrawerTitle>
        <DrawerDescription>
          <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {item.metricLabel ? (
              <span className="rounded-full border border-border/60 bg-muted/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {item.metricLabel}
              </span>
            ) : null}
            {item.segment ? (
              <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {item.segment}
              </span>
            ) : null}
            {item.horizonLabel ? (
              <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {item.horizonLabel}
              </span>
            ) : null}
            {valueBadge ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                {valueBadge}
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
        {supportText ? (
          <p className="text-[12px] leading-snug text-foreground/85">{supportText}</p>
        ) : null}
        <GuidanceTrailContent item={item} />
      </div>
      <DrawerFooter className="border-t border-border">
        <DrawerClose asChild>
          <Button variant="outline">Close</Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  );
}

// Narrow a heterogeneous sourceFiles entry to the PR2-shape dict. Skips
// legacy chunk-id numbers and entries missing the minimum needed for a
// click-through render.
type RichSourceFile = {
  source_doc_id: number;
  period_label: string | null;
  fy: number | null;
  qtr: number | null;
  doc_type: string | null;
  url: string | null;
  local_path: string | null;
};

const asRichSourceFile = (entry: unknown): RichSourceFile | null => {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const e = entry as Record<string, unknown>;
  const sid = e.source_doc_id;
  if (typeof sid !== "number" || !Number.isFinite(sid)) return null;
  return {
    source_doc_id: sid,
    period_label: typeof e.period_label === "string" ? e.period_label : null,
    fy: typeof e.fy === "number" ? e.fy : null,
    qtr: typeof e.qtr === "number" ? e.qtr : null,
    doc_type: typeof e.doc_type === "string" ? e.doc_type : null,
    url: typeof e.url === "string" && e.url.length > 0 ? e.url : null,
    local_path:
      typeof e.local_path === "string" && e.local_path.length > 0 ? e.local_path : null,
  };
};

export function GuidanceHistorySection({ items, sourceFiles }: GuidanceHistorySectionProps) {
  // Top-level family tab — Growth | Margins | CapEx | Others. Today only
  // "growth" carries content; the others render a "Coming soon" placeholder.
  // Default is "growth" because that's the only family with data.
  const [familyTab, setFamilyTab] = React.useState<FamilyTabId>("growth");

  // Default view: only current / forward-looking commitments. Historical
  // threads (track record) are hidden behind an expander. The reasoning
  // is that current commitments are what the reader needs to see on every
  // visit; track record is reference material they pull up when they want
  // to verify management's delivery history. Reset to collapsed whenever
  // the tab changes — switching tabs is a "fresh look" gesture.
  const [isExpanded, setIsExpanded] = React.useState<boolean>(false);
  React.useEffect(() => {
    setIsExpanded(false);
  }, [familyTab]);

  // Single Drawer at the section level — clicking any table row sets the
  // selected thread, which renders the drawer body. Avoids wrapping each
  // <tr> in a separate Drawer (which would break <table> DOM semantics).
  const [selectedThread, setSelectedThread] = React.useState<NormalizedGuidanceItem | null>(null);

  // Two view modes: "table" (dense, default) and "cards" (looser, original).
  // Both share the same hoisted Drawer for thread details.
  const [viewMode, setViewMode] = React.useState<"table" | "cards">("table");

  // Counts per family — drives the tab badges. Today every count except
  // "growth" is 0; the tabs still render so users can preview the structure.
  const familyCounts = React.useMemo(() => {
    const counts: Record<FamilyTabId, number> = {
      growth: 0,
      margins: 0,
      capex: 0,
      others: 0,
    };
    items.forEach((item) => {
      counts[familyOfItem(item)] += 1;
    });
    return counts;
  }, [items]);

  // Items in the active family tab. When the tab has no content (margins /
  // capex / others today), this is empty and the Coming Soon panel renders
  // instead of the table.
  const filteredItems = React.useMemo(
    () => items.filter((item) => familyOfItem(item) === familyTab),
    [items, familyTab],
  );

  const currentFy = currentFiscalYear();

  // Flat ordered list rendered as a 2-col grid. Two zones:
  //   1. Current / forward-looking commitments (applies_to >= current FY,
  //      or unspecified/ongoing). Sorted by status priority — active first,
  //      then met, revised, delayed, not_yet_clear, dropped — preserving
  //      input order within ties.
  //   2. Historical threads (applies_to < current FY). Sorted by:
  //      (a) FY descending — most recent past at top
  //      (b) family priority — growth threads before margin threads within
  //          each FY group, so the reader reads each FY as "what did they
  //          promise on top-line first, then on profitability"
  //      (c) status priority — active before met/revised/dropped within
  //          each (FY, family) bucket
  const orderedThreads = React.useMemo(() => {
    const STATUS_PRIORITY: NormalizedGuidanceStatusKey[] = [
      "active",
      "met",
      "missed",
      "revised",
      "delayed",
      "not_yet_clear",
      "dropped",
      "unknown",
    ];
    const priorityOf = (key: NormalizedGuidanceStatusKey) => {
      const idx = STATUS_PRIORITY.indexOf(key);
      return idx === -1 ? STATUS_PRIORITY.length : idx;
    };
    const familyPriorityOf = (family: NormalizedGuidanceItem["guidanceFamily"]) =>
      family === "growth" ? 0 : family === "margin" ? 1 : 2;

    const current: NormalizedGuidanceItem[] = [];
    const historical: NormalizedGuidanceItem[] = [];
    filteredItems.forEach((item) => {
      (isHistoricalGuidanceItem(item, currentFy) ? historical : current).push(item);
    });

    // Pre-compute segment counts so the heaviest segment clusters first
    // under SEGMENT-LEVEL (e.g. CDMO 4 before HPP 4 before Specialty 4
    // when counts are equal — fall back to alphabetical). Consolidated
    // threads (segment === null) aren't counted here.
    const segmentRank = new Map<string, number>();
    {
      const counts = new Map<string, number>();
      current.forEach((item) => {
        if (item.segment) counts.set(item.segment, (counts.get(item.segment) ?? 0) + 1);
      });
      const ordered = Array.from(counts.entries()).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      );
      ordered.forEach(([name], idx) => segmentRank.set(name, idx));
    }

    current.sort((a, b) => {
      // Primary: consolidated (segment=null) first, segment-specific
      // second — so the rendered subheadings ("Overall" / "Segment-level")
      // get coherent groups under them.
      const aSegmented = a.segment ? 1 : 0;
      const bSegmented = b.segment ? 1 : 0;
      if (aSegmented !== bSegmented) return aSegmented - bSegmented;
      // Within SEGMENT-LEVEL: cluster by segment (heaviest first).
      // Cards from the same segment land adjacent so the reader scans
      // a coherent segment-by-segment narrative under the subheading.
      if (a.segment && b.segment && a.segment !== b.segment) {
        const aRank = segmentRank.get(a.segment) ?? Number.MAX_SAFE_INTEGER;
        const bRank = segmentRank.get(b.segment) ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
      }
      // Within the same segment (or both consolidated): status priority.
      return priorityOf(a.statusKey) - priorityOf(b.statusKey);
    });

    historical.sort((a, b) => {
      const aYear = extractFyYear(a.appliesTo) ?? Number.NEGATIVE_INFINITY;
      const bYear = extractFyYear(b.appliesTo) ?? Number.NEGATIVE_INFINITY;
      if (aYear !== bYear) return bYear - aYear;
      const famDiff = familyPriorityOf(a.guidanceFamily) - familyPriorityOf(b.guidanceFamily);
      if (famDiff !== 0) return famDiff;
      return priorityOf(a.statusKey) - priorityOf(b.statusKey);
    });

    return [...current, ...historical];
  }, [filteredItems, currentFy]);

  const totalSourceMentions = React.useMemo(
    () => filteredItems.reduce((count, item) => count + item.sourceMentions.length, 0),
    [filteredItems],
  );

  if (!items.length) {
    return (
      <div className={TRACKER_EMPTY_CLASS}>
        <p className="text-sm font-medium text-foreground">
          No guidance threads tracked yet.
        </p>
      </div>
    );
  }

  return (
    <div className={TRACKER_ROOT_CLASS}>
      <div className={TRACKER_OVERVIEW_CLASS}>
        <ToggleGroup
          type="single"
          value={familyTab}
          onValueChange={(nextValue) => {
            // ToggleGroup emits "" when the active item is re-clicked;
            // ignore that so one tab is always active.
            if (
              nextValue === "growth" ||
              nextValue === "margins" ||
              nextValue === "capex" ||
              nextValue === "others"
            ) {
              setFamilyTab(nextValue);
            }
          }}
          variant="outline"
          size="sm"
          className="w-fit max-w-full flex-wrap gap-2 shadow-none data-[variant=outline]:shadow-none"
          aria-label="Filter guidance threads by family"
        >
          {FAMILY_TABS.map((tab) => {
            const count = familyCounts[tab.id];
            return (
              <ToggleGroupItem
                key={tab.id}
                value={tab.id}
                aria-label={`Show ${tab.label} guidance`}
                className="!flex-none w-auto min-w-fit rounded-full border px-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap data-[variant=outline]:border data-[variant=outline]:first:border-l data-[variant=outline]:border-l data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:[&_span]:text-background/70"
              >
                {tab.label}
                <span className="ml-1.5 text-muted-foreground">{count}</span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        {totalSourceMentions > 0 && familyTab === "growth" ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/30 pt-3">
            <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              {totalSourceMentions} mention{totalSourceMentions === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
      </div>

      {filteredItems.length === 0 ? (
        <div className={cn(elevatedBlockClass, "p-8 text-center")}>
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Coming soon
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/70">
            {FAMILY_TABS.find((t) => t.id === familyTab)?.label} guidance tracking is on the roadmap.
            We currently extract growth (revenue / EBITDA / PAT) commitments only.
          </p>
        </div>
      ) : null}

      {filteredItems.length > 0 ? (
        <>
      <div className="flex justify-end">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => {
            // ToggleGroup emits "" when the active item is re-clicked;
            // ignore that to keep one view always active.
            if (v === "table" || v === "cards") setViewMode(v);
          }}
          variant="outline"
          size="sm"
          className="w-fit shadow-none data-[variant=outline]:shadow-none"
          aria-label="View mode"
        >
          <ToggleGroupItem
            value="table"
            aria-label="Table view"
            className="rounded-l-full rounded-r-none border px-2.5 data-[variant=outline]:border data-[state=on]:bg-foreground data-[state=on]:text-background"
          >
            <TableProperties className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="cards"
            aria-label="Card view"
            className="rounded-l-none rounded-r-full border px-2.5 data-[variant=outline]:border data-[state=on]:bg-foreground data-[state=on]:text-background"
          >
            <LayoutGrid className="size-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {(() => {
        const currentCount = orderedThreads.filter(
          (item) => !isHistoricalGuidanceItem(item, currentFy),
        ).length;
        const visibleThreads =
          isExpanded || currentCount === 0
            ? orderedThreads
            : orderedThreads.slice(0, currentCount);

        const firstConsolidatedIdx = visibleThreads.findIndex(
          (item) =>
            !isHistoricalGuidanceItem(item, currentFy) && !item.segment,
        );
        const firstSegmentedIdx = visibleThreads.findIndex(
          (item) =>
            !isHistoricalGuidanceItem(item, currentFy) && Boolean(item.segment),
        );
        const firstHistoricalIdx = visibleThreads.findIndex((item) =>
          isHistoricalGuidanceItem(item, currentFy),
        );
        const showOverallLabel =
          firstConsolidatedIdx >= 0 && firstSegmentedIdx >= 0;
        const showSegmentLabel =
          firstConsolidatedIdx >= 0 && firstSegmentedIdx >= 0;

        if (viewMode === "table") {
          // Split into two tables for cleaner reading: Overall (no segment
          // column — every row would be em-dash) and Segment-level (full
          // columns). Each table renders its current rows followed by a
          // hairline-divided historical zone, when expanded.
          const overallRows = visibleThreads.filter((i) => !i.segment);
          const segmentedRows = visibleThreads.filter((i) => Boolean(i.segment));

          const overallFirstHistoricalIdx = overallRows.findIndex((item) =>
            isHistoricalGuidanceItem(item, currentFy),
          );
          const segmentedFirstHistoricalIdx = segmentedRows.findIndex((item) =>
            isHistoricalGuidanceItem(item, currentFy),
          );

          const sectionLabelClass =
            "px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70";

          return (
            <div className="space-y-4">
              {overallRows.length > 0 ? (
                <div>
                  <div className={sectionLabelClass}>Overall</div>
                  <div className={cn(elevatedBlockClass, "overflow-x-auto")}>
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted/30 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <tr>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-left">Metric</th>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-left">Horizon</th>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-left">% Growth</th>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-left">Target</th>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-left">Status</th>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-right">Trail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/25">
                        {overallRows.map((item, idx) => (
                          <React.Fragment key={item.guidanceKey}>
                            {idx === overallFirstHistoricalIdx && overallFirstHistoricalIdx > 0 ? (
                              <tr aria-hidden="true">
                                <td colSpan={6} className="border-t-2 border-border/40 p-0" />
                              </tr>
                            ) : null}
                            <GuidanceTableRow
                              item={item}
                              currentFy={currentFy}
                              onSelect={setSelectedThread}
                              showSegmentColumn={false}
                            />
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {segmentedRows.length > 0 ? (
                <div>
                  <div className={sectionLabelClass}>Segment-level</div>
                  <div className={cn(elevatedBlockClass, "overflow-x-auto")}>
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted/30 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <tr>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-left">Metric</th>
                          <th scope="col" className="px-3 py-2 text-left">Segment</th>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-left">Horizon</th>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-left">% Growth</th>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-left">Target</th>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-left">Status</th>
                          <th scope="col" className="whitespace-nowrap px-3 py-2 text-right">Trail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/25">
                        {segmentedRows.map((item, idx) => (
                          <React.Fragment key={item.guidanceKey}>
                            {idx === segmentedFirstHistoricalIdx && segmentedFirstHistoricalIdx > 0 ? (
                              <tr aria-hidden="true">
                                <td colSpan={7} className="border-t-2 border-border/40 p-0" />
                              </tr>
                            ) : null}
                            <GuidanceTableRow
                              item={item}
                              currentFy={currentFy}
                              onSelect={setSelectedThread}
                              showSegmentColumn={true}
                            />
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          );
        }

        // viewMode === "cards" — original card grid layout.
        const subheadingClass =
          "col-span-full pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80";
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleThreads.map((item, idx) => (
              <React.Fragment key={item.guidanceKey}>
                {showOverallLabel && idx === firstConsolidatedIdx ? (
                  <div className={subheadingClass}>Overall</div>
                ) : null}
                {showSegmentLabel && idx === firstSegmentedIdx ? (
                  <div className={subheadingClass}>Segment-level</div>
                ) : null}
                {idx === firstHistoricalIdx && firstHistoricalIdx > 0 ? (
                  <div
                    aria-hidden="true"
                    className="col-span-full my-1 border-t border-border/40"
                  />
                ) : null}
                <GuidanceThreadCard
                  item={item}
                  currentFy={currentFy}
                  onSelect={setSelectedThread}
                />
              </React.Fragment>
            ))}
          </div>
        );
      })()}

      {(() => {
        const currentCount = orderedThreads.filter(
          (item) => !isHistoricalGuidanceItem(item, currentFy),
        ).length;
        const historicalCount = orderedThreads.length - currentCount;
        // Toggle only matters when there are both current AND historical
        // threads — i.e., something to switch between. If the page is all
        // current or all historical, hide the button.
        if (currentCount === 0 || historicalCount === 0) return null;
        return (
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
                  Hide track record
                  <ChevronDown className="ml-1.5 size-3.5 rotate-180 transition-transform" />
                </>
              ) : (
                <>
                  Show track record ({historicalCount})
                  <ChevronDown className="ml-1.5 size-3.5 transition-transform" />
                </>
              )}
            </Button>
          </div>
        );
      })()}

      {(() => {
        // Snapshot-scoped provenance. Renders only when at least one
        // PR2-shape source_files entry exists (legacy chunk-id arrays
        // skip rendering). Collapsed by default so it doesn't dominate
        // the section; expandable details disclosure on demand.
        const rich = (sourceFiles ?? [])
          .map(asRichSourceFile)
          .filter((entry): entry is RichSourceFile => Boolean(entry));
        if (rich.length === 0) return null;
        return (
          <details className={cn(elevatedBlockClass, "px-4 py-3 group")}>
            <summary className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
              Sources ({rich.length})
            </summary>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {rich.map((src) => {
                const label = src.period_label ?? (src.fy && src.qtr ? `Q${src.qtr} FY${String(src.fy).slice(-2)}` : `#${src.source_doc_id}`);
                const docType = src.doc_type ?? "transcript";
                const docTypeShort = docType === "transcript" ? "Concall" : docType === "presentation" ? "PPT" : docType === "annual_report" ? "AR" : docType;
                const labelText = `${label} ${docTypeShort}`;
                if (src.url) {
                  return (
                    <li key={src.source_doc_id}>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-[11px] text-foreground/85 hover:border-border hover:bg-background hover:text-foreground"
                      >
                        {labelText} <span className="text-muted-foreground">↗</span>
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={src.source_doc_id}>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                      {labelText}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })()}
        </>
      ) : null}

      <Drawer
        direction="right"
        open={selectedThread !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedThread(null);
        }}
      >
        <DrawerContent className="w-full max-w-xl">
          {selectedThread ? <GuidanceDrawerBody item={selectedThread} /> : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
