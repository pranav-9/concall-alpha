import {
  Activity,
  BarChart2,
  BookOpen,
  ChevronRight,
  Layers,
  LayoutGrid,
  ListChecks,
  Newspaper,
  Send,
  type LucideIcon,
} from "lucide-react";

import type { PhoneMoreHref, PhoneTabHref } from "@/lib/phone-chrome";
import { cn } from "@/lib/utils";

// The house-skin navigation grammar, shared by the phone tab bar
// (components/mobile-tab-bar.tsx) and the desktop tab strip in
// app/(hero)/navbar.tsx so the two can't drift: the same icon per destination,
// the same amber active tick, the same "Other" rows. The destination lists
// themselves live in lib/phone-chrome.ts.

export const TAB_ICONS: Record<PhoneTabHref, LucideIcon> = {
  "/desk": Newspaper,
  "/announcements": Activity,
  "/leaderboards": BarChart2,
  "/blog": BookOpen,
};

export const MORE_ICONS: Record<PhoneMoreHref, LucideIcon> = {
  "/themes": Layers,
  "/sectors": LayoutGrid,
};

/** The "Other" rows the components add beyond PHONE_MORE_LINKS. */
export const WATCHLISTS_ROW = {
  href: "/watchlists",
  label: "Watchlists",
  blurb: "The companies you follow",
  icon: ListChecks,
} as const;

export const TELEGRAM_ROW = {
  label: "Telegram group",
  blurb: "Results-day notes, first",
  icon: Send,
} as const;

/**
 * The active-destination tick: a short amber bar on the edge the strip shares
 * with the page — the top edge of the bottom bar, the bottom edge of the top bar.
 */
export function ActiveMark({ edge = "top" }: { edge?: "top" | "bottom" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute left-1/2 h-0.5 w-[22px] -translate-x-1/2 rounded-sm bg-[var(--mark)]",
        edge === "top" ? "top-0" : "bottom-0",
      )}
    />
  );
}

export function SheetRow({
  icon: Icon,
  label,
  blurb,
  active,
}: {
  icon: LucideIcon;
  label: string;
  blurb?: string;
  active?: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--rule)]",
          active ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink)]",
        )}
      >
        <Icon aria-hidden size={17} strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="house-data text-[12px] uppercase tracking-[0.08em] text-[var(--ink)]">
          {label}
        </span>
        {blurb ? (
          <span className="text-[12.5px] leading-snug text-[var(--ink-soft)]">{blurb}</span>
        ) : null}
      </span>
      <ChevronRight aria-hidden size={16} className="shrink-0 text-[var(--ink-soft)]" />
    </>
  );
}
