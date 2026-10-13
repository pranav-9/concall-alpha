import Link from "next/link";

import type { ResultsPulse } from "@/lib/results-pulse/count";
import { cn } from "@/lib/utils";

// The navbar's first slot during results season: a highlighted link to
// /quarter-tracker carrying today's count ("3 today") or, on a quiet day, the
// season total so far ("12 declared"). Amber like the active tick, so it reads
// as the one live thing in the bar. Rendered by app/(hero)/navbar.tsx in all
// three of its shells; `size` only changes the padding and type size.

const PILL_BASE =
  "house-data inline-flex shrink-0 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-full border uppercase transition-colors";

const PILL_SIZE = {
  desktop: "px-3 py-[7px] text-[10.5px] tracking-[0.1em]",
  phone: "px-2.5 py-[8px] text-[9.5px] tracking-[0.08em]",
} as const;

export function resultsPillCount(pulse: ResultsPulse): string {
  if (pulse.today > 0) return `${pulse.today} today`;
  if (pulse.declared > 0) return `${pulse.declared} declared`;
  return pulse.label;
}

export function ResultsPill({
  pulse,
  active = false,
  size = "desktop",
  onClick,
}: {
  pulse: ResultsPulse;
  active?: boolean;
  size?: keyof typeof PILL_SIZE;
  onClick?: () => void;
}) {
  const live = pulse.today > 0;
  return (
    <Link
      href="/quarter-tracker"
      prefetch={false}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={`${pulse.label} results: ${pulse.today} today, ${pulse.declared} declared so far. Open the quarter tracker.`}
      className={cn(
        PILL_BASE,
        PILL_SIZE[size],
        active
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
          : "border-[var(--mark)] bg-[color-mix(in_srgb,var(--mark)_16%,var(--paper))] text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--mark)_28%,var(--paper))] active:bg-[color-mix(in_srgb,var(--mark)_28%,var(--paper))]",
      )}
    >
      <span aria-hidden className="relative flex h-1.5 w-1.5">
        {live ? (
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--mark)] opacity-75 motion-safe:animate-ping" />
        ) : null}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", active ? "bg-[var(--paper)]" : "bg-[var(--mark)]")} />
      </span>
      <span>Results</span>
      <span aria-hidden className="opacity-50">
        ·
      </span>
      <span className="font-semibold">{resultsPillCount(pulse)}</span>
    </Link>
  );
}
