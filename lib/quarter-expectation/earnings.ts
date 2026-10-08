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
  ExpectationRow,
  ExpectedEarnings,
  ExpectedEarningsLine,
  ImpliedQuarter,
  QuarterlyFinancialsRow,
  RunRate,
} from "./types";

// The expectations half of the card: what the issuer has guided for the
// period the call reports on (one text line per family, attributed to the
// Guidance tab) and, where Screener's quarterly P&L is on file, a table of
// ranges for the quarter against its year-ago print — revenue, EBITDA margin,
// EBITDA, net profit. A guide dated the target quarter itself outranks a
// full-year one; a whole-company guide outranks a segment's. Every range is
// the issuer's own guide, the trailing run-rate, or arithmetic on the two;
// nothing is forecast. Guides are for the year, and how the quarter phases
// is the reader's call — the footnote says so.

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
  const patYoy: number[] = [];
  for (const r of prior) {
    const yearAgo = findRow(rows, r.fy - 1, r.qtr);
    if (r.revenue_cr != null && r.revenue_cr > 0 && yearAgo?.revenue_cr != null && yearAgo.revenue_cr > 0) {
      yoy.push((r.revenue_cr / yearAgo.revenue_cr - 1) * 100);
    }
    if (r.opm_pct != null) opm.push(r.opm_pct);
    // Net profit YoY only reads off two positive prints — a loss-to-profit
    // swing is not a growth rate.
    if (r.net_profit_cr != null && r.net_profit_cr > 0 && yearAgo?.net_profit_cr != null && yearAgo.net_profit_cr > 0) {
      patYoy.push((r.net_profit_cr / yearAgo.net_profit_cr - 1) * 100);
    }
  }
  if (yoy.length < RUN_RATE_MIN_PAIRS) return null;
  const latest = prior[prior.length - 1];
  const avg = (xs: number[]) => round1(xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    revenueYoyPct: avg(yoy),
    yoyPairs: yoy.length,
    opmPct: opm.length > 0 ? avg(opm) : null,
    netProfitYoyPct: patYoy.length >= RUN_RATE_MIN_PAIRS ? avg(patYoy) : null,
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

// ---------------------------------------------------------------------------
// The expectations table. Each row is a range for the target quarter next to
// the year-ago print. Sources, in words the card prints:
//   guide           the issuer's FY guide applied to the year-ago quarter
//   run_rate        the last four quarters' average YoY, applied the same way
//   guide_run_rate  both exist and the range spans them — the guide says one
//                   thing, the business has been running at another
//   implied         arithmetic on two rows above (EBITDA = revenue × margin)
// A row needs its year-ago print; without one there is nothing to compare.
// ---------------------------------------------------------------------------

type Range = { lo: number; hi: number };

const percentRange = (item: NormalizedGuidanceItem | null): Range | null => {
  if (!item || isSegmentScoped(item)) return null;
  const v = readNumericValue(item);
  return v && v.kind === "percent" ? { lo: v.lo, hi: v.hi } : null;
};

const span = (a: Range | null, b: number | null): Range | null => {
  if (a && b != null) return { lo: Math.min(a.lo, b), hi: Math.max(a.hi, b) };
  if (a) return a;
  return b != null ? { lo: b, hi: b } : null;
};

const grow = (base: number, pct: Range): Range => ({
  lo: round0(base * (1 + pct.lo / 100)),
  hi: round0(base * (1 + pct.hi / 100)),
});

const pctChange = (r: Range, base: number): Range => ({
  lo: round1((r.lo / base - 1) * 100),
  hi: round1((r.hi / base - 1) * 100),
});

// Basis points, to the nearest ten — a guide written as "18.5–19.5%" against
// a 17.9% print is "+60 to +160 bps", not "+60 to +160.00000001".
const bpsChange = (r: Range, base: number): Range => ({
  lo: Math.round(((r.lo - base) * 100) / 10) * 10,
  hi: Math.round(((r.hi - base) * 100) / 10) * 10,
});

export type ExpectationGuides = {
  revenue: NormalizedGuidanceItem | null;
  ebitda: NormalizedGuidanceItem | null;
  pat: NormalizedGuidanceItem | null;
  ebitdaMargin: NormalizedGuidanceItem | null;
};

export const NO_GUIDES: ExpectationGuides = { revenue: null, ebitda: null, pat: null, ebitdaMargin: null };

export function buildExpectationRows(
  rows: QuarterlyFinancialsRow[],
  target: ReportingQuarter,
  guides: ExpectationGuides,
  runRate: RunRate | null,
): ExpectationRow[] {
  const yearAgo = findRow(rows, target.fy - 1, target.qtr);
  if (!yearAgo) return [];
  const out: ExpectationRow[] = [];
  const GUIDE_SECTION = "guidance-history";

  // Revenue — guide, run-rate, or the span of both.
  let revenue: Range | null = null;
  const yaRevenue = yearAgo.revenue_cr != null && yearAgo.revenue_cr > 0 ? yearAgo.revenue_cr : null;
  if (yaRevenue != null) {
    const guide = percentRange(guides.revenue?.metricSubtype === "revenue" ? guides.revenue : null);
    const pct = span(guide, runRate?.revenueYoyPct ?? null);
    if (pct) {
      revenue = grow(yaRevenue, pct);
      out.push({
        key: "revenue",
        label: "Revenue",
        unit: "cr",
        ...revenue,
        yearAgo: yaRevenue,
        change: { unit: "pct", ...pct },
        source: guide && runRate ? "guide_run_rate" : guide ? "guide" : "run_rate",
        sectionId: guide ? GUIDE_SECTION : null,
      });
    }
  }

  // EBITDA margin — a margin guide (a level), else the run-rate OPM.
  let margin: Range | null = null;
  const yaOpm = yearAgo.opm_pct;
  if (yaOpm != null) {
    const guide = percentRange(guides.ebitdaMargin?.metricSubtype === "ebitda_margin" ? guides.ebitdaMargin : null);
    margin = guide ?? (runRate?.opmPct != null ? { lo: runRate.opmPct, hi: runRate.opmPct } : null);
    if (margin) {
      out.push({
        key: "ebitda_margin",
        label: "EBITDA margin",
        unit: "pct",
        ...margin,
        yearAgo: yaOpm,
        change: { unit: "bps", ...bpsChange(margin, yaOpm) },
        source: guide ? "guide" : "run_rate",
        sectionId: guide ? GUIDE_SECTION : null,
      });
    }
  }

  // EBITDA — revenue × margin when both rows exist; else an EBITDA growth guide.
  const yaEbitda = yaRevenue != null && yaOpm != null ? round0((yaRevenue * yaOpm) / 100) : null;
  if (yaEbitda != null && yaEbitda > 0) {
    if (revenue && margin) {
      const r = { lo: round0((revenue.lo * margin.lo) / 100), hi: round0((revenue.hi * margin.hi) / 100) };
      out.push({
        key: "ebitda",
        label: "EBITDA",
        unit: "cr",
        ...r,
        yearAgo: yaEbitda,
        change: { unit: "pct", ...pctChange(r, yaEbitda) },
        source: "implied",
        sectionId: null,
      });
    } else {
      const guide = percentRange(guides.ebitda?.metricSubtype === "ebitda" ? guides.ebitda : null);
      if (guide) {
        out.push({
          key: "ebitda",
          label: "EBITDA",
          unit: "cr",
          ...grow(yaEbitda, guide),
          yearAgo: yaEbitda,
          change: { unit: "pct", ...guide },
          source: "guide",
          sectionId: GUIDE_SECTION,
        });
      }
    }
  }

  // Net profit — a PAT growth guide, else the run-rate PAT growth.
  const yaPat = yearAgo.net_profit_cr != null && yearAgo.net_profit_cr > 0 ? yearAgo.net_profit_cr : null;
  if (yaPat != null) {
    const guide = percentRange(guides.pat?.metricSubtype === "pat" ? guides.pat : null);
    const pct = guide ?? (runRate?.netProfitYoyPct != null ? { lo: runRate.netProfitYoyPct, hi: runRate.netProfitYoyPct } : null);
    if (pct) {
      out.push({
        key: "net_profit",
        label: "Net profit",
        unit: "cr",
        ...grow(yaPat, pct),
        yearAgo: yaPat,
        change: { unit: "pct", ...pct },
        source: guide ? "guide" : "run_rate",
        sectionId: guide ? GUIDE_SECTION : null,
      });
    }
  }

  return out;
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
  const yearAgoRow = findRow(financials, target.fy - 1, target.qtr);
  const yearAgoLabel = yearAgoRow ? quarterLabelFor(yearAgoRow.fy, yearAgoRow.qtr) : null;
  if (input.guidanceItems.length === 0) {
    const rows = buildExpectationRows(financials, target, NO_GUIDES, runRate);
    return runRate || rows.length > 0 ? { lines: [], basis, implied: null, runRate, rows, yearAgoLabel } : null;
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
      family,
      metricLabel: item.metricLabel ?? FAMILY_FALLBACK_LABEL[family],
      valueLabel: pick.guidedLabel ?? item.valueText ?? clip(item.guidanceText, 80),
      horizonLabel: item.horizonLabel,
      segment: isSegmentScoped(item) ? item.segment : null,
      sectionId: "guidance-history",
    });
  }
  const implied = buildImpliedQuarter(financials, target, picked.growth ?? null, picked.margin ?? null);
  // The table reads guides by subtype, whole-company only: a revenue guide and
  // a PAT guide are both "growth" and must not stand in for each other.
  const bySubtype = (subtype: NormalizedGuidanceItem["metricSubtype"]) =>
    pool.find((c) => c.item.metricSubtype === subtype && !isSegmentScoped(c.item))?.item ?? null;
  const rows = buildExpectationRows(
    financials,
    target,
    { revenue: bySubtype("revenue"), ebitda: bySubtype("ebitda"), pat: bySubtype("pat"), ebitdaMargin: bySubtype("ebitda_margin") },
    runRate,
  );
  if (lines.length === 0 && !runRate && rows.length === 0) return null;
  return { lines, basis, implied, runRate, rows, yearAgoLabel };
}
