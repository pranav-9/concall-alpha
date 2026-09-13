"use client";

import { useEffect, useRef, useState } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { TOUCH_TARGET_ICON } from "@/lib/design/shell";
import { cn, hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { BrandLogo, BrandMark } from "@/components/brand/logo";
import { JournalNewIndicator } from "@/components/journal-new-indicator";
import { TelegramJoinLink } from "@/components/telegram-join-link";

type UserInfo = {
  email: string | null;
  name: string | null;
  avatar: string | null;
} | null;

type LogoutButtonProps = {
  compact?: boolean;
};

type CompanySearchProps = {
  className?: string;
  onNavigate?: () => void;
  instanceId?: string;
  initialCompanies?: { code: string; name: string | null }[];
  autoFocus?: boolean;
};

const CompanySearch = dynamic<CompanySearchProps>(
  () => import("@/components/company-search").then((mod) => mod.CompanySearch),
);

const LogoutButton = dynamic<LogoutButtonProps>(
  () => import("@/components/logout-button").then((mod) => mod.LogoutButton),
);

const ThemeSwitcher = dynamic(
  () => import("@/components/theme-switcher").then((mod) => mod.ThemeSwitcher),
  {
    ssr: false,
    // Reserve the button's footprint (Button size="sm" with one icon: h-8,
    // ~36px wide) so the nav cluster doesn't shift when the switcher mounts.
    // Lighthouse attributed a ~0.03 CLS on every route to this gap.
    loading: () => <div aria-hidden className="h-8 w-9" />,
  },
);

const Navbar = ({
  initialUser = null,
  initialCompanies = [],
  latestJournalDate = null,
  telegramUrl = null,
}: {
  initialUser?: UserInfo;
  initialCompanies?: { code: string; name: string | null }[];
  latestJournalDate?: string | null;
  /** Validated invite URL from `getTelegramJoinUrl()`; null renders no link.
   *  The one join affordance on every page (2026-09-13 visibility push). */
  telegramUrl?: string | null;
  // Accepted for backwards-compat with the layout wiring; the quarter tracker is
  // now reached from the LIVE banner, not a nav tab.
  quarterLabel?: string | null;
}) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // The desk's phone presentation (handoff 2026-09-13) swaps the pill shell for
  // a compact house-skin bar below `sm`: brand + search + sign-in, with the
  // primary destinations living in the fixed bottom tab bar
  // (components/desk-mobile-tab-bar). The search button opens the same menu
  // panel — search box first, then every other destination — with the search
  // focused, so nothing the hamburger reached (Journal, Watchlists, theme,
  // Sign up) becomes unreachable.
  const isDeskPhoneChrome = pathname === "/desk";
  const [focusSearchOnOpen, setFocusSearchOnOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const navItems = [
    { href: "/desk", label: "Desk" },
    { href: "/announcements", label: "Announcements" },
    { href: "/themes", label: "Themes" },
    { href: "/leaderboards", label: "Leaderboards" },
    { href: "/sectors", label: "Sectors" },
    // Watchlists are user-owned — only surface the tab when signed in, so the
    // signed-out nav stays lean (matches the desk design).
    ...(initialUser ? [{ href: "/watchlists", label: "Watchlists" }] : []),
    { href: "/blog", label: "Journal" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const renderSignedOutAuth = (compact: boolean) => {
    if (compact) {
      return (
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            onClick={() => setIsMenuOpen(false)}
            className={cn(
              "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            onClick={() => setIsMenuOpen(false)}
            className={cn(
              "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-foreground bg-foreground px-3 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90",
            )}
          >
            Sign up
          </Link>
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <Link
          href="/auth/login"
          onClick={() => setIsMenuOpen(false)}
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          onClick={() => setIsMenuOpen(false)}
          className="inline-flex h-9 items-center justify-center rounded-md border border-transparent bg-foreground px-3 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90"
        >
          Sign up
        </Link>
      </div>
    );
  };

  const renderAuthControls = (compact: boolean) => {
    if (!initialUser) {
      return renderSignedOutAuth(compact);
    }

    return <LogoutButton compact={compact} />;
  };

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!navRef.current) return;
      if (!navRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        // Escape is a keyboard dismissal — return focus to the trigger so the
        // tab sequence resumes where it left off (outside-tap intentionally
        // does not, since focus is already wherever the user tapped).
        menuButtonRef.current?.focus();
      }
    };

    // Lock background scroll so flicking to tap a menu item doesn't slide the
    // page underneath the open panel.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the panel so keyboard/AT users land on the menu instead
    // of tabbing through the whole page first. Opened from the desk phone bar's
    // search button, the search input takes it instead (CompanySearch autoFocus
    // covers the case where its chunk mounts after this effect runs).
    if (focusSearchOnOpen) {
      menuPanelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    } else {
      menuPanelRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // focusSearchOnOpen is read once per open; re-running on its change would
    // re-lock scroll for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) setFocusSearchOnOpen(false);
  }, [isMenuOpen]);

  // The Navbar lives in the root layout, so isMenuOpen survives client
  // navigation. Close on every route change; the [isMenuOpen] effect's cleanup
  // then restores body.overflow, releasing the scroll-lock. Without this,
  // tapping Sign in / Sign up (or any menu link) leaves the menu, its backdrop,
  // and the scroll-lock open over the new page.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const element = navRef.current;
    if (!element) return;

    const updateNavbarHeight = () => {
      document.documentElement.style.setProperty(
        "--global-navbar-height",
        `${element.offsetHeight}px`,
      );
    };

    updateNavbarHeight();

    const observer = new ResizeObserver(() => {
      updateNavbarHeight();
    });

    observer.observe(element);
    window.addEventListener("resize", updateNavbarHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateNavbarHeight);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      id="global-navbar"
      className="sticky top-0 z-50 flex justify-center bg-background/38 backdrop-blur-lg dark:bg-background/70"
    >
      <div
        className={cn(
          "relative w-full max-w-[1440px] sm:px-6 sm:py-2 lg:px-10",
          isDeskPhoneChrome ? "px-0 py-0" : "px-3 py-1.5",
        )}
      >
        {isDeskPhoneChrome ? (
          <div className="house flex items-center justify-between gap-2.5 border-b border-[var(--rule)] !bg-[color-mix(in_srgb,var(--paper)_86%,transparent)] px-3.5 py-[7px] backdrop-blur-[14px] sm:hidden">
            <Link href="/" className="flex min-w-0 items-center gap-[9px]">
              <BrandMark bare size={26} className="shrink-0 text-[var(--ink)]" />
              <span className="house-data whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                Story of a Stock
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Search companies and open menu"
                aria-expanded={isMenuOpen}
                aria-controls={isMenuOpen ? "global-navbar-mobile-menu" : undefined}
                onClick={() => {
                  setFocusSearchOnOpen(!isMenuOpen);
                  setIsMenuOpen((prev) => !prev);
                }}
                className="flex h-[38px] w-[38px] touch-manipulation items-center justify-center rounded-full border border-[var(--rule)] text-[var(--ink)] transition-colors active:bg-[var(--paper-2)]"
              >
                {isMenuOpen ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                )}
              </button>
              {initialUser ? (
                <LogoutButton compact />
              ) : (
                <Link
                  href="/auth/login"
                  className="house-data whitespace-nowrap rounded-full border border-[var(--rule)] px-3 py-[9px] text-[10px] uppercase tracking-[0.12em] text-[var(--ink)] transition-colors active:bg-[var(--paper-2)]"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "flex min-h-[3.5rem] items-center justify-between gap-3 rounded-[1.5rem] sm:min-h-[4.25rem] border border-border/60 bg-background/82 px-3 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)] dark:border-white/12 dark:bg-white/[0.05] dark:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] sm:px-4",
            isDeskPhoneChrome && "hidden sm:flex",
          )}
        >
          <div className="min-w-0 shrink-0">
            <Link href="/" className="group inline-flex items-center gap-3">
              <BrandLogo size={40} showEyebrow />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden min-[1200px]:flex items-center gap-3 lg:gap-4">
              <div className="w-60 lg:w-72">
                <CompanySearch
                  instanceId="navbar-company-search"
                  initialCompanies={initialCompanies}
                />
              </div>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
                    isActive(item.href)
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {item.label}
                  {item.href === "/blog" && latestJournalDate ? (
                    <JournalNewIndicator latestKey={latestJournalDate} />
                  ) : null}
                  </Link>
              ))}
              {telegramUrl ? (
                <TelegramJoinLink
                  href={telegramUrl}
                  surface="navbar"
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Telegram
                </TelegramJoinLink>
              ) : null}
              <ThemeSwitcher />
              {renderAuthControls(true)}
            </div>

            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              // Only reference the panel while it exists (open). isMenuOpen is
              // false on the server and first client render, so this stays absent
              // on both — no hydration mismatch — and drops the dangling
              // reference when the menu is closed.
              aria-controls={isMenuOpen ? "global-navbar-mobile-menu" : undefined}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              // 44px square (touch floor) + touch-manipulation to drop the 300ms
              // tap delay + an active state for immediate tap feedback, and
              // TOUCH_TARGET_ICON squares off the hit area so the rounded-2xl
              // corners aren't dead. Was h-10 w-10 (40px): under the floor, and
              // its corners hit-tested to the div behind, so edge taps did
              // nothing — the "mash the menu and it won't open" report at 354px.
              className={cn(
                "relative z-50 min-[1200px]:hidden inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground active:bg-accent active:text-foreground dark:border-white/15 dark:bg-white/[0.06] dark:text-foreground/80",
                TOUCH_TARGET_ICON,
              )}
            >
              {isMenuOpen ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              )}
            </button>

            {!hasEnvVars ? (
              <div className="hidden lg:block">
                <EnvVarWarning />
              </div>
            ) : null}
          </div>
        </div>

        {isMenuOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            tabIndex={-1}
            onClick={() => setIsMenuOpen(false)}
            className="min-[1200px]:hidden fixed inset-0 z-40 cursor-default bg-foreground/10 backdrop-blur-[2px]"
          />
        )}

        {isMenuOpen && (
          <div
            ref={menuPanelRef}
            id="global-navbar-mobile-menu"
            role="menu"
            aria-label="Navigation menu"
            tabIndex={-1}
            className="min-[1200px]:hidden absolute z-50 left-3 right-3 top-[calc(100%+0.5rem)] max-h-[calc(100dvh-var(--global-navbar-height,4.25rem)-1.5rem)] overflow-y-auto overscroll-contain rounded-[1.5rem] border border-border/60 bg-background shadow-[0_24px_50px_-35px_rgba(15,23,42,0.45)] backdrop-blur-xl outline-none dark:border-white/12 dark:bg-[hsl(0_0%_8%)] dark:shadow-[0_24px_50px_-30px_rgba(0,0,0,0.9)]"
          >
            <div className="space-y-2 px-3 py-3">
              <CompanySearch
                className="mb-1 w-full"
                onNavigate={() => setIsMenuOpen(false)}
                instanceId="navbar-mobile-company-search"
                initialCompanies={initialCompanies}
                autoFocus={focusSearchOnOpen}
              />
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {item.label}
                  {item.href === "/blog" && latestJournalDate ? (
                    <JournalNewIndicator latestKey={latestJournalDate} />
                  ) : null}
                </Link>
              ))}
              {telegramUrl ? (
                <TelegramJoinLink
                  href={telegramUrl}
                  surface="navbar"
                  className="flex w-full items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Telegram group
                </TelegramJoinLink>
              ) : null}
              <div className="flex items-center justify-between pt-1">
                {renderAuthControls(true)}
                <ThemeSwitcher />
              </div>
              {!hasEnvVars ? (
                <div className="pt-1">
                  <EnvVarWarning />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
