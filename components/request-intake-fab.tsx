"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const enabledPaths = [/^\/$/, /^\/leaderboards(?:\/|$)/, /^\/company(?:\/|$)/];

export function RequestIntakeFab() {
  const pathname = usePathname();
  const show = enabledPaths.some((rx) => rx.test(pathname));
  if (!show) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6">
      <Link
        href="/requests"
        prefetch={false}
        className="inline-flex h-10 items-center rounded-full border border-border/40 bg-background/90 px-4 text-sm font-medium text-foreground shadow-[0_14px_28px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md transition-colors hover:bg-accent hover:text-foreground"
      >
        Submit Request
      </Link>
    </div>
  );
}
