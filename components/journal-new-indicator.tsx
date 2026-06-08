"use client";

import { useEffect, useState } from "react";

const COOKIE = "journal_seen";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

type Props = {
  // ISO date (yyyy-mm-dd) of the most recent Journal post.
  latestKey: string;
};

// Small blue "new" dot. Shows only when the latest post is within 7 days AND
// the reader hasn't opened the Journal since that post (cookie != latestKey).
export function JournalNewIndicator({ latestKey }: Props) {
  const [showDot, setShowDot] = useState(false);

  useEffect(() => {
    if (!latestKey) return;
    const isRecent = Date.now() - Date.parse(latestKey) <= SEVEN_DAYS_MS;
    if (!isRecent) return;
    if (readCookie(COOKIE) !== latestKey) {
      setShowDot(true);
    }
  }, [latestKey]);

  if (!showDot) return null;

  return (
    <span
      aria-label="New journal post"
      title="New journal post"
      className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400"
    />
  );
}
