// The one filter on /scanners: "In your watchlist". A link, not a toggle, so a
// filtered view is a shareable URL and the page needs no client JS. Same star
// and the same signed-out behaviour as the leaderboards' Watchlist chip
// (app/leaderboards/board-filter.tsx): signed out it is a sign-in link that
// returns with the filter on.

import Link from "next/link";

import { mobileChipClass } from "@/components/mobile-card";
import { cn } from "@/lib/utils";

export type WatchlistFilterState =
  | { kind: "signed-out"; signInHref: string }
  /** Signed in with nothing on any watchlist. */
  | { kind: "empty" }
  /** `count` = this scan's hits among the reader's watchlist companies. */
  | { kind: "ready"; on: boolean; count: number | null; href: string };

export function WatchlistFilterChip({ state }: { state: WatchlistFilterState }) {
  const star = (on: boolean) => (
    <span aria-hidden className={on ? undefined : "text-[var(--mark)]"}>
      ★
    </span>
  );
  const chip = (on: boolean) => cn(mobileChipClass(on), "gap-1.5");

  return (
    <div role="group" aria-label="Filter" className="flex items-center gap-2">
      <span className="house-data text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Filter</span>
      {state.kind === "signed-out" ? (
        <Link
          href={state.signInHref}
          prefetch={false}
          title="Sign in to scan only the companies on your watchlists"
          className={chip(false)}
        >
          {star(false)}
          In your watchlist
        </Link>
      ) : state.kind === "empty" ? (
        <Link
          href="/watchlists"
          prefetch={false}
          title="Add companies to a watchlist first"
          className={chip(false)}
        >
          {star(false)}
          In your watchlist
          <span className="tabular-nums opacity-70">0</span>
        </Link>
      ) : (
        <Link
          href={state.href}
          scroll={false}
          prefetch={false}
          aria-current={state.on ? "true" : undefined}
          title={state.on ? "Back to every covered company" : "Only the companies on your watchlists"}
          className={chip(state.on)}
        >
          {star(state.on)}
          In your watchlist
          {state.count != null ? <span className="tabular-nums opacity-70">{state.count}</span> : null}
        </Link>
      )}
    </div>
  );
}
