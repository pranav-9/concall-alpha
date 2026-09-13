// Header pills for the Guidance SectionCard title row — "Reliable" + "4 / 5
// met". Rendered by GuidanceHistoryPanel (server) from the same verdict the
// client section renders, so header and body never disagree. Pure markup,
// no client state — kept out of guidance-history-section.tsx so the panel
// doesn't eagerly pull the deferred client bundle.

import type { GuidanceVerdict } from "@/lib/guidance-tracking/verdict";
import { MIN_COMMITMENTS_FOR_GRADE } from "@/lib/walk-the-talk/grade-utils";
import type { CredibilityVerdictKey } from "@/lib/walk-the-talk/types";
import { chipClass, type ChipTone } from "./chip-tone";

// Counted tiers and stored (scored) verdicts share one tone map, so a stored
// "high_trust" and a counted "reliable" read as the same emerald signal.
export const GUIDANCE_TIER_TONE: Record<CredibilityVerdictKey, ChipTone> = {
  reliable: "emerald",
  mixed: "sky",
  erratic: "amber",
  weak: "rose",
  not_enough_data: "slate",
  high_trust: "emerald",
  credible: "sky",
  low_trust: "rose",
  not_assessable: "slate",
};

export function GuidanceHeaderPills({
  verdict,
}: {
  verdict: Pick<GuidanceVerdict, "tier" | "tierLabel" | "metCount" | "countedCount" | "verdictSource">;
}) {
  // A 1-of-1 or 2-of-2 record showing here would carry the same visual
  // weight as a proven tier before there's enough to grade — so the counted
  // ratio is suppressed until MIN_COMMITMENTS_FOR_GRADE, matching the
  // track-record card (/plan-eng-review sparse-company investigation,
  // 2026-09-06). A STORED verdict is not built from that ratio, so its chip
  // still shows; only the "x / y met" pill waits for enough resolved items.
  const enoughToGrade = verdict.countedCount >= MIN_COMMITMENTS_FOR_GRADE;
  const scored = verdict.verdictSource === "scored";
  if (!enoughToGrade && !scored) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={chipClass(GUIDANCE_TIER_TONE[verdict.tier])}>{verdict.tierLabel}</span>
      {enoughToGrade ? (
        <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 font-mono text-[10px] font-medium tabular-nums text-muted-foreground">
          {verdict.metCount} / {verdict.countedCount} met
        </span>
      ) : null}
    </span>
  );
}
