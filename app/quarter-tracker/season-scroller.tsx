"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The season chart's horizontal scroller. On a phone the chart is wider than
 * the screen, and a reader opening it mid-season should land on today, not on
 * 1 October — so once the scroller has a width, if the chart overflows, scroll
 * today's column into the middle. The chart lives in a closed <dialog>, so it
 * has no width at mount: a ResizeObserver waits for the first open. Server
 * markup is untouched; this only moves scrollLeft.
 */
export function SeasonScroller({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const centre = () => {
      if (done || el.clientWidth === 0) return;
      done = true;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const today = el.querySelector<HTMLElement>("[data-today]");
      if (today) el.scrollLeft = Math.max(0, today.offsetLeft - el.clientWidth / 2);
    };
    centre();
    if (done || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(centre);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
