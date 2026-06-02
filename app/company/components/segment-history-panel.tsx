"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { nestedDetailClass } from "./surface-tokens";
import { getDeltaToneClass } from "./delta-tone";
import { getPeriodOverPeriodDelta, formatPeriodDelta } from "@/lib/period-delta";
import { KpiSparkline } from "./kpi-sparkline-lazy";
import type {
  NormalizedSegmentHistoryQuarterly,
  NormalizedSegmentHistoryAnnual,
} from "@/lib/business-snapshot/types";

const numberFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
const fmt = (v: number | null | undefined) => (v == null ? "—" : numberFmt.format(v));

// Show only the most recent N quarters in the quarterly view (the table gets
// unwieldy past ~6 columns; older quarters still drive the annual derivation
// and the sparkline trend).
const MAX_QUARTERS = 6;

/** Trim a segment table to its latest N periods (keeps row amounts aligned). */
function takeLatestPeriods(
  t: NormalizedSegmentHistoryQuarterly,
  n: number,
): NormalizedSegmentHistoryQuarterly {
  if (t.periods.length <= n) return t;
  const kept = t.periods.slice(-n);
  const keptSet = new Set(kept);
  return {
    periods: kept,
    rows: t.rows.map((r) => ({
      ...r,
      amountByPeriod: Object.fromEntries(
        Object.entries(r.amountByPeriod).filter(([p]) => keptSet.has(p)),
      ),
    })),
    insights: t.insights,
  };
}

const isYearEnd = (p: string) => /^Q4/i.test(p);

const pctFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

/**
 * Trailing CAGR over the last `spanPeriods` data points, annualised.
 * `periodsPerYear` = 4 for quarterly series, 1 for annual. Returns null when
 * there isn't enough history or the endpoints aren't both positive.
 * Uses the most recent `spanPeriods+1` values present in `orderedPeriods`.
 */
