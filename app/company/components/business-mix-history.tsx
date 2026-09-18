import type { NormalizedRevenueBreakdownItem, NormalizedRevenueMixHistoryBySegment } from "@/lib/business-snapshot/types";
import { colorPalette } from "./business-segment-mix-constants";
import { elevatedBlockClass } from "./surface-tokens";
import { buildBusinessMixPeriods, pickComparisonPeriods } from "@/lib/business-snapshot/mix-history";

const percent = (value: number) => `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)}%`;

/** Use only disclosed comparable shares. Missing shares remain a visible gap;
 * neither partial series nor an over-full total is rescaled to look complete. */
export function BusinessMixHistory({ history, segments }: {
  history: NormalizedRevenueMixHistoryBySegment | null;
  segments: NormalizedRevenueBreakdownItem[];
}) {
  if (!history) return null;
  const rows = history.rows.filter((row) => !row.isTotal);
  if (rows.length < 2) return null;
  const periods = buildBusinessMixPeriods(history);
  const comparison = pickComparisonPeriods(periods);
  if (!comparison) return null;
  const names = [...new Set([
    ...[...segments].sort((a, b) => (b.revenueSharePercent ?? -1) - (a.revenueSharePercent ?? -1)).map((segment) => segment.name),
    ...rows.map((row) => row.segment),
  ])];
  const color = (name: string) => colorPalette[names.indexOf(name) % colorPalette.length];

  return (
    <section className={`${elevatedBlockClass} p-4 sm:p-5`} aria-labelledby="business-mix-history-heading">
      <h3 id="business-mix-history-heading" className="text-base font-semibold text-foreground">Revenue mix over time</h3>
      <p className="mt-1 text-xs text-muted-foreground">Reported or restated shares · unfilled space is undisclosed or not comparable</p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[comparison.baseline, comparison.latest].map(({ year, known, total }) => (
          <div key={year} className="space-y-2">
            <span className="text-xs font-medium text-foreground">{year}</span>
            <div role="img" aria-label={`${year}: ${known.map((item) => `${item.name} ${percent(item.value)}`).join(", ")}${total < 100 ? `; undisclosed or not comparable ${percent(100 - total)}` : ""}.`} className="flex h-5 overflow-hidden rounded bg-muted/50">
              {known.map((item) => <div key={item.name} style={{ width: `${item.value}%`, backgroundColor: color(item.name) }} className="h-full shrink-0" />)}
            </div>
          </div>
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {rows.map((row) => <li key={row.segment} className="inline-flex items-center gap-2"><span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color(row.segment) }} />{row.segment}</li>)}
      </ul>
      <details className="mt-4 border-t border-border/35 pt-2">
        <summary className="cursor-pointer rounded-sm py-1 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Mix percentages by year</summary>
        <dl className="mt-2 space-y-3 text-xs">
          {periods.map(({ year, known, valid }) => <div key={year}><dt className="font-semibold text-foreground">{year}</dt><dd className="mt-1 leading-relaxed text-muted-foreground">{valid ? known.map((item) => `${item.name}: ${percent(item.value)}`).join(" · ") : "Comparable mix unavailable"}</dd></div>)}
        </dl>
      </details>
    </section>
  );
}
