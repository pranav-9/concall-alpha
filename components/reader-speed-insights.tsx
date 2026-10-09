"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";

import { isInternalPath } from "@/lib/speed-insights-filter";

/**
 * Speed Insights for reader pages only: samples from the admin panel and the
 * dev previews are dropped before they are sent (lib/speed-insights-filter.ts).
 * A client component because `beforeSend` is a function, which the server
 * layout cannot pass across the boundary.
 */
export function ReaderSpeedInsights() {
  return <SpeedInsights beforeSend={(event) => (isInternalPath(event.url) ? null : event)} />;
}
