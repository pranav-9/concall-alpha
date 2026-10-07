// The two filter chips on the tracker — Improvers and Watchlist — in the house
// desktop chip grammar (app/leaderboards/board-filter.tsx). Links, not toggles:
// a filtered view is a URL, and the page ships no client state.

import Link from "next/link";

import { cn } from "@/lib/utils";

const CHIP =
  "house-data inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[10.5px] uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]";

export function chipClass(on: boolean, disabled = false): string {
  return cn(
    CHIP,
    on
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-2)]"
      : "border-[var(--rule)] bg-transparent text-[var(--ink-soft)] hover:border-[var(--ink-soft)] hover:text-[var(--ink)]",
    disabled && "pointer-events-none opacity-45",
  );
}

/** The glyph keeps its own colour until the chip is on, then inverts with the label. */
function Mark({ on, glyph, tone }: { on: boolean; glyph: string; tone: string }) {
  return (
    <span aria-hidden className={on ? undefined : tone}>
      {glyph}
    </span>
  );
}

function Count({ n }: { n: number }) {
  return <span className="tabular-nums opacity-70">{n}</span>;
}

export function ImproversChip({ on, count, href }: { on: boolean; count: number; href: string }) {
  const none = count === 0 && !on;
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      aria-current={on ? "true" : undefined}
      aria-disabled={none || undefined}
      tabIndex={none ? -1 : undefined}
      title={
        none
          ? "No company has scored above its prior quarter yet"
          : on
            ? "Back to every scored company"
            : "Only companies that scored above their prior quarter"
      }
      className={chipClass(on, none)}
    >
      <Mark on={on} glyph="▲" tone="text-[var(--signal)]" />
      Improvers
      <Count n={count} />
    </Link>
  );
}

export type WatchlistChipState =
  | { kind: "signed-out"; signInHref: string }
  /** Signed in with nothing on any watchlist. */
  | { kind: "empty" }
  /** `count` = this block's companies that are on the reader's watchlists. */
  | { kind: "ready"; on: boolean; count: number; href: string };

export function WatchlistChip({ state, size = "md" }: { state: WatchlistChipState; size?: "md" | "sm" }) {
  const sizing = size === "sm" ? "h-7 px-2.5 text-[9.5px]" : undefined;
  const star = (on: boolean) => <Mark on={on} glyph="★" tone="text-[var(--mark)]" />;

  if (state.kind === "signed-out") {
    return (
      <Link
        href={state.signInHref}
        prefetch={false}
        title="Sign in to follow only your watchlist companies through the season"
        className={cn(chipClass(false), sizing)}
      >
        {star(false)}
        Watchlist
      </Link>
    );
  }
  if (state.kind === "empty") {
    return (
      <Link
        href="/watchlists"
        prefetch={false}
        title="Add companies to a watchlist first"
        className={cn(chipClass(false), sizing)}
      >
        {star(false)}
        Watchlist
        <Count n={0} />
      </Link>
    );
  }
  return (
    <Link
      href={state.href}
      scroll={false}
      prefetch={false}
      aria-current={state.on ? "true" : undefined}
      title={state.on ? "Back to every covered company" : "Only the companies on your watchlists"}
      className={cn(chipClass(state.on), sizing)}
    >
      {star(state.on)}
      Watchlist
      <Count n={state.count} />
    </Link>
  );
}
