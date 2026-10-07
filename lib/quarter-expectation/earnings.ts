import { quarterLabelFor, type ReportingQuarter } from "@/lib/current-quarter";
import { readNumericValue } from "@/lib/guidance-tracking/format";
import type { GuidanceFamily, NormalizedGuidanceItem } from "@/lib/guidance-tracking/types";
import {
  buildGuidanceVerdict,
  horizonDeadlineFy,
  horizonQuarterIndex,
  isSegmentScoped,
  isStandingHorizon,
} from "@/lib/guidance-tracking/verdict";

import type {
  ExpectedEarnings,
  ExpectedEarningsLine,
  ImpliedQuarter,
  QuarterlyFinancialsRow,
  RunRate,
} from "./types";

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

const round1 = (n: number) => Math.round(n * 10) / 10;
const round0 = (n: number) => Math.round(n);

const quarterKey = (fy: number, qtr: number) => fy * 4 + qtr;

const findRow = (rows: QuarterlyFinancialsRow[], fy: number, qtr: number) =>
  rows.find((r) => r.fy === fy && r.qtr === qtr) ?? null;

export const RUN_RATE_QUARTERS = 4;
export const RUN_RATE_MIN_PAIRS = 2;

// Average YoY revenue growth and OPM over the last four reported quarters
// before the target. Needs each quarter's year-ago row; at least two pairs.
export function buildRunRate(rows: QuarterlyFinancialsRow[], target: ReportingQuarter): RunRate | null {
  const targetKey = quarterKey(target.fy, target.qtr);
  const prior = rows
    .filter((r) => quarterKey(r.fy, r.qtr) < targetKey)
    .sort((a, b) => quarterKey(a.fy, a.qtr) - quarterKey(b.fy, b.qtr))
    .slice(-RUN_RATE_QUARTERS);
  if (prior.length === 0) return null;
  const yoy: number[] = [];
  const opm: number[] = [];
  for (const r of prior) {
    const yearAgo = findRow(rows, r.fy - 1, r.qtr);
    if (r.revenue_cr != null && r.revenue_cr > 0 && yearAgo?.revenue_cr != null && yearAgo.revenue_cr > 0) {
      yoy.push((r.revenue_cr / yearAgo.revenue_cr - 1) * 100);
    }
    if (r.opm_pct != null) opm.push(r.opm_pct);
  }
  if (yoy.length < RUN_RATE_MIN_PAIRS) return null;
  const latest = prior[prior.length - 1];
  return {
    revenueYoyPct: round1(yoy.reduce((a, b) => a + b, 0) / yoy.length),
    yoyPairs: yoy.length,
    opmPct: opm.length > 0 ? round1(opm.reduce((a, b) => a + b, 0) / opm.length) : null,
    latestLabel: quarterLabelFor(latest.fy, latest.qtr),
  };
}

// The FY growth guide (whole company, revenue) applied to the year-ago quarter.
export function buildImpliedQuarter(
  rows: QuarterlyFinancialsRow[],
  target: ReportingQuarter,
  growth: NormalizedGuidanceItem | null,
  margin: NormalizedGuidanceItem | null,
): ImpliedQuarter | null {
  if (!growth || growth.metricSubtype !== "revenue" || isSegmentScoped(growth)) return null;
  const pct = readNumericValue(growth);
  if (!pct || pct.kind !== "percent") return null;
  const yearAgo = findRow(rows, target.fy - 1, target.qtr);
  if (!yearAgo || yearAgo.revenue_cr == null || yearAgo.revenue_cr <= 0) return null;
  const marginPct = margin && !isSegmentScoped(margin) && margin.metricSubtype === "ebitda_margin" ? readNumericValue(margin) : null;
  return {
    yearAgoLabel: quarterLabelFor(yearAgo.fy, yearAgo.qtr),
    yearAgoRevenueCr: yearAgo.revenue_cr,
    guidePctLo: pct.lo,
    guidePctHi: pct.hi,
    revenueLoCr: round0(yearAgo.revenue_cr * (1 + pct.lo / 100)),
    revenueHiCr: round0(yearAgo.revenue_cr * (1 + pct.hi / 100)),
    opmLo: marginPct?.kind === "percent" ? marginPct.lo : null,
    opmHi: marginPct?.kind === "percent" ? marginPct.hi : null,
  };
}

export function buildExpectedEarnings(input: {
  target: ReportingQuarter;
  guidanceItems: NormalizedGuidanceItem[];
  financials?: QuarterlyFinancialsRow[];
}): ExpectedEarnings | null {
  const { target } = input;
  const financials = input.financials ?? [];
  const basis = financials[0]?.basis ?? null;
  const runRate = buildRunRate(financials, target);
  if (input.guidanceItems.length === 0) {
    return runRate ? { lines: [], basis, implied: null, runRate } : null;
  }
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
  const picked: Partial<Record<GuidanceFamily, NormalizedGuidanceItem>> = {};
  for (const family of FAMILY_ORDER) {
    const pick =
      pool.find((c) => c.item.guidanceFamily === family && !isSegmentScoped(c.item)) ??
      pool.find((c) => c.item.guidanceFamily === family);
    if (!pick) continue;
    const { item } = pick;
    picked[family] = item;
    lines.push({
      source: "guide",
      metricLabel: item.metricLabel ?? FAMILY_FALLBACK_LABEL[family],
      valueLabel: pick.guidedLabel ?? item.valueText ?? clip(item.guidanceText, 80),
      horizonLabel: item.horizonLabel,
      segment: isSegmentScoped(item) ? item.segment : null,
      sectionId: "guidance-history",
    });
  }
  const implied = buildImpliedQuarter(financials, target, picked.growth ?? null, picked.margin ?? null);
  if (lines.length === 0 && !runRate) return null;
  return { lines, basis, implied, runRate };
}
