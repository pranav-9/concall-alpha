"use client";

import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";
import { GATE_CUT_ATTRIBUTE } from "@/lib/signup-gate";

/**
 * Journal post engagement. Fires journal_post_view once on mount, then
 * journal_read_complete once when the reader scrolls past ~90% of the document —
 * the believer-cohort signal — and journal_dwell with the time spent reading.
 * Renders nothing.
 *
 * While the sign-up gate clips the post (its cut marker is inert), 90% of the
 * document is the gate card and the footer, not the post — so the events are
 * tagged `gated: true` and the cohort query can leave those readers out.
 */
export function JournalReadTracker({ slug }: { slug: string }) {
  const viewed = useRef(false);
  const completed = useRef(false);

  useEffect(() => {
    if (!viewed.current) {
      viewed.current = true;
      analytics.journalPostView(slug);
    }

    const isGated = () => document.querySelector(`[${GATE_CUT_ATTRIBUTE}][inert]`) !== null;

    const onScroll = () => {
      if (completed.current) return;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = (window.scrollY / scrollable) * 100;
      if (pct >= 90) {
        completed.current = true;
        analytics.journalReadComplete(slug, pct, isGated());
        window.removeEventListener("scroll", onScroll);
      }
    };

    // Reading time: the clock runs only while the tab is foregrounded. It flushes
    // when the tab is hidden — the last reliable moment before a tab-close, where
    // unmount cleanup may never run — and restarts on return, so time spent on a
    // hidden tab is not counted. The path is pinned now: on a "Next read" click
    // the URL has already moved on when the leave flush fires.
    const path = window.location.pathname + window.location.search;
    let startedAt: number | null =
      document.visibilityState === "visible" ? performance.now() : null;

    const flushDwell = () => {
      if (startedAt === null) return;
      analytics.journalDwell(slug, performance.now() - startedAt, isGated(), path);
      startedAt = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushDwell();
      } else if (startedAt === null) {
        startedAt = performance.now();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    onScroll(); // short posts may already be fully visible
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flushDwell();
    };
  }, [slug]);

  return null;
}
