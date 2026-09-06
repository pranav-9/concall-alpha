"use client";

// Guidance section interior (the L1 SectionCard shell is provided by
// GuidanceHistoryPanel in company-detail-sections.tsx).
//
// Layout (redesign 2026-09-06): verdict-first.
//   1. "Do they keep their word?" verdict card + resolved track-record card.
//   2. Live commitments — in flight, with a value trail on revised threads.
//   3. Track record — resolved commitments as a guided / delivered / outcome
//      table.
//   4. Sources (collapsed) and a right-side Drawer with the full trail for
//      any row.
// All numbers and sentences come from lib/guidance-tracking/verdict.ts, which
// only templates from the payload — no analyst conclusion is invented here.

import * as React from "react";
import { ChevronDown, History } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { currentReportingQuarter, type ReportingQuarter } from "@/lib/current-quarter";
import { formatAbsoluteValue, formatPercentValue } from "@/lib/guidance-tracking/format";
import {
  buildGuidanceVerdict,
  readGuided,
  type GuidanceVerdict,
  type LiveRow,
  type LiveState,
  type ResolvedOutcome,
  type ResolvedRow,
} from "@/lib/guidance-tracking/verdict";
import { MIN_COMMITMENTS_FOR_GRADE } from "@/lib/walk-the-talk/grade-utils";
import type { WalkTheTalkTier } from "@/lib/walk-the-talk/types";
import { chipClass, type ChipTone } from "./chip-tone";
import { elevatedBlockClass, elevatedMutedBlockClass, nestedDetailClass } from "./surface-tokens";
import type {
  NormalizedGuidanceItem,
  NormalizedGuidanceStatusKey,
} from "@/lib/guidance-tracking/types";

// Kept for the Overview and tests/guidance-status-bucket.test.ts.
export { STATUS_TO_BUCKET, bucketOf } from "@/lib/guidance-tracking/verdict";

export type GuidanceHistorySectionProps = {
  items: NormalizedGuidanceItem[];
  // Snapshot-scoped provenance. Heterogeneous because legacy snapshots
  // stored a list of chunk ids; PR2-onwards stores objects with
  // source_doc_id / period_label / fy / qtr / doc_type / url. The section
  // renders only well-shaped entries and skips the rest.
  sourceFiles?: unknown[];
  // Reporting-quarter anchor for the live / resolved split. The panel passes
  // the same value it used for the header pills so the two never disagree.
  currentQtr?: ReportingQuarter;
};

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const eyebrowClass = "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const monoClass = "font-mono text-[11px] tabular-nums text-muted-foreground";

const TIER_CARD: Record<WalkTheTalkTier, { shell: string; eyebrow: string }> = {
  reliable: {
    shell: "border-emerald-500/35 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.07]",
    eyebrow: "text-emerald-700 dark:text-emerald-300",
  },
  mixed: {
    shell: "border-sky-500/35 bg-sky-500/[0.06] dark:bg-sky-500/[0.07]",
    eyebrow: "text-sky-700 dark:text-sky-300",
  },
  erratic: {
    shell: "border-amber-500/35 bg-amber-500/[0.06] dark:bg-amber-500/[0.07]",
    eyebrow: "text-amber-700 dark:text-amber-300",
  },
  weak: {
    shell: "border-rose-500/35 bg-rose-500/[0.06] dark:bg-rose-500/[0.07]",
    eyebrow: "text-rose-700 dark:text-rose-300",
  },
  not_enough_data: {
    shell: "border-border/35 bg-background/75",
    eyebrow: "text-muted-foreground",
  },
};

const OUTCOME_META: Record<ResolvedOutcome, { label: string; tone: ChipTone; bar: string; ink: string }> = {
  met: { label: "Met", tone: "emerald", bar: "bg-emerald-500", ink: "text-emerald-700 dark:text-emerald-300" },
  missed: { label: "Missed", tone: "rose", bar: "bg-rose-500", ink: "text-rose-700 dark:text-rose-300" },
  dropped: { label: "Dropped", tone: "rose", bar: "bg-rose-500", ink: "text-rose-700 dark:text-rose-300" },
  revised: { label: "Revised", tone: "amber", bar: "bg-amber-500", ink: "text-amber-700 dark:text-amber-300" },
  delayed: { label: "Delayed", tone: "amber", bar: "bg-amber-500", ink: "text-amber-700 dark:text-amber-300" },
  unclear: { label: "Unclear", tone: "slate", bar: "bg-muted", ink: "text-muted-foreground" },
};

