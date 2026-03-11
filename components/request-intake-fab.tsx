"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const enabledPaths = [/^\/$/, /^\/leaderboards(?:\/|$)/, /^\/company(?:\/|$)/];

export function RequestIntakeFab() {
  const pathname = usePathname();
  const show = enabledPaths.some((rx) => rx.test(pathname));
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        href="/requests"
        prefetch={false}
        className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
      >
        Submit Request
      </Link>
    </div>
  );
}
