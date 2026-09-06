import type { NormalizedRevenueBreakdownItem } from "@/lib/business-snapshot/types";
import { BusinessSegmentMixBar } from "./business-segment-mix-bar";
import { colorPalette, maxSlices } from "./business-segment-mix-constants";
import { elevatedBlockClass } from "./surface-tokens";

type BusinessSegmentsMosaicProps = {
  segments: NormalizedRevenueBreakdownItem[];
};

const pctFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
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
        className={`flex h-full flex-col rounded-xl border border-border/20 bg-background/25 ${
          isVisible ? "p-2.5 sm:p-3.5" : "p-2.5"
        }`}
      >
        {/* Label row: colour dot + uppercase segment name. On a phone the share
            sits on this same line (see below), so a four-segment mix is four
            short cards rather than four ~150px ones. */}
        <div className="flex items-start gap-1.5">
          {accentColor && (
            <span
              style={{
                display: "inline-block",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: accentColor,
                flexShrink: 0,
                marginTop: "4px",
              }}
            />
          )}
          <p className="min-w-0 flex-1 break-words text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
            {entry.name}
          </p>
          {entry.revenueSharePercent != null && (
            <p className="shrink-0 text-lg font-semibold leading-none tracking-tight text-foreground sm:hidden">
              {formatPctLabel(entry.revenueSharePercent)}
            </p>
          )}
        </div>

        {/* Hero share number (sm and up). */}
        {entry.revenueSharePercent != null && (
          <p
            className={`${
              isVisible ? "text-2xl sm:text-[26px]" : "text-xl"
            } mt-1.5 hidden font-semibold leading-none tracking-tight text-foreground sm:block`}
          >
            {formatPctLabel(entry.revenueSharePercent)}
          </p>
        )}

        {entry.description && (
          <p
            className={`${
              entry.revenueSharePercent != null ? "mt-1.5 sm:mt-2" : "mt-1.5"
            } text-[11px] leading-relaxed text-muted-foreground`}
          >
            {entry.description}
          </p>
        )}
      </div>
    );
  };

  const cardsSurface = (
    <div className="min-w-0 sm:rounded-xl sm:border sm:border-border/20 sm:bg-background/25 sm:p-3">
      <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:gap-2.5">
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
          <div className="mt-2 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:gap-2.5">
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
        <div className="mt-3 space-y-3">
          <BusinessSegmentMixBar segments={segments} />
          {cardsSurface}
        </div>
      ) : (
        <div className="mt-3">{cardsSurface}</div>
      )}
    </div>
  );
}
