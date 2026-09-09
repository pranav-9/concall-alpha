"use client";

// Guidance section interior (the L1 SectionCard shell is provided by
// GuidanceHistoryPanel in company-detail-sections.tsx).
//
// Layout (redesign 2026-09-06, live book prioritised 2026-09-08,
// forward-strength layer added 2026-09-09):
//   When the snapshot carries the forward-strength blocks (details.
//   forward_strength / .strategy_narrative from the deep-track producer) the
//   section leads with the LIVE book and closes with the delivery record:
//     1. "How strong is the guidance right now?" — the forward-strength
//        verdict (ambition × evidence pills, headline, the live-book
//        order-backed/asserted/aspiration split) beside "The strategy behind
//        the numbers" (the single bet + one implied lever).
//     2. What to watch — the top LIVE_WATCH_COUNT live commitments as ranked
//        cards (verdict.ts compareLiveMateriality); the rest collapse.
//     3. "Should you believe any of it?" — the credibility verdict + resolved
//        track-record card.
//     4. Track record — resolved commitments as a guided / delivered /
//        outcome table; Sources (collapsed); a right-side Drawer per row.
//   Snapshots WITHOUT the strength blocks keep the original credibility-first
//   order (verdict card + track record on top, then what-to-watch).
// The forward-strength prose comes from the producer (schema
// guidance_strength_v1); everything else is templated in
// lib/guidance-tracking/verdict.ts from the payload — no analyst conclusion is
// invented in this component.

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
  commitmentCoreLabel,
  liveStateKey,
  readGuided,
  type GuidanceVerdict,
  type LiveRow,
  type LiveStateKey,
  type ResolvedOutcome,
  type ResolvedRow,
} from "@/lib/guidance-tracking/verdict";
import { MIN_COMMITMENTS_FOR_GRADE } from "@/lib/walk-the-talk/grade-utils";
import type { WalkTheTalkTier } from "@/lib/walk-the-talk/types";
import { chipClass, type ChipTone } from "./chip-tone";
import { GUIDANCE_TIER_TONE } from "./guidance-header-pills";
import { elevatedBlockClass, elevatedMutedBlockClass, nestedDetailClass } from "./surface-tokens";
import type {
  NormalizedGuidanceItem,
  NormalizedGuidanceStatusKey,
} from "@/lib/guidance-tracking/types";
import type {
  AmbitionLabel,
  EvidenceBand,
  ForwardStrength,
  StrategyNarrative,
} from "@/lib/guidance-snapshot/types";

// Kept only for tests/guidance-status-bucket.test.ts — nothing in the
// Overview reads either of these (ship-workflow specialist review, 2026-09-06).
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
  // The forward-strength layer (details.forward_strength / .strategy_narrative,
  // parsed server-side). Null for any company whose snapshot predates the
  // deep-track strength upgrade — the two cards simply do not render, and the
  // section falls back to the credibility-first layout.
  forwardStrength?: ForwardStrength | null;
  strategyNarrative?: StrategyNarrative | null;
};

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const eyebrowClass = "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const monoClass = "font-mono text-[11px] tabular-nums text-muted-foreground";
// The design system's neutral chip recipe. Declared once — a hand-copied
// second instance is how two chips in the same card drift apart.
const neutralChipClass =
  "inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground";

// Shell/eyebrow styling keyed by ChipTone, not by tier directly — the
// tier -> tone assignment lives in one place (GUIDANCE_TIER_TONE, shared
// with the header pill) so this card can't drift from that mapping
// (ship-workflow specialist review, 2026-09-06).
const TONE_CARD_SHELL: Partial<Record<ChipTone, { shell: string; eyebrow: string }>> = {
  emerald: {
    shell: "border-emerald-500/35 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.07]",
    eyebrow: "text-emerald-700 dark:text-emerald-300",
  },
  sky: {
    shell: "border-sky-500/35 bg-sky-500/[0.06] dark:bg-sky-500/[0.07]",
    eyebrow: "text-sky-700 dark:text-sky-300",
  },
  amber: {
    shell: "border-amber-500/35 bg-amber-500/[0.06] dark:bg-amber-500/[0.07]",
    eyebrow: "text-amber-700 dark:text-amber-300",
  },
  rose: {
    shell: "border-rose-500/35 bg-rose-500/[0.06] dark:bg-rose-500/[0.07]",
    eyebrow: "text-rose-700 dark:text-rose-300",
  },
  slate: {
    shell: "border-border/35 bg-background/75",
    eyebrow: "text-muted-foreground",
  },
};

