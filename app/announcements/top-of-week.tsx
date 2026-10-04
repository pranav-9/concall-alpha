"use client";

// "Top 5 this week" — the /announcements page's opening strip (mockup 2026-10-04).
//
// Up to five filings from the trailing seven days, one compact card each, on a
// single ruled row: rank, company, age; the tape's own impact pill and category;
// one short headline; the order's size and the filing link. Nothing else is on
// the card. The list is computed at load time by selectTopStoryReads
// (lib/announcement-story-read); this file only paints it.
//
// The headline is the card's one control: it opens that filing's read against
// the company's story (what it changes, what it is measured against) in a panel
// under the strip — one at a time, same tab order as the cards. The read is what
// earned the filing its place; the card stays a headline and a number.
//
// One paint for every width: five equal columns when they fit, a sideways
// scroll with snap when they do not (phones show about one and a half cards).

import { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { formatOrderSize, IMPACT_META } from "@/lib/exchange-desk/types";
import type { StoryPick } from "@/lib/announcement-story-read/select";
import { STORY_EFFECT_META } from "@/lib/announcement-story-read/types";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]";
const PILL = "house-data house-micro inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 leading-none";
/** Everything under the name lines up with the name, not the rank numeral. */
const INDENT = "pl-[18px]";

/** "2d ago" → "2d", "just now" → "now": the card's corner holds a short token. */
function shortAge(label: string): string {
  return label === "just now" ? "now" : label.replace(/ ago$/, "");
}

/** The card's one line: the producer's headline, else the tape's own summary. */
function headlineOf(pick: StoryPick): string {
  return pick.read.headline ?? pick.update.summary;
}

function Card({
  pick,
  open,
  panelId,
  onToggle,
}: {
  pick: StoryPick;
  open: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  const { update } = pick;
  const impact = IMPACT_META[update.impact];
  return (
    <li
      className={cn(
        "flex min-w-[15.5rem] flex-1 basis-0 snap-start flex-col border-l border-[var(--rule)] px-4 pb-3 pt-4 first:border-l-0 sm:min-w-[13.5rem] sm:first:pl-0",
        open && "bg-[color-mix(in_srgb,var(--signal)_5%,transparent)]",
      )}
    >
      <div className="flex items-baseline gap-2">
        <span aria-hidden className="house-data w-2.5 shrink-0 text-xs text-[var(--ink-soft)] tabular-nums">
          {pick.rank}
        </span>
        <Link
          href={`/company/${update.companyCode}`}
          prefetch={false}
          title={update.companyName}
          className={cn("house-display min-w-0 flex-1 truncate text-[1.0625rem] leading-tight hover:text-[var(--signal)]", FOCUS)}
        >
          {update.companyName}
        </Link>
        <span className="house-data shrink-0 text-xs text-[var(--ink-soft)]">{shortAge(update.filedLabel)}</span>
      </div>

      <div className={cn("mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5", INDENT)}>
        <span className={cn(PILL, impact.className)}>{impact.label}</span>
        <span className="house-data house-micro font-semibold text-[var(--ink)]">{update.categoryLabel}</span>
        {pick.belowCut ? (
          <span
            className={cn(PILL, "border-dashed border-[var(--rule)] text-[var(--ink-soft)]")}
            title="This company sits just below the coverage cut — still tracked, de-emphasised on the boards"
          >
            Below the cut
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        title={open ? "Hide the read" : "What it changes for the company"}
        className={cn("mt-2.5 text-left text-[0.9375rem] leading-snug text-[var(--ink)] hover:text-[var(--signal)]", INDENT, FOCUS)}
      >
        {/* Two lines for a producer headline (it is capped for that); the third is
            room for a long word wrapping at the narrowest column, never an ellipsis. */}
        <span className="line-clamp-3 [text-wrap:pretty]">{headlineOf(pick)}</span>
      </button>

      <div className={cn("mt-auto flex items-end justify-between gap-3 pt-3", INDENT)}>
        <span className="house-data text-xs leading-snug text-[var(--ink)] tabular-nums">
          {update.orderSize ? formatOrderSize(update.orderSize) : null}
        </span>
        {update.attachmentUrl ? (
          <a
            href={update.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("house-data shrink-0 whitespace-nowrap text-xs text-[var(--ink-soft)] hover:text-[var(--signal)]", FOCUS)}
          >
            filing ↗
          </a>
        ) : null}
      </div>
    </li>
  );
}

/** The read behind one card: what it changes, what was filed, what it is measured against. */
function ReadPanel({ pick, id }: { pick: StoryPick; id: string }) {
  const { update, read } = pick;
  const effect = read.story_effect === "none" ? null : STORY_EFFECT_META[read.story_effect];
  return (
    <div id={id} className="border-b border-[var(--rule)] px-4 py-4 sm:px-0">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="house-data house-micro text-[var(--ink-soft)]">
          {pick.rank} · {update.companyName}
        </span>
        {effect ? (
          <span className={cn(PILL, effect.className)} title={effect.title}>
            {effect.label}
          </span>
        ) : null}
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--ink)]">{read.changes}</p>
      <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--ink-soft)]">{read.what}</p>
      {read.anchor ? (
        <p className="mt-2 line-clamp-2 max-w-3xl text-xs leading-relaxed text-[var(--ink-soft)]">
          <span className="house-data house-micro mr-1.5">Measured against {read.anchor.source}:</span>
          {read.anchor.text}
        </p>
      ) : null}
    </div>
  );
}

/** Renders nothing without picks (the page then opens straight onto the tape). */
export function TopOfWeek({ picks }: { picks: StoryPick[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (picks.length === 0) return null;
  const open = picks.find((pick) => pick.update.id === openId) ?? null;
  const panelId = "top-of-week-read";

  return (
    <section aria-labelledby="top-of-week" className="mb-4 mt-5 sm:mb-0 sm:mt-7">
      <h2 id="top-of-week" className="house-display px-4 text-lg sm:px-0 sm:text-xl">
        Top {picks.length} this week
      </h2>
      <ol className="mt-4 flex snap-x snap-mandatory overflow-x-auto border-y border-[var(--rule)] sm:mt-5 sm:snap-none">
        {picks.map((pick) => (
          <Card
            key={pick.update.id}
            pick={pick}
            open={pick.update.id === openId}
            panelId={panelId}
            onToggle={() => setOpenId((current) => (current === pick.update.id ? null : pick.update.id))}
          />
        ))}
      </ol>
      {open ? <ReadPanel pick={open} id={panelId} /> : null}
    </section>
  );
}
