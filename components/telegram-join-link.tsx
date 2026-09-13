"use client";

import type { ReactNode } from "react";

import { analytics, type CommunitySurface } from "@/lib/analytics";

/**
 * The outbound Telegram join link. Client-side only so the click can be counted
 * (`community_join_click`, broken down by `surface`) before the tab opens. The
 * caller decides whether to render it at all — pass the URL from
 * `getTelegramJoinUrl()`; when that is null, render nothing. Opens in a new
 * tab, and says so to screen readers once here for every surface.
 */
export function TelegramJoinLink({
  href,
  surface,
  className,
  children,
}: {
  href: string;
  surface: CommunitySurface;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={() => analytics.communityJoinClick(surface)}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
