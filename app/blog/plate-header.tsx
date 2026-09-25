import type { ReactNode } from "react";

// The desktop Journal's section furniture. No hooks, so server and client
// sections share it.

/** "Plate 01 — Company Stories", a full ink hairline, and an optional right label. */
export function PlateHeader({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="house-data shrink-0 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-[var(--ink)]" />
      {right ? (
        <span className="house-data shrink-0 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          {right}
        </span>
      ) : null}
    </div>
  );
}

/** A plate's h2 + one-line blurb, with a count or controls on the right. */
export function PlateTitle({
  id,
  title,
  blurb,
  aside,
}: {
  id: string;
  title: string;
  blurb: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="mt-[26px] flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="house-display text-[34px] leading-[1.05]">
          {title}
        </h2>
        <p className="text-[14px] leading-6 text-[var(--ink-soft)]">{blurb}</p>
      </div>
      {aside}
    </div>
  );
}

/** "Plate 02 — Head to head": numbered by the plates actually painted, so an empty lane never leaves a gap. */
export function plateLabel(n: number, name: string): string {
  return `Plate ${String(n).padStart(2, "0")} — ${name}`;
}

/** Keyboard focus ring for whole-card links and buttons (outset). */
export const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]";

/** Keyboard focus ring for full-bleed list rows (inset, so it isn't clipped by neighbours). */
export const ROW_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";

/** "Read the story →" — the house underline link, as a span inside a card link. */
export const CARD_CTA =
  "house-data text-[12px] font-bold text-[var(--ink)] underline decoration-[var(--mark)] decoration-2 underline-offset-4";
