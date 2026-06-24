// v4-category breakdown UI pieces, composed INSIDE QuarterlyScoreSection's
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

// Mirrors renderCard in quarterly-score-section.tsx: nestedDetailClass, accent-dot
// uppercase label, amber dot-bullet list.
// A single addressed category card. Exported so it can be placed outside the
// breakdown grid (e.g. Quantitative decomposition rendered next to the chart).
export function V4Card({ cat }: { cat: NormalizedCategory }) {
  const chip = leanChip(cat.lean);
  return (
    <div className={cn(nestedDetailClass, "p-3")}>
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
}: {
  categories: NormalizedCategory[];
  omit?: string[];
}) {
  return (
    <>
      {categories
        .filter((cat) => cat.state === "addressed" && !omit.includes(cat.key))
        .map((cat) => (
          <V4Card key={cat.key} cat={cat} />
        ))}
    </>
  );
}
