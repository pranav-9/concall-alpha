// v4-category breakdown UI pieces, composed INSIDE ConcallScoreSection's
// selector-driven detail block (2026-05-23 UI pass v3). Exports:
//   - V4CoverageStrip: the at-a-glance distribution (all 7 cats, state-colored)
//   - V4CategoryCards: the ADDRESSED category cards only (absent + deferred are
//     shown only in the strip — this is what removes Concentration/Mgmt-quality
//     from the cards while keeping them in the distribution)
// Cards match the existing quarter-detail cards exactly: nestedDetailClass, amber
// accent + amber dot-bullets. Designed to drop into the same 2-col grid as the
// old rationale/results/guidance/risks cards.

import { cn } from "@/lib/utils";

import type { NormalizedCategory } from "@/lib/quarterly-v4/normalize";
import { chipClass, type ChipTone } from "./chip-tone";
import { nestedDetailClass } from "./surface-tokens";

// Maps a per-category lean (-2..+2) to a labeled, color-coded chip descriptor.
// Word leads (the integer flickers across scorer runs — see concallyser
// gemini_scorer), the signed integer is a secondary glyph; "In line" (0) shows
// no number. null lean → no chip at all.
function leanChip(
  lean: number | null,
): { label: string; tone: ChipTone; value: string | null } | null {
  switch (lean) {
    case 2:
      return { label: "Strong positive", tone: "emerald", value: "+2" };
    case 1:
      return { label: "Positive", tone: "emerald", value: "+1" };
    case 0:
      return { label: "In line", tone: "slate", value: null };
    case -1:
      return { label: "Negative", tone: "rose", value: "−1" };
    case -2:
      return { label: "Strong negative", tone: "rose", value: "−2" };
    default:
      return null;
  }
}

// Compact labels for the leans strip — the full CATEGORY_LABELS don't fit a
// proportional segment ("Financial results" at flexGrow 1 truncates to nothing).
const STRIP_LABELS: Record<string, string> = {
  cat_1_quantitative_decomposition: "Results",
  cat_2_forward_guidance: "Guidance",
  cat_3_strategy_capital_allocation: "Strategy",
  cat_4_industry_context: "Industry",
  cat_5_concentration_dependencies: "Conc.",
  cat_6_management_quality: "Mgmt",
  cat_7_qa_signals: "Q&A",
};

// Segment tone by lean magnitude: ±2 saturates deeper than ±1 so the strip
// reads strength without a legend.
const SEGMENT_TONE: Record<number, string> = {
  [-2]: "bg-rose-400 text-rose-950 dark:bg-rose-500/80 dark:text-rose-50",
  [-1]: "bg-rose-300 text-rose-950 dark:bg-rose-400/60 dark:text-rose-50",
  [1]: "bg-emerald-500 text-white dark:bg-emerald-600/80",
  [2]: "bg-emerald-600 text-white dark:bg-emerald-700/90",
};

/**
 * Proportional leans strip: one segment per discussed category with a nonzero
 * lean, width ∝ |lean|, negatives left (detracts) → positives right (supports).
 * Zero-lean ("in line") cats carry no width so they appear only in the cards.
 * Each segment is a button; onSelect receives the category key so the parent
 * can open that category's card.
 */
export function V4LeansStrip({
  categories,
  onSelect,
}: {
  categories: NormalizedCategory[];
  onSelect?: (key: NormalizedCategory["key"]) => void;
}) {
  const segments = categories
    .filter(
      (cat): cat is NormalizedCategory & { lean: number } =>
        cat.state === "addressed" && typeof cat.lean === "number" && cat.lean !== 0,
    )
    .sort((a, b) => {
      if (a.lean < 0 !== b.lean < 0) return a.lean < 0 ? -1 : 1;
      return a.lean < 0 ? a.lean - b.lean : b.lean - a.lean;
    });
  if (segments.length === 0) return null;
  return (
    <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">← detracts</span>
      <div className="flex h-5 min-w-0 flex-1 gap-1 sm:h-6" role="group" aria-label="Per-category leans">
        {segments.map((cat) => {
          const sign = cat.lean > 0 ? "+" : "−";
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelect?.(cat.key)}
              title={`${cat.label} ${sign}${Math.abs(cat.lean)} — open this category's detail`}
              aria-label={`${cat.label} lean ${cat.lean > 0 ? "plus" : "minus"} ${Math.abs(cat.lean)}; open category detail`}
              className={cn(
                "flex min-w-0 items-center justify-center overflow-hidden rounded-md px-1.5 text-[10px] font-semibold transition-opacity hover:opacity-80",
                SEGMENT_TONE[cat.lean],
              )}
              style={{ flexGrow: Math.abs(cat.lean), flexBasis: 0 }}
            >
              {/* Six chips at ~40px each truncate to one letter on a phone, so
                  the bar is colour-only there and the legend below names them. */}
              <span className="hidden truncate sm:inline">
                {STRIP_LABELS[cat.key] ?? cat.label} {sign}
                {Math.abs(cat.lean)}
              </span>
            </button>
          );
        })}
      </div>
      <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">supports →</span>
    </div>
    <div className="flex items-center justify-between text-[10px] text-muted-foreground sm:hidden">
      <span>← detracts</span>
      <span>supports →</span>
    </div>
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 sm:hidden" aria-hidden>
      {segments.map((cat) => {
        const sign = cat.lean > 0 ? "+" : "−";
        return (
          <li key={cat.key} className="flex min-w-0 items-center gap-1.5 text-[11px]">
            <span className={cn("h-2 w-2 shrink-0 rounded-sm", SEGMENT_TONE[cat.lean])} />
            <span className="min-w-0 truncate text-foreground/85">
              {STRIP_LABELS[cat.key] ?? cat.label}
            </span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {sign}
              {Math.abs(cat.lean)}
            </span>
          </li>
        );
      })}
    </ul>
    </div>
  );
}

