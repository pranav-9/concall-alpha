// The season at a glance: one square per covered company, stacked on the day
// its board meets to approve the quarter's results. Filled squares are scored
// (band colour, hatched when the score came off a third-party transcript),
// outlined ones are still waiting — bold ink once the board has met, a hairline
// while the date is still ahead. Weekends are shaded, today is marked, and the
// companies with no date on file are counted at the edge.
//
// Server-rendered CSS, not an SVG: the day columns flex to the card's width on
// a desktop and fall back to a fixed 15px each (horizontal scroll) on a phone,
// which no viewBox can do without distorting the squares.

import Link from "next/link";

import { cn } from "@/lib/utils";
import { BANDS, bandForScore } from "@/lib/score-band";
import { formatScoredAt } from "@/lib/score-freshness";

import { SeasonScroller } from "./season-scroller";
import {
  callLabel,
  formatDay,
  formatTick,
  type SeasonCell,
  type SeasonChart,
  type SeasonDay,
} from "./season";

/** Square edge + the gap under it; the column height is this × the tallest stack. */
const SQUARE = 12;
const GAP = 2;
const ROW = SQUARE + GAP;
const MIN_ROWS = 10;
/** Narrowest a day column gets before the chart scrolls instead. */
const MIN_COLUMN = 15;

const WEEKEND_BAND = "bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]";
const TODAY_BAND = "bg-[color-mix(in_srgb,var(--mark)_18%,transparent)]";
const SET_OUTLINE = "border border-[color-mix(in_srgb,var(--ink-soft)_60%,transparent)]";

const hatch = (hex: string) =>
  `repeating-linear-gradient(135deg, ${hex} 0 1.5px, transparent 1.5px 4.5px)`;

function cellTitle(cell: SeasonCell): string {
  const { entry, state, placedByScore } = cell;
  const bits: string[] = [entry.name];
  if (entry.score != null) {
    bits.push(`${entry.score.toFixed(1)} ${BANDS[bandForScore(entry.score)].label}`);
    if (state === "unofficial") bits.push("third-party transcript, re-scored when the official lands");
    if (placedByScore) bits.push("no results date on file; shown on the day it was scored");
    else if (entry.resultsDate) bits.push(`results ${formatDay(entry.resultsDate)}`);
    const at = formatScoredAt(entry.scoredAt);
    if (at) bits.push(`scored ${at}`);
  } else if (state === "pending") {
    bits.push(`results out ${formatDay(entry.resultsDate!)}`, "score pending");
  } else {
    bits.push(`results ${formatDay(entry.resultsDate!)}`);
    const call = callLabel(entry);
    if (!call.muted) bits.push(call.text.replace(/^Call /, "call "));
  }
  return bits.join(" · ");
}

function Square({ cell }: { cell: SeasonCell }) {
  const { entry, state } = cell;
  const band = entry.score != null ? BANDS[bandForScore(entry.score)] : null;
  const title = cellTitle(cell);
  const base =
    "relative block shrink-0 rounded-[2px] transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal)]";
  let cls = "";
  let style: React.CSSProperties | undefined;
  if (state === "scored" && band) {
    cls = band.barClass;
  } else if (state === "unofficial" && band) {
    cls = "border";
    style = { borderColor: band.chartHex, backgroundImage: hatch(band.chartHex) };
  } else if (state === "pending") {
    cls = "border-[1.5px] border-[var(--ink)]";
  } else {
    cls = SET_OUTLINE;
  }
  return (
    <Link
      href={`/company/${encodeURIComponent(entry.code)}${entry.score != null ? "#sentiment-score" : ""}`}
      prefetch={false}
      title={title}
      aria-label={title}
      className={cn(base, cls)}
      style={{ width: SQUARE, height: SQUARE, ...style }}
    />
  );
}

