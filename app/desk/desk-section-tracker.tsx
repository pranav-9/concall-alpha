"use client";

import * as React from "react";
import { analytics } from "@/lib/analytics";

// section_view + section_dwell for one /desk block. Unlike the company-page
// workspace (one panel at a time, keyed on tab taps), a desk block is a scroll
// target on a long page, so "engaged" = actually scrolled into view.
// An IntersectionObserver drives both signals:
//   • section_view fires once, the first time the block is meaningfully visible
//     (not on every page load — a reader who never scrolls down never saw it).
//   • section_dwell accumulates only while the block is in the viewport AND the
//     tab is foregrounded, flushing on scroll-away, tab-hide, and unmount. Time
//     spent scrolled past or on a hidden tab is not counted as reading time.
// Pass a section_id namespaced "desk_…" so it never collides with the
// company-page section ids that share these event names.
// Count it as "in view" once a third of the block is on screen — enough that it
// is actually being read, not just clipping the fold.
const VISIBLE_RATIO = 0.33;

export function DeskSectionTracker({ sectionId, children }: { sectionId: string; children: React.ReactNode }) {
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
      analytics.sectionDwell(sectionId, performance.now() - startedAt, undefined, path);
      startedAt = null;
    };

    // Active = block on screen and tab foregrounded. Resume restarts the clock so
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
          analytics.sectionView(sectionId);
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
  }, [sectionId]);

  return <div ref={ref}>{children}</div>;
}
