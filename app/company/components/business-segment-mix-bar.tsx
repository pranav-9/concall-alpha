import { cn } from "@/lib/utils";
import type { NormalizedRevenueBreakdownItem } from "@/lib/business-snapshot/types";
import { colorPalette, maxSlices } from "./business-segment-mix-constants";
import { snapshotSubsectionClass } from "./surface-tokens";

type SegmentMixDatum = {
  name: string;
  value: number;
  color: string;
  isGrouped: boolean;
  groupedCount: number | null;
};

type BusinessSegmentMixBarProps = {
  segments: NormalizedRevenueBreakdownItem[];
  className?: string;
};

const pctFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

const formatPct = (value: number) => `${pctFormatter.format(value)}%`;

const buildChartData = (segments: NormalizedRevenueBreakdownItem[]) => {
  const sortedSegments = [...segments]
    .filter(
      (segment) =>
        typeof segment.revenueSharePercent === "number" && segment.revenueSharePercent > 0,
    )
    .sort((a, b) => (b.revenueSharePercent ?? 0) - (a.revenueSharePercent ?? 0));

  const visibleSegments = sortedSegments.slice(0, maxSlices);
  const groupedSegments = sortedSegments.slice(maxSlices);

  const chartData: SegmentMixDatum[] = visibleSegments.map((segment, index) => ({
    name: segment.name,
    value: segment.revenueSharePercent ?? 0,
    color: colorPalette[index % colorPalette.length],
    isGrouped: false,
    groupedCount: null,
  }));

  const groupedValue = groupedSegments.reduce(
    (total, segment) => total + (segment.revenueSharePercent ?? 0),
    0,
  );

  if (groupedValue > 0) {
    chartData.push({
      name: "Others",
      value: groupedValue,
      color: "#94a3b8",
      isGrouped: true,
      groupedCount: groupedSegments.length,
    });
  }

  return {
    chartData,
    knownShareTotal: sortedSegments.reduce(
      (total, segment) => total + (segment.revenueSharePercent ?? 0),
      0,
    ),
  };
};

export function BusinessSegmentMixBar({
  segments,
  className,
}: BusinessSegmentMixBarProps) {
  const { chartData, knownShareTotal } = buildChartData(segments);

  if (chartData.length < 2) {
    return null;
  }

  // Widths are shares of 100, not of knownShareTotal — so the unfilled track at
  // the right edge IS the undisclosed remainder, shown rather than captioned.
  const undisclosed = Math.max(0, 100 - knownShareTotal);
  // Gate on the *displayed* value so a sub-0.05% rounding sliver does not read
  // as "undisclosed 0%" against a "Disclosed 100%" caption.
  const showUndisclosed = formatPct(undisclosed) !== formatPct(0);

  // The bar is the mix's only text equivalent now that the legend row is gone;
  // the cards below carry the visible per-segment names, shares, and detail.
  const ariaLabel = `Revenue mix: ${chartData
    .map((datum) => `${datum.name} ${formatPct(datum.value)}`)
    .join(", ")}${showUndisclosed ? `, undisclosed ${formatPct(undisclosed)}` : ""}.`;

  return (
    <div className={cn(snapshotSubsectionClass, "flex items-center gap-3 p-3", className)}>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex h-3 flex-1 overflow-hidden rounded-full bg-muted/40"
      >
        {chartData.map((datum, index) => (
          <div
            key={`${datum.name}-${index}`}
            className="h-full min-w-[2px]"
            style={{ width: `${datum.value}%`, backgroundColor: datum.color }}
          />
        ))}
      </div>
      <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Disclosed {formatPct(knownShareTotal)}
      </span>
    </div>
  );
}
