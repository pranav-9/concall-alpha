"use client";

import dynamic from "next/dynamic";

type KpiSparklinePoint = {
  period: string;
  value: number | null;
};

type KpiSparklineProps = {
  points: KpiSparklinePoint[];
  ariaLabel?: string;
};

/**
 * The 28×80 box every state of the sparkline occupies — this loading
 * placeholder, KpiHistoryTrendCell's pre-viewport placeholder, and the rendered
 * chart's own wrapper — so the swaps between them never shift layout.
 */
export function KpiSparklinePlaceholder() {
  return <div className="h-7 w-20 rounded-sm bg-muted/40" />;
}

export const KpiSparkline = dynamic<KpiSparklineProps>(
  () => import("./kpi-sparkline").then((mod) => mod.KpiSparkline),
  {
    ssr: false,
    loading: () => <KpiSparklinePlaceholder />,
  },
);
