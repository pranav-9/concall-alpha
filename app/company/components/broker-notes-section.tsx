// L1 SectionCard shell is provided by BrokerNotesPanel in
// app/company/[code]/company-detail-sections.tsx; this renders the body only.
//
// The Broker Notes tab: what the sell side has published on the company. A header line
// (the sign-up gate's teaser), then the strip (ratings, target, growth beside ours, and
// each broker's latest read view, dated), then every note newest first. Every figure is
// credited to the brokers or to our own valuation row; all policy lives in
// lib/broker-notes/normalize.ts. No links: no PDFs, no Telegram.

import type { ReactNode } from "react";

import { formatInr, formatNoteDate, formatPct } from "@/lib/broker-notes/normalize";
import type {
  BrokerLatestView,
  BrokerNoteListItem,
  BrokerNotesView,
  GrowthBlock,
  RatingCounts,
  StatedMove,
  TargetBlock,
} from "@/lib/broker-notes/types";
import { cn } from "@/lib/utils";

import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";

export const BROKER_NOTES_ZERO_STATE = "No broker notes since Sep 2025 in the notes we track.";
export const BROKER_NOTES_FOOTER = "Brokers' published views, not ours. Not investment advice.";

const eyebrowClass = "text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground";
const chipClass = "rounded-full border border-border/50 bg-muted/40 px-2 py-0.5";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const leftOutLine = (n: number) =>
  `${plural(n, "note")} left out: ${n === 1 ? "it" : "they"} did not pass our row checks.`;

const statedLabel = (stated: StatedMove) =>
  `${stated.direction === "UPSIDE" ? "Upside" : "Downside"} ${formatPct(stated.pct)}`;

function headerLine(header: Extract<BrokerNotesView, { kind: "notes" }>["header"]): string {
  const latest = `latest ${formatNoteDate(header.latestDate)}`;
  if (header.brokerCount === 0) return `No broker notes in the last 180 days · ${latest}`;
  return `${plural(header.brokerCount, "broker")} · ${plural(header.notesLast90, "note")} in the last 90 days · ${latest}`;
}

function StripBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className={eyebrowClass}>{label}</p>
      {children}
    </div>
  );
}

function RatingsBlock({ ratings }: { ratings: RatingCounts }) {
  const small: string[] = [];
  if (ratings.notRated) small.push(`${ratings.notRated} not rated`);
  if (ratings.notStated) small.push(`${ratings.notStated} no rating stated`);
  if (ratings.other) small.push(plural(ratings.other, "other rating"));
  if (ratings.notRead) {
    const stated = [
      ratings.notReadStated.upside ? `${ratings.notReadStated.upside} upside stated` : null,
      ratings.notReadStated.downside ? `${ratings.notReadStated.downside} downside stated` : null,
    ].filter(Boolean);
    small.push(`${ratings.notRead} rating not read${stated.length ? ` (${stated.join(", ")})` : ""}`);
  }
  return (
    <StripBlock label="Ratings">
      <p className="text-base font-semibold tabular-nums leading-snug">
        {ratings.bullish} bullish · {ratings.neutral} neutral · {ratings.bearish} bearish
      </p>
      {small.length ? <p className="text-[12px] leading-snug text-muted-foreground">{small.join(" · ")}</p> : null}
    </StripBlock>
  );
}

function TargetBlockView({ target }: { target: TargetBlock }) {
  const dated =
    target.asOfFrom === target.asOfTo
      ? `as of ${formatNoteDate(target.asOfTo)}`
      : `dated ${formatNoteDate(target.asOfFrom)} to ${formatNoteDate(target.asOfTo)}`;
  const upside = target.upsideFromPrice;
  return (
    <StripBlock label="Price target">
      <p className="text-base font-semibold tabular-nums leading-snug">
        {target.kind === "single" ? `Target ${formatInr(target.value)} (1 broker)` : `Median ${formatInr(target.value)}`}
      </p>
      <p className="text-[12px] leading-snug text-muted-foreground">
        {target.kind === "median"
          ? `Range ${formatInr(target.low)}–${formatInr(target.high)} · ${plural(target.brokerCount, "broker")} · ${dated}`
          : dated}
      </p>
      {upside ? (
        <p className="text-[12px] leading-snug tabular-nums">
          {upside.pct >= 0
            ? `+${formatPct(upside.pct)} upside to target from ${formatInr(upside.price)}`
            : `Target is ${formatPct(-upside.pct)} below ${formatInr(upside.price)}`}
          <span className="text-muted-foreground"> (our price, {formatNoteDate(upside.pricedAsOf)})</span>
        </p>
      ) : null}
      {target.excludedCount ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {plural(target.excludedCount, "target")} left out: price moved a lot since that note.
        </p>
      ) : null}
    </StripBlock>
  );
}

function GrowthRow({ label, value, window }: { label: string; value: string; window: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
      {window ? <span className="text-[11px] text-muted-foreground">{window}</span> : null}
    </div>
  );
}

