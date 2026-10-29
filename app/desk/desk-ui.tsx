// Shared pieces of the desk's sections (2026-10-29 redesign, to the user's
// mockup): every block is a mono eyebrow over a hairline with its "see all"
// link on the right, then one bordered card on the paper-2 ground. One tree for
// every width — the grids inside each card collapse to a single column on the
// phone. Server-safe (no hooks).

import Link from "next/link";
import type { ReactNode } from "react";

import { CompanyMark } from "@/components/company-logo";
import { cn } from "@/lib/utils";

export const DESK_CARD = "overflow-hidden rounded-md border border-[var(--rule)] bg-[var(--paper-2)]";

// The house skin has no default focus ring on a bare <a>: make it explicit and
// on-brand, inset so it reads inside the hairline rather than clipping past it.
export const DESK_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";

// A quiet teal wash: the card is already paper-2, so a paper-2 hover is invisible.
export const DESK_HOVER = "transition-colors hover:bg-[color-mix(in_srgb,var(--signal)_6%,transparent)]";

/** Hairline between rows inside a card. */
export const DESK_ROW_RULE = "border-b border-[var(--rule)] last:border-b-0";

export function DeskSection({
  id,
  eyebrow,
  live = false,
  link,
  className,
  children,
}: {
  id: string;
  eyebrow: string;
  /** A teal dot before the eyebrow: the block reports something that moves daily. */
  live?: boolean;
  link?: { href: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={className}>
      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] pb-2.5">
        <h2 id={id} className="house-data house-micro flex min-w-0 items-center gap-2 text-[var(--ink-soft)]">
          {live ? (
            <span aria-hidden className="text-[8px] leading-none text-[var(--signal)]">
              ●
            </span>
          ) : null}
          <span className="truncate">{eyebrow}</span>
        </h2>
        {link ? (
          <Link
            href={link.href}
            prefetch={false}
            className={cn(
              "house-data shrink-0 whitespace-nowrap text-[11px] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]",
              DESK_FOCUS,
            )}
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

const CREST_SIZE = {
  sm: "h-6 w-6 rounded",
  md: "h-8 w-8 rounded-[5px]",
  lg: "h-11 w-11 rounded-md",
} as const;

const CREST_TEXT = {
  sm: "text-[9px]",
  md: "text-[11px]",
  lg: "text-sm",
} as const;

/** The company mark: its logo when on file, else initials in a hairline square. */
export function DeskCrest({ code, name, size = "md" }: { code: string; name: string; size?: keyof typeof CREST_SIZE }) {
  return (
    <CompanyMark
      code={code}
      name={name}
      className={CREST_SIZE[size]}
      initialsClassName={cn("bg-[var(--paper)] font-semibold tracking-tight text-[var(--ink)]", CREST_TEXT[size])}
    />
  );
}

/** Mono eyebrow inside a card: "Company story · Latest". */
export function CardEyebrow({ parts, className }: { parts: (string | null | undefined)[]; className?: string }) {
  return (
    <p className={cn("house-data house-micro whitespace-nowrap text-[var(--ink-soft)]", className)}>
      {parts.filter(Boolean).join(" · ")}
    </p>
  );
}

/** "18h ago" → "18h", "just now" → "now": a row's corner holds a short token. */
export function compactAge(label: string): string {
  return label === "just now" ? "now" : label.replace(/ ago$/, "");
}

/** "13 Oct" in IST — the date a reader in India would put on the filing. */
export function istDayMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);
}

// A trailing legal suffix adds nothing in a ranked list ("Sterlite Technologies
// Limited") and pushes long names into truncation. Some company rows are stored
// in capitals ("LUMAX INDUSTRIES"); a multi-word all-caps name is set in title
// case, keeping words of three letters or fewer as initialisms ("KPI", "SG").
// By rule, never per company.
const LEGAL_SUFFIX = /\s+(limited|ltd\.?)$/i;
export function tradingName(name: string): string {
  let out = name.trim().replace(LEGAL_SUFFIX, "").trim() || name.trim();
  const words = out.split(/\s+/);
  if (words.length > 1 && /[A-Z]/.test(out) && !/[a-z]/.test(out)) {
    out = words.map((w) => (w.length <= 3 ? w : w[0] + w.slice(1).toLowerCase())).join(" ");
  }
  return out;
}

/** Skeleton of a section while it streams: eyebrow, rule, a card of `height`. */
export function DeskSectionFallback({ height, className }: { height: string; className?: string }) {
  return (
    <div aria-hidden className={className}>
      <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2.5">
        <div className="h-3 w-40 animate-pulse rounded bg-[var(--rule)]" />
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--rule)]" />
      </div>
      <div className={cn("mt-3.5 animate-pulse", DESK_CARD)} style={{ height }} />
    </div>
  );
}
