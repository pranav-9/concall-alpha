import { Clock, ListChecks } from "lucide-react";

import { chipClass, type ChipTone } from "./chip-tone";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import {
  TIER_LABELS,
  type NormalizedWalkTheTalk,
  type WalkTheTalkCategory,
  type WalkTheTalkCategoryBucket,
  type WalkTheTalkTier,
} from "@/lib/walk-the-talk/types";
import { cn } from "@/lib/utils";

type Props = { snapshot: NormalizedWalkTheTalk };

const TIER_TONE: Record<WalkTheTalkTier, ChipTone> = {
  reliable: "emerald",
  mixed: "sky",
  erratic: "amber",
  weak: "rose",
  not_enough_data: "slate",
};

// Static Tailwind class strings (safelist requires static, not interpolated).
const TIER_ACCENT_BG: Record<WalkTheTalkTier, string> = {
  reliable: "bg-emerald-500/75",
  mixed: "bg-sky-500/75",
  erratic: "bg-amber-500/75",
  weak: "bg-rose-500/75",
  not_enough_data: "bg-slate-500/40",
};

const TIER_TEXT_COLOR: Record<WalkTheTalkTier, string> = {
  reliable: "text-emerald-700 dark:text-emerald-300",
  mixed: "text-sky-700 dark:text-sky-300",
  erratic: "text-amber-700 dark:text-amber-400",
  weak: "text-rose-700 dark:text-rose-300",
  not_enough_data: "text-slate-700 dark:text-slate-300",
};

const CATEGORY_LABEL: Record<WalkTheTalkCategory, string> = {
  capex: "Capex",
  capacity: "Capacity",
  revenue: "Revenue",
  margin: "Margin",
  other: "Other",
};

const subtleClass = "text-[12px] leading-snug text-muted-foreground";
const labelClass = "text-[13px] font-semibold leading-tight text-foreground";

function CategoryCard({ bucket }: { bucket: WalkTheTalkCategoryBucket }) {
  const tone = TIER_TONE[bucket.tier];
  return (
    <div className={cn(nestedDetailClass, "overflow-hidden")}>
      <div className={cn("h-1.5", TIER_ACCENT_BG[bucket.tier])} />
      <div className="space-y-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={labelClass}>{CATEGORY_LABEL[bucket.category]}</p>
          <span className={chipClass(tone)}>{TIER_LABELS[bucket.tier]}</span>
        </div>
        <p className={subtleClass}>
          {bucket.on_time_count} of {bucket.total_count} on time
        </p>
      </div>
    </div>
  );
}

function NotEnoughDataState({ snapshot }: { snapshot: NormalizedWalkTheTalk }) {
  return (
    <div className={cn(elevatedBlockClass, "p-5")}>
      <div className="flex items-start gap-3">
        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-2">
          <p className={labelClass}>Not enough data</p>
          <p className={subtleClass}>
            {snapshot.ticker || "This company"} does not yet have enough
            trackable management commitments to compute a walk-the-talk
            grade. Run guidance tracking (Phase 6) to refresh.
          </p>
        </div>
      </div>
    </div>
  );
}

// Rendered when guidance items exist but fewer than 3 have decided outcomes.
// Avoids the all-empty state — users get a clear explanation of what the
// grade is waiting on. Per-thread evidence lives in the Guidance History
// tab; this surface is purely the verdict view.
function GradePendingState({ snapshot }: { snapshot: NormalizedWalkTheTalk }) {
  const total = snapshot.commitments.length;
  const graded = snapshot.commitments.filter((c) => c.counts_for_grade).length;
  const totalWord = total === 1 ? "commitment" : "commitments";
  const gradedVerb = graded === 1 ? "has" : "have";

  return (
    <div className={cn(elevatedBlockClass, "p-5")}>
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-2">
          <p className={labelClass}>Grade pending</p>
          <p className={subtleClass}>
            {snapshot.ticker || "This company"} has {total} tracked guidance{" "}
            {totalWord}, but only {graded} {gradedVerb} a decided outcome
            (met / delayed / dropped / revised). The walk-the-talk grade
            needs at least 3 with decided outcomes; the others (active /
            not yet clear) will resolve in future quarters.
          </p>
        </div>
      </div>
    </div>
  );
}

export function WalkTheTalkSection({ snapshot }: Props) {
  if (snapshot.schemaStatus === "missing") {
    return <NotEnoughDataState snapshot={snapshot} />;
  }
  if (snapshot.overall.tier === "not_enough_data") {
    // Grade can't be computed yet. If we still have commitments, render the
    // grade-pending state with the matrix drawer so users see the per-item
    // view instead of a blank empty state.
    if (snapshot.commitments.length > 0) {
      return <GradePendingState snapshot={snapshot} />;
    }
    return <NotEnoughDataState snapshot={snapshot} />;
  }

  const tier = snapshot.overall.tier;
  const tierLabel = TIER_LABELS[tier];

  return (
    <div className="space-y-4">
      {/* L2 overall verdict — the at-a-glance 5-second read. */}
      <div className={cn(elevatedBlockClass, "p-5")}>
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <p
              className={cn(
                "text-[28px] font-bold leading-tight tracking-tight",
                TIER_TEXT_COLOR[tier],
              )}
            >
              {tierLabel}
            </p>
            <p className={subtleClass}>n = {snapshot.overall.totalCount}</p>
          </div>
          <p className="text-[13px] leading-relaxed text-foreground/90">
            {snapshot.overall.onTimeCount} of {snapshot.overall.totalCount}{" "}
            tracked commitments met on time
          </p>
        </div>
      </div>

      {/* Per-category 2x2 grid (1-col on mobile). Empty categories
          pre-suppressed in normalize.ts. */}
      {snapshot.byCategory.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {snapshot.byCategory.map((bucket) => (
            <CategoryCard key={bucket.category} bucket={bucket} />
          ))}
        </div>
      )}

      {/* Per-thread evidence lives in the Guidance History tab — this
          surface is purely the verdict view. */}
    </div>
  );
}

// Helper for the Panel wrapper: derives the badge text from the real data
// span (earliest first-mention quarter → latest mention quarter across all
// tracked commitments). Honest about the LLM input window regardless of
// guidance_snapshot.analysis_window_quarters (which is a frozen schema
// constant of 4 and does NOT reflect the actual span).
//
// Rendered in SectionCard.headerAction so it sits in the title row and
// doesn't compete with the verdict.
export function walkTheTalkSinceBadge(
  snapshot: NormalizedWalkTheTalk,
): string | null {
  if (snapshot.schemaStatus !== "present") return null;
  const start = snapshot.dataSpanStart;
  const end = snapshot.dataSpanEnd;
  if (!start || !end) return null;
  if (start === end) return start;
  return `${start} → ${end}`;
}
