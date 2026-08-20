"use client";

import { useState } from "react";
import Link from "next/link";

import ConcallScore from "@/components/concall-score";
import type { DeskTableRow } from "./desk-leaderboard-table";

type Window = "week" | "month";

// Right-rail "Most viewed" block: the companies readers actually open, ranked by
// unique visitors. Week/Month toggle; no counts shown (just the rank ordinal +
// ConcallScore), matching the top-performers block above it.
export default function DeskMostViewed({
  week,
  month,
  initialWindow,
}: {
  week: DeskTableRow[];
  month: DeskTableRow[];
  initialWindow: Window;
}) {
  const [win, setWin] = useState<Window>(initialWindow);
  const rows = win === "week" ? week : month;

  return (
    <section className="rounded border border-[var(--rule)] bg-[var(--paper-2)] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="house-data house-micro text-[var(--ink-soft)]">Most viewed</h3>
        <div className="flex items-center gap-1" role="group" aria-label="View window">
          {(["week", "month"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setWin(key)}
              aria-pressed={win === key}
              className={`house-data house-micro rounded px-1.5 py-0.5 transition-colors ${
                win === key
                  ? "text-[var(--ink)]"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              {key === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="house-data house-micro py-2 text-[var(--ink-soft)]">
          Not enough views yet this {win}.
        </p>
      ) : (
        <div>
          {rows.map((row, i) => (
            <Link
              key={row.code}
              href={`/company/${row.code}`}
              prefetch={false}
              className="flex items-center gap-3 border-b border-[var(--rule)] py-2.5 last:border-b-0 transition-colors hover:bg-[var(--paper-2)]"
            >
              <span className="house-data house-micro w-4 shrink-0 text-[var(--ink-soft)]">
                {i + 1}
              </span>
              <span className="house-display min-w-0 flex-1 truncate text-sm text-[var(--ink)]">
                {row.name}
              </span>
              {row.latestScore != null ? (
                <ConcallScore score={row.latestScore} size="sm" />
              ) : null}
            </Link>
          ))}
          <p className="house-data house-micro mt-2 text-[var(--ink-soft)]">
            Score shown is the latest ConcallScore.
          </p>
        </div>
      )}
    </section>
  );
}
