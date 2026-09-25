"use client";

import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";
import { GATE_CUT_ATTRIBUTE } from "@/lib/signup-gate";

/**
 * Journal post engagement. Fires journal_post_view once on mount, then
 * journal_read_complete once when the reader scrolls past ~90% of the document —
 * the believer-cohort signal. Renders nothing.
 *
 * While the sign-up gate clips the post (its cut marker is inert), 90% of the
 * document is the gate card and the footer, not the post — so the event is
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

    const onScroll = () => {
      if (completed.current) return;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = (window.scrollY / scrollable) * 100;
      if (pct >= 90) {
        completed.current = true;
        const gated = document.querySelector(`[${GATE_CUT_ATTRIBUTE}][inert]`) !== null;
        analytics.journalReadComplete(slug, pct, gated);
        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // short posts may already be fully visible
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  return null;
}
