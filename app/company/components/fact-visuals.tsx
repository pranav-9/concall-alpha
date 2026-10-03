import type { FactVisual } from "@/lib/business-snapshot/fact-visual";
import { colorPalette } from "./business-segment-mix-constants";
import { formatMetric } from "./fact-metric-bar";

const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
const number = (value: number) => numberFormatter.format(value);
const quietClass = "text-foreground/60";
const captionClass = `text-[10px] font-semibold uppercase tracking-[0.14em] ${quietClass}`;
const heroClass = "text-[40px] font-bold leading-none tracking-tighter tabular-nums text-foreground";
// "% of revenue" reads as "of revenue" under a number that already carries its % sign.
const unitTail = (unit: string) => unit.replace(/^%\s*/, "");

function Donut({ visual }: { visual: Extract<FactVisual, { kind: "donut" }> }) {
  const lead = visual.slices[0];
  const rows = [...visual.slices.map((slice, index) => ({ ...slice, color: colorPalette[index % colorPalette.length] })), ...(visual.rest > 0 ? [{ label: "Others", value: visual.rest, color: null }] : [])];
  let offset = 0;
  return (
    <div className="flex min-w-0 items-center gap-5 sm:gap-7">
      <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" role="img" aria-label={`${rows.map((row) => `${row.label} ${number(row.value)}%`).join(", ")}.`}>
          {rows.map((row, index) => {
            const arc = <circle key={`${row.label}-${index}`} cx="18" cy="18" r="14" fill="none" strokeWidth="7" pathLength={100} stroke={row.color ?? undefined} className={row.color ? undefined : "stroke-foreground/15"} strokeDasharray={`${row.value} ${100 - row.value}`} strokeDashoffset={-offset} />;
            offset += row.value;
            return arc;
          })}
        </svg>
        <p className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold leading-none tracking-tight tabular-nums text-foreground">{number(lead.value)}%</span>
          <span className={`mt-1 max-w-[4.5rem] truncate text-[9px] font-semibold uppercase tracking-[0.12em] ${quietClass}`}>{lead.label}</span>
        </p>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5 text-sm">
        {rows.map((row, index) => (
          <li key={`${row.label}-${index}`} className="flex items-baseline gap-2.5">
            <span aria-hidden className={`h-2 w-2 shrink-0 self-center rounded-full ${row.color ? "" : "bg-foreground/25"}`} style={row.color ? { backgroundColor: row.color } : undefined} />
            <span className="min-w-0 flex-1 break-words text-foreground/85">{row.label}</span>
            <span className="tabular-nums text-foreground/85">{number(row.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Hero number beside its own history. The SVG stretches to the box (constant 2px stroke); the dots
 * and value labels are HTML placed by percentage so they keep their size at any width. */
function Trend({ visual }: { visual: Extract<FactVisual, { kind: "trend" }> }) {
  const { points } = visual;
  const [first, last] = [points[0], points[points.length - 1]];
  const values = points.map((point) => point.value);
  const [low, high] = [Math.min(...values), Math.max(...values)];
  const pad = Math.max((high - low) * 0.35, 1);
  const [floor, ceiling] = [Math.max(0, low - pad * 2), high + pad];
  const x = (index: number) => (index / (points.length - 1)) * 100;
  const y = (value: number) => 100 - ((value - floor) / (ceiling - floor)) * 100;
  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const color = colorPalette[1];
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-4">
      <div className="min-w-0">
        <p className={heroClass}>{number(last.value)}%</p>
        <p className={`mt-2 break-words ${captionClass}`}>{visual.measure}{unitTail(visual.unit) ? ` · ${unitTail(visual.unit)}` : ""}</p>
        <p className={`mt-1.5 text-[13px] ${quietClass}`}>from {number(first.value)}% in {first.period}</p>
      </div>
      <div className="min-w-[11rem] max-w-sm flex-1 px-3 pt-5">
        <div role="img" aria-label={`${visual.measure}: ${points.map((point) => `${point.period} ${number(point.value)}%`).join(", ")}.`} className="relative h-24 border-b border-border/60">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <polygon points={`0,100 ${line} 100,100`} fill={color} opacity="0.12" />
            <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {points.map((point, index) => {
            const isLast = index === points.length - 1;
            return (
              <span key={point.period} aria-hidden className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x(index)}%`, top: `${y(point.value)}%` }}>
                <span className={`absolute bottom-2.5 left-1/2 -translate-x-1/2 text-[11px] tabular-nums ${isLast ? "font-bold text-foreground" : quietClass}`}>{number(point.value)}</span>
                <span className="block h-2.5 w-2.5 rounded-full border-2 bg-background" style={{ borderColor: color, backgroundColor: isLast ? color : undefined }} />
              </span>
            );
          })}
        </div>
        <ol className={`mt-2 flex justify-between text-[11px] tabular-nums ${quietClass}`} aria-hidden>
          {points.map((point) => <li key={point.period} className="-mx-3 w-0 whitespace-nowrap text-center [&>span]:inline-block [&>span]:-translate-x-1/2"><span>{point.period}</span></li>)}
        </ol>
      </div>
    </div>
  );
}

export function FactVisualBlock({ visual }: { visual: FactVisual }) {
  if (visual.kind === "donut") return <Donut visual={visual} />;
  if (visual.kind === "trend") return <Trend visual={visual} />;
  if (visual.kind === "hero") {
    return (
      <div>
        <p className={heroClass}>{number(visual.value)}%</p>
        <p className={`mt-2 break-words ${captionClass}`}>{visual.label}{unitTail(visual.unit) ? ` · ${unitTail(visual.unit)}` : ""}</p>
      </div>
    );
  }
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {visual.metrics.map((metric, index) => (
        <div key={`${metric.label}-${index}`} className="min-w-0">
          <dd className="text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">{formatMetric(metric)}</dd>
          <dt className={`mt-1 break-words text-xs ${quietClass}`}>{metric.label}</dt>
        </div>
      ))}
    </dl>
  );
}
