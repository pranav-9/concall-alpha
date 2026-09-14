// The guidance record drawn on a Featured Reads card: one mark per tracked
// commitment, so a reader sees at a glance how often this management has kept
// its word — the proof behind a "Guidance re-read" headline, before any prose.
//
// Pure: it only reshapes the GuidanceVerdict the company page's Guidance section
// already builds (lib/guidance-tracking/verdict.ts), so the card and the page
// can never disagree. Counting follows the section's track record exactly:
// graded resolved commitments form "X of Y met" (revised/delayed past their
// horizon count as not met; unclear ones are not graded and not drawn), and
// live commitments are drawn after them as open marks.

import type { GuidanceVerdict, ResolvedOutcome } from "@/lib/guidance-tracking/verdict";

export type RecordMark = "met" | "slipped" | "missed" | "live";

export type GuidanceRecord = {
  marks: RecordMark[];
  metCount: number;
  gradedCount: number;
  liveCount: number;
};

const MARK_FOR_OUTCOME: Record<ResolvedOutcome, RecordMark | null> = {
  met: "met",
  revised: "slipped",
  delayed: "slipped",
  missed: "missed",
  dropped: "missed",
  unclear: null,
};

// Grouped so the eye reads the ratio: kept, then slipped, then missed, then
// what is still open.
const MARK_ORDER: Record<RecordMark, number> = { met: 0, slipped: 1, missed: 2, live: 3 };

export function buildGuidanceRecord(
  verdict: Pick<GuidanceVerdict, "bars" | "live" | "metCount" | "countedCount">,
): GuidanceRecord | null {
  const resolvedMarks = verdict.bars
    .map((outcome) => MARK_FOR_OUTCOME[outcome])
    .filter((mark): mark is RecordMark => mark !== null);
  const liveCount = verdict.live.length;
  if (resolvedMarks.length === 0 && liveCount === 0) return null;

  const marks = [...resolvedMarks, ...Array<RecordMark>(liveCount).fill("live")].sort(
    (a, b) => MARK_ORDER[a] - MARK_ORDER[b],
  );
  return {
    marks,
    metCount: verdict.metCount,
    gradedCount: verdict.countedCount,
    liveCount,
  };
}

// "12 of 17 met · 24 live" — counts only, descriptive, never a call.
export function guidanceRecordCaption(record: GuidanceRecord): string {
  const parts: string[] = [];
  parts.push(
    record.gradedCount > 0 ? `${record.metCount} of ${record.gradedCount} met` : "Nothing resolved yet",
  );
  if (record.liveCount > 0) parts.push(`${record.liveCount} live`);
  return parts.join(" · ");
}
