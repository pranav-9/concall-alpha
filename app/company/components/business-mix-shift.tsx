import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { NormalizedRevenueBreakdownItem, NormalizedRevenueHistoryBySegment, NormalizedRevenueMixHistoryBySegment } from "@/lib/business-snapshot/types";
import { buildBusinessMixPeriods } from "@/lib/business-snapshot/mix-history";
import { DERIVED_SHARE_TITLE, isDerivedShare } from "@/lib/business-snapshot/revenue-share-basis";
import { colorPalette } from "./business-segment-mix-constants";
import { elevatedBlockClass } from "./surface-tokens";

const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const percent = (value: number) => `${numberFormatter.format(value)}%`;
const keyOf = (name: string) => name.trim().toLowerCase();
const marginLabels: Record<string, string> = { high_margin: "High margin", improving: "Improving", pre_scale: "Pre-scale", drag: "Margin drag" };
const quietClass = "text-foreground/60";
const GEOGRAPHY_OR_TOTAL = /\b(domestic|export|exports|india|overseas|international|global|rest of (the )?world|asia|europe|america|africa|middle east|gulf|uae|usa|us|uk|china|japan|consolidated|total)\b/i;
const labelClass = `text-[11px] font-semibold uppercase tracking-[0.14em] ${quietClass}`;

export type MixShiftView = {
  headline: string;
  /** One templated sentence under the headline: the move in numbers, margin, growth vs the company, who gave up share. */
  summary: string | null;
  /** The mover's share change in points, shown large beside the headline. */
  stat: { points: number; label: string; from: string; to: string } | null;
  /** Periods on the chart's x axis, oldest first; empty when there is no comparable history to draw. */
  years: string[];
  /** Largest latest share first. `points` holds one share per chart year (null = not disclosed that year). */
  rows: { name: string; latest: number | null; first: number | null; points: (number | null)[]; margin: string | null; derived: boolean; description: string | null }[];
  /** Business segments on a different axis from the history (KRN: the history is domestic vs export,
   * the segments are product lines). Shown as their own list so the product cards are not dropped. */
  lines?: { name: string; share: number | null; derived: boolean; description: string | null }[];
};

// Shares read as everyday fractions ("under a third", "nearly half"). A share too small or too
// large to name this way returns null and the headline falls back to the plain percentages.
const FRACTIONS: [number, string][] = [
  [10, "a tenth"], [20, "a fifth"], [25, "a quarter"], [100 / 3, "a third"], [40, "two-fifths"], [50, "half"],
  [60, "three-fifths"], [200 / 3, "two-thirds"], [75, "three-quarters"], [80, "four-fifths"], [90, "nine-tenths"],
];
export function shareInWords(value: number, arrivingFromBelow = false): string | null {
  if (value < 7 || value > 94) return null;
  const [anchor, word] = FRACTIONS.reduce((best, entry) => (Math.abs(entry[0] - value) < Math.abs(best[0] - value) ? entry : best));
  const gap = value - anchor;
  if (Math.abs(gap) <= 1.5) return word === "half" ? "about half" : `about ${word}`;
  return gap < 0 ? `${arrivingFromBelow ? "nearly" : "under"} ${word}` : `over ${word}`;
}

const marginClauses: Record<string, string> = {
  "High margin": ", a high-margin segment",
  Improving: ", where margins are improving",
  "Pre-scale": ", a segment still short of scale",
  "Margin drag": ", a drag on margins",
};

/** Annual revenue growth between two chart years, for one segment and for the company (the total
 * row, else the sum of segments when every one is disclosed in both years). */
function growthAgainstCompany(revenue: NormalizedRevenueHistoryBySegment | null, name: string, from: string, to: string, spanYears: number) {
  if (!revenue || spanYears < 1) return null;
  const rate = (start: number | null | undefined, end: number | null | undefined) =>
    typeof start === "number" && typeof end === "number" && start > 0 && end > 0 ? (Math.pow(end / start, 1 / spanYears) - 1) * 100 : null;
  const segments = revenue.rows.filter((row) => !row.isTotal);
  const row = segments.find((candidate) => keyOf(candidate.segment) === keyOf(name));
  const total = revenue.rows.find((candidate) => candidate.isTotal);
  const sum = (year: string) => {
    const values = segments.map((segment) => segment.revenueByYear[year]);
    return values.length > 0 && values.every((value) => typeof value === "number") ? values.reduce<number>((acc, value) => acc + (value as number), 0) : null;
  };
  const segmentRate = rate(row?.revenueByYear[from], row?.revenueByYear[to]);
  const companyRate = rate(total?.revenueByYear[from] ?? sum(from), total?.revenueByYear[to] ?? sum(to));
  return segmentRate != null && companyRate != null ? { segmentRate, companyRate } : null;
}
const yearNumber = (label: string) => Number(label.match(/(\d{2,4})\s*$/)?.[1] ?? NaN);

