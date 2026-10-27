// v4-category breakdown UI pieces, composed INSIDE ConcallScoreSection (2026-10-27
// quarter-tab design upgrade). Exports:
//   - leanChip: the lean's word + tone (shared with the Score breakdown tiles)
//   - V4Card / V4CategoryCards: the ADDRESSED category cards (absent + deferred
//     cats appear only as muted tiles in the Score breakdown row)
// Cards sit on nestedDetailClass with per-point tone dots.

import { cn } from "@/lib/utils";

import type { NormalizedCategory, NormalizedKeyPoint } from "@/lib/quarterly-v4/normalize";
import { streakLabel } from "@/lib/quarterly-v4/streak";
import type { KeyPointTone } from "@/lib/quarterly-v4/types";
import { chipClass, type ChipTone } from "./chip-tone";
import { nestedDetailClass } from "./surface-tokens";

// Maps a per-category lean (-2..+2) to a labeled, color-coded chip descriptor.
// Word leads (the integer flickers across scorer runs — see concallyser
// gemini_scorer), the signed integer is a secondary glyph; "In line" (0) shows
// no number. null lean → no chip at all.
export function leanChip(
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

// Accent dot on an addressed card's label (the section's amber).
const ADDRESSED_DOT = "bg-amber-400/80";

// Per-point tone → the dot beside it and the colour of its figure tag.
// neutral = the section's amber (a point that is in line / a caution);
// positive = teal (delivered / helps); negative = rose (hurts);
// minor = hollow dot, compact aside.
const POINT_DOT: Record<KeyPointTone, string> = {
  neutral: "bg-amber-400/80",
  positive: "bg-teal-400",
  negative: "bg-rose-400",
  minor: "border border-muted-foreground/60 bg-transparent",
};
const POINT_METRIC: Record<KeyPointTone, string> = {
  neutral: "text-amber-400/90",
  positive: "text-teal-400",
  negative: "text-rose-400",
  minor: "text-muted-foreground",
};

// One key point. Structured points get the bold lead + right-aligned figure tag
// + body (+ quote, + amber watch phrase); a legacy string renders as the plain
// dot-bullet it always was. "minor" points fold heading and body into one
// compact line ("Also unchanged: …").
function KeyPointRow({ point }: { point: NormalizedKeyPoint }) {
  const minor = point.tone === "minor";
  const watch = point.watch ? (
    <>
      {" "}
      <span className="text-amber-400/90">{point.watch}</span>
    </>
  ) : null;
  return (
    <li className="flex gap-2.5">
      <span
        className={cn("mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full", POINT_DOT[point.tone])}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {point.heading === null ? (
          <p className="text-[12px] leading-snug text-foreground/85">
            {point.detail}
            {watch}
          </p>
        ) : minor ? (
          <p className="text-[12px] leading-snug text-foreground/75">
            <span className="font-medium text-foreground/85">{point.heading}:</span> {point.detail}
            {watch}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-[12.5px] font-semibold leading-snug text-foreground">
                {point.heading}
              </p>
              {point.metric && (
                <p
                  className={cn(
                    // A long figure tag wraps on a phone instead of running off the card.
                    "min-w-0 break-words font-mono text-[11px] tabular-nums tracking-tight sm:shrink-0",
                    POINT_METRIC[point.tone],
                  )}
                >
                  {point.metric}
                </p>
              )}
            </div>
            <p className="mt-0.5 text-[12px] leading-snug text-foreground/85">
              {point.detail}
              {watch}
            </p>
            {point.quote && (
              <blockquote className="mt-1.5 border-l-2 border-border/60 pl-2.5 text-[11.5px] italic leading-snug text-muted-foreground">
                &ldquo;{point.quote}&rdquo;
              </blockquote>
            )}
          </>
        )}
      </div>
    </li>
  );
}

// A single addressed category card: accent-dot uppercase label, the lean chip
// (with its streak caption) on the right, then the ranked key points. Exported
// so it can be placed outside the breakdown grid (e.g. Quantitative
// decomposition rendered next to the chart).
export function V4Card({
  cat,
  id,
  highlighted = false,
  streak = null,
}: {
  cat: NormalizedCategory;
  id?: string;
  highlighted?: boolean;
  // Consecutive quarters (ending at the selected one) with the same lean sign.
  streak?: number | null;
}) {
  const chip = leanChip(cat.lean);
  const streakText = streakLabel(cat.lean, streak);
  const hasStructured = cat.keyPoints.some((p) => p.heading !== null);
  return (
    <div
      id={id}
      className={cn(nestedDetailClass, "scroll-mt-24 p-3", highlighted && "ring-2 ring-amber-400/60")}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", ADDRESSED_DOT)} aria-hidden />
          <h4 className="text-[13px] font-semibold leading-tight text-foreground">{cat.label}</h4>
        </div>
        {chip && (
          <span
            className={cn(chipClass(chip.tone), "shrink-0 gap-1 px-2 py-0.5 text-[10px]")}
            title={
              streakText
                ? `How this category leans the quarter's score (−2 to +2), and for how many quarters running`
                : "How this category leans the quarter's score (−2 to +2)"
            }
          >
            {chip.label}
            {chip.value && (
              <span className="font-semibold tabular-nums opacity-80">{chip.value}</span>
            )}
            {streakText && <span className="opacity-70">· {streakText}</span>}
          </span>
        )}
      </div>
      <ul className={hasStructured ? "space-y-3" : "space-y-1.5"}>
        {cat.keyPoints.map((point, i) => (
          <KeyPointRow key={i} point={point} />
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
  streaks = {},
}: {
  categories: NormalizedCategory[];
  omit?: string[];
  // Category key selected via the leans strip — that card gets an anchor id
  // (scroll target) and a highlight ring.
  focusKey?: string | null;
  // Per-category lean streak (consecutive quarters, same sign) for the chip caption.
  streaks?: Partial<Record<string, number>>;
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
            streak={streaks[cat.key] ?? null}
          />
        ))}
    </>
  );
}
