"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "changelog-last-seen";

type Props = {
  latestKey: string;
};

export function ChangelogNewIndicator({ latestKey }: Props) {
  const [showDot, setShowDot] = useState(false);

  useEffect(() => {
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (seen === null) {
      window.localStorage.setItem(STORAGE_KEY, latestKey);
      return;
    }
    if (seen !== latestKey) {
      setShowDot(true);
    }
  }, [latestKey]);

  if (!showDot) return null;

  return (
    <span
      aria-label="New capability shipped"
      title="New capability available"
      className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-300"
    />
  );
}
