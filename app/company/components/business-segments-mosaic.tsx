import type { NormalizedRevenueBreakdownItem } from "@/lib/business-snapshot/types";
import { BusinessSegmentMixDonutChart } from "./business-segment-mix-donut-chart-lazy";
import { colorPalette, maxSlices } from "./business-segment-mix-constants";
import { elevatedBlockClass } from "./surface-tokens";

type BusinessSegmentsMosaicProps = {
  segments: NormalizedRevenueBreakdownItem[];
};

const pctFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const formatPctLabel = (value: number) => `${pctFormatter.format(value)}%`;

const sortRevenueEntries = (entries: NormalizedRevenueBreakdownItem[]) =>
  [...entries].sort((a, b) => {
    if (a.revenueSharePercent == null && b.revenueSharePercent == null) return 0;
    if (a.revenueSharePercent == null) return 1;
    if (b.revenueSharePercent == null) return -1;
    return b.revenueSharePercent - a.revenueSharePercent;
  });

export function BusinessSegmentsMosaic({ segments }: BusinessSegmentsMosaicProps) {
  if (segments.length === 0) return null;

  const sortedSegments = sortRevenueEntries(segments);
  const visibleLimit = 4;
  const visibleEntries = sortedSegments.slice(0, visibleLimit);
  const extraEntries = sortedSegments.slice(visibleLimit);
  const shareBearingSegments = sortedSegments.filter(
    (segment) => typeof segment.revenueSharePercent === "number" && segment.revenueSharePercent > 0,
  );
  const hasSegmentMixDonut = shareBearingSegments.length >= 2;

  const segmentColorMap: Record<string, string> = Object.fromEntries(
    shareBearingSegments
      .slice(0, maxSlices)
      .map((seg, i) => [seg.name, colorPalette[i % colorPalette.length]]),
  );

  const renderRevenueEntry = (
    entry: NormalizedRevenueBreakdownItem,
    idx: number,
    variant: "visible" | "extra",
  ) => {
    const isVisible = variant === "visible";
    const accentColor = segmentColorMap[entry.name];

    return (
      <div
        key={`${entry.name}-${variant}-${idx}`}
        className={`rounded-xl border border-border/20 bg-background/25 ${
          isVisible ? "h-full p-3" : "p-2"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {accentColor && (
                <span
                  style={{
                    display: "inline-block",
                    width: isVisible ? "8px" : "6px",
                    height: isVisible ? "8px" : "6px",
                    borderRadius: "50%",
                    backgroundColor: accentColor,
                    flexShrink: 0,
                  }}
                />
              )}
              <p
                className={`${
                  isVisible ? "text-[13px]" : "text-[11px]"
                } font-medium leading-snug text-foreground`}
              >
                {entry.name}
              </p>
            </div>
            {entry.description && (
              <p
                className={`${
                  isVisible ? "text-[12px]" : "text-[11px]"
                } leading-relaxed text-muted-foreground`}
              >
                {entry.description}
              </p>
            )}
          </div>
          {entry.revenueSharePercent != null && (
            <span className="shrink-0 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground">
              {formatPctLabel(entry.revenueSharePercent)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const cardsSurface = (
    <div
      className={`min-w-0 rounded-xl border border-border/20 bg-background/25 p-3 ${
        hasSegmentMixDonut ? "lg:col-span-2" : ""
      }`}
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visibleEntries.map((entry, idx) => renderRevenueEntry(entry, idx, "visible"))}
      </div>
      {extraEntries.length > 0 && (
        <details className="mt-3">
          <summary className="list-none cursor-pointer">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-muted/60">
              <span>Show more</span>
              <span className="text-muted-foreground">({extraEntries.length})</span>
            </div>
          </summary>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {extraEntries.map((entry, idx) => renderRevenueEntry(entry, idx, "extra"))}
          </div>
        </details>
      )}
    </div>
  );

  return (
    <div className={`${elevatedBlockClass} p-4`}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
          Business Segments
        </p>
      </div>

      {hasSegmentMixDonut ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(18rem,0.95fr)] lg:items-stretch">
          {cardsSurface}
          <BusinessSegmentMixDonutChart
            segments={segments}
            className="lg:col-start-3 lg:row-start-1 lg:h-full"
          />
        </div>
      ) : (
        cardsSurface
      )}
    </div>
  );
}
