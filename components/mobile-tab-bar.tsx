"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart2, Layers, LayoutGrid, Newspaper, type LucideIcon } from "lucide-react";

import { isPhoneAppRoute, normalizePhonePathname, PHONE_TABS, type PhoneTabHref } from "@/lib/phone-chrome";
import { cn } from "@/lib/utils";

// The phone tab bar (handoffs 2026-09-13: "The Desk — mobile" and the four
// sibling screens): the primary destinations the compact top bar no longer
// carries. Fixed to the bottom edge below `sm` on the five reading routes —
// Desk / Filings / Themes / Ranking / Sectors — the rest of the site keeps the
// hamburger. Mounted in the root layout after the footer so the spacer it
// renders keeps the footer's last line above the bar.
const ICONS: Record<PhoneTabHref, LucideIcon> = {
  "/desk": Newspaper,
  "/announcements": Activity,
  "/themes": Layers,
  "/leaderboards": BarChart2,
  "/sectors": LayoutGrid,
};

export function MobileTabBar() {
  const pathname = usePathname();
  if (!isPhoneAppRoute(pathname)) return null;
  // The bar only renders on an exact chrome route, so "active" is equality on
  // the normalised pathname — there are no sub-routes to prefix-match.
  const current = normalizePhonePathname(pathname);

  return (
    <>
      <div aria-hidden className="h-[calc(4.25rem+env(safe-area-inset-bottom))] sm:hidden" />
      <nav
        aria-label="Primary"
        className="house fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-[var(--rule)] !bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] px-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-[14px] sm:hidden"
      >
        {PHONE_TABS.map(({ href, label }) => {
          const Icon = ICONS[href];
          const active = current === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 touch-manipulation flex-col items-center gap-1 px-0.5 py-2 transition-colors",
                active ? "text-[var(--ink)]" : "text-[var(--ink-soft)] active:text-[var(--ink)]",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute left-1/2 top-0 h-0.5 w-[22px] -translate-x-1/2 rounded-sm bg-[var(--mark)]"
                />
              ) : null}
              <Icon aria-hidden size={20} strokeWidth={1.8} />
              <span className="house-data text-[9px] uppercase tracking-[0.06em]">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
