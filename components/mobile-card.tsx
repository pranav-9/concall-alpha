// Shared phone-width primitives for the house-skin mobile presentation
// (handoffs 2026-09-13: "The Desk — mobile", then Filings / Themes / Ranking /
// Sectors). One card shell + one row-link recipe + one chip grammar so every
// phone screen reads as one system: paper-2 ground, hairline rules, 12px radius,
// 16px page gutter, mono labels, `--mark` only ever on the active control.

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Rounded card shell: `mx-4` is the 16px page gutter. Inside an already-padded
 * host (the company page's SectionCard) add `mx-0`; `cn` resolves it over `mx-4`.
 */
export const MOBILE_CARD =
  "mx-4 overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]";

/** Whole-row link: hairline divider, paper hover, on-brand focus ring. */
export const MOBILE_ROW =
  "block border-b border-[var(--rule)] transition-colors last:border-b-0 hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";

/**
 * List form of the row: the hairline lives on the <li>, the link inside carries
 * hover + focus. Use these (not MOBILE_ROW) whenever rows sit in a <ul>, or
 * `last:` would fire on every link — each is the only child of its <li>.
 */
export const MOBILE_LI = "border-b border-[var(--rule)] last:border-b-0";
export const MOBILE_LINK =
  "block transition-colors hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";

/** The on-brand inset focus ring on its own — for a row whose link is an inner element. */
export const MOBILE_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";

/** Card header: eyebrow on the left, a label or link on the right. */
export function MobileCardHead({
  eyebrow,
  right,
  live = false,
  id,
}: {
  eyebrow: string;
  right?: ReactNode;
  /** Prefix the eyebrow with the live dot. */
  live?: boolean;
  id?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-[var(--rule)] px-3.5 py-3">
      <span
        id={id}
        className="house-data flex items-center gap-1.5 whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]"
      >
        {live ? <LiveDot /> : null}
        {eyebrow}
      </span>
      {right}
    </div>
  );
}

/** The right-hand label of a card header (mono, 0.08em). Use `as` link when it navigates. */
export const MOBILE_HEAD_RIGHT =
  "house-data whitespace-nowrap text-[10px] uppercase tracking-[0.08em] text-[var(--ink-soft)]";

/** Small chevron used at the end of brief rows. */
export function Chevron({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      width="8"
      height="14"
      viewBox="0 0 8 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0 text-[var(--ink-soft)]", className)}
    >
      <path d="M1 1l6 6-6 6" />
    </svg>
  );
}

/** The "new" coverage badge — outlined signal, never filled. */
export function NewBadge({ title }: { title?: string }) {
  return (
    <span
      title={title}
      className="house-data shrink-0 rounded-[3px] border border-[color-mix(in_srgb,var(--signal)_40%,transparent)] px-1 py-px text-[8px] uppercase tracking-[0.1em] leading-tight text-[var(--signal)]"
    >
      new
    </span>
  );
}

/** A quiet outlined tag beside a name (`best`, `below cut`, `unofficial`). */
export function MobileTag({
  children,
  tone = "muted",
  title,
}: {
  children: ReactNode;
  tone?: "signal" | "warn" | "muted";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "house-data shrink-0 whitespace-nowrap rounded-[3px] border px-1 py-px text-[8px] uppercase tracking-[0.08em] leading-tight",
        tone === "signal" &&
          "border-[color-mix(in_srgb,var(--signal)_40%,transparent)] text-[var(--signal)]",
        tone === "warn" && "border-[color-mix(in_srgb,var(--warn)_45%,transparent)] text-[var(--warn)]",
        tone === "muted" && "border-[var(--rule)] text-[var(--ink-soft)]",
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Chips — the phone form of every filter / tab / sort strip. One horizontal
// scroller, scrollbar hidden, never wraps; active = ink fill on paper-2 text.
// ---------------------------------------------------------------------------

/**
 * The scroller that holds a chip row. Add `px-4` (page) or `px-3.5` (in-card);
 * no px inside an already-padded host (the company page's SectionCard).
 */
export const MOBILE_CHIP_STRIP =
  "flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// min-h-11: the 44px touch floor has to be the chip's own box — the strip is
// overflow-x-auto, which would clip the TOUCH_TARGET pseudo-element. Outline is
// inset for the same reason (an offset ring gets cut at the scroller's edge).
const CHIP_BASE =
  "house-data inline-flex min-h-11 shrink-0 touch-manipulation items-center whitespace-nowrap rounded-full border px-[13px] py-2 text-[10px] uppercase tracking-[0.1em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";

/** Chip classes for the active / inactive state. Works on <button>, <Link> and Radix triggers. */
export function mobileChipClass(active: boolean): string {
  return cn(
    CHIP_BASE,
    active
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-2)]"
      : "border-[var(--rule)] bg-transparent text-[var(--ink-soft)] active:text-[var(--ink)]",
  );
}

