// The Growth tab's summary card (2026-09-18): a read of the whole page built
// from numbers the page already shows below it — the base case, its bear/bull
// range, the bridged earnings read, and the highest-priority catalyst. No
// prose is generated here and none is taken from the LLM's summary bullets,
// so the card can never drift from, or merely restate, the sections under it.

import { isGuidedMarginBasis } from "@/lib/growth-outlook/earnings-display";
import type {
  NormalizedGrowthCatalyst,
  NormalizedGrowthOutlook,
} from "@/lib/growth-outlook/types";

// Earnings growth is a separate number only when the pipeline bridged it
// through a quantified issuer margin target. A flat-margin fallback repeats
// the revenue figure; loss_making / implausible_margin_path are not
// trustworthy. The scenario cards apply this rule plus one more basis,
// derived_from_guidance (earnings-display.ts); this summary card stays
// revenue-only for it.
export const isEarningsBridged = (
  outlook: Pick<NormalizedGrowthOutlook, "earningsLadder"> | null | undefined,
): boolean => isGuidedMarginBasis(outlook?.earningsLadder?.basis);

// Highest weighted priority first; unranked catalysts keep their stored order
// at the tail. Returns a copy.
export const rankCatalysts = (catalysts: NormalizedGrowthCatalyst[]): NormalizedGrowthCatalyst[] =>
  [...catalysts].sort((a, b) => {
    const aPriority = a.priority?.weightedPriority;
    const bPriority = b.priority?.weightedPriority;
    if (aPriority == null && bPriority == null) return 0;
    if (aPriority == null) return 1;
    if (bPriority == null) return -1;
    return bPriority - aPriority;
  });

export type GrowthSummary = {
  revenueGrowth: string | null; // base case, e.g. "18-22%"
  bearGrowth: string | null;
  bullGrowth: string | null;
  horizonYears: number | null;
  earnings: {
    growth: string;
    metricLabel: string | null; // "EBITDA"
    marginAtHorizon: string | null;
  } | null;
  topCatalyst: NormalizedGrowthCatalyst | null;
};

const clean = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

// Null when there is nothing to summarise — the section then renders no
// summary card at all rather than an empty shell.
export const buildGrowthSummary = (outlook: NormalizedGrowthOutlook | null | undefined): GrowthSummary | null => {
  if (!outlook) return null;
  const base = outlook.scenarios?.base ?? null;
  const revenueGrowth = clean(base?.growth) ?? clean(outlook.baseGrowthPct);
  const earningsGrowth = isEarningsBridged(outlook) ? clean(base?.earningsGrowth) : null;
  const metric = clean(outlook.earningsLadder?.metric) ?? clean(outlook.marginPath?.metric);
  const topCatalyst = rankCatalysts(outlook.catalysts).find((c) => clean(c.catalyst)) ?? null;

  if (!revenueGrowth && !topCatalyst && typeof outlook.growthScore !== "number") return null;

  return {
    revenueGrowth,
    // The range only reads next to a base case; without one a lone bear or
    // bull number has nothing to be a range around.
    bearGrowth: revenueGrowth ? (clean(outlook.scenarios?.downside?.growth) ?? clean(outlook.downsideGrowthPct)) : null,
    bullGrowth: revenueGrowth ? (clean(outlook.scenarios?.upside?.growth) ?? clean(outlook.upsideGrowthPct)) : null,
    horizonYears: typeof outlook.horizonYears === "number" && outlook.horizonYears > 0 ? outlook.horizonYears : null,
    earnings:
      revenueGrowth && earningsGrowth
        ? {
            growth: earningsGrowth,
            metricLabel: metric ? metric.toUpperCase() : null,
            marginAtHorizon: clean(base?.marginAtHorizon),
          }
        : null,
    topCatalyst,
  };
};
