"use client";

import { useEffect } from "react";

const COOKIE = "journal_seen";
// Persist for a year so the "new" dot stays hidden until the next post lands.
const ONE_YEAR_S = 365 * 24 * 60 * 60;

type Props = {
  latestKey: string;
};

// Rendered on the Journal index page: records that the reader has seen the
// latest post, which clears the navbar "new" dot on the next render.
export function JournalMarkSeen({ latestKey }: Props) {
  useEffect(() => {
    if (!latestKey) return;
    document.cookie = `${COOKIE}=${encodeURIComponent(
      latestKey,
    )}; path=/; max-age=${ONE_YEAR_S}; SameSite=Lax`;
  }, [latestKey]);

  return null;
}
