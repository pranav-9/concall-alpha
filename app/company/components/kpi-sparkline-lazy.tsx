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

export const KpiSparkline = dynamic<KpiSparklineProps>(
  () => import("./kpi-sparkline").then((mod) => mod.KpiSparkline),
  {
    ssr: false,
    loading: () => <div className="h-7 w-20 rounded-sm bg-muted/40" />,
  },
);
