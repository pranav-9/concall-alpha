"use client";

import { useEffect } from "react";

const STORAGE_KEY = "changelog-last-seen";

type Props = {
  latestKey: string;
};

export function ChangelogMarkSeen({ latestKey }: Props) {
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, latestKey);
  }, [latestKey]);

  return null;
}