/** The whole card is derived here: the chart draws only years whose disclosed shares are comparable
 * (see buildBusinessMixPeriods), and the headline names the segment whose share moved the most. */
export function buildMixShiftView(
  segments: NormalizedRevenueBreakdownItem[],
  history: NormalizedRevenueMixHistoryBySegment | null,
  revenue: NormalizedRevenueHistoryBySegment | null = null,
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
    const moves = rows
      .flatMap((row) => (row.first != null && row.latest != null ? [{ ...row, first: row.first, latest: row.latest, delta: row.latest - row.first }] : []))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    // The story is what is growing: the biggest gainer leads unless a decline dwarfs it (a catch-all "Others" line never leads this way).
    const gainer = moves.filter((move) => !/^others?\b/i.test(move.name.trim())).sort((a, b) => b.delta - a.delta)[0];
    const mover = gainer && moves[0] && gainer.delta >= 0.6 * Math.abs(moves[0].delta) ? gainer : moves[0];
    const years = periods.map((period) => period.year);
    const [from, to] = [years[0], years[years.length - 1]];
    // A geographic (domestic / export / region) or total-only history describes a different axis from
    // product segments, so the segments are kept as their own list. Name matching alone is not enough:
    // most mismatches are the same axis named twice ("CEM" vs "Contract/Exclusive Manufacturing (CEM)").
    const historyKeys = new Set(names.map(keyOf));
    const lines = segments.length > 0 && names.every((name) => GEOGRAPHY_OR_TOTAL.test(name))
      && segments.every((segment) => !historyKeys.has(keyOf(segment.name)))
      ? [...segments]
          .sort((a, b) => (b.revenueSharePercent ?? -1) - (a.revenueSharePercent ?? -1))
          .map((segment) => ({ name: segment.name, share: segment.revenueSharePercent, derived: isDerivedShare(segment), description: segment.description ?? null }))
      : [];
    if (!mover || Math.abs(Math.round(mover.delta)) < 2) {
      return { headline: `The revenue mix has barely moved since ${from}.`, summary: null, stat: null, years, rows, lines };
    }
    const rose = mover.delta > 0;
    const [before, after] = [shareInWords(mover.first), shareInWords(mover.latest, rose)];
    // Words only for a move big enough that the two fractions read as different places.
    const headline = Math.abs(mover.delta) >= 7 && before && after && before !== after
      ? `${mover.name} has gone from ${before} of revenue to ${after}.`
      : `${mover.name} has ${rose ? "grown" : "shrunk"} from ${percent(mover.first)} to ${percent(mover.latest)} of revenue.`;

    // The sentence under it: the same move in numbers, then whatever else the data can add.
    const span = yearNumber(to) - yearNumber(from);
    const growth = growthAgainstCompany(revenue, mover.name, from, to, Number.isFinite(span) ? span : 0);
    const other = rows
      .flatMap((row) => (row.name !== mover.name && row.first != null && row.latest != null ? [{ ...row, first: row.first, latest: row.latest, delta: row.latest - row.first }] : []))
      .filter((row) => (rose ? row.delta <= -2 : row.delta >= 2))
      .sort((a, b) => (rose ? a.delta - b.delta : b.delta - a.delta))[0];
    const whileOther = other ? `, while ${other.name} ${rose ? "fell" : "rose"} from ${percent(other.first)} to ${percent(other.latest)}` : "";
    const move = `${mover.name} ${rose ? "rose" : "fell"} from ${percent(mover.first)} of revenue in ${from} to ${percent(mover.latest)} in ${to}${marginClauses[mover.margin ?? ""] ?? ""}`;
    const summary = growth
      ? `${move}. Its revenue ${Math.abs(growth.segmentRate) < 0.5 ? "was flat" : `${growth.segmentRate > 0 ? "grew" : "fell"} about ${percent(Math.abs(growth.segmentRate))}${span > 1 ? " a year" : ""}`} against the company's ${growth.companyRate < 0 ? "−" : ""}${percent(Math.abs(growth.companyRate))}${whileOther}.`
      : `${move}${whileOther}.`;
    return {
      headline,
      summary,
      stat: { points: Math.round(mover.delta), label: `${mover.name} share`, from, to },
      years,
      rows,
      lines,
    };
  }

  if (segments.length === 0) return null;
  const rows = [...segments]
    .sort((a, b) => (b.revenueSharePercent ?? -1) - (a.revenueSharePercent ?? -1))
    .map((segment) => ({ name: segment.name, latest: segment.revenueSharePercent, first: null, points: [], ...extras(segment.name) }));
  const top = rows[0];
  return {
    headline: top.latest != null ? `${top.name} is ${percent(top.latest)} of revenue.` : "Where the revenue comes from.",
    summary: null,
    stat: null,
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
export function BusinessMixShift({ segments, history, revenue = null, summary, children }: {
  segments: NormalizedRevenueBreakdownItem[];
  history: NormalizedRevenueMixHistoryBySegment | null;
  revenue?: NormalizedRevenueHistoryBySegment | null;
  /** A stored mix-shift sentence, when the snapshot has one, replaces the templated one. */
  summary: string | null;
  children?: ReactNode;
}) {
  const view = buildMixShiftView(segments, history, revenue);
  if (!view) return children ? <>{children}</> : null;
  const colorOf = (name: string) => colorPalette[view.rows.findIndex((row) => row.name === name) % colorPalette.length];
  const hasChart = view.years.length >= 2;
  const latestYear = hasChart ? view.years[view.years.length - 1] : null;
  const subline = summary ?? view.summary;
  const hasMargin = view.rows.some((row) => row.margin);
  const lines = view.lines ?? [];
  const described = [...view.rows, ...lines].filter((row) => row.description);

  return (
    <section className={`${elevatedBlockClass} p-4 sm:p-5`} aria-labelledby="business-mix-shift-heading">
      <p className={labelClass}>{hasChart ? "Mix shift" : "Revenue mix"}</p>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0 max-w-3xl">
          <h3 id="business-mix-shift-heading" className="mt-2 break-words text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-[22px]">{view.headline}</h3>
          {subline ? <p className="mt-2 text-[13px] leading-relaxed text-foreground/70">{subline}</p> : null}
        </div>
        {view.stat ? (
          <div className="flex min-w-0 items-center gap-3">
            {/* Emerald is the accent for a gain, not a verdict; a loss is drawn neutral. */}
            <p className={`flex shrink-0 items-baseline gap-1 ${view.stat.points < 0 ? "text-foreground" : "text-emerald-700 dark:text-emerald-400/80"}`}>
              <span className="text-[26px] font-bold leading-none tracking-tighter tabular-nums">{view.stat.points > 0 ? "+" : "−"}{Math.abs(view.stat.points)}</span>
              <span className="text-[13px] font-semibold">pts</span>
            </p>
            <p className={`max-w-[11rem] break-words text-xs leading-snug ${quietClass}`}>
              {view.stat.label},{" "}
              <span className="inline-block">{view.stat.from}<span aria-hidden> → </span><span className="sr-only"> to </span>{view.stat.to}</span>
            </p>
          </div>
        ) : null}
      </div>

      <div className={`mt-5 grid gap-x-8 gap-y-5 ${hasChart ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" : ""}`}>
        {hasChart ? <MixLines view={view} colorOf={colorOf} /> : null}
        <table className="w-full self-center text-[13px]">
          <thead>
            <tr className={`text-left text-[10px] font-semibold uppercase tracking-[0.14em] ${quietClass}`}>
              <th scope="col" className="pb-2 font-semibold" colSpan={2}>{latestYear ? `${latestYear} share` : "Share"}</th>
              {hasMargin ? <th scope="col" className="pb-2 text-right font-semibold">Margin</th> : null}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
                <tr key={row.name} className="border-t border-border/35 align-baseline">
                  <td className="w-px whitespace-nowrap py-2 pr-3 font-bold tabular-nums text-foreground">
                    <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(row.name) }} />
                    {row.latest != null ? percent(row.latest) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-foreground/85">
                    <span className="break-words">{row.name}</span>
                    {row.derived ? <span title={DERIVED_SHARE_TITLE} className={`ml-1.5 text-[10px] ${quietClass}`}>derived</span> : null}
                  </td>
                  {hasMargin ? <td className={`whitespace-nowrap py-2 pl-3 text-right ${quietClass}`}>{row.margin ?? "—"}</td> : null}
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lines.length > 0 ? (
        <div className="mt-5">
          <p className={labelClass}>By product line</p>
          <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
            {lines.map((line) => (
              <li key={line.name} className="flex min-w-0 items-baseline gap-3 border-t border-border/35 py-2 text-[13px]">
                <span className="w-10 shrink-0 font-bold tabular-nums text-foreground">{line.share != null ? percent(line.share) : "—"}</span>
                <span className="min-w-0 break-words text-foreground/85">{line.name}</span>
                {line.derived ? <span title={DERIVED_SHARE_TITLE} className={`text-[10px] ${quietClass}`}>derived</span> : null}
              </li>
            ))}
          </ul>
          {lines.some((line) => line.share == null) ? (
            <p className={`mt-2 text-[11px] leading-snug ${quietClass}`}>— the company does not split revenue for this line.</p>
          ) : null}
        </div>
      ) : null}

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
