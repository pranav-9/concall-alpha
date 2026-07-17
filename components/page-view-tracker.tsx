"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { parseUtmParams, type UtmParams } from "@/lib/attribution";

function getCompanyCode(pathname: string): string | null {
  const match = pathname.match(/^\/company\/([^/]+)$/);
  if (!match?.[1]) return null;
  return decodeURIComponent(match[1]).toUpperCase();
}

type FirstTouch = { referrer: string | null } & UtmParams;

const FIRST_TOUCH_KEY = "pv:first-touch";

// document.referrer and utm_* params only exist on the landing URL; capture
// them once per tab-session and replay on every event so any range-windowed
// query sees attribution without session reconstruction.
function readFirstTouch(): FirstTouch {
  const fresh: FirstTouch = {
    referrer: document.referrer || null,
    ...parseUtmParams(window.location.search),
  };

  try {
    const stored = window.sessionStorage.getItem(FIRST_TOUCH_KEY);
    if (stored) return JSON.parse(stored) as FirstTouch;
    window.sessionStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(fresh));
  } catch {
    // Storage unavailable: fall back to the freshly computed value, which is
    // correct on the landing page and degrades to nulls after navigation.
  }
  return fresh;
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
        ...readFirstTouch(),
      }),
      keepalive: true,
    }).catch(() => {
      // Tracking is non-critical.
    });
  }, [pathname, searchParams]);

  return null;
}
