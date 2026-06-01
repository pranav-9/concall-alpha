import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { nestedDetailClass } from "./surface-tokens";
import type {
  NormalizedSegmentHistoryQuarterly,
  NormalizedConsolidatedFinancialsAnnual,
} from "@/lib/business-snapshot/types";

const numberFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

const fmt = (v: number | null | undefined) => (v == null ? "—" : numberFmt.format(v));

/**
 * Tri-axis segment/financial history (chunks-fed pipeline).
 *
 * Two independent, fill-if-found slots rendered as inline supporting detail
 * inside the Business Snapshot flow (per UI-patterns: tables of supporting
 * evidence → inline <details>, not a drawer):
 *   - segment_history_quarterly      → per-segment AUM/revenue × recent quarters
 *   - consolidated_financials_annual → company-level metrics × up to 5 fiscal years
 *
 * Renders nothing when both slots are null/empty.
 */
export function SegmentHistoryPanel({
  quarterly,
  annual,
}: {
  quarterly: NormalizedSegmentHistoryQuarterly | null;
  annual: NormalizedConsolidatedFinancialsAnnual | null;
}) {
  const hasQuarterly = Boolean(quarterly && quarterly.rows.length > 0 && quarterly.periods.length > 0);
  const hasAnnual = Boolean(annual && annual.rows.length > 0 && annual.periods.length > 0);
  if (!hasQuarterly && !hasAnnual) return null;

  return (
    <details className={`group/segment-history ${nestedDetailClass} p-3`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
        <span>Segment &amp; multi-period history</span>
        <span className="text-muted-foreground group-open/segment-history:hidden">Show details</span>
        <span className="hidden text-muted-foreground group-open/segment-history:inline">Hide details</span>
      </summary>

      <div className="mt-3 space-y-4">
        {hasQuarterly && quarterly ? (
          <PeriodTable
            heading="Segment AUM by quarter"
            unit={quarterly.rows.find((r) => r.unit)?.unit ?? null}
            periods={quarterly.periods}
            rowLabel="Segment"
            rows={quarterly.rows.map((r) => ({
              label: r.segment,
              byPeriod: r.amountByPeriod,
              latestPct: r.mixPctLatest,
            }))}
            showLatestPct
            insights={quarterly.insights}
          />
        ) : null}

        {hasAnnual && annual ? (
          <PeriodTable
            heading="Consolidated financials by year"
            unit={null}
            periods={annual.periods}
            rowLabel="Metric"
            rows={annual.rows.map((r) => ({
              label: r.metric + (r.unit ? ` (${r.unit})` : ""),
              byPeriod: r.valueByPeriod,
              latestPct: null,
            }))}
            showLatestPct={false}
            insights={annual.insights}
          />
        ) : null}
      </div>
    </details>
  );
}

function PeriodTable({
  heading,
  unit,
  periods,
  rowLabel,
  rows,
  showLatestPct,
  insights,
}: {
  heading: string;
  unit: string | null;
  periods: string[];
  rowLabel: string;
  rows: { label: string; byPeriod: Record<string, number | null>; latestPct: number | null }[];
  showLatestPct: boolean;
  insights: string[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-foreground/75">
        {heading}
        {unit ? <span className="text-muted-foreground"> · {unit}</span> : null}
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] whitespace-nowrap">{rowLabel}</TableHead>
              {periods.map((p) => (
                <TableHead key={p} className="text-right text-[11px] whitespace-nowrap">
                  {p}
                </TableHead>
              ))}
              {showLatestPct ? (
                <TableHead className="text-right text-[11px] whitespace-nowrap">Mix %</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="text-[11px] font-medium whitespace-nowrap">{row.label}</TableCell>
                {periods.map((p) => (
                  <TableCell key={p} className="text-right text-[11px] tabular-nums">
                    {fmt(row.byPeriod[p])}
                  </TableCell>
                ))}
                {showLatestPct ? (
                  <TableCell className="text-right text-[11px] tabular-nums text-muted-foreground">
                    {row.latestPct == null ? "—" : `${numberFmt.format(row.latestPct)}%`}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {insights.length > 0 ? (
        <ul className="space-y-1 pl-4 text-[11px] leading-snug text-muted-foreground list-disc">
          {insights.slice(0, 4).map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
