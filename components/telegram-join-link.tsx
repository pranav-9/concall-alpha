"use client";

import type { ComponentPropsWithRef, MouseEvent, ReactNode } from "react";

import { analytics, type CommunitySurface } from "@/lib/analytics";

/**
 * The outbound Telegram join link. Client-side only so the click can be counted
 * (`community_join_click`, broken down by `surface`) before the tab opens. The
 * caller decides whether to render it at all — pass the URL from
 * `getTelegramJoinUrl()`; when that is null, render nothing. Opens in a new
 * tab, and says so to screen readers once here for every surface.
 *
 * Other anchor props (and `ref`) pass through, so it can sit under a Radix
 * `asChild` — the desktop navbar's "Other" menu item — which needs both.
 */
export function TelegramJoinLink({
  href,
  surface,
  className,
  children,
  onClick,
  ...rest
}: Omit<ComponentPropsWithRef<"a">, "href" | "target" | "rel" | "onClick"> & {
  href: string;
  surface: CommunitySurface;
  className?: string;
  children: ReactNode;
  /** Runs after the click is counted — e.g. the nudge retiring itself. */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={(event) => {
        analytics.communityJoinClick(surface);
        onClick?.(event);
      }}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
