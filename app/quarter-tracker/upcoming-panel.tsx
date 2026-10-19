// Whose call is next: the not-yet-scored companies grouped by earnings-call day,
// read off each company's own invite filing. A score lands only after the call,
// so this is a concall calendar, not a results calendar. Call held but no score
// yet sits on top (the transcript is usually the wait); companies with no call
// on file fold away at the bottom, with their results date where one is set.

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { TrackerEntry } from "./data";
import {
  callLabel,
  callTimeLabel,
  formatDay,
  formatTick,
  relativeDay,
  type ISODate,
  type UpcomingGroups,
} from "./season";

function GroupHead({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-2 border-y border-[var(--rule)] bg-[var(--paper)] px-4 py-1.5 first:border-t-0">
      <span className="house-data text-[10px] uppercase tracking-[0.14em] text-[var(--ink)]">{label}</span>
      {note ? <span className="house-data text-[10px] text-[var(--ink-soft)]">{note}</span> : null}
    </div>
  );
}

function CompanyLink({ entry }: { entry: TrackerEntry }) {
  return (
    <Link
      href={`/company/${encodeURIComponent(entry.code)}`}
      prefetch={false}
      className="group flex min-w-0 items-baseline gap-2"
    >
      <span className="house-display truncate text-[13px] leading-tight text-[var(--ink)] transition-colors group-hover:text-[var(--signal)]">
        {entry.name}
      </span>
      <span className="house-data shrink-0 text-[10px] text-[var(--ink-soft)]">{entry.code}</span>
    </Link>
  );
}

function CallCell({ call }: { call: { text: string; href: string | null; muted: boolean } }) {
  const cls = cn(
    "house-data shrink-0 whitespace-nowrap text-[11px] tabular-nums",
    call.muted ? "text-[var(--ink-soft)]" : "text-[var(--ink)]",
  );
  if (call.href) {
    return (
      <a
        href={call.href}
        target="_blank"
        rel="noopener noreferrer"
        title="Open the call invite filing"
        className={cn(cls, "hover:underline")}
      >
        {call.text}
      </a>
    );
  }
  return <span className={cls}>{call.text}</span>;
}

function Rows({ entries, right }: { entries: TrackerEntry[]; right: (entry: TrackerEntry) => ReactNode }) {
  return (
    <ul>
      {entries.map((entry) => (
        <li key={entry.code} className="border-t border-[var(--rule)] first:border-t-0">
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <CompanyLink entry={entry} />
            {right(entry)}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function UpcomingPanel({
  groups,
  today,
  chip,
  scoped,
}: {
  groups: UpcomingGroups;
  today: ISODate;
  chip: ReactNode;
  /** The watchlist filter is on — the empty state must say so. */
  scoped: boolean;
}) {
  const { pending, ahead, noCall, undated } = groups;
  const nothingCalled = pending.length === 0 && ahead.length === 0;
  const notAnnounced = noCall.length + undated.length;

  return (
    <section
      aria-labelledby="upcoming-heading"
      className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-2.5">
        <h2 id="upcoming-heading" className="house-data text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          Upcoming concalls
        </h2>
        {chip}
      </div>

      {pending.length > 0 ? (
        <div>
          <GroupHead label="Call held · score pending" />
          <Rows
            entries={pending}
            right={(entry) => (
              <span className="house-data shrink-0 whitespace-nowrap text-[11px] text-[var(--ink-soft)]">
                {formatDay(entry.callDate!)}
              </span>
            )}
          />
        </div>
      ) : null}

      {ahead.map(({ date, entries }) => (
        <div key={date}>
          <GroupHead label={formatDay(date)} note={relativeDay(today, date)} />
          <Rows entries={entries} right={(entry) => <CallCell call={callTimeLabel(entry)} />} />
        </div>
      ))}

      {nothingCalled ? (
        <p className="px-4 py-8 text-center text-[13px] leading-[1.5] text-[var(--ink-soft)]">
          {scoped
            ? notAnnounced > 0
              ? "None of your watchlist companies has a call date yet."
              : "Every company on your watchlists has reported."
            : notAnnounced > 0
              ? "No call dates on file yet. Companies file the call invite a few days ahead, so most appear the week before."
              : "Every covered company has reported."}
        </p>
      ) : null}

      {notAnnounced > 0 ? (
        // A named group: a bare `group` here would light every row's group-hover at once.
        <details className="group/fold border-t border-[var(--rule)]">
          <summary className="house-data flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="inline-block transition-transform group-open/fold:rotate-90">
              ›
            </span>
            Call not announced yet
            <span className="tabular-nums opacity-70">{notAnnounced}</span>
          </summary>
          <p className="px-4 pb-2 text-[11.5px] leading-[1.5] text-[var(--ink-soft)]">
            Companies file the call invite with the exchange a few days ahead, so most calls appear
            the week before. The results date is shown where the board meeting is on file.
          </p>
          {noCall.length > 0 ? (
            <Rows
              entries={noCall}
              right={(entry) =>
                entry.callUnreadable && entry.callUrl ? (
                  <CallCell call={callLabel(entry)} />
                ) : (
                  <span className="house-data shrink-0 whitespace-nowrap text-[11px] text-[var(--ink-soft)]">
                    Results {formatTick(entry.resultsDate!)}
                  </span>
                )
              }
            />
          ) : null}
          {undated.length > 0 ? (
            <ul
              className={cn(
                "flex flex-wrap gap-x-3 gap-y-1 px-4 pb-3",
                noCall.length > 0 && "border-t border-[var(--rule)] pt-2.5",
              )}
            >
              {undated.map((entry) => (
                <li key={entry.code}>
                  <Link
                    href={`/company/${encodeURIComponent(entry.code)}`}
                    prefetch={false}
                    className="text-[12px] text-[var(--ink)] hover:text-[var(--signal)] hover:underline"
                  >
                    {entry.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </details>
      ) : null}
    </section>
  );
}