const LIVE_META: Record<LiveState, { label: string; tone: ChipTone; glyph: string }> = {
  on_track: { label: "On track", tone: "emerald", glyph: "●" },
  revised: { label: "Revised", tone: "amber", glyph: "↻" },
  delayed: { label: "Pushed out", tone: "amber", glyph: "↻" },
  no_update: { label: "No update", tone: "slate", glyph: "○" },
};

// Precise 8-label status vocabulary — drawer header only.
const STATUS_TONE: Record<NormalizedGuidanceStatusKey, ChipTone> = {
  met: "emerald",
  missed: "rose",
  dropped: "rose",
  revised: "amber",
  delayed: "amber",
  active: "sky",
  not_yet_clear: "slate",
  unknown: "slate",
};

// ---------------------------------------------------------------------------
// Verdict row
// ---------------------------------------------------------------------------

function VerdictCard({ verdict }: { verdict: GuidanceVerdict }) {
  const card = TIER_CARD[verdict.tier];
  return (
    <div className={cn("rounded-xl border p-4 shadow-md shadow-black/20 sm:p-5", card.shell)}>
      <p className={cn(eyebrowClass, card.eyebrow)}>Do they keep their word?</p>
      <p className="mt-2 text-xl font-bold leading-tight text-foreground sm:text-[22px]">
        {verdict.headline}
      </p>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-foreground/80">
        {verdict.summary}
      </p>
    </div>
  );
}

