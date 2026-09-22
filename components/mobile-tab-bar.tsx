"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart2,
  BookOpen,
  ChevronRight,
  Ellipsis,
  Layers,
  LayoutGrid,
  ListChecks,
  Newspaper,
  Send,
  type LucideIcon,
} from "lucide-react";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { JournalNewIndicator } from "@/components/journal-new-indicator";
import { TelegramJoinLink } from "@/components/telegram-join-link";
import {
  isPhoneAppRoute,
  isPhoneMoreRoute,
  normalizePhonePathname,
  PHONE_MORE_LINKS,
  PHONE_TABS,
  type PhoneMoreHref,
  type PhoneTabHref,
} from "@/lib/phone-chrome";
import { cn } from "@/lib/utils";

// The phone tab bar (handoffs 2026-09-13: "The Desk — mobile" and its sibling
// screens; re-cut 2026-09-22): the primary destinations the compact top bar no
// longer carries. Fixed to the bottom edge below `sm` on the phone-app routes
// (lib/phone-chrome) — the rest of the site keeps the hamburger. Four direct
// tabs — Desk / Filings / Ranking / Journal — and a fifth, "Other", that opens
// a bottom sheet with the remaining destinations (Themes, Sectors, Watchlists
// when signed in, the Telegram group). Mounted in the root layout after the
// footer so the spacer it renders keeps the footer's last line above the bar.
const TAB_ICONS: Record<PhoneTabHref, LucideIcon> = {
  "/desk": Newspaper,
  "/announcements": Activity,
  "/leaderboards": BarChart2,
  "/blog": BookOpen,
};

const MORE_ICONS: Record<PhoneMoreHref, LucideIcon> = {
  "/themes": Layers,
  "/sectors": LayoutGrid,
};

const TAB_CLASS =
  "relative flex flex-1 touch-manipulation flex-col items-center gap-1 px-0.5 py-2 transition-colors";

function ActiveMark() {
  return (
    <span
      aria-hidden
      className="absolute left-1/2 top-0 h-0.5 w-[22px] -translate-x-1/2 rounded-sm bg-[var(--mark)]"
    />
  );
}

function TabLabel({ children }: { children: React.ReactNode }) {
  return <span className="house-data text-[9px] uppercase tracking-[0.06em]">{children}</span>;
}

const SHEET_ROW_CLASS =
  "flex w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors active:bg-[var(--paper-2)]";

function SheetRow({
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

export function MobileTabBar({
  telegramUrl = null,
  isSignedIn = false,
  latestJournalDate = null,
}: {
  /** Validated invite URL from `getTelegramJoinUrl()`; null renders no row. */
  telegramUrl?: string | null;
  /** Watchlists are user-owned — the row only shows when signed in. */
  isSignedIn?: boolean;
  /** ISO date of the newest Journal post; drives the "new" dot on the Journal tab. */
  latestJournalDate?: string | null;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // The bar lives in the root layout, so the sheet would otherwise survive a
  // client navigation. Close it on every route change.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (!isPhoneAppRoute(pathname)) return null;
  // The bar only renders on an exact chrome route, so "active" is equality on
  // the normalised pathname — there are no sub-routes to prefix-match.
  const current = normalizePhonePathname(pathname);
  const moreActive = isPhoneMoreRoute(pathname);

  return (
    <>
      <div aria-hidden className="h-[calc(4.25rem+env(safe-area-inset-bottom))] sm:hidden" />
      <nav
        aria-label="Primary"
        className="house fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-[var(--rule)] !bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] px-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-[14px] sm:hidden"
      >
        {PHONE_TABS.map(({ href, label }) => {
          const Icon = TAB_ICONS[href];
          const active = current === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                TAB_CLASS,
                active ? "text-[var(--ink)]" : "text-[var(--ink-soft)] active:text-[var(--ink)]",
              )}
            >
              {active ? <ActiveMark /> : null}
              <span className="relative">
                <Icon aria-hidden size={20} strokeWidth={1.8} />
                {href === "/blog" && latestJournalDate ? (
                  <span className="absolute -right-1.5 -top-0.5">
                    <JournalNewIndicator latestKey={latestJournalDate} />
                  </span>
                ) : null}
              </span>
              <TabLabel>{label}</TabLabel>
            </Link>
          );
        })}

        <button
          type="button"
          aria-label="Other destinations"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
          className={cn(
            TAB_CLASS,
            moreActive || moreOpen
              ? "text-[var(--ink)]"
              : "text-[var(--ink-soft)] active:text-[var(--ink)]",
          )}
        >
          {moreActive ? <ActiveMark /> : null}
          <Ellipsis aria-hidden size={20} strokeWidth={1.8} />
          <TabLabel>Other</TabLabel>
        </button>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent
          aria-describedby={undefined}
          className="house !bg-[var(--paper)] border-[var(--rule)] rounded-t-2xl sm:hidden"
        >
          <DrawerTitle className="house-data px-5 pb-1 pt-3 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            Other
          </DrawerTitle>
          <div className="flex flex-col gap-0.5 px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {PHONE_MORE_LINKS.map(({ href, label, blurb }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                aria-current={current === href ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
                className={SHEET_ROW_CLASS}
              >
                <SheetRow icon={MORE_ICONS[href]} label={label} blurb={blurb} active={current === href} />
              </Link>
            ))}
            {isSignedIn ? (
              <Link
                href="/watchlists"
                prefetch={false}
                onClick={() => setMoreOpen(false)}
                className={SHEET_ROW_CLASS}
              >
                <SheetRow icon={ListChecks} label="Watchlists" blurb="The companies you follow" />
              </Link>
            ) : null}
            {telegramUrl ? (
              <TelegramJoinLink
                href={telegramUrl}
                surface="tab_bar"
                onClick={() => setMoreOpen(false)}
                className={SHEET_ROW_CLASS}
              >
                <SheetRow icon={Send} label="Telegram group" blurb="Results-day notes, first" />
              </TelegramJoinLink>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
