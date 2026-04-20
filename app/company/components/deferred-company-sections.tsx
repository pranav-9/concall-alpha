"use client";

import dynamic from "next/dynamic";
import type { ChartDataPoint, QuarterData } from "../types";
import type { NormalizedHistoricalEconomics } from "@/lib/business-snapshot/types";
import type { GuidanceHistorySectionProps } from "./guidance-history-section";

type TrendInfo = {
  direction: "improving" | "declining" | "stable";
  description: string;
};

type SectionPlaceholderProps = {
  label: string;
};

const SectionPlaceholder = ({ label }: SectionPlaceholderProps) => (
  <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
    {label}
  </div>
);

export const QuarterlyScoreSection = dynamic<{
  chartData: ChartDataPoint[];
  detailQuarters: QuarterData[];
  trend: TrendInfo;
}>(
  () => import("./quarterly-score-section").then((mod) => mod.QuarterlyScoreSection),
  {
    ssr: false,
    loading: () => <SectionPlaceholder label="Loading quarterly score..." />,
  },
);

export const HistoricalEconomicsDataPack = dynamic<{
  history: NormalizedHistoricalEconomics;
}>(
  () => import("./historical-economics-data-pack").then((mod) => mod.HistoricalEconomicsDataPack),
  {
    ssr: false,
    loading: () => <SectionPlaceholder label="Loading business momentum..." />,
  },
);

export const GuidanceHistorySection = dynamic<GuidanceHistorySectionProps>(
  () => import("./guidance-history-section").then((mod) => mod.GuidanceHistorySection),
  {
    ssr: false,
    loading: () => <SectionPlaceholder label="Loading guidance history..." />,
  },
);

export const CompanyCommentsSection = dynamic<{ companyCode: string }>(
  () => import("@/components/company/company-comments-section").then((mod) => mod.CompanyCommentsSection),
  {
    ssr: false,
    loading: () => <SectionPlaceholder label="Loading community comments..." />,
  },
);