function TrackRecordCard({ verdict }: { verdict: GuidanceVerdict }) {
  // A 1-of-1 or 2-of-2 record renders the SAME visual weight (a full bar, a
  // round percentage) as a proven track record, which reads as more
  // confident than the data supports — so the percentage and the bar are
  // withheld until there's enough to grade (/plan-eng-review sparse-company
  // investigation, 2026-09-06: SKYGOLD showed "1/1 met · 100%" over a
  // full-width green bar next to a headline that says "Too early to call.").
  // The raw count still shows — it's real, just not yet a rate.
  const enoughToGrade = verdict.countedCount >= MIN_COMMITMENTS_FOR_GRADE;
  const pct = enoughToGrade ? Math.round((verdict.metCount / verdict.countedCount) * 100) : null;
  return (
    <div className={cn(elevatedMutedBlockClass, "flex flex-col p-4 sm:p-5")}>
      <p className={eyebrowClass}>Resolved track record</p>
      {verdict.countedCount > 0 ? (
        <>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="text-[28px] font-black leading-none tracking-[-0.02em] text-foreground">
              {verdict.metCount}/{verdict.countedCount}
            </span>
            <span className={monoClass}>
              met{pct != null ? ` · ${pct}%` : ""}
            </span>
          </div>
          {enoughToGrade ? (
            <div className="mt-3 flex gap-[3px]" aria-hidden>
              {verdict.bars.map((outcome, i) => (
                <span
                  key={i}
                  className={cn("h-1.5 flex-1 rounded-sm", OUTCOME_META[outcome].bar)}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-[13px] leading-snug text-foreground/80">
          Nothing has resolved yet.
        </p>
      )}
      {verdict.unclearCount > 0 ? (
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          +{verdict.unclearCount} past {verdict.unclearCount === 1 ? "commitment" : "commitments"} with
          no clear outcome in the filings, not graded.
        </p>
      ) : null}
      {verdict.liveNote ? (
        <p className="mt-3 text-[12px] leading-snug text-muted-foreground">{verdict.liveNote}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared row bits
// ---------------------------------------------------------------------------

function ScopeChip({ item }: { item: NormalizedGuidanceItem }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
      {item.segment ?? "Consolidated"}
    </span>
  );
}

function TrailHint({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80">
      <History className="size-3" />
      {count}
    </span>
  );
}

function ValueTrailLine({ row }: { row: LiveRow }) {
  if (row.trail.length < 2) return null;
  const last = row.trail.length - 1;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className={cn(eyebrowClass, "mr-1")}>Trail</span>
      {row.trail.map((step, i) => {
        const isLast = i === last;
        const arrow = step.direction === "down" ? "▼" : step.direction === "up" ? "▲" : null;
        return (
          <React.Fragment key={`${step.quarter ?? "q"}-${i}`}>
            {i > 0 ? <span aria-hidden className="h-px w-4 bg-border/70" /> : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] tabular-nums",
                isLast && step.direction === "down"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                  : isLast && step.direction === "up"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : "border-border/60 bg-background/70 text-foreground/80",
              )}
            >
              {step.quarter ? <span className="text-muted-foreground">{step.quarter} ·</span> : null}
              {step.label}
              {isLast && arrow ? <span aria-hidden>{arrow}</span> : null}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyboard-capable row — an <li> that opens the evidence drawer. Both the
// live and resolved rows below share it, and it's exported so other
// click-only rows in the portal can adopt the same pattern later (see
// TODOS.md "Portal-wide keyboard sweep for click-only rows",
// /plan-eng-review Issue 5, 2026-09-06).
//
// Enter/Space dispatch a real click (`currentTarget.click()`) rather than
// calling `onSelect` directly, so the existing delegated analytics listener
// in company-page-workspace.tsx — which listens for a native DOM "click" on
// `[data-drawer-type]` — fires for keyboard opens exactly as it does for
// mouse opens.
// ---------------------------------------------------------------------------

export function SelectableRow({
  onSelect,
  className,
  children,
}: {
  onSelect: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      data-drawer-type="guidance-thread"
      className={cn(
        "cursor-pointer outline-none focus-visible:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60",
        className,
      )}
    >
      {children}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Live commitments
// ---------------------------------------------------------------------------

function LiveCommitmentRow({ row, onSelect }: { row: LiveRow; onSelect: (i: NormalizedGuidanceItem) => void }) {
  const meta = LIVE_META[row.state];
  const { item } = row;
  return (
    <SelectableRow onSelect={() => onSelect(item)} className="px-4 py-3.5 transition-colors hover:bg-muted/30">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-foreground">{item.guidanceText}</p>
          {row.note || row.heldSince ? (
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
              {row.note}
              {row.heldSince ? (
                <>
                  {row.note ? " " : null}
                  <span className={monoClass}>Held since {row.heldSince}.</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          <ScopeChip item={item} />
          {item.horizonLabel ? <span className={monoClass}>{item.horizonLabel}</span> : null}
          <span className={chipClass(meta.tone)}>
            <span aria-hidden className="mr-1">{meta.glyph}</span>
            {meta.label}
          </span>
          <TrailHint count={item.trail.length} />
        </div>
      </div>
      <ValueTrailLine row={row} />
    </SelectableRow>
  );
}

function LiveCommitments({ rows, onSelect }: { rows: LiveRow[]; onSelect: (i: NormalizedGuidanceItem) => void }) {
  if (rows.length === 0) return null;
  return (
    <div className={cn(elevatedBlockClass, "overflow-hidden")}>
      <div className="border-b border-border/40 px-4 py-2.5">
        <p className={eyebrowClass}>Live commitments · in flight</p>
      </div>
      <ul className="divide-y divide-border/30">
        {rows.map((row) => (
          <LiveCommitmentRow key={row.item.guidanceKey} row={row} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resolved track record
// ---------------------------------------------------------------------------

const RESOLVED_GRID = "md:grid-cols-[minmax(0,1fr)_7rem_7rem_9.5rem]";

function ResolvedRowView({ row, onSelect }: { row: ResolvedRow; onSelect: (i: NormalizedGuidanceItem) => void }) {
  const meta = OUTCOME_META[row.outcome];
  const { item } = row;
  const pill = row.delta ? `${meta.label} · ${row.delta.label}` : meta.label;
  const sub = [item.segment ?? "Consolidated", item.horizonLabel].filter(Boolean).join(" · ");
  return (
    <SelectableRow
      onSelect={() => onSelect(item)}
      className={cn("grid grid-cols-1 gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/30 md:items-center", RESOLVED_GRID)}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-snug text-foreground">
          {item.guidanceText}
          <span className="font-normal text-muted-foreground"> · {sub}</span>
        </p>
        {row.note ? (
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground md:line-clamp-1">{row.note}</p>
        ) : null}
      </div>
      {/* Mobile: labelled cells in one row. Desktop: three aligned columns. */}
      <div className="flex items-center justify-between gap-3 md:contents">
        <div className="md:text-right">
          <span className={cn(eyebrowClass, "md:hidden")}>Guided </span>
          <span className={cn(monoClass, "text-foreground/80")}>{row.guidedLabel ?? "—"}</span>
        </div>
        <div className="md:text-right">
          <span className={cn(eyebrowClass, "md:hidden")}>Delivered </span>
          <span className={cn(monoClass, row.deliveredLabel ? meta.ink : "")}>{row.deliveredLabel ?? "—"}</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className={chipClass(meta.tone)} aria-label={`${meta.label} (${item.statusLabel})`}>
            {pill}
          </span>
          <TrailHint count={item.trail.length} />
        </div>
      </div>
    </SelectableRow>
  );
}

function ResolvedTrackRecord({ rows, onSelect }: { rows: ResolvedRow[]; onSelect: (i: NormalizedGuidanceItem) => void }) {
  if (rows.length === 0) return null;
  return (
    <div className={cn(elevatedBlockClass, "overflow-hidden")}>
      <div className="border-b border-border/40 px-4 py-2.5">
        <p className={eyebrowClass}>Track record · resolved commitments</p>
      </div>
      <div className={cn("hidden gap-x-4 border-b border-border/40 px-4 py-2 md:grid", RESOLVED_GRID)}>
        <p className={eyebrowClass}>Commitment</p>
        <p className={cn(eyebrowClass, "text-right")}>Guided</p>
        <p className={cn(eyebrowClass, "text-right")}>Delivered</p>
        <p className={cn(eyebrowClass, "text-right")}>Outcome</p>
      </div>
      <ul className="divide-y divide-border/30">
        {rows.map((row) => (
          <ResolvedRowView key={row.item.guidanceKey} row={row} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawer — full trail for one thread
// ---------------------------------------------------------------------------

const trailMentionTone = (mentionType: string | null): ChipTone => {
  switch (mentionType?.trim().toLowerCase().replace(/\s+/g, "_")) {
    case "first_mention":
      return "sky";
    case "revision":
    case "delay":
    case "update":
      return "amber";
    case "met":
      return "emerald";
    case "missed":
    case "dropped":
      return "rose";
    default:
      return "slate";
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
      {item.trail.map((t, idx) => {
        const sourceMeta = [t.documentLabel, t.documentType, t.sourceReference].filter(
          (entry): entry is string => Boolean(entry),
        );
        const value = formatAbsoluteValue(t) ?? formatPercentValue(t);
        return (
          <li key={`${item.guidanceKey}-trail-${idx}`} className={cn(nestedDetailClass, "px-3 py-2.5")}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                {t.quarter ? (
                  <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-foreground">
                    {t.quarter}
                  </span>
                ) : null}
                {t.mentionType ? (
                  <span className={chipClass(trailMentionTone(t.mentionType))}>{t.mentionType}</span>
                ) : null}
                {t.horizonLabel ? (
                  <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-muted-foreground">
                    {t.horizonLabel}
                  </span>
                ) : null}
                {value ? (
                  <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 font-mono font-semibold tabular-nums text-foreground">
                    {value}
                  </span>
                ) : null}
              </div>
              {sourceMeta.length > 0 ? (
                <p className="max-w-[20rem] text-[10px] leading-snug text-muted-foreground sm:text-right">
                  {sourceMeta.join(" | ")}
                </p>
              ) : null}
            </div>
            {t.summary ? (
              <p className="mt-2 text-[11px] font-medium leading-relaxed text-foreground">{t.summary}</p>
            ) : null}
            {t.excerpt ? (
              <p className="mt-2 border-l-2 border-border/45 pl-2.5 text-[11px] italic leading-relaxed text-foreground/85">
                &ldquo;{t.excerpt}&rdquo;
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function GuidanceDrawerBody({ item }: { item: NormalizedGuidanceItem }) {
  const guided = readGuided(item).label;
  const periodWindow =
    item.firstMentionPeriod && item.latestMentionPeriod && item.firstMentionPeriod !== item.latestMentionPeriod
      ? `${item.firstMentionPeriod} → ${item.latestMentionPeriod}`
      : (item.latestMentionPeriod ?? item.firstMentionPeriod);
  const supportText = item.latestView ?? item.statusReason;

  return (
    <>
      <DrawerHeader className="border-b border-border">
        <DrawerTitle className="text-[14px] leading-snug">{item.guidanceText}</DrawerTitle>
        <DrawerDescription>
          <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className={chipClass(STATUS_TONE[item.statusKey])}>{item.statusLabel}</span>
            {item.metricLabel ? (
              <span className="rounded-full border border-border/60 bg-muted/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {item.metricLabel}
              </span>
            ) : null}
            <ScopeChip item={item} />
            {item.horizonLabel ? <span className={monoClass}>{item.horizonLabel}</span> : null}
            {guided ? <span className={cn(monoClass, "text-foreground")}>{guided}</span> : null}
            {periodWindow ? <span className={monoClass}>{periodWindow}</span> : null}
            <span className={monoClass}>
              {item.trail.length} update{item.trail.length === 1 ? "" : "s"}
            </span>
          </span>
        </DrawerDescription>
      </DrawerHeader>
      <div className="space-y-3 overflow-y-auto px-4 py-4">
        {supportText ? <p className="text-[12px] leading-snug text-foreground/85">{supportText}</p> : null}
        {item.statusReason && item.statusReason !== supportText ? (
          <p className="text-[11px] leading-snug text-muted-foreground">{item.statusReason}</p>
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

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

type RichSourceFile = {
  source_doc_id: number;
  period_label: string | null;
  fy: number | null;
  qtr: number | null;
  doc_type: string | null;
  url: string | null;
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
    // Only real web URLs render as hrefs; anything else would resolve
    // site-relative and leak crawlable 404s.
    url: typeof e.url === "string" && /^https?:\/\//i.test(e.url) ? e.url : null,
  };
};

function SourcesDisclosure({ sourceFiles }: { sourceFiles: unknown[] | undefined }) {
  const rich = (sourceFiles ?? [])
    .map(asRichSourceFile)
    .filter((entry): entry is RichSourceFile => Boolean(entry));
  if (rich.length === 0) return null;
  return (
    <details className={cn(elevatedBlockClass, "group px-4 py-3")}>
      <summary className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        Sources ({rich.length})
      </summary>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {rich.map((src) => {
          const label =
            src.period_label ?? (src.fy && src.qtr ? `Q${src.qtr} FY${String(src.fy).slice(-2)}` : `#${src.source_doc_id}`);
          const docType = src.doc_type ?? "transcript";
          const docTypeShort =
            docType === "transcript" ? "Concall" : docType === "presentation" ? "PPT" : docType === "annual_report" ? "AR" : docType;
          const labelText = `${label} ${docTypeShort}`;
          return (
            <li key={src.source_doc_id}>
              {src.url ? (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-source-type={docType}
                  className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-[11px] text-foreground/85 hover:border-border hover:bg-background hover:text-foreground"
                >
                  {labelText} <span className="text-muted-foreground">↗</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                  {labelText}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function GuidanceHistorySection({ items, sourceFiles, currentQtr }: GuidanceHistorySectionProps) {
  const current = currentQtr ?? currentReportingQuarter();
  const verdict = React.useMemo(() => buildGuidanceVerdict(items, current), [items, current]);

  // One Drawer at the section level — any row sets the selected thread.
  const [selectedThread, setSelectedThread] = React.useState<NormalizedGuidanceItem | null>(null);

  if (!items.length) {
    return (
      <div className={cn(elevatedBlockClass, "p-4")}>
        <p className="text-sm font-medium text-foreground">No guidance threads tracked yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <VerdictCard verdict={verdict} />
        <TrackRecordCard verdict={verdict} />
      </div>

      <LiveCommitments rows={verdict.live} onSelect={setSelectedThread} />
      <ResolvedTrackRecord rows={verdict.resolved} onSelect={setSelectedThread} />
      <SourcesDisclosure sourceFiles={sourceFiles} />

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
