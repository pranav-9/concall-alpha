"use client";

import { KpiSparkline, KpiSparklinePlaceholder } from "./kpi-sparkline-lazy";
import { BREAKPOINT_SM, useMinWidth } from "@/hooks/use-min-width";

type Point = { period: string; value: number | null };

/**
 * The Trend cell of the Key Variables history table. The column is hidden
 * below `sm` (its header is `hidden sm:table-cell`), but a CSS-hidden cell
 * would still mount the recharts sparkline — one ResponsiveContainer per KPI
 * row, downloading the recharts chunk on a phone for an invisible column. So
 * the sparkline only mounts once the viewport is known to be `sm` or wider.
 * Until then (server render, first paint) the cell shows the same fixed-size
 * placeholder the lazy sparkline uses, so the desktop column keeps its width.
 */
export function KpiHistoryTrendCell({
  points,
  ariaLabel,
}: {
  points: Point[];
  ariaLabel: string;
}) {
  const isSmUp = useMinWidth(BREAKPOINT_SM);
  return (
    <td className="hidden px-3 py-2 sm:table-cell">
      {isSmUp ? (
        <KpiSparkline ariaLabel={ariaLabel} points={points} />
      ) : (
        <KpiSparklinePlaceholder />
      )}
    </td>
  );
}
