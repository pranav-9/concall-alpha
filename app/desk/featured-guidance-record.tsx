// The data exhibit on a guidance Featured Read: one dot per tracked commitment —
// kept, slipped, missed, then the ones still live — with the count beneath.
// Drawn from the same verdict the company page's Guidance section builds, so a
// reader sees the proof before the prose (lib/desk-featured/guidance-record.ts).

import { cn } from "@/lib/utils";
import {
  guidanceRecordCaption,
  type GuidanceRecord,
  type RecordMark,
} from "@/lib/desk-featured/guidance-record";

const MARK_CLASS: Record<RecordMark, string> = {
  met: "bg-[var(--signal)]",
  slipped: "bg-[var(--warn)]",
  missed: "bg-[var(--alarm)]",
  live: "border border-[var(--ink-soft)]",
};

const LEGEND: Array<{ mark: RecordMark; label: string }> = [
  { mark: "met", label: "Met" },
  { mark: "slipped", label: "Slipped" },
  { mark: "missed", label: "Missed" },
  { mark: "live", label: "Live" },
];

export function FeaturedGuidanceRecord({
  record,
  size,
  className,
}: {
  record: GuidanceRecord;
  size: "hero" | "compact";
  className?: string;
}) {
  const hero = size === "hero";
  const dot = hero ? "h-3.5 w-3.5" : "h-2 w-2";
  const present = new Set(record.marks);

  return (
    <div className={className}>
      <div aria-hidden className={cn("flex flex-wrap", hero ? "gap-1.5" : "gap-1")}>
        {record.marks.map((mark, i) => (
          <span key={i} className={cn("shrink-0 rounded-full", dot, MARK_CLASS[mark])} />
        ))}
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-4 gap-y-1",
          hero ? "mt-3" : "mt-2",
        )}
      >
        <p className="house-data house-micro text-[var(--ink-soft)]">
          Guidance record · {guidanceRecordCaption(record)}
        </p>
        {hero ? (
          <ul aria-hidden className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {LEGEND.filter(({ mark }) => present.has(mark)).map(({ mark, label }) => (
              <li
                key={mark}
                className="house-data house-micro flex items-center gap-1.5 text-[var(--ink-soft)]"
              >
                <span className={cn("h-2 w-2 rounded-full", MARK_CLASS[mark])} />
                {label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
