import type { ReactNode } from "react";

// The desktop Journal's section rule: "Plate 01 — Company Stories", a full ink
// hairline, and an optional right label. No hooks, so server and client
// sections share it.
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

/** "Read the story →" — the house underline link, as a span inside a card link. */
export const CARD_CTA =
  "house-data text-[12px] font-bold text-[var(--ink)] underline decoration-[var(--mark)] decoration-2 underline-offset-4";
