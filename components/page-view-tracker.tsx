"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function getCompanyCode(pathname: string): string | null {
  const match = pathname.match(/^\/company\/([^/]+)$/);
  if (!match?.[1]) return null;
  return decodeURIComponent(match[1]).toUpperCase();
}

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return;

    const search = searchParams.toString();
    const path = search ? `${pathname}?${search}` : pathname;
    const key = `pv:${path}`;
    const now = Date.now();

    try {
      const lastSent = window.sessionStorage.getItem(key);
      if (lastSent) {
        const elapsed = now - Number(lastSent);
        if (!Number.isNaN(elapsed) && elapsed < 1500) return;
      }
      window.sessionStorage.setItem(key, String(now));
    } catch {
      // Ignore storage issues.
    }

    void fetch("/api/track/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path,
        companyCode: getCompanyCode(pathname),
      }),
      keepalive: true,
    }).catch(() => {
      // Tracking is non-critical.
    });
  }, [pathname, searchParams]);

  return null;
}
