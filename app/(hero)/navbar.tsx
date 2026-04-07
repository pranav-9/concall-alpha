"use client";

import { useState } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { CompanySearch } from "@/components/company-search";
import { AuthButton, type UserInfo } from "@/components/auth-button";
import { cn, hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar = ({ initialUser = null }: { initialUser?: UserInfo }) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems = [
    { href: "/leaderboards", label: "Leaderboards" },
    { href: "/watchlists", label: "Watchlists" },
    { href: "/sectors", label: "Sectors" },
    { href: "/requests", label: "Submit Request" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="sticky top-0 z-50 flex justify-center bg-background/38 backdrop-blur-lg">
      <div className="relative w-full max-w-[1440px] px-3 py-2 sm:px-6 lg:px-10">
        <div className="flex min-h-[4.25rem] items-center justify-between gap-3 rounded-[1.5rem] border border-border/60 bg-background/82 px-3 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)] sm:px-4">
          <div className="min-w-0 shrink-0">
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(220,252,231,0.85),rgba(224,242,254,0.85))] text-sm font-black text-foreground shadow-sm dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(6,78,59,0.45),rgba(12,74,110,0.45))]">
                S
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-foreground/80">
                  Research platform
                </span>
                <span className="block truncate text-sm font-bold text-foreground sm:text-base">
                  Story of a Stock
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-3 lg:gap-4">
              <div className="w-60 lg:w-72">
                <CompanySearch />
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
              <AuthButton initialUser={initialUser} compact />
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
            <CompanySearch className="w-full mb-1" onNavigate={() => setIsMenuOpen(false)} />
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
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-1">
              <AuthButton initialUser={initialUser} compact />
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
