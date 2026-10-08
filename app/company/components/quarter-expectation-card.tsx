"use client";

import { formatDay, formatTime, istToday, relativeDay } from "@/app/quarter-tracker/season";
import type { QuarterExpectationView } from "@/lib/quarter-expectation/build";
import type { RationaleLine } from "@/lib/quarter-expectation/updates";
import type {
  ExpectationRow,
  ExpectationRowSource,
  ExpectationSetup,
  ExpectedEarningsLine,
  ExpectedUpdate,
  ExpectedUpdateKind,
  ExpectedUpdateLean,
} from "@/lib/quarter-expectation/types";
import { BANDS, bandForScore } from "@/lib/score-band";
import { cn } from "@/lib/utils";

import { chipClass } from "./chip-tone";
import { elevatedBlockClassFromSm } from "./surface-tokens";

// "Before the Q2 FY27 call" — the top of the ConcallScore section while the
// quarter in season is unscored. Two blocks, in reading order:
//
//   What could be major   up to three items the call has to speak to, each
//                         with the way it leans (upside / downside / open),
//                         the tab it came from and, for a filing, its date.
//   Expectations          a table of ranges for the quarter against the
//                         year-ago print — revenue, EBITDA margin, EBITDA,
//                         net profit — each row naming its source (the
//                         issuer's guide, the run-rate, or arithmetic on the
//                         two). The ConcallScore's own 4Q average closes the
//                         table as a reference, never a forecast.
//
// Everything is derived (lib/quarter-expectation) and attributed. Once the
// quarter is scored the card steps aside: the "vs 4Q avg" line in "Where it
// sits" carries the comparison from then on.

const SOURCE_LABEL: Record<ExpectedUpdateKind, string> = {
  due: "Guidance",
  progress: "Guidance",
  catalyst: "Growth",
  variable: "Key variables",
  fix: "Last call",
  filing: "Filing",
};

const LEAN_META: Record<ExpectedUpdateLean, { label: string; glyph: string; className: string }> = {
  upside: { label: "Upside", glyph: "▲", className: "text-emerald-500 dark:text-emerald-400" },
  downside: { label: "Downside", glyph: "▼", className: "text-rose-500 dark:text-rose-400" },
  open: { label: "Open", glyph: "◆", className: "text-amber-500 dark:text-amber-400" },
};

const ROW_SOURCE_LABEL: Record<ExpectationRowSource, string> = {
  guide: "Guide",
  run_rate: "Run-rate",
  guide_run_rate: "Guide + run-rate",
  implied: "Implied",
};

const ROW_FAMILY: Record<ExpectationRow["key"], ExpectedEarningsLine["family"]> = {
  revenue: "growth",
  ebitda: "growth",
  net_profit: "growth",
  ebitda_margin: "margin",
};

const MAJOR_VISIBLE = 3;

