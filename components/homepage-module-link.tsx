"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { analytics, type AnalyticsSurface } from "@/lib/analytics";

/**
 * A next/link that fires homepage_module_click. Lets server-rendered homepage
 * modules (score plate, trail wall) emit the click event without becoming client
 * components themselves — they render this thin client wrapper in place of Link.
 *
 * `surface` defaults to "home" so existing homepage call sites stay unchanged;
 * off-homepage modules (e.g. the /desk Featured Reads cards) pass "desk" so the
 * shared event stays separable in breakdowns.
 */
export function HomepageModuleLink({
  module,
  companyCode,
  surface = "home",
  href,
  className,
  title,
  children,
}: {
  module: string;
  companyCode?: string;
  surface?: AnalyticsSurface;
  href: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      title={title}
      className={className}
      onClick={() => analytics.homepageModuleClick(module, companyCode, surface)}
    >
      {children}
    </Link>
  );
}
