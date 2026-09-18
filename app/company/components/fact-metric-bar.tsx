import type { FactMetric } from "@/lib/business-snapshot/profile";
import { colorPalette } from "./business-segment-mix-constants";
import { snapshotSubsectionClass } from "./surface-tokens";

const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

// Symbol-shaped units ("%", "x") suffix directly onto the number; word units
// ("lines", "Rs Cr") get a space. Metrics are freeform per business_facts.metrics
// (mirrors Key Variables' freeform metric labels), so this is a formatting
// heuristic, not a closed set.
const isSymbolUnit = (unit: string) => /^[%x×]$/i.test(unit.trim());
export const formatMetric = (metric: FactMetric) => {
  const value = numberFormatter.format(metric.value);
  return isSymbolUnit(metric.unit) ? `${value}${metric.unit}` : `${value} ${metric.unit}`;
};

/**
 * Proportional segmented bar for a fact's structured `metrics` breakdown
 * (e.g. customer concentration bands, manufacturing line counts). Same visual
 * recipe as BusinessSegmentMixBar (role="img" pill + colored segments), but a
 * fresh component rather than reusing it directly — that one is hard-typed to
 * NormalizedRevenueBreakdownItem[] (revenue-share-specific fields), not the
 * general {label, value, unit} shape a fact metric carries.
 */
export function FactMetricBar({ metrics }: { metrics: FactMetric[] }) {
  const total = metrics.reduce((sum, metric) => sum + metric.value, 0);
  if (total <= 0) return null;

  const ariaLabel = `${metrics.map((metric) => `${metric.label} ${formatMetric(metric)}`).join(", ")}.`;

  return (
    <div className={`${snapshotSubsectionClass} mt-2 space-y-2 p-2.5`}>
      <div role="img" aria-label={ariaLabel} className="flex h-2.5 overflow-hidden rounded-full bg-muted/40">
        {metrics.map((metric, index) => (
          <div
            key={`${metric.label}-${index}`}
            className="h-full min-w-[2px]"
            style={{ width: `${(metric.value / total) * 100}%`, backgroundColor: colorPalette[index % colorPalette.length] }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {metrics.map((metric, index) => (
          <li key={`${metric.label}-${index}`} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorPalette[index % colorPalette.length] }} />
            {metric.label} · <span className="font-medium text-foreground/80">{formatMetric(metric)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
