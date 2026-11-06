// Every company scored this quarter, as a sortable table: the company (the
// widest column — no Δ or score-trail columns, user call 2026-11-06), score +
// band, the guidance management raised or lowered on the call, the
// deep-tracked key variables year on year, and when the score landed (marked
// when it came off a third-party transcript). Column heads are links
// (`?sort=`), so the order is a URL and the table needs no client JS. The
// latest call day's rows are pinned in their own block above the rest; the
// sort applies inside each block. Below `xl` the Guidance and Key variables
// columns fold under the company name (at `lg` they overflow the card); below
// `md` the Scored column folds into a meta line too.

import Link from "next/link";
import type { ReactNode } from "react";

import { CompanyMark } from "@/components/company-logo";
import { BANDS, bandForScore } from "@/lib/score-band";
import { formatScoredAt } from "@/lib/score-freshness";
import type { ThesisEffect } from "@/lib/key-variables-snapshot/types";
import { cn } from "@/lib/utils";

import type { TrackerEntry } from "./data";
import { formatAgo, type SortDir, type SortKey } from "./season";
import {
  EMPTY_SIGNALS,
  type GuidanceMove,
  type GuidanceStanding,
  type KeyVariableYoy,
  type QuarterGuidance,
  type QuarterSignals,
} from "./signals";

const HEAD =
  "house-data px-3 py-2.5 text-left text-[10px] font-normal uppercase tracking-[0.14em] text-[var(--ink-soft)] md:px-4";
const CELL = "px-3 py-3 align-top md:px-4";
const RULES = "divide-x divide-[var(--rule)]";
const COLUMNS = 5;

const EFFECT_TONE: Record<ThesisEffect, string> = {
  helps: "text-[var(--signal)]",
  hurts: "text-[var(--alarm)]",
  caution: "text-[var(--warn)]",
  neutral: "text-[var(--ink-soft)]",
};

function SortHead({
  active,
  dir,
  href,
  children,
  className,
}: {
  active: boolean;
  dir: SortDir;
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <th scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined} className={cn(HEAD, className)}>
      <Link
        href={href}
        scroll={false}
        prefetch={false}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-[var(--ink)]",
          active && "text-[var(--ink)]",
        )}
      >
        {children}
        <span aria-hidden className={cn("text-[8px]", !active && "opacity-0")}>
          {active && dir === "asc" ? "▴" : "▾"}
        </span>
      </Link>
    </th>
  );
}

const UNOFFICIAL_TITLE =
  "Scored from a third-party transcript, published before the company filed its own. It will be re-scored when the official transcript lands.";

function UnofficialTag() {
  return (
    <span className="house-data whitespace-nowrap text-[9.5px] uppercase tracking-[0.1em] text-[var(--warn)]" title={UNOFFICIAL_TITLE}>
      Unofficial
    </span>
  );
}

// ---------------------------------------------------------------------------
// Reading columns
// ---------------------------------------------------------------------------

function Move({ move, count, quarter }: { move: GuidanceMove; count: number; quarter: string }) {
  const raised = move.direction === "raised";
  const word = raised ? "Raised" : "Lowered";
  const more = count - 1;
  // Numbers print only when they read as the move on their own (signals.ts).
  const values = move.from != null && move.to != null ? ` ${move.from} → ${move.to}` : "";
  return (
    <div title={`${word} on the ${quarter} call: ${move.label}${values ? `,${values}` : ""}${more > 0 ? ` (and ${more} more)` : ""}`}>
      <span className={cn("text-[12px] font-semibold leading-tight", raised ? "text-[var(--signal)]" : "text-[var(--alarm)]")}>
        {word}
        {more > 0 ? <span className="ml-1.5 text-[10.5px] font-normal text-[var(--ink-soft)]">+{more} more</span> : null}
      </span>
      <span className="house-data mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-[var(--ink-soft)]">
        {move.label}
        {values}
      </span>
    </div>
  );
}

// Read the quarter, raised and cut nothing (signals.ts): a blank cell then
// means only that the quarter has not been read yet.
function Standing({ standing, quarter }: { standing: GuidanceStanding; quarter: string }) {
  const revised = standing.key === "revised";
  const word = revised ? "Revised" : "Held";
  const more = standing.count - 1;
  const title = revised
    ? `Revised on the ${quarter} call, in figures that don't compare with the earlier guide: ${standing.label}`
    : `Restated unchanged on the ${quarter} call: ${standing.label}`;
  return (
    <div title={`${title}${more > 0 ? ` (and ${more} more)` : ""}`}>
      <span className={cn("text-[12px] font-semibold leading-tight", revised ? "text-[var(--warn)]" : "text-[var(--ink)]")}>
        {word}
        {more > 0 ? <span className="ml-1.5 text-[10.5px] font-normal text-[var(--ink-soft)]">+{more} more</span> : null}
      </span>
      <span className="house-data mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-[var(--ink-soft)]">
        {standing.label}
      </span>
    </div>
  );
}

