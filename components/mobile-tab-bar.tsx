"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { JournalNewIndicator } from "@/components/journal-new-indicator";
import {
  ActiveMark,
  MORE_ICONS,
  SheetRow,
  TAB_ICONS,
  TELEGRAM_ROW,
  WATCHLISTS_ROW,
} from "@/components/nav-destinations";
import { TelegramJoinLink } from "@/components/telegram-join-link";
import {
  isPhoneAppRoute,
  isPhoneMoreRoute,
  normalizePhonePathname,
  PHONE_MORE_LINKS,
  PHONE_TABS,
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
// Icons, the active tick and the sheet rows are shared with the desktop tab
// strip via components/nav-destinations.
const TAB_CLASS =
  "relative flex flex-1 touch-manipulation flex-col items-center gap-1 px-0.5 py-2 transition-colors";

function TabLabel({ children }: { children: React.ReactNode }) {
  return <span className="house-data text-[9px] uppercase tracking-[0.06em]">{children}</span>;
}

const SHEET_ROW_CLASS =
  "flex w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors active:bg-[var(--paper-2)]";

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
                href={WATCHLISTS_ROW.href}
                prefetch={false}
                onClick={() => setMoreOpen(false)}
                className={SHEET_ROW_CLASS}
              >
                <SheetRow icon={WATCHLISTS_ROW.icon} label={WATCHLISTS_ROW.label} blurb={WATCHLISTS_ROW.blurb} />
              </Link>
            ) : null}
            {telegramUrl ? (
              <TelegramJoinLink
                href={telegramUrl}
                surface="tab_bar"
                onClick={() => setMoreOpen(false)}
                className={SHEET_ROW_CLASS}
              >
                <SheetRow icon={TELEGRAM_ROW.icon} label={TELEGRAM_ROW.label} blurb={TELEGRAM_ROW.blurb} />
              </TelegramJoinLink>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
