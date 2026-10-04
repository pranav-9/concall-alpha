// "What moved a story this week" — the /announcements page's opening block.
//
// Up to five filings from the trailing seven days, each read against the
// company's own story and guidance (lib/announcement-story-read). The list is
// computed at load time by selectTopStoryReads; this file only paints it. Server
// component: the page passes the picks, and both paints (phone card, desktop
// rows) render from the same array — the page's BelowSm / FromSm gates choose.
//
// What each row says, in order: who filed and what it does to their story (the
// effect chip), what was filed, what it changes, and the line of our own
// research that read is measured against. The impact pill appears only on the
// risk tail (negative / severe): a "Positive" pill on every row would read as a
// verdict on the stock, and the effect chip already says what the filing does.

import Link from "next/link";

import { MOBILE_CARD, MOBILE_FOCUS, MobileCardHead } from "@/components/mobile-card";
import { cn } from "@/lib/utils";
import { formatOrderSize, IMPACT_META, type ExchangeUpdate } from "@/lib/exchange-desk/types";
import {
  MAX_STORY_PICKS,
  STORY_WINDOW_DAYS,
  type StoryPick,
} from "@/lib/announcement-story-read/select";
import { STORY_EFFECT_META, type StoryEffect } from "@/lib/announcement-story-read/types";

const ROW_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";
const CHIP = "house-data house-micro inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 leading-none";

function EffectChip({ effect }: { effect: StoryEffect }) {
  if (effect === "none") return null;
  const meta = STORY_EFFECT_META[effect];
  return (
    <span className={cn(CHIP, meta.className)} title={meta.title}>
      {meta.label}
    </span>
  );
}

/** Risk tail only — see the file header. */
function RiskPill({ update }: { update: ExchangeUpdate }) {
  if (update.impact !== "negative" && update.impact !== "severe") return null;
  const meta = IMPACT_META[update.impact];
  return <span className={cn(CHIP, meta.className)}>{meta.label}</span>;
}

function BelowCutTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className={cn(CHIP, "border-dashed border-[var(--rule)] text-[var(--ink-soft)]")}
      title="This company sits just below the coverage cut — still tracked, de-emphasised on the boards"
    >
      Below the cut
    </span>
  );
}

function Anchor({ pick, className }: { pick: StoryPick; className?: string }) {
  const anchor = pick.read.anchor;
  if (!anchor) return null;
  return (
    <p className={cn("text-[var(--ink-soft)]", className)}>
      <span className="house-data house-micro mr-1.5 uppercase tracking-[0.08em]">Measured against</span>
      <span className="house-data house-micro mr-1.5">{anchor.source}:</span>
      {anchor.text}
    </p>
  );
}

function FilingLink({ update, className }: { update: ExchangeUpdate; className?: string }) {
  if (!update.attachmentUrl) return null;
  return (
    <a
      href={update.attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("house-data house-micro text-[var(--ink-soft)] hover:text-[var(--signal)]", ROW_FOCUS, className)}
    >
      filing ↗
    </a>
  );
}

function DesktopRow({ pick }: { pick: StoryPick }) {
  const { update, read } = pick;
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 border-b border-[var(--rule)] py-5 last:border-b-0">
      <span aria-hidden className="house-display pt-0.5 text-2xl leading-none text-[var(--ink-soft)] tabular-nums">
        {pick.rank}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Link
            href={`/company/${update.companyCode}`}
            prefetch={false}
            className={cn("house-display text-lg leading-tight text-[var(--ink)] hover:text-[var(--signal)]", ROW_FOCUS)}
          >
            {update.companyName}
          </Link>
          <EffectChip effect={read.story_effect} />
          <RiskPill update={update} />
          <BelowCutTag show={pick.belowCut} />
          <span className="house-data house-micro ml-auto flex items-center gap-3 text-[var(--ink-soft)]">
            <span>{update.categoryLabel}</span>
            {update.orderSize ? <span className="text-[var(--ink)] tabular-nums">{formatOrderSize(update.orderSize)}</span> : null}
            <span>{update.filedLabel}</span>
            <FilingLink update={update} />
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--ink-soft)]">{read.what}</p>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--ink)]">{read.changes}</p>
        <Anchor pick={pick} className="mt-2 line-clamp-2 max-w-3xl text-xs leading-relaxed" />
      </div>
    </li>
  );
}

