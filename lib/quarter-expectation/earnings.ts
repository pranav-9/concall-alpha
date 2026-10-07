import type { ReportingQuarter } from "@/lib/current-quarter";
import type { GuidanceFamily, NormalizedGuidanceItem } from "@/lib/guidance-tracking/types";
import {
  buildGuidanceVerdict,
  horizonDeadlineFy,
  horizonQuarterIndex,
  isSegmentScoped,
  isStandingHorizon,
} from "@/lib/guidance-tracking/verdict";

import type { ExpectedEarnings, ExpectedEarningsLine } from "./types";

// The earnings column: what the issuer has guided for the period the call
// reports on, one line per family (growth / margin / yield), attributed to the
// Guidance tab. A guide dated the target quarter itself outranks a
// full-year one; a whole-company guide outranks a segment's. Nothing is
// computed from it — guides are for the year, and how the quarter phases is
// the reader's call. Rupee figures (guide × the year-ago quarter) need a
// quarterly-financials substrate that does not exist yet; this stays text.

const FAMILY_FALLBACK_LABEL: Record<GuidanceFamily, string> = {
  growth: "Growth",
  margin: "Margin",
  yield: "Yield",
};

const FAMILY_ORDER: GuidanceFamily[] = ["growth", "margin", "yield"];

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

type Candidate = { item: NormalizedGuidanceItem; guidedLabel: string | null };

export function buildExpectedEarnings(input: {
  target: ReportingQuarter;
  guidanceItems: NormalizedGuidanceItem[];
}): ExpectedEarnings | null {
  const { target } = input;
  if (input.guidanceItems.length === 0) return null;
  const targetIndex = target.fy * 4 + target.qtr;
  const verdict = buildGuidanceVerdict(input.guidanceItems, target);

  const dueNow: Candidate[] = verdict.resolved
    .filter(
      (r) =>
        r.outcome === "unclear" && !isStandingHorizon(r.item) && horizonQuarterIndex(r.item) === targetIndex,
    )
    .map((r) => ({ item: r.item, guidedLabel: r.guidedLabel }));
  const live: Candidate[] = verdict.live
    .filter((r) => !isStandingHorizon(r.item) && horizonDeadlineFy(r.item) === target.fy)
    .map((r) => ({ item: r.item, guidedLabel: r.guidedLabel }));
  const pool = [...dueNow, ...live];

  const lines: ExpectedEarningsLine[] = [];
  for (const family of FAMILY_ORDER) {
    const pick =
      pool.find((c) => c.item.guidanceFamily === family && !isSegmentScoped(c.item)) ??
      pool.find((c) => c.item.guidanceFamily === family);
    if (!pick) continue;
    const { item } = pick;
    lines.push({
      source: "guide",
      metricLabel: item.metricLabel ?? FAMILY_FALLBACK_LABEL[family],
      valueLabel: pick.guidedLabel ?? item.valueText ?? clip(item.guidanceText, 80),
      horizonLabel: item.horizonLabel,
      segment: isSegmentScoped(item) ? item.segment : null,
      sectionId: "guidance-history",
    });
  }
  return lines.length > 0 ? { lines } : null;
}
