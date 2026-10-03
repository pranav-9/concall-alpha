import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { NormalizedRevenueBreakdownItem, NormalizedRevenueMixHistoryBySegment } from "@/lib/business-snapshot/types";
import { buildBusinessMixPeriods } from "@/lib/business-snapshot/mix-history";
import { DERIVED_SHARE_TITLE, isDerivedShare } from "@/lib/business-snapshot/revenue-share-basis";
import { colorPalette } from "./business-segment-mix-constants";
import { elevatedBlockClass } from "./surface-tokens";

const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const percent = (value: number) => `${numberFormatter.format(value)}%`;
const keyOf = (name: string) => name.trim().toLowerCase();
const marginLabels: Record<string, string> = { high_margin: "High margin", improving: "Improving", pre_scale: "Pre-scale", drag: "Margin drag" };
const quietClass = "text-foreground/60";
const labelClass = `text-[11px] font-semibold uppercase tracking-[0.14em] ${quietClass}`;

export type MixShiftView = {
  headline: string;
  /** Periods on the chart's x axis, oldest first; empty when there is no comparable history to draw. */
  years: string[];
  /** Largest latest share first. `points` holds one share per chart year (null = not disclosed that year). */
  rows: { name: string; latest: number | null; first: number | null; points: (number | null)[]; margin: string | null; derived: boolean; description: string | null }[];
};

/** The whole card is derived here: the chart draws only years whose disclosed shares are comparable
 * (see buildBusinessMixPeriods), and the headline names the segment whose share moved the most. */
export function buildMixShiftView(
  segments: NormalizedRevenueBreakdownItem[],
  history: NormalizedRevenueMixHistoryBySegment | null,
): MixShiftView | null {
  const bySegment = new Map(segments.map((segment) => [keyOf(segment.name), segment]));
  const extras = (name: string) => {
    const segment = bySegment.get(keyOf(name));
    return {
      margin: marginLabels[segment?.marginProfile ?? ""] ?? null,
      derived: segment ? isDerivedShare(segment) : false,
      description: segment?.description ?? null,
    };
  };
  const periods = history ? buildBusinessMixPeriods(history).filter((period) => period.valid) : [];

  if (periods.length >= 2) {
    const names = [...new Set(periods.flatMap((period) => period.known.map((item) => item.name)))];
    const rows = names.map((name) => {
      const points = periods.map((period) => period.known.find((item) => item.name === name)?.value ?? null);
      return { name, points, first: points[0], latest: points[points.length - 1], ...extras(name) };
    }).sort((a, b) => (b.latest ?? -1) - (a.latest ?? -1));
    const mover = rows
      .flatMap((row) => (row.first != null && row.latest != null ? [{ ...row, first: row.first, latest: row.latest, delta: row.latest - row.first }] : []))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    const years = periods.map((period) => period.year);
    const headline = mover && Math.abs(Math.round(mover.delta)) >= 2
      ? `${mover.name} has ${mover.delta > 0 ? "grown" : "shrunk"} from ${percent(mover.first)} to ${percent(mover.latest)} of revenue.`
      : `The revenue mix has barely moved since ${years[0]}.`;
    return { headline, years, rows };
  }

  if (segments.length === 0) return null;
  const rows = [...segments]
    .sort((a, b) => (b.revenueSharePercent ?? -1) - (a.revenueSharePercent ?? -1))
    .map((segment) => ({ name: segment.name, latest: segment.revenueSharePercent, first: null, points: [], ...extras(segment.name) }));
  const top = rows[0];
  return {
    headline: top.latest != null ? `${top.name} is ${percent(top.latest)} of revenue.` : "Where the revenue comes from.",
    years: [],
    rows,
  };
}

/** Share-of-revenue lines. The SVG stretches to the box (lines keep a constant 2px stroke); dots and
 * labels are HTML positioned by percentage so they never distort or shrink on a phone. */
