// The Journal's phone presentation (<sm), from the 2026-09-22 "Journal —
// mobile" handoff. Same server-fetched lanes as the desktop tree in page.tsx,
// painted in the house-skin mobile grammar (components/mobile-card.tsx): a
// masthead, one Company Stories card (featured story + compact rows for the
// rest), then the Notebook as a divider + chip strip + list card. Server
// component; the Notebook's filter state lives in notebook-phone.tsx.

import Image from "next/image";
import Link from "next/link";

import {
  LiveDot,
  MOBILE_CARD,
  MOBILE_FOCUS,
  MobileDivider,
} from "@/components/mobile-card";
import { TelegramJoinLink } from "@/components/telegram-join-link";

import { shortDateLabel } from "./dates";
import type { CompanyStory, JournalLanes } from "./lanes";
import { pad, priorLinkLabel, priorStory, storyLabel } from "./lanes";
import { NotebookPhone } from "./notebook-phone";

export function JournalPhone({
  lanes,
  telegramUrl,
  hasPosts,
}: {
  lanes: JournalLanes;
  telegramUrl: string | null;
  /** page.tsx derives this from the lanes so both paints share one empty-state rule. */
  hasPosts: boolean;
}) {
  return (
    <div className="pb-8">
      <header className="px-4 pt-[18px]">
        <p className="house-data flex items-center gap-[7px] text-[11px] text-[var(--ink-soft)]">
          <LiveDot />
          Story of a Stock · Field notes
        </p>
        <h1 className="house-display mt-1.5 text-[38px] leading-none">Journal</h1>
        <div aria-hidden className="mt-4 h-[3px] bg-[var(--ink)]" />
        <div aria-hidden className="mt-[3px] h-px bg-[var(--rule)]" />
        {telegramUrl ? (
          <TelegramJoinLink
            href={telegramUrl}
            surface="journal_index"
            className={`house-data mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-2.5 text-[12px] text-[var(--ink)] transition-colors hover:border-[var(--ink)] active:border-[var(--ink)] ${MOBILE_FOCUS}`}
          >
            Updates land in the Telegram group →
          </TelegramJoinLink>
        ) : null}
      </header>

      {!hasPosts ? (
        <p className="mt-8 px-4 text-sm text-[var(--ink-soft)]">No posts yet.</p>
      ) : (
        <>
          <CompanyStoriesPhone lanes={lanes} />
          {lanes.notebook.length ? (
            <>
              {/* aria-hidden: the section's sr-only h2 carries the name, so a
                  screen reader hears "The Notebook" once. */}
              <MobileDivider
                label={<span aria-hidden>The Notebook</span>}
                strong
                className="mt-8"
              />
              <NotebookPhone posts={lanes.notebook} />
            </>
          ) : null}
        </>
      )}

      <footer className="mx-4 mt-10 border-t border-[var(--rule)] pt-4">
        <p className="house-data text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
          Story of a Stock — Journal · Field notes on ~100 mid &amp; small caps
        </p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company Stories — the flagship lane as one card.
// ---------------------------------------------------------------------------

function CompanyStoriesPhone({ lanes }: { lanes: JournalLanes }) {
  const { featured, companyRest, companyCount, companyNameCount } = lanes;
  if (!featured) return null;
  const prior = priorStory(featured, companyRest);
  const href = `/blog/${featured.slug}`;

  return (
    <section
      aria-labelledby="company-stories-phone-heading"
      className={`${MOBILE_CARD} mt-6`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] px-3.5 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-[3px] w-5 bg-[var(--signal)]" />
            <span className="house-data text-[10px] uppercase tracking-[0.16em] text-[var(--signal)]">
              The flagship lane
            </span>
          </div>
          <h2
            id="company-stories-phone-heading"
            className="house-display mt-1.5 text-[22px] leading-tight"
          >
            Company Stories
          </h2>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="house-display text-[34px] leading-none">{pad(companyCount)}</span>
          <span className="house-data mt-1 whitespace-nowrap text-[9px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            stories · {companyNameCount} cos
          </span>
        </div>
      </div>

      {/* Featured — the newest company story */}
      <div className="px-3.5 pb-4 pt-3.5">
        <Link
          href={href}
          aria-label={featured.title}
          className={`block rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-2 ${MOBILE_FOCUS}`}
        >
          <PosterPhone story={featured} />
        </Link>

        <p className="house-data mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.08em]">
          <span className="font-semibold text-[var(--ink)]">Latest</span>
          <span aria-hidden className="text-[var(--rule)]">/</span>
          <span className="text-[var(--signal)]">{featured.company ?? "Company"}</span>
          <span aria-hidden className="text-[var(--rule)]">/</span>
          <span className="text-[var(--ink-soft)]">
            {storyLabel(featured)} · {shortDateLabel(featured.date, featured.dateLabel)}
          </span>
        </p>
        <Link href={href} className={`mt-2.5 block rounded-sm ${MOBILE_FOCUS}`}>
          <h3 className="house-display text-[22px] leading-[1.15] [text-wrap:pretty]">
            {featured.title}
          </h3>
        </Link>
        <p className="mt-3 text-[14px] leading-6 text-[var(--ink-soft)] [text-wrap:pretty]">
          {featured.summary}
        </p>
        {prior ? (
          <p className="mt-3 text-[13px] leading-5 text-[var(--ink-soft)]">
            Story {featured.storyIndex} on {featured.company ?? "this company"} —{" "}
            <Link href={`/blog/${prior.slug}`} className="house-link">
              {priorLinkLabel(featured)}
            </Link>
            .
          </p>
        ) : null}
        <Link
          href={href}
          className="house-data house-link mt-4 inline-flex min-h-11 items-center text-[13px] font-semibold"
        >
          Read the story →
        </Link>
      </div>

      {/* The rest of the company stories, one compact row-card each */}
      {companyRest.length ? (
        <ul className="flex flex-col gap-2.5 border-t border-[var(--rule)] p-3.5">
          {companyRest.map((story) => (
            <li key={story.slug}>
              <StoryRow story={story} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

// Landscape crop of the story's poster (its title band and first exhibit sit
// at the top), inside the plate's own hairline; a text plate when a post
// shipped without one. `loading="eager"`, NOT `priority`: both paints are in
// the server HTML and next/image's `priority` preload is unconditional, so it
// would make every desktop visit download a full-width copy of a poster that
// unmounts on hydration. Eager emits no preload but still starts the phone's
// LCP image with the HTML. `sizes` is in px (a `vw` would limit the srcset
// to deviceSizes ≥640w), so the hidden desktop copy resolves to the 16w
// candidate (<1 KB) while the phone gets a candidate matched to its DPR.
function PosterPhone({ story }: { story: CompanyStory }) {
  if (story.image) {
    return (
      <span className="relative block aspect-[16/10] w-full overflow-hidden rounded-[4px] border border-[var(--rule)]">
        <Image
          src={story.image}
          alt={story.imageAlt ?? story.title}
          fill
          sizes="(min-width: 640px) 16px, 420px"
          loading="eager"
          className="object-cover object-top"
        />
      </span>
    );
  }
  return (
    <span className="flex aspect-[16/10] w-full flex-col justify-between rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] p-4">
      <span className="house-data text-[10px] uppercase tracking-[0.16em] text-[var(--signal)]">
        Company story
      </span>
      <span>
        <span className="house-display block text-[26px] leading-tight">
          {story.company ?? "Company story"}
        </span>
        <span aria-hidden className="mt-2.5 block h-[3px] w-12 bg-[var(--mark)]" />
      </span>
    </span>
  );
}

function StoryRow({ story }: { story: CompanyStory }) {
  return (
    <Link
      href={`/blog/${story.slug}`}
      className={`flex gap-3 rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-2.5 transition-colors active:bg-[var(--paper-2)] ${MOBILE_FOCUS}`}
    >
      <ThumbPhone story={story} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-start justify-between gap-2">
          <span className="house-data truncate pt-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--signal)]">
            {story.company ?? "Company"}
          </span>
          <span className="house-data shrink-0 whitespace-nowrap rounded-full border border-[var(--rule)] px-1.5 py-px text-[8px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
            {storyLabel(story)}
          </span>
        </span>
        <span className="house-display mt-1.5 line-clamp-2 text-[15px] leading-snug [text-wrap:pretty]">
          {story.title}
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <time
            dateTime={story.date || undefined}
            className="house-data whitespace-nowrap text-[10px] text-[var(--ink-soft)]"
          >
            {shortDateLabel(story.date, story.dateLabel)}
          </time>
          <span className="house-data text-[10px] text-[var(--ink)]">Read →</span>
        </span>
      </span>
    </Link>
  );
}

// The row's 68px poster thumbnail — top crop of the real poster, or a miniature
// text plate carrying the company name.
function ThumbPhone({ story }: { story: CompanyStory }) {
  return (
    <span
      aria-hidden
      className="relative block aspect-[4/5] w-[68px] shrink-0 overflow-hidden rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)]"
    >
      {story.image ? (
        <Image
          src={story.image}
          alt=""
          fill
          sizes="68px"
          className="object-cover object-top"
        />
      ) : (
        <span className="flex h-full flex-col justify-between p-1.5">
          <span className="house-data text-[8px] uppercase tracking-[0.14em] text-[var(--signal)]">
            Story
          </span>
          <span>
            <span className="house-display block text-[10px] leading-tight">
              {story.company ?? "Company"}
            </span>
            <span className="mt-1 block h-[2px] w-5 bg-[var(--mark)]" />
          </span>
        </span>
      )}
    </span>
  );
}
