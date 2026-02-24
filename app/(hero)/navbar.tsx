"use client";

import { useState } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { RequestIntakeButton } from "@/components/request-intake-button";
import { CompanySearch } from "@/components/company-search";
import { cn, hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems = [
    { href: "/leaderboards", label: "Leaderboards" },
    { href: "/how-scores-work", label: "How Scores Work" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="sticky top-0 z-50 flex justify-center border-b border-border bg-background/90 backdrop-blur">
      <div className="relative w-full max-w-5xl">
        <div className="h-14 sm:h-16 flex justify-between items-center px-3 sm:px-5 text-sm">
          <div className="min-w-0">
            <Link href="/" className="truncate font-bold text-sm sm:text-base text-foreground">
              Story of a Stock
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-5">
              <CompanySearch className="w-56 lg:w-64" />
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "text-xs font-medium transition-colors whitespace-nowrap",
                    isActive(item.href)
                      ? "text-foreground underline underline-offset-4"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <RequestIntakeButton
                triggerLabel="Submit Request"
                triggerVariant="ghost"
                triggerClassName="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
              />
            </div>

            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-ring"
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
          <div className="md:hidden absolute top-full left-0 right-0 border-t border-border border-b border-border bg-background/95 backdrop-blur px-3 py-3 space-y-2">
            <CompanySearch className="w-full mb-1" onNavigate={() => setIsMenuOpen(false)} />
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "flex w-full items-center px-1 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "text-foreground underline underline-offset-4"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <RequestIntakeButton
              triggerLabel="Submit Request"
              triggerVariant="ghost"
              triggerClassName="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
            />
            {!hasEnvVars ? (
              <div className="pt-1">
                <EnvVarWarning />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
