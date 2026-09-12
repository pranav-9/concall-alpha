"use client";

import * as React from "react";
import { analytics } from "@/lib/analytics";

// section_view + section_dwell for the /desk Featured Reads strip. Unlike the
// company-page workspace (one panel at a time, keyed on tab taps), this strip is
// a scroll target on a long page, so "engaged" = actually scrolled into view.
// An IntersectionObserver drives both signals:
//   • section_view fires once, the first time the strip is meaningfully visible
//     (not on every page load — a reader who never scrolls down never saw it).
//   • section_dwell accumulates only while the strip is in the viewport AND the
//     tab is foregrounded, flushing on scroll-away, tab-hide, and unmount. Time
//     spent scrolled past or on a hidden tab is not counted as reading time.
// section_id is namespaced "desk_featured_reads" so it never collides with the
// company-page section ids that share these event names.
const SECTION_ID = "desk_featured_reads";
// Count it as "in view" once a third of the strip is on screen — enough that the
// hero card is actually being read, not just clipping the fold.
const VISIBLE_RATIO = 0.33;

export function DeskFeaturedReadsTracker({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let viewed = false; // section_view is once-per-mount
    let startedAt: number | null = null; // dwell clock, null when paused
    let inViewport = false;
    // pathname + search so section_dwell's $current_url keeps the query string
    // (UTM/deep-link attribution), matching the $pageview for this load.
    const path = window.location.pathname + window.location.search;

    const flush = () => {
      if (startedAt === null) return;
      analytics.sectionDwell(SECTION_ID, performance.now() - startedAt, undefined, path);
      startedAt = null;
    };

    // Active = strip on screen and tab foregrounded. Resume restarts the clock so
    // time spent off-screen / on a hidden tab is excluded.
    const sync = () => {
      const active = inViewport && document.visibilityState === "visible";
      if (active && startedAt === null) {
        startedAt = performance.now();
      } else if (!active) {
        flush();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO;
        if (inViewport && !viewed) {
          viewed = true;
          analytics.sectionView(SECTION_ID);
        }
        sync();
      },
      { threshold: [0, VISIBLE_RATIO] },
    );
    observer.observe(el);

    const onVisibilityChange = () => sync();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flush();
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
