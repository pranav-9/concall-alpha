"use client";

// The two board filters on /leaderboards: Improvers (climbed the Overall ranking
// since the previous snapshot) and Watchlist (on any of the reader's lists).
// One state for the whole page — the provider sits above both the phone and the
// desktop paint (components/viewport-gate: a breakpoint crossing re-mounts a
// paint, so reader state must live in the shared parent) and above all four
// boards, so a filter set on Overall is still on when the reader opens Growth.
//
// A filter never renumbers a board: every board ranks its full universe first
// and only then hides rows, so rank 37 stays 37 with Improvers on.

import Link from "next/link";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { mobileChipClass } from "@/components/mobile-card";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export type BoardFilterKey = "improvers" | "watchlist";

type BoardFilterState = {
  active: ReadonlySet<BoardFilterKey>;
  toggle: (key: BoardFilterKey) => void;
  /** UPPERCASE codes to keep, or null when no filter is on. Both on = both must hold. */
  codes: ReadonlySet<string> | null;
  improverCount: number;
  /** null = signed out: the chip becomes a sign-in link instead of a toggle. */
  watchlistCount: number | null;
};

const BoardFilterContext = createContext<BoardFilterState | null>(null);

export function BoardFilterProvider({
  improverCodes,
  watchlistCodes,
  children,
}: {
  /** UPPERCASE codes whose Overall rank is better than at the previous snapshot. */
  improverCodes: string[];
  /** UPPERCASE codes on the reader's watchlists that are on the board; null when signed out. */
  watchlistCodes: string[] | null;
  children: ReactNode;
}) {
  const [active, setActive] = useState<ReadonlySet<BoardFilterKey>>(new Set());

  const value = useMemo<BoardFilterState>(() => {
    const sets: Record<BoardFilterKey, ReadonlySet<string>> = {
      improvers: new Set(improverCodes),
      watchlist: new Set(watchlistCodes ?? []),
    };
    // Both on = both must hold: "the improvers on my watchlist".
    const on = [...active].map((key) => sets[key]);
    const codes =
      on.length === 0
        ? null
        : new Set([...on[0]].filter((code) => on.every((set) => set.has(code))));
    return {
      active,
      codes,
      improverCount: improverCodes.length,
      watchlistCount: watchlistCodes == null ? null : watchlistCodes.length,
      toggle: (key) => {
        const next = new Set(active);
        const on = !next.has(key);
        if (on) next.add(key);
        else next.delete(key);
        analytics.leaderboardFilterToggle(key, on, "leaderboards");
        setActive(next);
      },
    };
  }, [active, improverCodes, watchlistCodes]);

  return <BoardFilterContext.Provider value={value}>{children}</BoardFilterContext.Provider>;
}

/** UPPERCASE codes the boards should keep; null = show everything (also outside a provider). */
export function useBoardFilterCodes(): ReadonlySet<string> | null {
  return useContext(BoardFilterContext)?.codes ?? null;
}

/** Keep the rows the active filters allow. Identity when no filter is on. */
export function filterByCodes<T>(
  rows: T[],
  codes: ReadonlySet<string> | null,
  codeOf: (row: T) => string,
): T[] {
  return codes == null ? rows : rows.filter((row) => codes.has(codeOf(row).toUpperCase()));
}

/** What a board shows when the active filters leave it with no rows. */
export function FilterEmpty() {
  return (
    <p className="px-4 py-10 text-center text-sm text-muted-foreground">
      No companies match the filter.
    </p>
  );
}

/** How many of a board's companies are showing — the count in the board's title bar. */
export function FilteredCount({ codes }: { codes: string[] }) {
  const keep = useBoardFilterCodes();
  return <>{keep == null ? codes.length : codes.filter((code) => keep.has(code.toUpperCase())).length}</>;
}

const DESKTOP_CHIP =
  "house-data inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[11px] uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)] disabled:cursor-not-allowed disabled:opacity-45";

function desktopChipClass(on: boolean) {
  return cn(
    DESKTOP_CHIP,
    on
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-2)]"
      : "border-[var(--rule)] bg-transparent text-[var(--ink-soft)] hover:border-[var(--ink-soft)] hover:text-[var(--ink)]",
  );
}

const WATCHLIST_SIGN_IN = "/auth/login?next=%2Fleaderboards";

/**
 * The filter chips. `desktop` sits at the right end of the tab row; `phone` is
 * a second chip row under the board tabs, in the phone chip grammar.
 */
export function BoardFilterChips({ variant }: { variant: "desktop" | "phone" }) {
  const state = useContext(BoardFilterContext);
  if (!state) return null;
  const { active, toggle, improverCount, watchlistCount } = state;
  const phone = variant === "phone";
  const chipClass = (on: boolean) => (phone ? cn(mobileChipClass(on), "gap-1.5") : desktopChipClass(on));
  const improversOn = active.has("improvers");
  const watchlistOn = active.has("watchlist");
  // The glyph keeps its own colour until the chip is on, then inverts with the label.
  const mark = (on: boolean, glyph: string, tone: string) => (
    <span aria-hidden className={on ? undefined : tone}>
      {glyph}
    </span>
  );
  const count = (n: number) => <span className="tabular-nums opacity-70">{n}</span>;

  return (
    <div
      role="group"
      aria-label="Filter the boards"
      className={phone ? "flex items-center gap-2 px-4 pt-2" : "flex items-center gap-2"}
    >
      <span
        className={cn(
          "house-data uppercase tracking-[0.14em] text-[var(--ink-soft)]",
          phone ? "text-[9px]" : "mr-1 text-[11px]",
        )}
      >
        Filter
      </span>
      <button
        type="button"
        aria-pressed={improversOn}
        disabled={improverCount === 0}
        onClick={() => toggle("improvers")}
        title={
          improverCount === 0
            ? "No company has climbed the Overall ranking since the previous snapshot"
            : "Companies that climbed the Overall ranking since the previous snapshot"
        }
        className={chipClass(improversOn)}
      >
        {mark(improversOn, "▲", "text-[var(--signal)]")}
        Improvers
        {count(improverCount)}
      </button>
      {watchlistCount == null ? (
        <Link
          href={WATCHLIST_SIGN_IN}
          prefetch={false}
          title="Sign in to filter the boards to your watchlist"
          className={chipClass(false)}
        >
          {mark(false, "★", "text-[var(--mark)]")}
          Watchlist
        </Link>
      ) : (
        <button
          type="button"
          aria-pressed={watchlistOn}
          disabled={watchlistCount === 0}
          onClick={() => toggle("watchlist")}
          title={
            watchlistCount === 0
              ? "None of your watchlist companies are on these boards yet"
              : "Companies on your watchlists"
          }
          className={chipClass(watchlistOn)}
        >
          {mark(watchlistOn, "★", "text-[var(--mark)]")}
          Watchlist
          {count(watchlistCount)}
        </button>
      )}
    </div>
  );
}
