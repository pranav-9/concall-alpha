"use client";

import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

/**
 * Fire-once client beacon for "on view / on render" events. Server components
 * (pages, section panels) can't call the analytics helpers directly — they must
 * not pull posthog-js into the server bundle — so they render one of these tiny
 * client children instead. Renders nothing.
 */
type BeaconProps =
  | { event: "empty_section"; sectionId: string; companyCode: string; reason?: string }
  | { event: "stale_valuation"; companyCode: string; daysStale: number }
  | { event: "watchlist_view"; count: number }
  | { event: "how_scores_work_view"; tab?: string }
  | { event: "journal_post_view"; slug: string }
  | { event: "sector_view"; sector: string };

export function AnalyticsBeacon(props: BeaconProps) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    switch (props.event) {
      case "empty_section":
        analytics.emptySectionView(props.sectionId, props.companyCode, props.reason);
        break;
      case "stale_valuation":
        analytics.staleValuationWithheld(props.companyCode, props.daysStale);
        break;
      case "watchlist_view":
        analytics.watchlistView(props.count);
        break;
      case "how_scores_work_view":
        analytics.howScoresWorkView(props.tab);
        break;
      case "journal_post_view":
        analytics.journalPostView(props.slug);
        break;
      case "sector_view":
        analytics.sectorView(props.sector);
        break;
    }
    // props are stable for the lifetime of this mount; fire strictly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