const TIER_CARD: Record<WalkTheTalkTier, { shell: string; eyebrow: string }> = Object.fromEntries(
  (Object.keys(GUIDANCE_TIER_TONE) as WalkTheTalkTier[]).map((tier) => [
    tier,
    TONE_CARD_SHELL[GUIDANCE_TIER_TONE[tier]]!,
  ]),
) as Record<WalkTheTalkTier, { shell: string; eyebrow: string }>;

const OUTCOME_META: Record<ResolvedOutcome, { label: string; tone: ChipTone; bar: string; ink: string }> = {
  met: { label: "Met", tone: "emerald", bar: "bg-emerald-500", ink: "text-emerald-700 dark:text-emerald-300" },
  missed: { label: "Missed", tone: "rose", bar: "bg-rose-500", ink: "text-rose-700 dark:text-rose-300" },
  dropped: { label: "Dropped", tone: "rose", bar: "bg-rose-500", ink: "text-rose-700 dark:text-rose-300" },
  revised: { label: "Revised", tone: "amber", bar: "bg-amber-500", ink: "text-amber-700 dark:text-amber-300" },
  delayed: { label: "Delayed", tone: "amber", bar: "bg-amber-500", ink: "text-amber-700 dark:text-amber-300" },
  unclear: { label: "Unclear", tone: "slate", bar: "bg-muted", ink: "text-muted-foreground" },
};

