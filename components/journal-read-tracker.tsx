"use client";

import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

/**
 * Journal post engagement. Fires journal_post_view once on mount, then
 * journal_read_complete once when the reader scrolls past ~90% of the document —
 * the believer-cohort signal. Renders nothing.
 */
export function JournalReadTracker({ slug }: { slug: string }) {
  const viewed = useRef(false);
  const completed = useRef(false);

  useEffect(() => {
    if (!viewed.current) {
      viewed.current = true;
      analytics.journalPostView(slug);
    }

    const onScroll = () => {
      if (completed.current) return;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = (window.scrollY / scrollable) * 100;
      if (pct >= 90) {
        completed.current = true;
        analytics.journalReadComplete(slug, pct);
        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // short posts may already be fully visible
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  return null;
}