// Accent dot per state. Addressed uses the section's amber (matches the old
// rationale/results/guidance/risks cards); absent + deferred are muted.
const STATE_DOT: Record<NormalizedCategory["state"], string> = {
  addressed: "bg-amber-400/80",
  absent_in_concall: "bg-slate-400/50",
  deferred_v2: "bg-border",
};

function StatePill({ cat }: { cat: NormalizedCategory }) {
  if (cat.state === "addressed") {
    return <span className={chipClass("amber")}>{cat.label}</span>;
  }
  if (cat.state === "absent_in_concall") {
    return <span className={chipClass("slate")}>{cat.label}</span>;
  }
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-border/50 px-2.5 py-1 text-[11px] font-medium leading-none text-muted-foreground">
      {cat.label}
    </span>
  );
}

// At-a-glance category distribution: all 7 cats as state-colored pills + legend.
export function V4CoverageStrip({ categories }: { categories: NormalizedCategory[] }) {
  // Deferred cats (e.g. Management quality, coming in v2) carry no content yet —
  // omit them from the strip rather than show an empty "coming" pill.
  const shown = categories.filter((cat) => cat.state !== "deferred_v2");
  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-1.5">
        {shown.map((cat) => (
          <StatePill key={cat.key} cat={cat} />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        <span className="text-amber-400/80">●</span> Discussed&nbsp;&nbsp;
        <span className="text-slate-400">●</span> Not discussed
      </p>
    </div>
  );
}

// Mirrors renderCard in concall-score-section.tsx: nestedDetailClass, accent-dot
// uppercase label, amber dot-bullet list.
// A single addressed category card. Exported so it can be placed outside the
// breakdown grid (e.g. Quantitative decomposition rendered next to the chart).
export function V4Card({
  cat,
  id,
  highlighted = false,
}: {
  cat: NormalizedCategory;
  id?: string;
  highlighted?: boolean;
}) {
  const chip = leanChip(cat.lean);
  return (
    <div
      id={id}
      className={cn(nestedDetailClass, "scroll-mt-24 p-3", highlighted && "ring-2 ring-amber-400/60")}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATE_DOT.addressed)} />
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {cat.label}
          </p>
        </div>
        {chip && (
          <span
            className={cn(chipClass(chip.tone), "shrink-0 gap-1 px-2 py-0.5 text-[10px]")}
            title="How this category leans the quarter's score (−2 to +2)"
          >
            {chip.label}
            {chip.value && (
              <span className="font-semibold tabular-nums opacity-80">{chip.value}</span>
            )}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {cat.keyPoints.map((point, i) => (
          <li key={i} className="relative pl-3 text-[12px] leading-snug text-foreground/85">
            <span className="absolute left-0 top-1.5 h-1 w-1 rounded-full bg-amber-400/80" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The ADDRESSED v4 category cards, as grid children (fragment) to drop into the
 * same 2-col grid as the old rationale/results/guidance/risks cards. Absent +
 * deferred cats are intentionally NOT rendered as cards (they appear only in the
 * coverage strip) — this is what keeps Concentration/Mgmt-quality out of the cards.
 */
export function V4CategoryCards({
  categories,
  omit = [],
  focusKey = null,
}: {
  categories: NormalizedCategory[];
  omit?: string[];
  // Category key selected via the leans strip — that card gets an anchor id
  // (scroll target) and a highlight ring.
  focusKey?: string | null;
}) {
  return (
    <>
      {categories
        .filter((cat) => cat.state === "addressed" && !omit.includes(cat.key))
        .map((cat) => (
          <V4Card
            key={cat.key}
            cat={cat}
            id={`v4-cat-${cat.key}`}
            highlighted={cat.key === focusKey}
          />
        ))}
    </>
  );
}