/**
 * Chip classes driven by Radix's `data-state` instead of a prop — for a
 * TabsTrigger, whose active state the Tabs root owns.
 */
export const MOBILE_CHIP_TAB = cn(
  CHIP_BASE,
  // The shadcn trigger ships dark:-variant colours of its own; restate every
  // colour under dark: too, or those win on specificity and paint white on white.
  "h-auto flex-none rounded-full border-[var(--rule)] bg-transparent font-normal text-[var(--ink-soft)] shadow-none dark:text-[var(--ink-soft)]",
  // …and its focus recipe (3px ring + ring-coloured border), so every chip strip
  // focuses with the same inset teal outline.
  "focus-visible:border-[var(--rule)] focus-visible:ring-0 data-[state=active]:focus-visible:border-[var(--ink)]",
  "data-[state=active]:border-[var(--ink)] data-[state=active]:bg-[var(--ink)] data-[state=active]:text-[var(--paper-2)] data-[state=active]:shadow-none",
  "dark:data-[state=active]:border-[var(--ink)] dark:data-[state=active]:bg-[var(--ink)] dark:data-[state=active]:text-[var(--paper-2)]",
);

// ---------------------------------------------------------------------------
// Page furniture.
// ---------------------------------------------------------------------------

/** Page masthead: title (30px display) with an optional eyebrow above and dek below. */
export function MobileMasthead({
  eyebrow,
  title,
  titleSize = "lg",
  children,
}: {
  eyebrow?: ReactNode;
  title: string;
  /** `lg` = 30px (Desk, Themes, Leaderboards, Sectors); `md` = 27px (Filings' two-word title). */
  titleSize?: "lg" | "md";
  /** Dek and meta lines, already styled. */
  children?: ReactNode;
}) {
  return (
    <header className="px-4 pb-1 pt-[18px]">
      {eyebrow ? (
        <p className="house-data flex items-center gap-[7px] text-[11px] text-[var(--ink-soft)]">
          {eyebrow}
        </p>
      ) : null}
      <h1
        className={cn(
          "house-display",
          eyebrow ? "mt-1.5" : "",
          titleSize === "lg" ? "text-[30px] leading-[1.02]" : "text-[27px] leading-[1.05]",
        )}
      >
        {title}
      </h1>
      {children}
    </header>
  );
}

/** The dek under a masthead title. */
export const MOBILE_DEK = "mt-[9px] text-[12.5px] leading-[1.5] text-[var(--ink-soft)] [text-wrap:pretty]";

/** The live dot that prefixes an eyebrow. */
export function LiveDot() {
  return (
    <span aria-hidden className="text-[9px] text-[var(--signal)]">
      ●
    </span>
  );
}

/** A labelled hairline that opens a secondary region ("Reference", "Just outside coverage"). */
export function MobileDivider({
  label,
  strong = false,
  className,
}: {
  label: ReactNode;
  /** Ink rule (the Desk's "Reference" break) instead of the hairline. */
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 px-4", className)}>
      <span className="house-data whitespace-nowrap text-[9px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
        {label}
      </span>
      <span aria-hidden className={cn("h-px flex-1", strong ? "bg-[var(--ink)]" : "bg-[var(--rule)]")} />
    </div>
  );
}

/** The two-digit rank gutter at the start of a board row. */
export function RankCell({ rank, className }: { rank: number | string | null; className?: string }) {
  return (
    <span
      className={cn(
        "house-data w-[18px] shrink-0 text-center text-xs tabular-nums text-[var(--ink-soft)]",
        className,
      )}
    >
      {rank == null ? "—" : typeof rank === "number" ? String(rank).padStart(2, "0") : rank}
    </span>
  );
}

// Company initials for the monogram crest: first letter of the first two words;
// a single-word name takes its first two letters. "&" is not a word.
export function initials(name: string): string {
  const words = name.replace(/&/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const pick = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return pick.toUpperCase();
}

/** The 34px monogram crest beside a company name. */
export function Crest({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="house-data flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-[var(--rule)] bg-[var(--paper)] text-[11px] text-[var(--ink-soft)]"
    >
      {initials(name)}
    </span>
  );
}

/** ▲ / ▼ / • for a signed move, with the matching text colour class. */
export function signedArrow(n: number): string {
  return n > 0 ? "▲" : n < 0 ? "▼" : "•";
}
export function signedColor(n: number): string {
  return n > 0 ? "text-[var(--signal)]" : n < 0 ? "text-[var(--alarm)]" : "text-[var(--ink-soft)]";
}
