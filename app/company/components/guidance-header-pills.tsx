// Header pills for the Guidance SectionCard title row — "Reliable" + "4 / 5
// met". Rendered by GuidanceHistoryPanel (server) from the same verdict the
// client section renders, so header and body never disagree. Pure markup,
// no client state — kept out of guidance-history-section.tsx so the panel
// doesn't eagerly pull the deferred client bundle.

import type { GuidanceVerdict } from "@/lib/guidance-tracking/verdict";
import { MIN_COMMITMENTS_FOR_GRADE } from "@/lib/walk-the-talk/grade-utils";
import type { WalkTheTalkTier } from "@/lib/walk-the-talk/types";
import { chipClass, type ChipTone } from "./chip-tone";

export const GUIDANCE_TIER_TONE: Record<WalkTheTalkTier, ChipTone> = {
  reliable: "emerald",
  mixed: "sky",
  erratic: "amber",
  weak: "rose",
  not_enough_data: "slate",
};

export function GuidanceHeaderPills({
  verdict,
}: {
  verdict: Pick<GuidanceVerdict, "tier" | "tierLabel" | "metCount" | "countedCount">;
}) {
  // A 1-of-1 or 2-of-2 record showing here would carry the same visual
  // weight as a proven tier before there's enough to grade — suppressed
  // until MIN_COMMITMENTS_FOR_GRADE, matching the track-record card
  // (/plan-eng-review sparse-company investigation, 2026-09-06). At
  // countedCount 0-2, verdict.tier is ALWAYS "not_enough_data" (see
  // computeTier), so this one check covers every case that would
  // otherwise render an empty wrapper span (Claude adversarial finding,
  // ship-workflow review, 2026-09-06 — harmless, but a future edit that
  // only checked the tier condition would have silently reintroduced the
  // 1-2-counted gap).
  if (verdict.countedCount < MIN_COMMITMENTS_FOR_GRADE) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={chipClass(GUIDANCE_TIER_TONE[verdict.tier])}>{verdict.tierLabel}</span>
      <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 font-mono text-[10px] font-medium tabular-nums text-muted-foreground">
        {verdict.metCount} / {verdict.countedCount} met
      </span>
    </span>
  );
}
