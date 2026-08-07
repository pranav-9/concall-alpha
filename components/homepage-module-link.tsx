"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { analytics } from "@/lib/analytics";

/**
 * A next/link that fires homepage_module_click. Lets server-rendered homepage
 * modules (score plate, trail wall) emit the click event without becoming client
 * components themselves — they render this thin client wrapper in place of Link.
 */
export function HomepageModuleLink({
  module,
  companyCode,
  href,
  className,
  title,
  children,
}: {
  module: string;
  companyCode?: string;
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
      onClick={() => analytics.homepageModuleClick(module, companyCode)}
    >
      {children}
    </Link>
  );
}
