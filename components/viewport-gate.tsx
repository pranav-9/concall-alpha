"use client";

import type { ReactNode } from "react";

import { BREAKPOINT_SM, useMinWidth } from "@/hooks/use-min-width";
import { cn } from "@/lib/utils";

/**
 * Two-layout gates for a page that renders a phone presentation and a desktop
 * presentation of the same server-fetched data. Both subtrees are server-rendered
 * (CSS-toggled at `sm`, so SSR markup and hydration agree); once matchMedia has
 * answered, the hidden one is unmounted — the same discipline as the leaderboard
 * boards (hooks/use-min-width). Server components can pass their markup as
 * children, so a section fetches once and paints twice.
 *
 * Trade-offs, both deliberate: the server HTML carries both paints (no CLS, one
 * fetch), and a later crossing of `sm` (tablet rotation, window resize)
 * re-mounts the other paint from scratch — so state a reader can change
 * (filters, show-all toggles) belongs in the shared parent, never in a paint.
 */
export function BelowSm({ children, className }: { children: ReactNode; className?: string }) {
  const isSm = useMinWidth(BREAKPOINT_SM);
  if (isSm === true) return null;
  return <div className={cn("sm:hidden", className)}>{children}</div>;
}

export function FromSm({ children, className }: { children: ReactNode; className?: string }) {
  const isSm = useMinWidth(BREAKPOINT_SM);
  if (isSm === false) return null;
  return <div className={cn("hidden sm:block", className)}>{children}</div>;
}