function DayColumn({ day }: { day: SeasonDay }) {
  return (
    <div
      data-today={day.today || undefined}
      className="relative flex min-w-0 flex-1 flex-col-reverse items-center justify-start"
      style={{ rowGap: GAP, paddingBottom: GAP + 1 }}
    >
      {day.weekend ? <span aria-hidden className={cn("absolute inset-0", WEEKEND_BAND)} /> : null}
      {day.today ? (
        <>
          <span aria-hidden className={cn("absolute inset-0", TODAY_BAND)} />
          <span className="house-data absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.16em] text-[var(--ink)]">
            Today
          </span>
        </>
      ) : null}
      {day.cells.map((cell) => (
        <Square key={cell.entry.code} cell={cell} />
      ))}
    </div>
  );
}

function Legend() {
  const swatch = "inline-block h-[10px] w-[10px] shrink-0 rounded-[2px]";
  return (
    <ul className="house-data flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--ink-soft)]">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className={cn(swatch, BANDS.strongly_bullish.barClass)} />
        Scored
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden
          className={cn(swatch, "border")}
          style={{
            borderColor: BANDS.strongly_bullish.chartHex,
            backgroundImage: hatch(BANDS.strongly_bullish.chartHex),
          }}
        />
        Unofficial transcript
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className={cn(swatch, "border-[1.5px] border-[var(--ink)]")} />
        Results out, score pending
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className={cn(swatch, SET_OUTLINE)} />
        Date set
      </li>
    </ul>
  );
}

export function SeasonChartCard({
  chart,
  freshCompanies,
  unofficialCompanies,
}: {
  chart: SeasonChart;
  freshCompanies: number;
  unofficialCompanies: number;
}) {
  const rows = Math.max(chart.rows, MIN_ROWS);
  const height = rows * ROW + GAP + 1;
  const minWidth = chart.days.length * MIN_COLUMN;
  const undated = chart.undated.length;

  return (
    <section
      aria-labelledby="season-chart-heading"
      className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[var(--rule)] px-4 py-3">
        <h2
          id="season-chart-heading"
          className="house-data text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]"
        >
          Results by board-meeting date
        </h2>
        <Legend />
      </div>

      <div className="flex items-stretch px-4 pb-2 pt-3">
        {/* `relative` so a column's offsetLeft is measured from the scroller. */}
        <SeasonScroller className="relative min-w-0 flex-1 overflow-x-auto pt-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex" style={{ height, minWidth }}>
            {chart.days.map((day) => (
              <DayColumn key={day.date} day={day} />
            ))}
          </div>
          <div className="flex border-t border-[var(--rule)]" style={{ minWidth }}>
            {chart.days.map((day) => (
              <div key={day.date} className="relative h-5 min-w-0 flex-1">
                {day.monday ? (
                  <>
                    <span aria-hidden className="absolute left-0 top-0 h-[5px] w-px bg-[var(--ink-soft)]" />
                    <span className="house-data absolute left-1 top-1.5 whitespace-nowrap text-[9.5px] text-[var(--ink-soft)]">
                      {formatTick(day.date)}
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </SeasonScroller>

        <div className="ml-4 hidden shrink-0 flex-col justify-center border-l border-[var(--rule)] pl-5 sm:flex">
          <span className="house-display text-[28px] leading-none text-[var(--ink)]">{undated}</span>
          <span className="house-data mt-1.5 text-[9px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Date TBA
          </span>
        </div>
      </div>

      <p className="border-t border-[var(--rule)] px-4 py-2.5 text-[12px] leading-[1.5] text-[var(--ink-soft)]">
        {freshCompanies > 0 ? (
          <>
            <span className="font-semibold text-[var(--ink)]">{freshCompanies}</span> scored in the last 24
            hours.
          </>
        ) : (
          <>Nothing scored in the last 24 hours.</>
        )}
        {unofficialCompanies > 0 ? (
          <>
            {" "}
            <span className="font-semibold text-[var(--ink)]">{unofficialCompanies}</span>{" "}
            {unofficialCompanies === 1 ? "sits" : "sit"} on a third-party transcript and will be re-scored
            when the issuer files its own.
          </>
        ) : null}
        <span className="sm:hidden">
          {" "}
          <span className="font-semibold text-[var(--ink)]">{undated}</span> without a date yet.
        </span>
      </p>
    </section>
  );
}
