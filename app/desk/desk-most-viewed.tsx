"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { DESK_CARD, DESK_FOCUS } from "./desk-ui";
import { RankedRows, type RankedRow } from "./desk-ranked-rows";

type Window = "week" | "month";

// Right-rail "Most viewed" block: the companies readers actually open, ranked by
// unique visitors. Week/Month toggle; no counts shown (just the rank ordinal +
// ConcallScore), matching the top-performers block above it.
export default function DeskMostViewed({
  week,
  month,
  initialWindow,
}: {
  week: RankedRow[];
  month: RankedRow[];
  initialWindow: Window;
}) {
  const [win, setWin] = useState<Window>(initialWindow);
  const rows = win === "week" ? week : month;

  return (
    <div className={DESK_CARD}>
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
        <h3 className="house-data house-micro text-[var(--ink-soft)]">Most viewed</h3>
        <div className="flex items-center gap-1" role="group" aria-label="View window">
          {(["week", "month"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setWin(key)}
              aria-pressed={win === key}
              className={cn(
                "house-data house-micro rounded border px-2 py-1 transition-colors",
                win === key
                  ? "border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
                  : "border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]",
                DESK_FOCUS,
              )}
            >
              {key === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="house-data house-micro px-4 pb-4 pt-2 text-[var(--ink-soft)] sm:px-5">
          Not enough views yet this {win}.
        </p>
      ) : (
        <RankedRows rows={rows} module="desk_most_viewed" />
      )}
    </div>
  );
}
