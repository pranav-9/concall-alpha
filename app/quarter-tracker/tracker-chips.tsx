// The board's filter chips — Improvers, Raised guidance, Lowered guidance and
// Watchlist. Links, not toggles: a filtered view is a URL, and the chips ship
// no client state. Only the sector select (sector-select.tsx) needs JS.

import Link from "next/link";

import { cn } from "@/lib/utils";

const CHIP =
  // 44px boxes in the phone's sideways strip (docs/portal-design-system.md), compact from sm.
  "inline-flex h-11 sm:h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] border px-2.5 text-[11.5px] leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]";

export function chipClass(on: boolean, disabled = false): string {
  return cn(
    CHIP,
    on
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-2)]"
      : "border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink)] hover:border-[var(--ink-soft)]",
    disabled && "pointer-events-none opacity-45",
  );
}

/** The glyph keeps its own colour until the chip is on, then inverts with the label. */
function Mark({ on, glyph, tone }: { on: boolean; glyph: string; tone: string }) {
  return (
    <span aria-hidden className={cn("text-[9px]", on ? undefined : tone)}>
      {glyph}
    </span>
  );
}

function Count({ n }: { n: number }) {
  return <span className="tabular-nums opacity-60">{n}</span>;
}

export function FilterChip({
  on,
  count,
  href,
  label,
  glyph,
  tone,
  titles,
  unavailable,
}: {
  on: boolean;
  count: number;
  /** The read behind this filter failed: the chip is disabled and says so, never "none". */
  unavailable?: string;
  href: string;
  label: string;
  glyph?: string;
  tone?: string;
  /** Tooltips: when off, when on, and when there is nothing to filter to. */
  titles: { off: string; on: string; none: string };
}) {
  const none = (count === 0 || unavailable != null) && !on;
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      aria-current={on ? "true" : undefined}
      aria-disabled={none || undefined}
      tabIndex={none ? -1 : undefined}
      title={unavailable ?? (none ? titles.none : on ? titles.on : titles.off)}
      className={chipClass(on, none)}
    >
      {glyph ? <Mark on={on} glyph={glyph} tone={tone ?? ""} /> : null}
      {label}
      {unavailable != null ? <span className="opacity-60">—</span> : <Count n={count} />}
    </Link>
  );
}

export type WatchlistChipState =
  | { kind: "signed-out"; signInHref: string }
  /** Signed in with nothing on any watchlist. */
  | { kind: "empty" }
  /** `count` = this block's companies that are on the reader's watchlists. */
  | { kind: "ready"; on: boolean; count: number; href: string };

export function WatchlistChip({ state }: { state: WatchlistChipState }) {
  const star = (on: boolean) => <Mark on={on} glyph="★" tone="text-[var(--ink)]" />;

  if (state.kind === "signed-out") {
    return (
      <Link
        href={state.signInHref}
        prefetch={false}
        title="Sign in to follow only your watchlist companies through the season"
        className={chipClass(false)}
      >
        {star(false)}
        Watchlist
      </Link>
    );
  }
  if (state.kind === "empty") {
    return (
      <Link href="/watchlists" prefetch={false} title="Add companies to a watchlist first" className={chipClass(false)}>
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
      className={chipClass(state.on)}
    >
      {star(state.on)}
      Watchlist
      <Count n={state.count} />
    </Link>
  );
}
