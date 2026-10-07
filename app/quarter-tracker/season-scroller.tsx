"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The season chart's horizontal scroller. On a phone the chart is wider than
 * the screen, and a reader opening it mid-season should land on today, not on
 * 1 October — so once mounted, if the chart overflows, scroll today's column
 * into the middle. Server markup is untouched; this only moves scrollLeft.
 */
export function SeasonScroller({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth + 1) return;
    const today = el.querySelector<HTMLElement>("[data-today]");
    if (!today) return;
    el.scrollLeft = Math.max(0, today.offsetLeft - el.clientWidth / 2);
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