const eyebrowClass = "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
const metaClass = "font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground";

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const fmtCr = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
// A change reads as a band, not a measurement: whole points from ten up, one
// decimal below ("+14–25%", "+2.7%").
const fmtDelta = (n: number) => (Math.abs(n) >= 10 ? String(Math.round(Math.abs(n))) : fmtNum(Math.abs(n)));
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmtDelta(n)}`;
/** "18 Sep" — the day without its weekday, for a meta line. */
const shortDay = (iso: string) => formatDay(iso).replace(/^[A-Za-z]{3}\s/, "");
const EN_DASH = "–";

/** "₹238–253 cr" | "18.5–19.5%" — a point when lo === hi. */
const fmtRange = (row: ExpectationRow): string => {
  const same = row.lo === row.hi;
  if (row.unit === "cr") return `₹${fmtCr(row.lo)}${same ? "" : `${EN_DASH}${fmtCr(row.hi)}`} cr`;
  return `${fmtNum(row.lo)}${same ? "" : `${EN_DASH}${fmtNum(row.hi)}`}%`;
};

const fmtYearAgo = (row: ExpectationRow): string =>
  row.unit === "cr" ? `₹${fmtCr(row.yearAgo)} cr` : `${fmtNum(row.yearAgo)}%`;

/** "+30–38%" | "+60 to +160 bps" | "−4%" — a point when lo === hi. */
const fmtChange = (row: ExpectationRow): string => {
  const { lo, hi, unit } = row.change;
  if (unit === "bps") {
    return lo === hi ? `${signed(lo)} bps` : `${signed(lo)} to ${signed(hi)} bps`;
  }
  if (lo === hi) return `${signed(lo)}%`;
  // Same sign: one sign, one dash. Straddling zero: both signed.
  return lo >= 0 === hi >= 0 ? `${signed(lo)}${EN_DASH}${fmtDelta(hi)}%` : `${signed(lo)} to ${signed(hi)}%`;
};

type ChangeTone = "up" | "down" | "mixed" | "flat";
const changeTone = (row: ExpectationRow): ChangeTone => {
  const { lo, hi } = row.change;
  if (lo === 0 && hi === 0) return "flat";
  if (lo >= 0) return "up";
  if (hi <= 0) return "down";
  return "mixed";
};

const TONE_META: Record<ChangeTone, { glyph: string; word: string; className: string }> = {
  up: { glyph: "▲", word: "YoY up", className: "text-emerald-600 dark:text-emerald-400" },
  down: { glyph: "▼", word: "YoY down", className: "text-rose-600 dark:text-rose-400" },
  mixed: { glyph: "◆", word: "YoY either way", className: "text-amber-600 dark:text-amber-400" },
  flat: { glyph: "•", word: "YoY flat", className: "text-muted-foreground" },
};

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function SetupChips({ setup }: { setup: ExpectationSetup }) {
  const chips = setup.items
    .map((item) =>
      item.kind === "divergence"
        ? { key: "divergence", label: "Score and outlook disagree", title: item.detail }
        : item.kind === "trajectory"
          ? { key: "trajectory", label: "Trail falling", title: item.detail }
          : null,
    )
    .filter((c): c is { key: string; label: string; title: string } => c != null);
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((chip) => (
        <span key={chip.key} title={chip.title} className={cn(chipClass("amber"), "px-2 py-0.5 text-[10px]")}>
          {chip.label}
        </span>
      ))}
    </>
  );
}

function DateLine({ view, today }: { view: QuarterExpectationView; today: string }) {
  const { calendar, state } = view;
  const parts: React.ReactNode[] = [];
  if (calendar?.resultsDate) {
    parts.push(
      <span key="results">
        {state === "pending" ? "Reported " : "Results "}
        <span className="text-foreground">{formatDay(calendar.resultsDate)}</span>
        {` · ${relativeDay(today, calendar.resultsDate).toLowerCase()}`}
        {state === "pending" ? " · score pending" : null}
      </span>,
    );
  } else {
    parts.push(<span key="results">Results date not announced</span>);
  }
  if (calendar?.callDate) {
    const when = `${formatDay(calendar.callDate)}${calendar.callTime ? `, ${formatTime(calendar.callTime)} IST` : ""}`;
    parts.push(
      <span key="call">
        Call{" "}
        {calendar.callUrl ? (
          <a href={calendar.callUrl} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
            {when}
          </a>
        ) : (
          <span className="text-foreground">{when}</span>
        )}
      </span>,
    );
  } else if (calendar?.callUnreadable && calendar.callUrl) {
    parts.push(
      <a key="call" href={calendar.callUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
        Call invite filed
      </a>,
    );
  } else if (calendar?.resultsDate) {
    parts.push(<span key="call">Call not announced</span>);
  }
  if (view.unscoredPriorLabel) {
    parts.push(<span key="gap">{view.unscoredPriorLabel} was not scored</span>);
  }
  return (
    <p className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 ? <span aria-hidden>·</span> : null}
          {part}
        </span>
      ))}
    </p>
  );
}

// ---------------------------------------------------------------------------
// What could be major
// ---------------------------------------------------------------------------

function MajorItem({ update }: { update: ExpectedUpdate }) {
  const lean = LEAN_META[update.lean];
  const linked = update.sectionId !== "sentiment-score";
  const meta = [lean.label, SOURCE_LABEL[update.kind], update.dated ? shortDay(update.dated) : null].filter(Boolean);
  const body = (
    <>
      <span aria-hidden className={cn("mt-[3px] w-3 shrink-0 text-[10px] leading-none", lean.className)}>
        {lean.glyph}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground" title={update.detail ?? undefined}>
          {update.heading}
        </span>
        <span className={metaClass}>{meta.join(" · ")}</span>
        {update.detail && update.kind !== "filing" ? (
          <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{update.detail}</span>
        ) : null}
      </span>
    </>
  );
  const cellClass = "flex min-h-11 items-start gap-2.5 px-3 py-3";
  return linked ? (
    <a href={`#${update.sectionId}`} className={cn(cellClass, "rounded-md hover:bg-accent/60")} aria-label={`${update.heading} — ${meta.join(", ")}`}>
      {body}
    </a>
  ) : (
    <div className={cellClass}>{body}</div>
  );
}

