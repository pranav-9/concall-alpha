"use client";

import * as React from "react";

/**
 * Horizontal-scroll wrapper for dense period tables (e.g. the Key Variables
 * KPI history). Period columns run oldest -> newest, so the newest quarter is
 * rightmost and clips off-screen inside a narrow card on mobile. On mount (and
 * on resize) this opens the table scrolled to the far right so the latest
 * quarter is visible by default, and shows edge fades that reflect the actual
 * scroll position — a right fade when newer columns are hidden to the right.
 * Desktop, where the table fits, gets no fade and no scroll.
 */
export function ScrollToLatest({ children }: { children: React.ReactNode }) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = React.useState({ right: false });

  const syncEdges = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setEdges({ right: el.scrollLeft < maxScroll - 1 });
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Open scrolled to the newest (rightmost) column, then reflect that in the
    // edge fades.
    if (el.scrollWidth > el.clientWidth + 1) {
      el.scrollLeft = el.scrollWidth;
    }
    syncEdges();

    const observer = new ResizeObserver(syncEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncEdges]);

  return (
    <div className="relative">
      <div ref={scrollRef} onScroll={syncEdges} className="overflow-x-auto">
        {children}
      </div>
      {/* No left fade: the only consumer (Key Variables) pins its first column,
          which would sit on top of it. The pinned labels are the "more to the
          left" cue. */}
      {edges.right ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent"
        />
      ) : null}
    </div>
  );
}
