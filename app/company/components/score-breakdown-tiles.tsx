"use client";

import { LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NormalizedCategory } from "@/lib/quarterly-v4/normalize";

import { chipClass } from "./chip-tone";
import { leanChip } from "./quarterly-v4-section";
import { nestedDetailClass } from "./surface-tokens";

const dataFont = "font-[family-name:var(--font-data)] tabular-nums";

const LEAN_TEXT: Record<"up" | "down" | "flat", string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  flat: "text-foreground/70",
};
const LEAN_FILL: Record<"up" | "down", string> = {
  up: "bg-emerald-500 dark:bg-emerald-400",
  down: "bg-rose-500 dark:bg-rose-400",
};

/** A −2..+2 lean as a bar growing from the centre of a short track. */
function LeanMeter({ lean }: { lean: number }) {
  const half = Math.min(2, Math.abs(lean)) / 2; // share of one side
  const width = `${half * 50}%`;
  return (
    <div className="relative h-1 w-full rounded-full bg-border/60" aria-hidden>
      <span className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/50" />
      {lean > 0 && (
        <span className={cn("absolute left-1/2 top-0 h-full rounded-r-full", LEAN_FILL.up)} style={{ width }} />
      )}
      {lean < 0 && (
        <span className={cn("absolute right-1/2 top-0 h-full rounded-l-full", LEAN_FILL.down)} style={{ width }} />
      )}
    </div>
  );
}

/**
 * One tile per scoring category (management quality is deferred and does not
 * appear): the lean the scorer gave it (−2..+2), a centre-anchored meter, and
 * the lean's word. A category the call did not discuss shows as such — the
 * tile row doubles as the coverage read. An addressed tile is a button that
 * opens that category's card below.
 */
export function ScoreBreakdownTiles({
  categories,
  onSelect,
}: {
  categories: NormalizedCategory[];
  onSelect?: (key: NormalizedCategory["key"]) => void;
}) {
  const tiles = categories.filter((cat) => cat.state !== "deferred_v2");
  if (tiles.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="text-[15px] font-semibold leading-tight text-foreground">Score breakdown</h3>
        <span className={cn(chipClass("slate"), dataFont, "px-2 py-0.5 text-[10px]")}>by category</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="list">
        {tiles.map((cat) => {
          const addressed = cat.state === "addressed";
          const chip = addressed ? leanChip(cat.lean) : null;
          const dir = cat.lean == null ? "flat" : cat.lean > 0 ? "up" : cat.lean < 0 ? "down" : "flat";
          const body = (
            <>
              <p className="truncate text-[12px] font-semibold text-foreground">{cat.label}</p>
              {addressed && cat.lean != null ? (
                <>
                  <p className={cn(dataFont, "mt-1.5 text-[24px] font-bold leading-none", LEAN_TEXT[dir])}>
                    {cat.lean > 0 ? "+" : cat.lean < 0 ? "−" : ""}
                    {Math.abs(cat.lean)}
                  </p>
                  <div className="mt-2.5">
                    <LeanMeter lean={cat.lean} />
                  </div>
                  <p className={cn(dataFont, "mt-1.5 text-[10px] leading-snug text-muted-foreground")}>
                    {chip?.label ?? "In line"}
                  </p>
                </>
              ) : (
                <>
                  <p className={cn(dataFont, "mt-1.5 text-[24px] font-bold leading-none text-muted-foreground/50")}>—</p>
                  <div className="mt-2.5 h-1 w-full rounded-full bg-border/40" aria-hidden />
                  <p className={cn(dataFont, "mt-1.5 text-[10px] leading-snug text-muted-foreground")}>
                    {addressed ? "No lean recorded" : "Not discussed"}
                  </p>
                </>
              )}
            </>
          );
          return addressed && onSelect ? (
            <button
              key={cat.key}
              type="button"
              role="listitem"
              onClick={() => onSelect(cat.key)}
              title={`Open the ${cat.label} card`}
              aria-label={`${cat.label}: ${chip?.label ?? "no lean"}${cat.lean != null ? ` (${cat.lean > 0 ? "plus" : cat.lean < 0 ? "minus" : ""} ${Math.abs(cat.lean)})` : ""}. Open the category card`}
              className={cn(
                nestedDetailClass,
                "min-w-0 cursor-pointer p-3 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              )}
            >
              {body}
            </button>
          ) : (
            <div key={cat.key} role="listitem" className={cn(nestedDetailClass, "min-w-0 p-3 opacity-80")}>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