function GrowthBlockView({ growth }: { growth: GrowthBlock }) {
  const { brokers } = growth;
  const range =
    brokers.lowPct === brokers.highPct
      ? formatPct(brokers.lowPct)
      : `${formatPct(brokers.lowPct)}–${formatPct(brokers.highPct)}`;
  const brokerWindow = [brokers.windows.join(", "), plural(brokers.brokerCount, "broker")].filter(Boolean).join(" · ");
  return (
    <StripBlock label={`${growth.metricLabel} growth a year`}>
      <GrowthRow label="Brokers" value={range} window={brokerWindow} />
      {growth.ourBase ? (
        <GrowthRow label="Our base case" value={formatPct(growth.ourBase.pct)} window={growth.ourBase.window} />
      ) : null}
      {growth.priceAssumes ? (
        <GrowthRow label="Price assumes" value={formatPct(growth.priceAssumes.pct)} window={growth.priceAssumes.window} />
      ) : null}
    </StripBlock>
  );
}

function BrokerRow({ view }: { view: BrokerLatestView }) {
  const ratingDated = view.rating ? `${view.rating.label} (${formatNoteDate(view.rating.asOf)})` : "Rating not read";
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 text-[12px]">
      <span className="font-semibold text-foreground">{view.broker}</span>
      <span>{ratingDated}</span>
      {view.target ? (
        <span className="tabular-nums">
          Target {formatInr(view.target.price)} ({formatNoteDate(view.target.asOf)})
          {view.target.excluded ? <span className="text-muted-foreground"> · price moved a lot since this note</span> : null}
        </span>
      ) : (
        <span className="text-muted-foreground">No target</span>
      )}
      <span className="tabular-nums text-muted-foreground">Latest note {formatNoteDate(view.latestNote.reportDate)}</span>
    </li>
  );
}

function NoteItem({ note }: { note: BrokerNoteListItem }) {
  return (
    <li className={cn(nestedDetailClass, "space-y-1.5 p-3")}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]">
        <span className="font-semibold text-foreground">{note.broker}</span>
        <span className="text-muted-foreground">{note.noteTypeLabel}</span>
        <span className="ml-auto tabular-nums text-muted-foreground">{formatNoteDate(note.reportDate)}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className={cn(chipClass, note.ratingBucket === "not_read" && "text-muted-foreground")}>
          {note.ratingBucket === "not_read" ? "Rating not read" : note.ratingLabel}
        </span>
        {note.stated ? <span className={cn(chipClass, "tabular-nums")}>{statedLabel(note.stated)}</span> : null}
        {note.targetPrice !== null ? (
          <span className={cn(chipClass, "tabular-nums")}>Target {formatInr(note.targetPrice)}</span>
        ) : null}
        {note.priceMovedFlag ? (
          <span className={cn(chipClass, "text-muted-foreground")}>Price moved a lot since this note</span>
        ) : null}
      </div>
      {note.headline ? <p className="text-sm leading-snug [overflow-wrap:anywhere]">{note.headline}</p> : null}
    </li>
  );
}

export function BrokerNotesSection({ view }: { view: BrokerNotesView }) {
  if (view.kind === "empty") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{BROKER_NOTES_ZERO_STATE}</p>
        {view.parseErrors.length ? (
          <p className="text-[11px] text-muted-foreground">
            {leftOutLine(view.parseErrors.length)}
          </p>
        ) : null}
      </div>
    );
  }

  const { header, ratings, target, growth, brokers, recent, older, parseErrors } = view;
  const hasStrip = Boolean(ratings || target || growth);

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium tabular-nums">{headerLine(header)}</p>
        {header.readThrough ? (
          <p className="text-[12px] text-muted-foreground">Notes read through {formatNoteDate(header.readThrough)}</p>
        ) : null}
      </div>

      {/* The sign-up gate starts here (R11): signed-out readers see only the header line. */}
      <div data-gate-cut className="space-y-4">
        {hasStrip ? (
          <div className={cn(elevatedBlockClass, "space-y-4 p-4 sm:p-5")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ratings ? <RatingsBlock ratings={ratings} /> : null}
              {target ? <TargetBlockView target={target} /> : null}
              {growth ? <GrowthBlockView growth={growth} /> : null}
            </div>
            {brokers.length ? (
              <div className="space-y-1 border-t border-border/40 pt-3">
                <p className={eyebrowClass}>By broker, newest first</p>
                <ul className="divide-y divide-border/30">
                  {brokers.map((b) => (
                    <BrokerRow key={`${b.broker}-${b.latestNote.messageId}`} view={b} />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {recent.length ? (
          <div className="space-y-2">
            <p className={eyebrowClass}>Notes in the last 180 days</p>
            <ul className="space-y-2">
              {recent.map((note) => (
                <NoteItem key={note.messageId} note={note} />
              ))}
            </ul>
          </div>
        ) : null}

        {older.length ? (
          <details>
            <summary className="cursor-pointer select-none text-[12px] font-medium text-muted-foreground">
              Older notes, more than 180 days ({older.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {older.map((note) => (
                <NoteItem key={note.messageId} note={note} />
              ))}
            </ul>
          </details>
        ) : null}

        {parseErrors.length ? (
          <p className="text-[11px] text-muted-foreground">
            {leftOutLine(parseErrors.length)}
          </p>
        ) : null}

        <p className="text-[11px] text-muted-foreground">{BROKER_NOTES_FOOTER}</p>
      </div>
    </div>
  );
}
