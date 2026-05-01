"use client";

import { useEffect, useRef, useState } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { cn, hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand/logo";

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

const Navbar = ({ initialUser = null }: { initialUser?: UserInfo }) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const navItems = [
    { href: "/leaderboards", label: "Leaderboards" },
    { href: "/watchlists", label: "Watchlists" },
    { href: "/sectors", label: "Sectors" },
    { href: "/requests", label: "Submit Request" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const renderSignedOutAuth = (compact: boolean) => {
    if (compact) {
      return (
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className={cn(
              "inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className={cn(
              "inline-flex items-center rounded-full border border-foreground bg-foreground px-3 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90",
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
      className="sticky top-0 z-50 flex justify-center bg-background/38 backdrop-blur-lg"
    >
      <div className="relative w-full max-w-[1440px] px-3 py-2 sm:px-6 lg:px-10">
        <div className="flex min-h-[4.25rem] items-center justify-between gap-3 rounded-[1.5rem] border border-border/60 bg-background/82 px-3 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)] sm:px-4">
          <div className="min-w-0 shrink-0">
            <Link href="/" className="group inline-flex items-center gap-3">
              <BrandLogo size={40} showEyebrow />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-3 lg:gap-4">
              <div className="w-60 lg:w-72">
                <CompanySearch instanceId="navbar-company-search" />
              </div>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "rounded-full px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
                    isActive(item.href)
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {item.label}
                  </Link>
              ))}
              <ThemeSwitcher />
              {renderAuthControls(true)}
            </div>

            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground"
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
          <div className="md:hidden absolute left-3 right-3 top-[calc(100%+0.5rem)] overflow-hidden rounded-[1.5rem] border border-border/60 bg-background/96 shadow-[0_24px_50px_-35px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="space-y-2 px-3 py-3">
              <CompanySearch
                className="mb-1 w-full"
                onNavigate={() => setIsMenuOpen(false)}
                instanceId="navbar-mobile-company-search"
              />
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {item.label}
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