function trailingCagr(
  orderedPeriods: string[],
  byPeriod: Record<string, number | null>,
  spanPeriods: number,
  periodsPerYear: number,
): number | null {
  // Collect the values in chronological order, only where present.
  const series = orderedPeriods
    .map((p) => byPeriod[p])
    .filter((v): v is number => v != null);
  if (series.length < spanPeriods + 1) return null;
  const end = series[series.length - 1];
  const start = series[series.length - 1 - spanPeriods];
  if (start == null || end == null || start <= 0 || end <= 0) return null;
  const years = spanPeriods / periodsPerYear;
  if (years <= 0) return null;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

const formatCagr = (v: number | null) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${pctFmt.format(v)}%`;

// Lenders measure segments by AUM (loan book); everyone else by revenue. Both
// often carry "Rs Cr", so infer from segment names rather than unit.
const _LENDER_HINT = /(loan|vehicle|MSME|gold|two.?wheeler|advances|AUM|microfinance|mortgage)/i;
function segmentMetricLabel(segments: string[]): string {
  const lenderish = segments.filter((s) => _LENDER_HINT.test(s)).length;
  return lenderish >= Math.ceil(segments.length / 2) ? "Segment AUM" : "Segment revenue";
}
// Q4FY25 → FY25
const q4ToFy = (p: string) => p.replace(/^Q4\s*/i, "");

/**
 * Derive a per-segment ANNUAL view from the quarterly slot when no real
 * segment_history_annual is published. AUM is a STOCK (point-in-time balance),
 * so the annual value is the year-end (Q4) figure — not a sum. This is the
 * literal reported year-end value, not a fabrication. Returns null if there
 * are no Q4 columns to derive from.
 */
function deriveAnnualFromQuarterly(
  q: NormalizedSegmentHistoryQuarterly | null,
): NormalizedSegmentHistoryAnnual | null {
  if (!q || q.rows.length === 0) return null;
  const yearEnds = q.periods.filter(isYearEnd);
  if (yearEnds.length === 0) return null;
  const fyPeriods = yearEnds.map(q4ToFy);
  const rows = q.rows.map((r) => {
    const amountByPeriod: Record<string, number | null> = {};
    yearEnds.forEach((qp) => {
      amountByPeriod[q4ToFy(qp)] = r.amountByPeriod[qp] ?? null;
    });
    return {
      segment: r.segment,
      amountByPeriod,
      unit: r.unit,
      mixPctLatest: r.mixPctLatest,
      comparabilityLabel: r.comparabilityLabel,
    };
  });
  return { periods: fyPeriods, rows, insights: [] };
}

type SegmentView = { table: NormalizedSegmentHistoryQuarterly; derived: boolean } | null;

/**
 * Tri-axis segment/financial history (chunks-fed pipeline). Inline supporting
 * detail inside the Business Snapshot flow (per UI-patterns: supporting tables
 * → inline <details>, not a drawer).
 *
 * Segment table is switchable Quarterly ⟷ Annual. Annual prefers a real
 * segment_history_annual slot; if absent (common for single-segment NBFCs),
 * it derives annual from the quarterly year-end (Q4) columns for stock metrics.
 */
export function SegmentHistoryPanel({
  quarterly,
  annual,
}: {
  quarterly: NormalizedSegmentHistoryQuarterly | null;
  annual: NormalizedSegmentHistoryAnnual | null;
}) {
  const hasQuarterly = Boolean(quarterly && quarterly.rows.length > 0 && quarterly.periods.length > 0);

  // Annual segment view: real slot first, else derive from quarterly Q4 columns.
  const annualView: SegmentView = useMemo(() => {
    if (annual && annual.rows.length > 0 && annual.periods.length > 0) {
      return { table: annual, derived: false };
    }
    const derived = deriveAnnualFromQuarterly(quarterly);
    return derived ? { table: derived, derived: true } : null;
  }, [annual, quarterly]);

  const hasAnnualSegment = Boolean(annualView);

  // Default to quarterly when available, else whatever segment view exists.
  const [view, setView] = useState<"quarterly" | "annual">(hasQuarterly ? "quarterly" : "annual");

  const hasAnySegment = hasQuarterly || hasAnnualSegment;
  if (!hasAnySegment) return null;

  // Full (untrimmed) table for the active view — drives the sparkline trend.
  const activeFull: SegmentView =
    view === "quarterly"
      ? hasQuarterly
        ? { table: quarterly as NormalizedSegmentHistoryQuarterly, derived: false }
        : annualView
      : annualView ?? (hasQuarterly ? { table: quarterly as NormalizedSegmentHistoryQuarterly, derived: false } : null);

  // Visible columns: cap quarterly to the latest N; annual stays full.
  const activeSegment: SegmentView =
    activeFull && view === "quarterly" && !activeFull.derived
      ? { table: takeLatestPeriods(activeFull.table, MAX_QUARTERS), derived: activeFull.derived }
      : activeFull;

  return (
    <details open className={`group/segment-history ${nestedDetailClass} p-3`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
        <span>Segment &amp; multi-period history</span>
        <span className="text-muted-foreground group-open/segment-history:hidden">Show details</span>
        <span className="hidden text-muted-foreground group-open/segment-history:inline">Hide details</span>
      </summary>

      <div className="mt-3 space-y-4">
        {hasAnySegment && activeSegment ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-foreground/75">
                {segmentMetricLabel(activeSegment.table.rows.map((r) => r.segment))}
                {activeSegment.table.rows.find((r) => r.unit)?.unit ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {activeSegment.table.rows.find((r) => r.unit)?.unit}
                  </span>
                ) : null}
                {view === "annual" && activeSegment.derived ? (
                  <span className="text-muted-foreground"> · year-end (derived)</span>
                ) : null}
              </p>
              {/* Only offer the switch when both axes are actually available. */}
              {hasQuarterly && hasAnnualSegment ? (
                <ToggleGroup
                  type="single"
                  size="sm"
                  value={view}
                  onValueChange={(v) => v && setView(v as "quarterly" | "annual")}
                  aria-label="Segment table granularity"
                >
                  <ToggleGroupItem value="quarterly" className="text-[10px] px-2 py-0.5">
                    Quarterly
                  </ToggleGroupItem>
                  <ToggleGroupItem value="annual" className="text-[10px] px-2 py-0.5">
                    Annual
                  </ToggleGroupItem>
                </ToggleGroup>
              ) : null}
            </div>
            <PeriodTable
              periods={activeSegment.table.periods}
              rowLabel="Segment"
              rows={(activeFull?.table.rows ?? activeSegment.table.rows)
                .map((r) => ({
                  label: r.segment,
                  byPeriod: r.amountByPeriod,
                  latestPct: r.mixPctLatest,
                }))
                // Order by latest mix % so the default top-4 are the biggest segments.
                .sort((a, b) => (b.latestPct ?? -1) - (a.latestPct ?? -1))}
              showLatestPct
              showTrend
              trendPeriods={activeFull?.table.periods}
              collapseRowsTo={4}
              cagrColumns={
                view === "quarterly"
                  ? [
                      { label: "4Q CAGR", span: 4, perYear: 4 },
                      { label: "12Q CAGR", span: 12, perYear: 4 },
                    ]
                  : [
                      { label: "3Y CAGR", span: 3, perYear: 1 },
                      { label: "5Y CAGR", span: 5, perYear: 1 },
                    ]
              }
            />
            {activeSegment.table.insights.length > 0 ? (
              <Insights items={activeSegment.table.insights} />
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}

function PeriodTable({
  periods,
  rowLabel,
  rows,
  showLatestPct,
  showDeltas = true,
  showTrend = false,
  trendPeriods,
  collapseRowsTo,
  cagrColumns,
}: {
  periods: string[];
  rowLabel: string;
  rows: { label: string; byPeriod: Record<string, number | null>; latestPct: number | null }[];
  showLatestPct: boolean;
  showDeltas?: boolean;
  showTrend?: boolean;
  // Periods to draw the sparkline over (often a longer window than the visible
  // columns — e.g. all 16 quarters while the table shows the latest 6).
  trendPeriods?: string[];
  // When set and there are more rows than this, show only the top N by default
  // (rows are assumed already ordered by importance) with a "Show more" toggle.
  collapseRowsTo?: number;
  // Trailing-CAGR columns rendered before Mix %, computed over the FULL series
  // (trendPeriods). e.g. {label:"4Q CAGR", span:4, perYear:4}.
  cagrColumns?: { label: string; span: number; perYear: number }[];
}) {
  const sparkPeriods = trendPeriods ?? periods;
  const cagrCols = cagrColumns ?? [];
  const [expanded, setExpanded] = useState(false);
  const canCollapse = collapseRowsTo != null && rows.length > collapseRowsTo;
  const visibleRows = canCollapse && !expanded ? rows.slice(0, collapseRowsTo) : rows;
  const hiddenCount = rows.length - visibleRows.length;

  // Mix %: prefer the disclosed value; else derive each row's share of the
  // latest-period total across ALL rows (works for segment revenue/AUM tables
  // that print absolute values but no % column — e.g. APAR's segment revenue).
  const latestPeriod = periods[periods.length - 1];
  const latestTotal = showLatestPct
    ? rows.reduce((sum, r) => {
        const v = latestPeriod ? r.byPeriod[latestPeriod] : null;
        return sum + (v != null && v > 0 ? v : 0);
      }, 0)
    : 0;
  const mixPctFor = (row: { latestPct: number | null; byPeriod: Record<string, number | null> }): number | null => {
    if (row.latestPct != null) return row.latestPct;
    const v = latestPeriod ? row.byPeriod[latestPeriod] : null;
    if (v == null || v <= 0 || latestTotal <= 0) return null;
    return (v / latestTotal) * 100;
  };
  const colSpan =
    1 + (showTrend ? 1 : 0) + periods.length + cagrCols.length + (showLatestPct ? 1 : 0);
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px] whitespace-nowrap">{rowLabel}</TableHead>
            {showTrend ? (
              <TableHead className="text-[11px] whitespace-nowrap">Trend</TableHead>
            ) : null}
            {periods.map((p) => (
              <TableHead key={p} className="text-right text-[11px] whitespace-nowrap">
                {p}
              </TableHead>
            ))}
            {cagrCols.map((c) => (
              <TableHead key={c.label} className="text-right text-[11px] whitespace-nowrap">
                {c.label}
              </TableHead>
            ))}
            {showLatestPct ? (
              <TableHead className="text-right text-[11px] whitespace-nowrap">Mix %</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="text-[11px] font-medium whitespace-nowrap">{row.label}</TableCell>
              {showTrend ? (
                <TableCell className="align-middle">
                  <KpiSparkline
                    ariaLabel={`${row.label} trend across ${sparkPeriods.length} periods`}
                    points={sparkPeriods.map((p) => ({ period: p, value: row.byPeriod[p] ?? null }))}
                  />
                </TableCell>
              ) : null}
              {periods.map((p) => (
                <TableCell key={p} className="text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[11px] tabular-nums">{fmt(row.byPeriod[p])}</span>
                    {showDeltas
                      ? (() => {
                          const formatted = formatPeriodDelta(
                            getPeriodOverPeriodDelta(periods, row.byPeriod, p),
                          );
                          return formatted ? (
                            <span
                              className={`text-[10px] leading-none ${getDeltaToneClass(formatted.toneValue)}`}
                            >
                              {formatted.label}
                            </span>
                          ) : (
                            <span className="text-[10px] leading-none text-muted-foreground">&nbsp;</span>
                          );
                        })()
                      : null}
                  </div>
                </TableCell>
              ))}
              {cagrCols.map((c) => {
                const v = trailingCagr(sparkPeriods, row.byPeriod, c.span, c.perYear);
                return (
                  <TableCell
                    key={c.label}
                    className={`text-right text-[11px] tabular-nums align-top ${
                      v == null ? "text-muted-foreground" : getDeltaToneClass(v)
                    }`}
                  >
                    {formatCagr(v)}
                  </TableCell>
                );
              })}
              {showLatestPct ? (() => {
                const mix = mixPctFor(row);
                return (
                  <TableCell className="text-right text-[11px] tabular-nums text-muted-foreground align-top">
                    {mix == null ? "—" : `${numberFmt.format(mix)}%`}
                  </TableCell>
                );
              })() : null}
            </TableRow>
          ))}
          {canCollapse ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-1">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {expanded ? "Show fewer" : `Show more (${hiddenCount})`}
                </button>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function Insights({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 pl-4 text-[11px] leading-snug text-muted-foreground list-disc">
      {items.slice(0, 4).map((i, idx) => (
        <li key={idx}>{i}</li>
      ))}
    </ul>
  );
}