function WhatCouldBeMajor({ updates }: { updates: ExpectedUpdate[] }) {
  const head = updates.slice(0, MAJOR_VISIBLE);
  const tail = updates.slice(MAJOR_VISIBLE);
  return (
    <div className="flex flex-col gap-2">
      <p className={eyebrowClass}>What could be major</p>
      {updates.length === 0 ? (
        <p className="text-[11px] italic text-muted-foreground">
          Nothing flagged going in — no guidance due, no dated catalyst, no material filing this quarter.
        </p>
      ) : (
        <>
          <ul
            className={cn(
              "grid grid-cols-1 divide-y divide-border/30 rounded-md border border-border/25 bg-background/45",
              head.length > 1 && "lg:divide-x lg:divide-y-0",
              head.length === 2 && "lg:grid-cols-2",
              head.length >= 3 && "lg:grid-cols-3",
            )}
          >
            {head.map((u, i) => (
              <li key={`${u.kind}-${i}`} className="min-w-0">
                <MajorItem update={u} />
              </li>
            ))}
          </ul>
          {tail.length > 0 ? (
            <details className="group">
              <summary className="cursor-pointer list-none py-0.5 text-[11px] font-medium text-foreground/80 hover:underline">
                <span className="group-open:hidden">{tail.length} more to listen for</span>
                <span className="hidden group-open:inline">Fewer</span>
              </summary>
              <ul className="mt-1 grid grid-cols-1 divide-y divide-border/30 rounded-md border border-border/25 bg-background/45">
                {tail.map((u, i) => (
                  <li key={`${u.kind}-${i}`} className="min-w-0">
                    <MajorItem update={u} />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expectations table
// ---------------------------------------------------------------------------

const rowGridClass =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 py-2.5 sm:grid-cols-[8.5rem_minmax(7.5rem,auto)_minmax(0,1fr)_auto] sm:items-baseline sm:py-3";

function ExpectationRowView({ row }: { row: ExpectationRow }) {
  const tone = TONE_META[changeTone(row)];
  const source = ROW_SOURCE_LABEL[row.source];
  const sourceEl = row.sectionId ? (
    <a href={`#${row.sectionId}`} className={cn(metaClass, "hover:text-foreground hover:underline")}>
      {source}
    </a>
  ) : (
    <span className={metaClass}>{source}</span>
  );
  return (
    <li className={rowGridClass}>
      <span className="text-[13px] font-medium text-foreground">{row.label}</span>
      <span className="justify-self-end sm:order-last">{sourceEl}</span>
      <span className="col-span-2 text-[18px] font-semibold tabular-nums leading-tight text-foreground sm:col-span-1">
        {fmtRange(row)}
      </span>
      <span className="col-span-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:col-span-1">
        <span className={cn("text-[15px] font-semibold tabular-nums leading-tight", tone.className)}>
          <span aria-hidden className="mr-1 text-[10px]">
            {tone.glyph}
          </span>
          {fmtChange(row)}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {tone.word} · from {fmtYearAgo(row)}
        </span>
      </span>
    </li>
  );
}

// The text fallback: a guide on file but no year-ago print to size it against.
function GuideLineView({ line }: { line: ExpectedEarningsLine }) {
  const label = `${line.segment ? `${line.segment} ` : ""}${line.metricLabel}`;
  return (
    <li className={rowGridClass}>
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      <span className="justify-self-end sm:order-last">
        <a href={`#${line.sectionId}`} className={cn(metaClass, "hover:text-foreground hover:underline")}>
          Guide
        </a>
      </span>
      <span className="col-span-2 line-clamp-2 text-[18px] font-semibold tabular-nums leading-tight text-foreground sm:col-span-1">
        {line.valueLabel}
      </span>
      <span className="col-span-2 font-mono text-[11px] text-muted-foreground sm:col-span-1">
        {line.horizonLabel ? `for ${line.horizonLabel}` : "horizon not stated"}
      </span>
    </li>
  );
}

function TrailRow({ view }: { view: QuarterExpectationView }) {
  const { baseline } = view;
  if (!baseline.ok) {
    const miss = baseline.miss;
    return (
      <li className={rowGridClass}>
        <span className="text-[13px] font-medium text-foreground">ConcallScore</span>
        <span className="justify-self-end sm:order-last">
          <span className={metaClass}>4Q avg</span>
        </span>
        <span className="col-span-2 font-mono text-[11px] text-muted-foreground sm:col-span-2">
          {miss.reason === "too_few"
            ? `Trail too short to read — ${miss.scoredQuarters === 0 ? "no" : miss.scoredQuarters} scored ${miss.scoredQuarters === 1 ? "quarter" : "quarters"}, four needed.`
            : `Trail too old to read — last scored ${miss.latestLabel}.`}
        </span>
      </li>
    );
  }
  const { value } = baseline;
  const first = value.quarters[0]?.label;
  const last = value.quarters[value.quarters.length - 1]?.label;
  return (
    <li className={rowGridClass}>
      <span className="text-[13px] font-medium text-foreground">ConcallScore</span>
      <span className="justify-self-end sm:order-last">
        <span className={metaClass}>4Q avg</span>
      </span>
      <span className="col-span-2 text-[18px] font-semibold tabular-nums leading-tight text-foreground sm:col-span-1">
        {value.low.toFixed(1)}
        {EN_DASH}
        {value.high.toFixed(1)}
      </span>
      <span className="col-span-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:col-span-1">
        <span className="text-[15px] font-semibold tabular-nums leading-tight text-foreground/85">
          {value.baseline.toFixed(1)} ± {value.band.toFixed(1)}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {BANDS[bandForScore(value.baseline)].label} · {first}
          {EN_DASH}
          {last}
        </span>
      </span>
    </li>
  );
}

function Expectations({ view }: { view: QuarterExpectationView }) {
  const { earnings, target } = view;
  const rows = earnings?.rows ?? [];
  // A text line stands in only for a family the table could not size from a
  // guide (no year-ago print, or a yield guide — which has no row).
  const guidedFamilies = new Set(rows.filter((r) => r.sectionId).map((r) => ROW_FAMILY[r.key]));
  const lines = (earnings?.lines ?? []).filter((l) => !guidedFamilies.has(l.family));
  const heading = earnings?.yearAgoLabel ? `Expectations · ${target.label} vs ${earnings.yearAgoLabel}` : `Expectations · ${target.label}`;
  const notes: string[] = [];
  if (rows.some((r) => r.source === "guide" || r.source === "guide_run_rate") || lines.length > 0) {
    notes.push("Guides are for the year; how the quarter phases is yours to judge.");
  }
  if (rows.some((r) => r.source === "run_rate" || r.source === "guide_run_rate") && earnings?.runRate) {
    notes.push(`Run-rate is the average of the last ${earnings.runRate.yoyPairs} quarters' YoY, to ${earnings.runRate.latestLabel}.`);
  }
  if (rows.some((r) => r.source === "implied")) notes.push("Implied rows are revenue × margin.");
  if (earnings?.basis) notes.push(`Figures from Screener, ${earnings.basis}.`);
  notes.push("The score reads the call after it happens.");
  return (
    <div className="flex flex-col gap-1">
      <p className={eyebrowClass}>{heading}</p>
      <ul className="flex flex-col divide-y divide-border/30 border-y border-border/30">
        {rows.map((row) => (
          <ExpectationRowView key={row.key} row={row} />
        ))}
        {lines.map((line, i) => (
          <GuideLineView key={`line-${i}`} line={line} />
        ))}
        <TrailRow view={view} />
      </ul>
      <p className="pt-1 text-[10px] leading-snug text-muted-foreground/80">{notes.join(" ")}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function QuarterExpectationCard({
  view,
  setup,
}: {
  view: QuarterExpectationView;
  setup: ExpectationSetup;
  /** Kept for the caller; the last call's negative read now arrives as the "fix" item. */
  lastQuarter?: { label: string; rationale: RationaleLine[] } | null;
}) {
  if (view.state === "landed") return null;
  const today = istToday();
  const title =
    view.state === "pending" ? `${view.target.label} reported · score pending` : `Before the ${view.target.label} call`;

  if (view.empty) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/25 bg-background/45 px-4 py-3">
        <p className="text-[11px] text-muted-foreground">
          <span className={eyebrowClass}>{title}</span>
          {" — results date not announced; nothing flagged going in."}
        </p>
        <SetupChips setup={setup} />
      </div>
    );
  }

  return (
    <section aria-label={title} className={`${elevatedBlockClassFromSm} flex flex-col gap-4 sm:p-4`}>
      <div className="flex flex-col gap-1.5 border-b border-border/30 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <h3 className="text-[15px] font-semibold leading-tight text-foreground">{title}</h3>
          <SetupChips setup={setup} />
        </div>
        <DateLine view={view} today={today} />
      </div>
      <WhatCouldBeMajor updates={view.updates} />
      <Expectations view={view} />
    </section>
  );
}
