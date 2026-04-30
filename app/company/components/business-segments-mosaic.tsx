import type { NormalizedRevenueBreakdownItem } from "@/lib/business-snapshot/types";
import { BusinessSegmentMixDonutChart } from "./business-segment-mix-donut-chart-lazy";
import { colorPalette, maxSlices } from "./business-segment-mix-constants";

type BadgeDisplay = {
  label: string;
  className: string;
};

type BusinessSegmentsMosaicProps = {
  segments: NormalizedRevenueBreakdownItem[];
};

const pctFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const formatPctLabel = (value: number) => `${pctFormatter.format(value)}%`;

const formatCompactLabel = (value: string) => value.replace(/_/g, " ").trim();

const getMarginProfileDisplay = (value: string | null): BadgeDisplay | null => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "higher":
      return {
        label: "Higher margin",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "medium":
      return {
        label: "Medium margin",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "lower":
      return {
        label: "Lower margin",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    case "unknown":
      return {
        label: "Margin unknown",
        className: "border-border/60 bg-muted/60 text-foreground",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getSegmentRoleDisplay = (value: string | null): BadgeDisplay | null => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "core_engine":
    case "core engine":
      return {
        label: "Core engine",
        className:
          "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
      };
    case "emerging":
      return {
        label: "Emerging",
        className:
          "border-violet-200/80 bg-violet-100 text-violet-800 dark:border-violet-700/40 dark:bg-violet-900/30 dark:text-violet-200",
      };
    case "supporting":
      return {
        label: "Supporting",
        className: "border-border/60 bg-muted/60 text-foreground",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getGrowthDirectionDisplay = (value: string | null): BadgeDisplay | null => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "accelerating":
    case "gaining_share":
    case "gaining share":
      return {
        label: "Accelerating",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "stable":
    case "steady":
      return {
        label: "Stable",
        className:
          "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
      };
    case "declining":
    case "losing_share":
    case "losing share":
      return {
        label: "Declining",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

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
    const marginProfileDisplay = getMarginProfileDisplay(entry.marginProfile);
    const roleDisplay = getSegmentRoleDisplay(entry.rolePill);
    const growthDirectionDisplay = getGrowthDirectionDisplay(entry.growthDirectionPill);
    const isVisible = variant === "visible";

    if (isVisible) {
      const accentColor = segmentColorMap[entry.name];
      return (
        <div
          key={`${entry.name}-${variant}-${idx}`}
          className={`h-full p-3 ${
            idx === 0
              ? "rounded-xl border border-sky-200/70 bg-sky-50/60 shadow-sm shadow-sky-950/5 dark:border-sky-700/30 dark:bg-sky-950/15"
              : "rounded-xl border border-border/20 bg-background/25"
          }`}
          style={accentColor ? { boxShadow: `inset 3px 0 0 ${accentColor}` } : undefined}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {accentColor && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: accentColor,
                      flexShrink: 0,
                    }}
                  />
                )}
                <p className="text-[13px] font-medium leading-snug text-foreground">
                  {entry.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {roleDisplay && (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${roleDisplay.className}`}
                  >
                    {roleDisplay.label}
                  </span>
                )}
                {growthDirectionDisplay && (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${growthDirectionDisplay.className}`}
                  >
                    {growthDirectionDisplay.label}
                  </span>
                )}
                {marginProfileDisplay && (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${marginProfileDisplay.className}`}
                  >
                    {marginProfileDisplay.label}
                  </span>
                )}
              </div>
              {entry.description && (
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  {entry.description}
                </p>
              )}
              {entry.marginProfileNote && (
                <p className="text-[11px] leading-relaxed text-muted-foreground/90">
                  {entry.marginProfileNote}
                </p>
              )}
            </div>
            {entry.revenueSharePercent != null && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                  idx === 0
                    ? "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200"
                    : "border-border/60 bg-muted/60 text-foreground"
                }`}
              >
                {formatPctLabel(entry.revenueSharePercent)}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        key={`${entry.name}-${variant}-${idx}`}
        className="rounded-xl border border-border/20 bg-background/25 p-2"
        style={segmentColorMap[entry.name] ? { boxShadow: `inset 3px 0 0 ${segmentColorMap[entry.name]}` } : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {segmentColorMap[entry.name] && (
                <span
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: segmentColorMap[entry.name],
                    flexShrink: 0,
                  }}
                />
              )}
              <p className="text-[11px] font-medium leading-snug text-foreground">
                {entry.name}
              </p>
              {roleDisplay && (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${roleDisplay.className}`}
                >
                  {roleDisplay.label}
                </span>
              )}
              {growthDirectionDisplay && (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${growthDirectionDisplay.className}`}
                >
                  {growthDirectionDisplay.label}
                </span>
              )}
              {marginProfileDisplay && (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${marginProfileDisplay.className}`}
                >
                  {marginProfileDisplay.label}
                </span>
              )}
            </div>
            {entry.description && (
              <p
                className={`${
                  isVisible ? (idx === 0 ? "text-[13px]" : "text-xs") : "text-[11px]"
                } leading-relaxed text-muted-foreground`}
              >
                {entry.description}
              </p>
            )}
            {entry.marginProfileNote && (
              <p
                className={`${
                  isVisible ? "text-[11px]" : "text-[10px]"
                } leading-relaxed text-muted-foreground/90`}
              >
                {entry.marginProfileNote}
              </p>
            )}
          </div>
          {entry.revenueSharePercent != null && (
            <span
              className={`shrink-0 ${
                isVisible
                  ? "rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground"
                  : "text-[10px] text-muted-foreground"
              }`}
            >
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
    <div className="rounded-xl border border-border/25 bg-gradient-to-br from-background/96 via-background/91 to-muted/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_14px_24px_-24px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:from-background/88 dark:via-background/82 dark:to-background/70">
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
