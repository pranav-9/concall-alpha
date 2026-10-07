"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { daysBetween, formatDay, formatTime, istToday, relativeDay } from "@/lib/calendar-format";
import type { QuarterExpectationView } from "@/lib/quarter-expectation/build";
import type { RationaleLine } from "@/lib/quarter-expectation/updates";
import type { ExpectationSetup, ExpectedUpdate, ExpectedUpdateKind } from "@/lib/quarter-expectation/types";
import { BANDS, bandForScore } from "@/lib/score-band";
import { cn } from "@/lib/utils";

import { chipClass } from "./chip-tone";
import { elevatedBlockClassFromSm, nestedDetailClass } from "./surface-tokens";

// "Before the Q2 FY27 call" — the top of the ConcallScore section while the
// quarter in season is unscored. What to listen for leads; the trail's 4Q
// average and the issuer's own guide sit in a rail beside it. Everything is
// derived (lib/quarter-expectation) and attributed to the tab it came from.
// Once the quarter is scored the card steps aside: the "vs 4Q avg" line in
// "Where it sits" carries the comparison from then on.

const SOURCE_LABEL: Record<ExpectedUpdateKind, string> = {
  due: "Guidance",
  progress: "Guidance",
  catalyst: "Growth",
  variable: "Key variables",
  fix: "Last call",
};

const PHONE_VISIBLE = 3;

const eyebrowClass = "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

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
    const days = daysBetween(today, calendar.resultsDate);
    parts.push(
      <span key="results">
        {state === "pending" ? "Reported " : "Results "}
        <span className="text-foreground">{formatDay(calendar.resultsDate)}</span>
        {` · ${relativeDay(days).toLowerCase()}`}
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

function UpdateRow({ update, rank }: { update: ExpectedUpdate; rank: number }) {
  const linked = update.sectionId !== "sentiment-score";
  const body = (
    <>
      <span className="w-4 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">{rank}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[12px] font-semibold leading-snug text-foreground">{update.heading}</span>
          <span className={cn(chipClass("slate"), "px-1.5 py-0 text-[9px] uppercase tracking-[0.1em]")}>
            {SOURCE_LABEL[update.kind]}
          </span>
        </span>
        {update.detail ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{update.detail}</span>
        ) : null}
      </span>
    </>
  );
  const rowClass = cn(
    "flex min-h-11 items-start gap-2 py-2 sm:min-h-0 sm:py-1.5",
    update.tone === "caution" ? "border-l-2 border-amber-400/70 pl-2" : "border-l-2 border-transparent pl-2",
  );
  return linked ? (
    <li>
      <a href={`#${update.sectionId}`} className={cn(rowClass, "rounded-sm hover:bg-accent/60")}>
        {body}
      </a>
    </li>
  ) : (
    <li className={rowClass}>{body}</li>
  );
}