function PhoneRow({ pick }: { pick: StoryPick }) {
  const { update, read } = pick;
  return (
    <li className="border-b border-[var(--rule)] px-3.5 py-3.5 last:border-b-0">
      <div className="flex items-baseline gap-2.5">
        <span aria-hidden className="house-data w-4 shrink-0 text-[11px] text-[var(--ink-soft)] tabular-nums">
          {pick.rank}
        </span>
        <Link
          href={`/company/${update.companyCode}`}
          prefetch={false}
          className={cn("house-display min-w-0 flex-1 text-[15px] leading-snug text-[var(--ink)]", MOBILE_FOCUS)}
        >
          {update.companyName}
        </Link>
        <span className="house-data shrink-0 text-[10px] text-[var(--ink-soft)]">{update.filedLabel.replace(/ ago$/, "")}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[26px]">
        <EffectChip effect={read.story_effect} />
        <RiskPill update={update} />
        <BelowCutTag show={pick.belowCut} />
        <span className="house-data text-[9px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">{update.categoryLabel}</span>
      </div>
      <p className="mt-2 pl-[26px] text-xs leading-[1.5] text-[var(--ink-soft)] [text-wrap:pretty]">{read.what}</p>
      <p className="mt-1.5 pl-[26px] text-[13px] leading-[1.5] text-[var(--ink)] [text-wrap:pretty]">{read.changes}</p>
      <Anchor pick={pick} className="mt-2 line-clamp-3 pl-[26px] text-[11px] leading-[1.45]" />
      <FilingLink update={update} className="mt-2 inline-block pl-[26px]" />
    </li>
  );
}

const DEK =
  "The filings of the past week that bear on what a company's story rests on, each held against its own guidance. " +
  "Anything in line with a company's normal run is left to the tape below.";

/** Desktop paint: an editorial block above the tape. Renders nothing without picks. */
export function TopOfWeekDesktop({ picks }: { picks: StoryPick[] }) {
  if (picks.length === 0) return null;
  return (
    <section aria-labelledby="top-of-week" className="mb-12">
      <p className="house-data house-micro flex flex-wrap items-center gap-x-2 text-[var(--ink-soft)]">
        <span aria-hidden className="text-[var(--signal)]">
          ●
        </span>
        <span>Last {STORY_WINDOW_DAYS} days</span>
        <span aria-hidden>·</span>
        <span>
          {picks.length} of up to {MAX_STORY_PICKS}
        </span>
      </p>
      <h2 id="top-of-week" className="house-display mt-2 text-2xl leading-tight sm:text-3xl">
        What moved a story this week
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">{DEK}</p>
      <ol className="mt-4 rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] px-5 sm:px-6">
        {picks.map((pick) => (
          <DesktopRow key={pick.update.id} pick={pick} />
        ))}
      </ol>
    </section>
  );
}

/** Phone paint: one card under the masthead, before the tape's card. */
export function TopOfWeekPhone({ picks }: { picks: StoryPick[] }) {
  if (picks.length === 0) return null;
  return (
    <section aria-labelledby="top-of-week-phone" className={cn(MOBILE_CARD, "mb-4 mt-4")}>
      <MobileCardHead
        id="top-of-week-phone"
        eyebrow="What moved a story this week"
        live
        right={
          <span className="house-data whitespace-nowrap text-[10px] text-[var(--ink-soft)]">last {STORY_WINDOW_DAYS} days</span>
        }
      />
      <ol>
        {picks.map((pick) => (
          <PhoneRow key={pick.update.id} pick={pick} />
        ))}
      </ol>
    </section>
  );
}
