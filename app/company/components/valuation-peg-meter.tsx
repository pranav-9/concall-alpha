// PEG meter — "price paid for growth" on a four-band track: cheap / fair / rich / expensive.
//
// PEG is DISPLAY-ONLY context and never an input to the valuation score (see
// lib/valuation-check/types.ts). The bands are the textbook PEG cuts (1.0 / 1.5 / 2.0). The track
// domain is fixed at 0–2.5 so the four zones read at the same width for every company; a ratio past
// 2.5 pins the marker at the right edge (still labelled with its true value elsewhere).
//
// Server-rendered — pure CSS, no client JS. Palette follows the local viz convention (the sibling
// horizon/spectrum/boxplot components use raw tone utilities for their marks).

import { cn } from "@/lib/utils";

export type PegBandKey = "cheap" | "fair" | "rich" | "expensive";

type PegBandDef = {
  key: PegBandKey;
  label: string;
  /** faint track segment fill */
  segClass: string;
  /** solid marker + emphasised text */
  markClass: string;
  textClass: string;
};

const PEG_BANDS: Record<PegBandKey, PegBandDef> = {
  cheap: {
    key: "cheap",
    label: "Cheap",
    segClass: "bg-emerald-400/25 dark:bg-emerald-500/20",
    markClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-300",
  },
  fair: {
    key: "fair",
    label: "Fair",
    segClass: "bg-muted-foreground/15",
    markClass: "bg-muted-foreground",
    textClass: "text-foreground",
  },
  rich: {
    key: "rich",
    label: "Rich",
    segClass: "bg-amber-400/25 dark:bg-amber-500/20",
    markClass: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-300",
  },
  expensive: {
    key: "expensive",
    label: "Expensive",
    segClass: "bg-red-500/25 dark:bg-red-500/20",
    markClass: "bg-red-500",
    textClass: "text-red-700 dark:text-red-300",
  },
};

const DOMAIN_MAX = 2.5;
// Cuts at 1.0 / 1.5 / 2.0 → segment widths as a share of the 0–2.5 track.
const SEGMENTS: { key: PegBandKey; widthPct: number }[] = [
  { key: "cheap", widthPct: (1.0 / DOMAIN_MAX) * 100 },
  { key: "fair", widthPct: (0.5 / DOMAIN_MAX) * 100 },
  { key: "rich", widthPct: (0.5 / DOMAIN_MAX) * 100 },
  { key: "expensive", widthPct: (0.5 / DOMAIN_MAX) * 100 },
];

export function pegBandFor(ratio: number): PegBandDef {
  if (ratio < 1.0) return PEG_BANDS.cheap;
  if (ratio < 1.5) return PEG_BANDS.fair;
  if (ratio < 2.0) return PEG_BANDS.rich;
  return PEG_BANDS.expensive;
}

/** The four-band track with a marker at `ratio`. Legend is rendered separately, once. */
export function PegMeter({ ratio }: { ratio: number }) {
  const band = pegBandFor(ratio);
  const markerPct = Math.max(0, Math.min(100, (ratio / DOMAIN_MAX) * 100));
  return (
    <div
      className="relative"
      role="img"
      aria-label={`PEG ${ratio.toFixed(2)} — ${band.label.toLowerCase()}.`}
    >
      <div className="flex h-2 overflow-hidden rounded-full">
        {SEGMENTS.map((seg) => (
          <div
            key={seg.key}
            className={PEG_BANDS[seg.key].segClass}
            style={{ width: `${seg.widthPct}%` }}
          />
        ))}
      </div>
      <span
        className={cn(
          "absolute top-1/2 h-3.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background",
          band.markClass,
        )}
        style={{ left: `${markerPct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

/** Shared legend for the PEG meters — the four cuts, once per PEG block. */
export function PegMeterLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      {(
        [
          ["cheap", "< 1.0"],
          ["fair", "1.0–1.5"],
          ["rich", "1.5–2.0"],
          ["expensive", "> 2.0"],
        ] as const
      ).map(([key, range]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", PEG_BANDS[key as PegBandKey].markClass)} />
          {PEG_BANDS[key as PegBandKey].label.toLowerCase()} {range}
        </span>
      ))}
    </div>
  );
}
