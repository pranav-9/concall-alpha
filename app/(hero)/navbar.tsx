"use client";

import { useEffect, useRef, useState } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { cn, hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand/logo";
import { JournalNewIndicator } from "@/components/journal-new-indicator";

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
};

const CompanySearch = dynamic<CompanySearchProps>(
  () => import("@/components/company-search").then((mod) => mod.CompanySearch),
);

const LogoutButton = dynamic<LogoutButtonProps>(
  () => import("@/components/logout-button").then((mod) => mod.LogoutButton),
);

const ThemeSwitcher = dynamic(
  () => import("@/components/theme-switcher").then((mod) => mod.ThemeSwitcher),
  { ssr: false },
);

const Navbar = ({
  initialUser = null,
  initialCompanies = [],
  latestJournalDate = null,
  quarterLabel = null,
}: {
  initialUser?: UserInfo;
  initialCompanies?: { code: string; name: string | null }[];
  latestJournalDate?: string | null;
  // Computed server-side (lib/current-quarter) so the label rolls forward each
  // season instead of freezing at whatever quarter was current when shipped.
  quarterLabel?: string | null;
}) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const navItems = [
    ...(quarterLabel ? [{ href: "/quarter-tracker", label: quarterLabel }] : []),
    { href: "/leaderboards", label: "Leaderboards" },
    { href: "/themes", label: "Themes" },
    { href: "/watchlists", label: "Watchlists" },
    { href: "/blog", label: "Journal" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const renderSignedOutAuth = (compact: boolean) => {
    if (compact) {
      return (
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className={cn(
              "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
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
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
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
    // of tabbing through the whole page first.
    menuPanelRef.current?.focus();

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

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
      <div className="relative w-full max-w-[1440px] px-3 py-2 sm:px-6 lg:px-10">
        <div className="flex min-h-[4.25rem] items-center justify-between gap-3 rounded-[1.5rem] border border-border/60 bg-background/82 px-3 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)] dark:border-white/12 dark:bg-white/[0.05] dark:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] sm:px-4">
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
              <ThemeSwitcher />
              {renderAuthControls(true)}
            </div>

            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="global-navbar-mobile-menu"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="relative z-50 min-[1200px]:hidden inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground dark:border-white/15 dark:bg-white/[0.06] dark:text-foreground/80"
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
            className="min-[1200px]:hidden fixed inset-0 z-40 cursor-default"
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
