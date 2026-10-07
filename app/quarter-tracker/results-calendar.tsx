import Link from "next/link";
import { PANEL_CARD_SKY } from "@/lib/design/shell";
import { daysBetween, formatDay, formatTime, istToday, relativeDay } from "@/lib/calendar-format";
import type { TrackerEntry } from "./data";

// When each not-yet-scored company reports, and when its earnings call is.
// Dates come from quarter_calendar (exchange board-meeting calendars + the
// company's call-invite filing). Server-rendered; "today" is the IST date, the
// day Indian results and calls are scheduled in.

function CallCell({ entry }: { entry: TrackerEntry }) {
  if (entry.callDate) {
    const when = `${formatDay(entry.callDate)}${entry.callTime ? ` · ${formatTime(entry.callTime)} IST` : ""}`;
    return (
      <span className="text-[12px] tabular-nums text-foreground">
        <span className="text-muted-foreground">Call </span>
        {entry.callUrl ? (
          <a href={entry.callUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {when}
          </a>
        ) : (
          when
        )}
      </span>
    );
  }
  if (entry.callUnreadable && entry.callUrl) {
    return (
      <a
        href={entry.callUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[12px] text-muted-foreground hover:text-foreground hover:underline"
      >
        Call invite filed
      </a>
    );
  }
  return <span className="text-[12px] text-muted-foreground">Call not announced</span>;
}

function CompanyRow({ entry, showResultsDate }: { entry: TrackerEntry; showResultsDate?: boolean }) {
  return (
    <li className="flex flex-col gap-0.5 border-t border-border/30 py-2 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <Link
        href={`/company/${encodeURIComponent(entry.code)}`}
        prefetch={false}
        className="flex min-w-0 items-baseline gap-2"
      >
        <span className="truncate text-sm font-semibold text-foreground hover:underline">
          {entry.name}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{entry.code}</span>
        {entry.sector && (
          <span className="hidden shrink-0 text-[11px] text-muted-foreground/80 md:inline">
            · {entry.sector}
          </span>
        )}
      </Link>
      <span className="flex shrink-0 items-center gap-3">
        {showResultsDate && entry.resultsDate && (
          <span className="text-[12px] tabular-nums text-muted-foreground">
            Results {formatDay(entry.resultsDate)}
          </span>
        )}
        <CallCell entry={entry} />
      </span>
    </li>
  );
}

export function ResultsCalendar({
  entries,
  quarterLabel,
}: {
  entries: TrackerEntry[];
  quarterLabel: string;
}) {
  const upcoming = entries.filter((e) => e.bucket === "upcoming");
  if (upcoming.length === 0) return null;

  const today = istToday();
  const byName = (a: TrackerEntry, b: TrackerEntry) => a.name.localeCompare(b.name);
  const dated = upcoming
    .filter((e) => e.resultsDate)
    .sort((a, b) => a.resultsDate!.localeCompare(b.resultsDate!) || byName(a, b));
  // Results date has passed but no score yet — the transcript is usually the wait.
  const awaitingScore = dated.filter((e) => e.resultsDate! < today);
  const ahead = dated.filter((e) => e.resultsDate! >= today);
  const undated = upcoming.filter((e) => !e.resultsDate).sort(byName);

  const groups = new Map<string, TrackerEntry[]>();
  for (const e of ahead) {
    const list = groups.get(e.resultsDate!);
    if (list) list.push(e);
    else groups.set(e.resultsDate!, [e]);
  }

  return (
    <section className={`${PANEL_CARD_SKY} space-y-4`} aria-labelledby="results-calendar-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-200">
            Results calendar
          </p>
          <h2 id="results-calendar-heading" className="text-lg font-bold text-foreground">
            When {quarterLabel} results and calls land
          </h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {dated.length} dated · {undated.length} not announced yet
        </p>
      </div>

      {awaitingScore.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Results out · score pending
          </p>
          <ul>
            {awaitingScore.map((e) => (
              <CompanyRow key={e.code} entry={e} showResultsDate />
            ))}
          </ul>
        </div>
      )}

      {groups.size > 0 && (
        <ol className="space-y-3">
          {[...groups.entries()].map(([date, list]) => (
            <li key={date}>
              <p className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/80">
                <span className="tabular-nums">{formatDay(date)}</span>
                <span className="font-medium normal-case tracking-normal text-muted-foreground">
                  {relativeDay(daysBetween(today, date))}
                </span>
              </p>
              <ul>
                {list.map((e) => (
                  <CompanyRow key={e.code} entry={e} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {undated.length > 0 && (
        <details className="group border-t border-border/30 pt-3">
          <summary className="cursor-pointer list-none text-[12px] font-medium text-muted-foreground hover:text-foreground">
            <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>
            Date not announced yet ({undated.length})
          </summary>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Companies give the exchange two to seven days&apos; notice of a results meeting, so
            most dates appear the week before.
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {undated.map((e) => (
              <li key={e.code}>
                <Link
                  href={`/company/${encodeURIComponent(e.code)}`}
                  prefetch={false}
                  className="text-[12px] text-foreground/85 hover:underline"
                >
                  {e.name}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
