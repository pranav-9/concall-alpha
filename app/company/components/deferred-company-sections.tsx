"use client";

import dynamic from "next/dynamic";
import type { ChartDataPoint, QuarterData } from "../types";
import type { WatchSwingVar } from "@/lib/next-quarter-watch/types";
import type { NormalizedHistoricalEconomics } from "@/lib/business-snapshot/types";
import type { GuidanceHistorySectionProps } from "./guidance-history-section";
import {
  HELD_SECTION_IDS,
  createChunkRegistry,
  schedulePreload,
  type ChunkLoader,
  type PreloadedSectionId,
} from "@/lib/lazy-sections";
import { cn } from "@/lib/utils";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import { SectionSkeleton } from "./section-skeleton";

// These sections are client-only chunks that are NOT in the initial bundle: the
// workspace mounts one panel at a time, so a chunk downloads the first time its
// tab is tapped. The placeholder below is what stands in the panel while that
// happens. It used to be a one-line "Loading…" card: on a phone the footer
// jumped up into the viewport, then the real section landed ~0.5–1s later
// (outside the 500ms hadRecentInput exclusion) and pushed it back down — a
// 0.5+ CLS on every Quarterly / Guidance tap, the whole field CLS story on
// mobile (Speed Insights 0.47, PostHog p75 0.45–0.64, 2026-09-05).
//
// Two layers now keep that from happening (see lib/lazy-sections.ts):
//   1. the workspace holds the panel swap until `ensureSectionChunk` resolves
//      (bounded), so the placeholder is only ever seen on a stalled network;
//   2. when it is seen, it fills the viewport so nothing below the panel is
//      on screen to move when the real section lands. `min-h-screen` (100vh)
//      on purpose: it overshoots `svh` slightly on phones, which is safe here,
//      and it holds on browsers without `svh`.
type SectionPlaceholderProps = {
  label: string;
  /** Fill the viewport (full-panel sections) or hold a fixed block (embedded). */
  size?: "panel" | "block";
};

const SectionPlaceholder = ({ label, size = "panel" }: SectionPlaceholderProps) => (
  <div
    role="status"
    className={cn(
      size === "panel"
        ? [elevatedBlockClass, "min-h-screen p-4 sm:p-5"]
        : [nestedDetailClass, "min-h-[320px] p-4"],
    )}
  >
    <SectionSkeleton blocks={size === "panel" ? "tall" : "short"} />
    <span className="sr-only">{label}</span>
  </div>
);

const loadConcallScoreSection = () =>
  import("./concall-score-section").then((mod) => mod.ConcallScoreSection);
const loadHistoricalEconomicsDataPack = () =>
  import("./historical-economics-data-pack").then((mod) => mod.HistoricalEconomicsDataPack);
const loadGuidanceHistorySection = () =>
  import("./guidance-history-section").then((mod) => mod.GuidanceHistorySection);
// Same module kpi-sparkline-lazy.tsx imports, so the bundler resolves it to the
// same chunk (it carries recharts, shared with the ConcallScore chart).
const loadKpiSparkline = () => import("./kpi-sparkline").then((mod) => mod.KpiSparkline);

// Section id (see ../constants SECTION_MAP, pinned by tests/deferred-sections)
// → chunks that must be present before that panel renders without a
// placeholder. Only HELD_SECTION_IDS delay the swap; the rest are warmed so a
// later tap finds recharts cached.
const registry = createChunkRegistry(
  {
    "sentiment-score": [loadConcallScoreSection],
    "guidance-history": [loadGuidanceHistorySection],
    "business-overview": [loadHistoricalEconomicsDataPack, loadKpiSparkline],
    "key-variables": [loadKpiSparkline],
  } satisfies Record<PreloadedSectionId, readonly ChunkLoader[]>,
  { hold: HELD_SECTION_IDS },
);

/** Resolves once every lazy chunk for the section is loaded (unknown ids: at once). */
export const ensureSectionChunk = registry.ensure;

/** Whether a swap to this section should wait on `ensureSectionChunk`. */
export const hasLazyChunk = registry.has;

/**
 * Warm every lazy chunk once the document has finished streaming and the page
 * is idle, so a tab tap usually finds the chunk cached and the swap is
 * immediate. Skipped on Save-Data / 2G. Returns a cancel for unmount.
 * Best-effort: failures are swallowed and the real import on mount retries.
 */
export function preloadDeferredCompanySections() {
  return schedulePreload(registry.warmAll);
}

export const ConcallScoreSection = dynamic<{
  chartData: ChartDataPoint[];
  detailQuarters: QuarterData[];
  growthScore?: number | null;
  swingVars?: WatchSwingVar[];
}>(loadConcallScoreSection, {
  ssr: false,
  loading: () => <SectionPlaceholder label="Loading ConcallScore..." />,
});

export const HistoricalEconomicsDataPack = dynamic<{
  history: NormalizedHistoricalEconomics;
}>(loadHistoricalEconomicsDataPack, {
  ssr: false,
  loading: () => <SectionPlaceholder label="Loading business momentum..." size="block" />,
});

export const GuidanceHistorySection = dynamic<GuidanceHistorySectionProps>(
  loadGuidanceHistorySection,
  {
    ssr: false,
    loading: () => <SectionPlaceholder label="Loading guidance history..." />,
  },
);

export const CompanyCommentsSection = dynamic<{ companyCode: string }>(
  () => import("@/components/company/company-comments-section").then((mod) => mod.CompanyCommentsSection),
  {
    ssr: false,
    loading: () => <SectionPlaceholder label="Loading community comments..." size="block" />,
  },
);