function GuidanceCell({ guidance, quarter }: { guidance: QuarterGuidance | null; quarter: string }) {
  if (!guidance) return null;
  if (!guidance.raised && !guidance.lowered) {
    return guidance.standing ? <Standing standing={guidance.standing} quarter={quarter} /> : null;
  }
  return (
    <div className="space-y-1.5">
      {guidance.raised ? <Move move={guidance.raised} count={guidance.raisedCount} quarter={quarter} /> : null}
      {guidance.lowered ? <Move move={guidance.lowered} count={guidance.loweredCount} quarter={quarter} /> : null}
    </div>
  );
}

function KeyVariablesCell({ readings, labelled = false }: { readings: KeyVariableYoy[]; labelled?: boolean }) {
  if (readings.length === 0) return null;
  return (
    <div>
      {/* Folded under the name there is no column head to say these are year on year. */}
      {labelled ? (
        <p className="house-data mb-1 text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">Key variables · YoY</p>
      ) : null}
      <ul className="space-y-1">
      {readings.map((r) => (
        // One line when it fits; otherwise the numbers wrap under the name
        // rather than cutting the name down to a stub.
        <li
          key={`${r.variable}:${r.name}`}
          className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[11.5px] leading-snug"
          title={`${r.variable} — ${r.name}: ${r.from} → ${r.to}, against the same quarter last year`}
        >
          <span className="max-w-full truncate text-[var(--ink)]">{r.name}</span>
          {/* Two pieces that wrap apart, and the numbers themselves wrap on a
              phone: at 360px the folded column is ~100px wide. */}
          <span className="house-data text-[10.5px] text-[var(--ink-soft)] sm:whitespace-nowrap">
            {r.from} → {r.to}
          </span>
          {r.change ? (
            <span className={cn("house-data whitespace-nowrap text-[10.5px] font-semibold", EFFECT_TONE[r.effect])}>
              {r.change}
            </span>
          ) : null}
        </li>
      ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function Row({
  entry,
  signals,
  quarter,
  now,
}: {
  entry: TrackerEntry;
  signals: QuarterSignals;
  quarter: string;
  now: Date;
}) {
  const score = entry.score!;
  const band = BANDS[bandForScore(score)];
  const ago = formatAgo(entry.scoredAt, now);
  const scoredTitle = formatScoredAt(entry.scoredAt) ?? undefined;
  const unofficial = entry.sourceStatus === "unofficial";
  const hasReading = Boolean(signals.guidance) || signals.keyVariables.length > 0;
  return (
    <tr className={cn(RULES, "border-t border-[var(--rule)] transition-colors hover:bg-[var(--paper)]")}>
      <td className={CELL}>
        <Link
          href={`/company/${encodeURIComponent(entry.code)}#sentiment-score`}
          prefetch={false}
          className="group flex min-w-0 items-center gap-3 md:min-w-[14rem]"
        >
          <CompanyMark
            code={entry.code}
            name={entry.name}
            className="h-8 w-8 rounded-[6px]"
            initialsClassName="house-data bg-[var(--paper)] text-[10px] text-[var(--ink-soft)]"
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="house-display text-[14px] leading-tight text-[var(--ink)] transition-colors group-hover:text-[var(--signal)]">
                {entry.name}
              </span>
              {entry.scoredWithin24h ? (
                <span className="house-data text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[var(--signal)]" title="Scored in the last 24 hours">
                  New
                </span>
              ) : null}
            </span>
            <span className="house-data mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--ink-soft)] md:hidden">
              <span className="whitespace-nowrap" title={scoredTitle}>
                {ago}
              </span>
              {unofficial ? (
                <>
                  <span aria-hidden>·</span>
                  <UnofficialTag />
                </>
              ) : null}
            </span>
          </span>
        </Link>
        {hasReading ? (
          // Below xl the readings fold under the name — outside the link, so a
          // screen reader's link name stays the company and a tap on a reading
          // does nothing. pl-11 = the mark (2rem) + gap (0.75rem). w-0 +
          // min-w-full: they take the cell's width but never widen it — a long
          // metric name would push Score off a phone.
          <div className="mt-2 pl-11 xl:hidden">
            <div className="w-0 min-w-full space-y-2">
              <GuidanceCell guidance={signals.guidance} quarter={quarter} />
              <KeyVariablesCell readings={signals.keyVariables} labelled />
            </div>
          </div>
        ) : null}
      </td>
      <td className={CELL}>
        <span className={cn("block text-[16px] font-semibold leading-none tabular-nums", band.textClass)}>
          {score.toFixed(1)}
        </span>
        <span className={cn("mt-1 block text-[10.5px] leading-tight md:whitespace-nowrap", band.textClass)}>{band.label}</span>
      </td>
      {/* Fixed content widths hold these two columns: an auto-layout table
          would otherwise hand them their one-line width and squeeze Company. */}
      <td className={cn(CELL, "hidden xl:table-cell")}>
        <div className="w-[11.5rem]">
          <GuidanceCell guidance={signals.guidance} quarter={quarter} />
        </div>
      </td>
      <td className={cn(CELL, "hidden xl:table-cell")}>
        <div className="w-[16.5rem]">
          <KeyVariablesCell readings={signals.keyVariables} />
        </div>
      </td>
      <td className={cn(CELL, "hidden md:table-cell")}>
        <span className="flex flex-col items-start gap-1">
          <span className="house-data whitespace-nowrap text-[11px] tabular-nums text-[var(--ink-soft)]" title={scoredTitle}>
            {ago}
          </span>
          {unofficial ? <UnofficialTag /> : null}
        </span>
      </td>
    </tr>
  );
}

/** A block's caption row inside the table: "Yesterday's calls · 4". */
function GroupHead({ label, count }: { label: string; count: number }) {
  return (
    <tr className="border-t border-[var(--rule)] bg-[var(--paper)]">
      <th
        scope="rowgroup"
        colSpan={COLUMNS}
        className="house-data px-3 py-2 text-left text-[10px] font-normal uppercase tracking-[0.14em] text-[var(--ink)] md:px-4"
      >
        {label} <span className="tabular-nums text-[var(--ink-soft)]">· {count}</span>
      </th>
    </tr>
  );
}

export function ScoredBoard({
  pinned,
  rows,
  signals,
  scoreLabel,
  sort,
  dir,
  sortHref,
  filters,
  now,
  emptyMessage,
  notice,
}: {
  /** The latest call day's rows, drawn first under their own caption; null = one list. */
  pinned: { label: string; rows: TrackerEntry[] } | null;
  /** Every other scored row (all of them when nothing is pinned). */
  rows: TrackerEntry[];
  /** Upper-cased code → the row's guidance and key-variable readings. */
  signals: ReadonlyMap<string, QuarterSignals>;
  scoreLabel: string;
  sort: SortKey;
  dir: SortDir;
  sortHref: (key: SortKey) => string;
  /** The sector select and the filter chips, right of the heading. */
  filters: ReactNode;
  now: Date;
  emptyMessage: string;
  /** A reading column's read failed: say so above the board, never imply "none". */
  notice?: string | null;
}) {
  const total = (pinned?.rows.length ?? 0) + rows.length;
  const row = (entry: TrackerEntry) => (
    <Row
      key={entry.code}
      entry={entry}
      signals={signals.get(entry.code.toUpperCase()) ?? EMPTY_SIGNALS}
      quarter={scoreLabel}
      now={now}
    />
  );
  return (
    <section
      aria-labelledby="scored-board-heading"
      className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-b border-[var(--rule)] px-3 py-2.5 md:px-4">
        <h2
          id="scored-board-heading"
          className="house-data flex items-baseline gap-2.5 text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]"
        >
          Scored this quarter
          <span className="tabular-nums text-[var(--ink-soft)]">{total}</span>
        </h2>
        {/* One sideways-scrolling row on a phone; wraps from sm. */}
        <div className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-1.5 overflow-x-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {filters}
        </div>
      </div>

      {notice ? (
        <p role="status" className="border-b border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-[12px] leading-[1.5] text-[var(--warn)] md:px-4">
          {notice}
        </p>
      ) : null}

      {total === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] leading-[1.5] text-[var(--ink-soft)]">{emptyMessage}</p>
      ) : (
        // Auto layout on purpose: a fixed table takes its column count from the
        // group heads' colSpan, so the columns hidden below xl/md would become
        // empty phantom columns squeezing Company.
        <table className="w-full border-collapse">
          <thead>
            <tr className={RULES}>
              <th scope="col" className={cn(HEAD, "w-auto")}>
                Company
              </th>
              <SortHead active={sort === "score"} dir={dir} href={sortHref("score")} className="w-[5.25rem] md:w-[8.25rem]">
                {scoreLabel}
              </SortHead>
              <th scope="col" className={cn(HEAD, "hidden w-[13.5rem] xl:table-cell")}>
                Guidance
              </th>
              <th scope="col" className={cn(HEAD, "hidden w-[18.5rem] xl:table-cell")}>
                Key variables · YoY
              </th>
              <SortHead active={sort === "scored"} dir={dir} href={sortHref("scored")} className="hidden w-[5.75rem] md:table-cell">
                Scored
              </SortHead>
            </tr>
          </thead>
          {pinned ? (
            <tbody>
              <GroupHead label={pinned.label} count={pinned.rows.length} />
              {pinned.rows.map(row)}
            </tbody>
          ) : null}
          {rows.length > 0 ? (
            <tbody>
              {pinned ? <GroupHead label="Earlier" count={rows.length} /> : null}
              {rows.map(row)}
            </tbody>
          ) : null}
        </table>
      )}
    </section>
  );
}