// A static lookup with no branching left in it — which key a row gets (and
// in particular which way a revision went) is decided by `liveStateKey` in
// the verdict layer, where it is unit-tested. A green "Raised" on a guidance
// CUT is the most misleading thing this section could print, so that choice
// does not live in an untestable component ternary (ship review, 2026-09-08).
//
// "Held", not "On track": nothing here says the company is tracking to the
// number — only that the number is unchanged. The verdict layer has no
// progress-to-date reading for a live commitment, so the chip must not imply
// one.
const LIVE_META: Record<LiveStateKey, { label: string; tone: ChipTone; glyph: string }> = {
  held: { label: "Held", tone: "sky", glyph: "●" },
  raised: { label: "Raised", tone: "emerald", glyph: "▲" },
  lowered: { label: "Lowered", tone: "rose", glyph: "▼" },
  revised: { label: "Revised", tone: "amber", glyph: "↻" },
  pushed_out: { label: "Pushed out", tone: "amber", glyph: "↻" },
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
// Forward-strength layer (the live-book verdict + the strategy behind it)
// ---------------------------------------------------------------------------

// The ambition pill characterises the GUIDANCE, not the stock: ambitious =
// bold vs delivered history (amber = lean in), conservative = at/below it
// (slate = neutral). Evidence reads green→red on how banked the live book is.
const AMBITION_META: Record<AmbitionLabel, { label: string; tone: ChipTone }> = {
  ambitious: { label: "Ambitious", tone: "amber" },
  measured: { label: "Measured", tone: "sky" },
  conservative: { label: "Conservative", tone: "slate" },
};

const EVIDENCE_META: Record<EvidenceBand, { label: string; tone: ChipTone }> = {
  well_evidenced: { label: "Well evidenced", tone: "emerald" },
  partly_evidenced: { label: "Partly evidenced", tone: "amber" },
  thinly_evidenced: { label: "Thinly evidenced", tone: "rose" },
};

// The top card's shell tracks the ambition tone the same way the credibility
// card's shell tracks its tier tone — so the two verdicts read as siblings.
function ForwardStrengthCard({ forwardStrength }: { forwardStrength: ForwardStrength }) {
  const amb = AMBITION_META[forwardStrength.ambition.label];
  const ev = EVIDENCE_META[forwardStrength.evidence.label];
  const shell = TONE_CARD_SHELL[amb.tone] ?? TONE_CARD_SHELL.slate!;
  const { liveTotal, orderBacked, asserted, aspiration } = forwardStrength.evidence;
  return (
    <div className={cn("rounded-xl border p-4 shadow-md shadow-black/20 sm:p-5", shell.shell)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn(eyebrowClass, shell.eyebrow)}>How strong is the guidance right now?</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={chipClass(amb.tone)}>{amb.label}</span>
          <span className={chipClass(ev.tone)}>{ev.label}</span>
        </div>
      </div>
      <p className="mt-2 text-xl font-bold leading-tight text-foreground sm:text-[22px]">
        {forwardStrength.headline}
      </p>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-foreground/80">
        {forwardStrength.supportingLine}
      </p>
      {liveTotal > 0 ? (
        <p className={cn("mt-3", monoClass)}>
          {`OF ${liveTotal} LIVE · ${orderBacked} order-backed · ${asserted} asserted · ${aspiration} ${
            aspiration === 1 ? "aspiration" : "aspirations"
          }`}
        </p>
      ) : null}
    </div>
  );
}

function StrategyNarrativeCard({ strategy }: { strategy: StrategyNarrative }) {
  const lever = strategy.impliedLever;
  const leverValue =
    lever && (lever.from || lever.to)
      ? [lever.from, lever.to].filter(Boolean).join(" → ")
      : null;
  return (
    <div className={cn(elevatedMutedBlockClass, "p-4 sm:p-5")}>
      <p className={eyebrowClass}>The strategy behind the numbers</p>
      <p className="mt-2 text-base font-semibold leading-snug text-foreground sm:text-lg">
        {strategy.headline}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-foreground/80">{strategy.body}</p>
      {lever ? (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={eyebrowClass}>{lever.label}</span>
          {leverValue ? (
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {leverValue}
            </span>
          ) : null}
          {lever.basis ? (
            <span className="text-[11px] text-muted-foreground">{lever.basis}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verdict row
// ---------------------------------------------------------------------------

function VerdictCard({ verdict, eyebrow }: { verdict: GuidanceVerdict; eyebrow?: string }) {
  const card = TIER_CARD[verdict.tier];
  return (
    <div className={cn("rounded-xl border p-4 shadow-md shadow-black/20 sm:p-5", card.shell)}>
      <p className={cn(eyebrowClass, card.eyebrow)}>{eyebrow ?? "Do they keep their word?"}</p>
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

// Segment names arrive from the producer in whatever case the filing used
// ("products", "aerospace and defence"). Only the first letter is touched —
// a title-case pass would mangle the acronyms that are common here (A&D,
// R&D, HPP).
const scopeLabel = (item: NormalizedGuidanceItem): string => {
  const seg = item.segment;
  if (!seg) return "Consolidated";
  return seg.charAt(0).toUpperCase() + seg.slice(1);
};

function ScopeChip({ item }: { item: NormalizedGuidanceItem }) {
  return <span className={neutralChipClass}>{scopeLabel(item)}</span>;
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
  const meta = LIVE_META[liveStateKey(row)];
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

// The ranked cards. One card = one live commitment, in the order
// compareLiveMateriality put them: what resolves soonest and covers most of
// the company, first. The card carries only what the payload has — the
// number they are on the hook for, how it got there, and how long it has
// stood. There is no progress-to-date reading in this section's data, so the
// card never implies one.
function WatchCard({
  row,
  rank,
  onSelect,
}: {
  row: LiveRow;
  rank: number;
  onSelect: (i: NormalizedGuidanceItem) => void;
}) {
  const meta = LIVE_META[liveStateKey(row)];
  const { item } = row;
  // commitmentCoreLabel only prefixes the segment when there IS a metric
  // label; with none it falls back to raw guidanceText, which carries no
  // guaranteed scope. Keying the chip off `item.segment` alone therefore hid
  // the scope entirely on that branch — a segment-only guide read as a
  // consolidated one (ship review, 2026-09-08).
  const titleNamesScope = Boolean(item.segment && item.metricLabel);
  return (
    <SelectableRow
      onSelect={() => onSelect(item)}
      className={cn(elevatedBlockClass, "flex list-none flex-col p-4 transition-colors hover:bg-muted/20")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={monoClass}>{String(rank).padStart(2, "0")}</span>
        <span className={chipClass(meta.tone)}>
          <span aria-hidden className="mr-1">{meta.glyph}</span>
          {meta.label}
        </span>
      </div>
      {/* The scope is named once per card, wherever it reads better. A
          segment carries it in the title ("Blackwell (B200) revenue growth")
          — three cards all titled "Revenue growth" under small chips is
          unreadable, and E2E ships exactly that. Consolidated, and anything
          whose title can't name its segment, keeps the chip instead. */}
      <p className="mt-2 text-[14px] font-semibold leading-snug text-foreground">
        {commitmentCoreLabel(item)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {titleNamesScope ? null : <ScopeChip item={item} />}
        {item.horizonLabel ? <span className={neutralChipClass}>{item.horizonLabel}</span> : null}
      </div>
      {row.note ? (
        <p className="mt-2.5 line-clamp-4 text-[12px] leading-relaxed text-muted-foreground">{row.note}</p>
      ) : null}
      <div className="mt-3 border-t border-border/30 pt-3">
        {/* Same word the resolved table's column uses, so the live number and
            the historical one read on the same axis. */}
        <p className={eyebrowClass}>Guided</p>
        {row.guidedLabel ? (
          <p className="mt-1 font-mono text-[16px] font-semibold tabular-nums leading-tight text-foreground">
            {row.guidedLabel}
          </p>
        ) : (
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
            Stated qualitatively — no number on the record.
          </p>
        )}
        {row.trail.length > 0 ? (
          <ValueTrailLine row={row} />
        ) : row.heldSince ? (
          <p className={cn(monoClass, "mt-2")}>Held since {row.heldSince}</p>
        ) : null}
      </div>
    </SelectableRow>
  );
}

function WhatToWatch({
  verdict,
  onSelect,
}: {
  verdict: GuidanceVerdict;
  onSelect: (i: NormalizedGuidanceItem) => void;
}) {
  const [restOpen, setRestOpen] = React.useState(false);
  const { watch, watchRest } = verdict;
  if (watch.length === 0) return null;
  return (
    <div className="space-y-3">
      {/* The eyebrow stays a short structural label; the qualifying claim
          reads in sentence case below it. Uppercasing a whole sentence at
          0.16em tracking is the slowest thing on the page to read, and the
          design system rules it out. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className={eyebrowClass}>What to watch</p>
          <p className="mt-1 text-[13px] font-medium leading-snug text-foreground">
            {verdict.watchHeading}
          </p>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Ranked by the year they come due, then how much of the company they cover, then what just moved
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {watch.map((row, i) => (
          <WatchCard key={row.item.guidanceKey} row={row} rank={i + 1} onSelect={onSelect} />
        ))}
      </ul>
      {watchRest.length > 0 ? (
        <div className={cn(elevatedBlockClass, "overflow-hidden")}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <p className={eyebrowClass}>{verdict.watchRestLabel}</p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              aria-expanded={restOpen}
              onClick={() => setRestOpen((open) => !open)}
            >
              {restOpen ? "Hide" : verdict.watchRestToggleLabel}
            </Button>
          </div>
          {restOpen ? (
            <ul className="divide-y divide-border/30 border-t border-border/40">
              {watchRest.map((row) => (
                <LiveCommitmentRow key={row.item.guidanceKey} row={row} onSelect={onSelect} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
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
  const sub = [scopeLabel(item), item.horizonLabel].filter(Boolean).join(" · ");
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

// How many resolved rows show before the "show all" toggle. The table is the
// evidence behind the verdict card, not the headline — a long back-catalogue
// pushed the live book off the screen entirely.
const RESOLVED_PREVIEW_COUNT = 5;

function ResolvedTrackRecord({ rows, onSelect }: { rows: ResolvedRow[]; onSelect: (i: NormalizedGuidanceItem) => void }) {
  const [showAll, setShowAll] = React.useState(false);
  if (rows.length === 0) return null;
  const visible = showAll ? rows : rows.slice(0, RESOLVED_PREVIEW_COUNT);
  const hidden = rows.length - visible.length;
  return (
    <div className={cn(elevatedBlockClass, "overflow-hidden")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/40 px-4 py-2.5">
        <p className={eyebrowClass}>Track record · resolved commitments</p>
        <p className="text-[11px] leading-snug text-muted-foreground">Most recent first</p>
      </div>
      <div className={cn("hidden gap-x-4 border-b border-border/40 px-4 py-2 md:grid", RESOLVED_GRID)}>
        <p className={eyebrowClass}>Commitment</p>
        <p className={cn(eyebrowClass, "text-right")}>Guided</p>
        <p className={cn(eyebrowClass, "text-right")}>Delivered</p>
        <p className={cn(eyebrowClass, "text-right")}>Outcome</p>
      </div>
      <ul className="divide-y divide-border/30">
        {visible.map((row) => (
          <ResolvedRowView key={row.item.guidanceKey} row={row} onSelect={onSelect} />
        ))}
      </ul>
      {rows.length > RESOLVED_PREVIEW_COUNT ? (
        <div className="flex justify-center border-t border-border/40 px-4 py-2.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            aria-expanded={showAll}
            onClick={() => setShowAll((open) => !open)}
          >
            {showAll ? "Show fewer" : `Show all ${rows.length} resolved (${hidden} more)`}
          </Button>
        </div>
      ) : null}
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

export function GuidanceHistorySection({
  items,
  sourceFiles,
  currentQtr,
  forwardStrength,
  strategyNarrative,
}: GuidanceHistorySectionProps) {
  const current = currentQtr ?? currentReportingQuarter();
  const verdict = React.useMemo(() => buildGuidanceVerdict(items, current), [items, current]);
  const companyCode = items[0]?.companyCode ?? "";

  // One Drawer at the section level — any row sets the selected thread.
  const [selectedThread, setSelectedThread] = React.useState<NormalizedGuidanceItem | null>(null);
  // Same App Router in-place re-render that carried the toggles across
  // companies also carried this: with a thread open, navigating to another
  // company left company A's commitment rendered in the drawer over company
  // B's page, with nothing in the drawer body naming the company (Claude +
  // Codex adversarial review, 2026-09-08). Keyed children can't fix state
  // that lives in the parent, so reset it explicitly.
  React.useEffect(() => {
    setSelectedThread(null);
  }, [companyCode]);

  if (!items.length) {
    return (
      <div className={cn(elevatedBlockClass, "p-4")}>
        <p className="text-sm font-medium text-foreground">No guidance threads tracked yet.</p>
      </div>
    );
  }

  // Two layouts. With the forward-strength blocks the section leads with "how
  // strong is the guidance right now?" (the live book) and closes with "should
  // you believe it?" (the delivery record) — strength on top, credibility at
  // the bottom, per the 2026-09 upgrade. Without them (snapshots that predate
  // the strength producer) it keeps the original credibility-first layout.
  const credibilityBlock = (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <VerdictCard
        verdict={verdict}
        eyebrow={forwardStrength ? "Should you believe any of it?" : undefined}
      />
      <TrackRecordCard verdict={verdict} />
    </div>
  );

  return (
    <div className="space-y-4">
      {forwardStrength ? (
        // The strategy card is optional (guidance_strength_v1 lets
        // strategy_narrative be null when no single lever dominates). Without
        // it the strength card goes full-width rather than sitting in a
        // two-column grid with a blank right track.
        strategyNarrative ? (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ForwardStrengthCard forwardStrength={forwardStrength} />
            <StrategyNarrativeCard strategy={strategyNarrative} />
          </div>
        ) : (
          <ForwardStrengthCard forwardStrength={forwardStrength} />
        )
      ) : (
        credibilityBlock
      )}

      {/* Keyed on the company so both disclosure toggles reset when the
          reader navigates to another company. The App Router re-renders this
          subtree in place (CompanyPageWorkspace carries no key), so without
          this an expanded 40-row back-catalogue followed the reader to the
          next company — defeating the truncation (red-team review,
          2026-09-08). */}
      <WhatToWatch key={`watch-${companyCode}`} verdict={verdict} onSelect={setSelectedThread} />

      {/* Strength-first layout closes on the delivery record. */}
      {forwardStrength ? credibilityBlock : null}

      <ResolvedTrackRecord
        key={`resolved-${companyCode}`}
        rows={verdict.resolved}
        onSelect={setSelectedThread}
      />
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
