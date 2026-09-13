// Shared phone-width primitives for the /desk mobile presentation (handoff
// 2026-09-13, "The Desk — mobile"). One card shell + one row-link recipe so the
// Featured / Latest activity / Ranking / Top of the book cards read as one
// system: paper-2 ground, hairline rules, 12px radius, 16px page gutter.

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Rounded card shell: `mx-4` is the 16px page gutter. */
export const MOBILE_CARD =
  "mx-4 overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]";

/** Whole-row link: hairline divider, paper hover, on-brand focus ring. */
export const MOBILE_ROW =
  "block border-b border-[var(--rule)] transition-colors hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";

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
        {live ? (
          <span aria-hidden className="text-[9px] text-[var(--signal)]">
            ●
          </span>
        ) : null}
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
export function NewBadge() {
  return (
    <span className="house-data shrink-0 rounded-[3px] border border-[color-mix(in_srgb,var(--signal)_40%,transparent)] px-1 py-px text-[8px] uppercase tracking-[0.1em] leading-tight text-[var(--signal)]">
      new
    </span>
  );
}