function MixLines({ view, colorOf }: { view: MixShiftView; colorOf: (name: string) => string }) {
  const top = Math.max(10, Math.ceil(Math.max(...view.rows.flatMap((row) => row.points.map((point) => point ?? 0))) / 10) * 10);
  const x = (index: number) => (index / (view.years.length - 1)) * 100;
  const y = (value: number) => 100 - (value / top) * 100;
  const label = view.rows.map((row) => `${row.name}: ${row.points.map((point, index) => (point == null ? null : `${view.years[index]} ${percent(point)}`)).filter(Boolean).join(", ")}`).join("; ");
  return (
    <div className="min-w-0 px-1.5">
      <div role="img" aria-label={`Share of revenue by segment. ${label}.`} className="relative h-44 border-b border-border/60 sm:h-52">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {view.rows.map((row) => {
            const drawn = row.points.flatMap((point, index) => (point == null ? [] : [`${x(index)},${y(point)}`]));
            return drawn.length >= 2 ? <polyline key={row.name} points={drawn.join(" ")} fill="none" stroke={colorOf(row.name)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : null;
          })}
        </svg>
        {view.rows.map((row) => (row.latest == null ? null : (
          <span key={row.name} aria-hidden className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background" style={{ left: "100%", top: `${y(row.latest)}%`, backgroundColor: colorOf(row.name) }} />
        )))}
      </div>
      <ol className={`mt-2 flex justify-between text-[11px] tabular-nums ${quietClass}`} aria-hidden>
        {view.years.map((year, index) => <li key={year} className={index === view.years.length - 1 ? "font-semibold text-foreground" : ""}>{year}</li>)}
      </ol>
    </div>
  );
}

/** One card for "where the revenue comes from and how that is changing": headline, share lines,
 * and a share / change / margin row per segment. `children` is the detailed history, kept behind
 * the card's single disclosure. */
export function BusinessMixShift({ segments, history, summary, children }: {
  segments: NormalizedRevenueBreakdownItem[];
  history: NormalizedRevenueMixHistoryBySegment | null;
  summary: string | null;
  children?: ReactNode;
}) {
  const view = buildMixShiftView(segments, history);
  if (!view) return children ? <>{children}</> : null;
  const colorOf = (name: string) => colorPalette[view.rows.findIndex((row) => row.name === name) % colorPalette.length];
  const hasChart = view.years.length >= 2;
  const latestYear = hasChart ? view.years[view.years.length - 1] : null;
  const hasChange = view.rows.some((row) => row.first != null && row.latest != null);
  const hasMargin = view.rows.some((row) => row.margin);
  const described = view.rows.filter((row) => row.description);

  return (
    <section className={`${elevatedBlockClass} p-4 sm:p-5`} aria-labelledby="business-mix-shift-heading">
      <p className={labelClass}>{hasChart ? "Mix shift" : "Revenue mix"}</p>
      <h3 id="business-mix-shift-heading" className="mt-2 break-words text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-[22px]">{view.headline}</h3>
      {summary ? <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-foreground/70">{summary}</p> : null}

      <div className={`mt-5 grid gap-x-8 gap-y-5 ${hasChart ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" : ""}`}>
        {hasChart ? <MixLines view={view} colorOf={colorOf} /> : null}
        <table className="w-full self-center text-[13px]">
          <thead>
            <tr className={`text-left text-[10px] font-semibold uppercase tracking-[0.14em] ${quietClass}`}>
              <th scope="col" className="pb-2 font-semibold" colSpan={2}>{latestYear ? `${latestYear} share` : "Share"}</th>
              {hasChange ? <th scope="col" className="pb-2 text-right font-semibold">Since {view.years[0]}</th> : null}
              {hasMargin ? <th scope="col" className="pb-2 text-right font-semibold">Margin</th> : null}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => {
              const delta = row.first != null && row.latest != null ? Math.round(row.latest - row.first) : null;
              return (
                <tr key={row.name} className="border-t border-border/35 align-baseline">
                  <td className="w-px whitespace-nowrap py-2 pr-3 font-bold tabular-nums text-foreground">
                    <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(row.name) }} />
                    {row.latest != null ? percent(row.latest) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-foreground/85">
                    <span className="break-words">{row.name}</span>
                    {row.derived ? <span title={DERIVED_SHARE_TITLE} className={`ml-1.5 text-[10px] ${quietClass}`}>derived</span> : null}
                  </td>
                  {hasChange ? <td className={`whitespace-nowrap py-2 pl-2 text-right tabular-nums ${quietClass}`}>{delta == null ? "—" : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta)} pts`}</td> : null}
                  {hasMargin ? <td className={`whitespace-nowrap py-2 pl-3 text-right ${quietClass}`}>{row.margin ?? "—"}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {children || described.length > 0 ? (
        <details className="group mt-4">
          <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-sm text-xs font-medium text-foreground/60 underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            Segment revenue history
            <ChevronDown className="h-3 w-3 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
          </summary>
          <div className="mt-3 space-y-3">
            {described.length > 0 ? (
              <dl className="grid gap-x-8 sm:grid-cols-2">
                {described.map((row) => (
                  <div key={row.name} className="min-w-0 border-t border-border/35 py-3">
                    <dt className="text-[13px] font-semibold text-foreground">{row.name}</dt>
                    <dd className={`mt-1 break-words text-xs leading-relaxed ${quietClass}`}>{row.description}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {children}
          </div>
        </details>
      ) : null}
    </section>
  );
}
