"use client";

import dynamic from "next/dynamic";
import type { NormalizedRevenueBreakdownItem } from "@/lib/business-snapshot/types";

type BusinessSegmentMixDonutChartProps = {
  segments: NormalizedRevenueBreakdownItem[];
  className?: string;
};

export const BusinessSegmentMixDonutChart = dynamic<BusinessSegmentMixDonutChartProps>(
  () =>
    import("./business-segment-mix-donut-chart").then(
      (mod) => mod.BusinessSegmentMixDonutChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[16rem] items-center justify-center rounded-xl border border-border/20 bg-background/25 p-3 text-xs text-muted-foreground">
        Loading revenue mix...
      </div>
    ),
  },
);
