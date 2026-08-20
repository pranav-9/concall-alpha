"use client";

// A sticky "Open the Desk" pill pinned to the lower edge of the viewport. It
// stays hidden at the very top (where the hero already shows its own CTA) and
// slides up once the reader scrolls past the hero, so the primary path into the
// working surface is always one tap away. Respects the safe-area inset and
// prefers-reduced-motion.

import Link from "next/link";
import { useEffect, useState } from "react";

export function DeskStickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Reveal once the reader has scrolled past roughly the hero's own CTA.
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transition-all duration-300 motion-reduce:transition-none ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <Link
        href="/desk"
        tabIndex={show ? 0 : -1}
        className="house-data pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--paper-2)] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/5 transition-transform hover:-translate-y-0.5"
      >
        Open the Desk →
      </Link>
    </div>
  );
}

export default DeskStickyCta;