function ListenFor({ updates }: { updates: ExpectedUpdate[] }) {
  const head = updates.slice(0, PHONE_VISIBLE);
  const tail = updates.slice(PHONE_VISIBLE);
  return (
    <div className={`${nestedDetailClass} flex min-w-0 flex-col gap-2 p-3`}>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
        <p className={eyebrowClass}>What to listen for</p>
      </div>
      {updates.length === 0 ? (
        <p className="text-[11px] italic text-muted-foreground">
          Nothing flagged going in — no guidance due, no dated catalyst.
        </p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border/30">
            {head.map((u, i) => (
              <UpdateRow key={`${u.kind}-${i}`} update={u} rank={i + 1} />
            ))}
            {tail.length > 0 ? (
              <li className="hidden lg:block">
                <ul className="flex flex-col divide-y divide-border/30">
                  {tail.map((u, i) => (
                    <UpdateRow key={`${u.kind}-${i}`} update={u} rank={PHONE_VISIBLE + i + 1} />
                  ))}
                </ul>
              </li>
            ) : null}
          </ul>
          {tail.length > 0 ? (
            <details className="lg:hidden">
              <summary className="cursor-pointer py-1 text-[11px] font-medium text-foreground/80">
                {tail.length} more
              </summary>
              <ul className="flex flex-col divide-y divide-border/30">
                {tail.map((u, i) => (
                  <UpdateRow key={`${u.kind}-${i}`} update={u} rank={PHONE_VISIBLE + i + 1} />
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}

function TrailBlock({
  view,
  lastQuarter,
}: {
  view: QuarterExpectationView;
  lastQuarter: { label: string; rationale: RationaleLine[] } | null;
}) {
  const { baseline, state } = view;
  const signed = lastQuarter?.rationale.filter((r) => r.direction != null && (r.heading || r.detail)) ?? [];
  return (
    <div className={`${nestedDetailClass} flex flex-col gap-1.5 p-3`}>
      <p className={eyebrowClass}>Where the trail sits</p>
      {baseline.ok ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-1.5 text-[11px] text-muted-foreground">
            {state === "pending" ? <span>Score pending · trail at</span> : null}
            <span className="font-mono text-[16px] font-semibold tabular-nums text-foreground">
              {baseline.value.baseline.toFixed(1)}
            </span>
            <span>· 4Q avg</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {BANDS[bandForScore(baseline.value.baseline)].label} territory · usual swing ±{baseline.value.band.toFixed(1)}
          </p>
          <p className="text-[10px] leading-snug text-muted-foreground/80">
            Where the last four scored quarters landed ({baseline.value.quarters[0]?.label}–
            {baseline.value.quarters[baseline.value.quarters.length - 1]?.label}). The score reads the call after it
            happens.
          </p>
        </>
      ) : baseline.miss.reason === "too_few" ? (
        <p className="text-[11px] text-muted-foreground">
          Trail too short to read — {baseline.miss.scoredQuarters === 0 ? "no" : baseline.miss.scoredQuarters}{" "}
          scored {baseline.miss.scoredQuarters === 1 ? "quarter" : "quarters"}, four needed.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Trail too old to read — last scored {baseline.miss.latestLabel}.
        </p>
      )}
      {lastQuarter && signed.length > 0 ? (
        <details className="mt-1">
          <summary className="cursor-pointer text-[11px] font-medium text-foreground/80">
            What moved the last score · {lastQuarter.label}
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {signed.map((r, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-foreground/85">
                {r.direction === "positive" ? (
                  <ArrowUp className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                ) : r.direction === "negative" ? (
                  <ArrowDown className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" />
                ) : (
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400/80" />
                )}
                <span>
                  {r.heading ? <span className="font-semibold text-foreground">{r.heading}</span> : null}
                  {r.heading && r.detail ? " — " : ""}
                  {r.detail}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function GuideBlock({ view }: { view: QuarterExpectationView }) {
  const { earnings } = view;
  if (!earnings) return null;
  return (
    <div className={`${nestedDetailClass} flex flex-col gap-1.5 p-3`}>
      <p className={eyebrowClass}>{earnings.lines.length > 0 ? "What they've guided" : "How it's been running"}</p>
      <ul className="flex flex-col gap-1.5">
        {earnings.lines.map((line, i) => (
          <li key={i} className="min-w-0 text-[11px] leading-snug">
            <a href={`#${line.sectionId}`} className="block min-w-0 break-words hover:underline">
              <span className="text-muted-foreground">
                {line.segment ? `${line.segment} ` : ""}
                {line.metricLabel}
                {line.horizonLabel ? ` · ${line.horizonLabel}` : ""}
              </span>
              <span className="line-clamp-2 font-semibold text-foreground">{line.valueLabel}</span>
            </a>
          </li>
        ))}
      </ul>
      {earnings.implied ? (
        <p className="border-t border-border/30 pt-1.5 text-[11px] leading-snug text-muted-foreground">
          If the guide holds for {view.target.label}:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            ₹{fmtCr(earnings.implied.revenueLoCr)}
            {earnings.implied.revenueHiCr !== earnings.implied.revenueLoCr ? `–${fmtCr(earnings.implied.revenueHiCr)}` : ""} cr
          </span>{" "}
          revenue
          {earnings.implied.opmLo != null ? (
            <>
              {" "}
              at{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {earnings.implied.opmLo}
                {earnings.implied.opmHi != null && earnings.implied.opmHi !== earnings.implied.opmLo ? `–${earnings.implied.opmHi}` : ""}% OPM
              </span>
            </>
          ) : null}{" "}
          <span className="text-muted-foreground/80">
            ({earnings.implied.yearAgoLabel} ₹{fmtCr(earnings.implied.yearAgoRevenueCr)} cr × {fmtPct(earnings.implied.guidePctLo)}
            {earnings.implied.guidePctHi !== earnings.implied.guidePctLo ? `–${fmtPct(earnings.implied.guidePctHi)}` : ""})
          </span>
        </p>
      ) : null}
      {earnings.runRate ? (
        <p className={cn("text-[11px] leading-snug text-muted-foreground", !earnings.implied && "border-t border-border/30 pt-1.5")}>
          Run-rate to {earnings.runRate.latestLabel}:{" "}
          <span className="font-semibold tabular-nums text-foreground">{fmtPct(earnings.runRate.revenueYoyPct)} YoY</span> revenue
          {earnings.runRate.opmPct != null ? (
            <>
              {" "}
              at <span className="font-semibold tabular-nums text-foreground">{earnings.runRate.opmPct}% OPM</span>
            </>
          ) : null}
          <span className="text-muted-foreground/80">
            {" "}
            (last {earnings.runRate.yoyPairs} quarters)
          </span>
        </p>
      ) : null}
      <p className="text-[10px] leading-snug text-muted-foreground/80">
        {earnings.lines.length > 0 ? "Issuer guide. Guides are for the year; how the quarter phases is yours to judge." : null}
        {earnings.basis ? `${earnings.lines.length > 0 ? " " : ""}Figures from Screener, ${earnings.basis}.` : null}
      </p>
    </div>
  );
}

const fmtCr = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${Number.isInteger(n) ? n : n.toFixed(1)}%`;

export function QuarterExpectationCard({
  view,
  setup,
  lastQuarter,
}: {
  view: QuarterExpectationView;
  setup: ExpectationSetup;
  lastQuarter: { label: string; rationale: RationaleLine[] } | null;
}) {
  if (view.state === "landed") return null;
  const today = istToday();
  const title =
    view.state === "pending" ? `${view.target.label} reported · score pending` : `Before the ${view.target.label} call`;

  if (view.empty) {
    return (
      <div className={`${nestedDetailClass} flex flex-wrap items-center gap-2 px-4 py-3`}>
        <p className="text-[11px] text-muted-foreground">
          <span className={eyebrowClass}>{title}</span>
          {" — results date not announced; nothing flagged going in."}
        </p>
        <SetupChips setup={setup} />
      </div>
    );
  }

  const hasRail = true; // the trail block always renders (a miss is still a read)
  return (
    <section aria-label={title} className={`${elevatedBlockClassFromSm} flex flex-col gap-3 sm:p-2.5`}>
      <div className="flex flex-col gap-1 px-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
          <p className={cn(eyebrowClass, "text-foreground")}>{title}</p>
          <SetupChips setup={setup} />
        </div>
        <DateLine view={view} today={today} />
      </div>
      <div className={cn("grid grid-cols-1 gap-3", hasRail && "lg:grid-cols-[7fr_5fr] lg:items-start")}>
        <ListenFor updates={view.updates} />
        <div className="flex min-w-0 flex-col gap-3">
          <TrailBlock view={view} lastQuarter={lastQuarter} />
          <GuideBlock view={view} />
        </div>
      </div>
    </section>
  );
}
