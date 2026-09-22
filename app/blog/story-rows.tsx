"use client";

import Image from "next/image";
import Link from "next/link";

import { MOBILE_FOCUS } from "@/components/mobile-card";

import { shortDateLabel } from "./dates";
import { useStoriesExpanded } from "./journal-view-state";
import type { CompanyStory } from "./lanes";
import { storyLabel } from "./lanes";

/**
 * Rows shown before the fold. With the featured story above them this makes
 * the five newest stories visible; the rest sit behind one toggle so the card
 * stays a screen or two long as the archive grows.
 */
export const PHONE_STORY_ROWS = 4;

// The remaining company stories on the phone, one compact row-card each,
// collapsed past PHONE_STORY_ROWS. Client component only for the toggle; the
// expanded flag lives in JournalViewProvider (shared parent, per viewport-gate).
export function StoryRows({ stories }: { stories: CompanyStory[] }) {
  const { storiesExpanded, setStoriesExpanded } = useStoriesExpanded();
  const hidden = Math.max(0, stories.length - PHONE_STORY_ROWS);
  const visible = storiesExpanded || hidden === 0 ? stories : stories.slice(0, PHONE_STORY_ROWS);

  return (
    <div className="border-t border-[var(--rule)] p-3.5">
      <ul id="company-stories-phone-rows" className="flex flex-col gap-2.5">
        {visible.map((story) => (
          <li key={story.slug}>
            <StoryRow story={story} />
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          aria-expanded={storiesExpanded}
          aria-controls="company-stories-phone-rows"
          onClick={() => setStoriesExpanded(!storiesExpanded)}
          className={`house-data mt-2.5 flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--rule)] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)] transition-colors active:text-[var(--ink)] hover:border-[var(--ink-soft)] hover:text-[var(--ink)] ${MOBILE_FOCUS}`}
        >
          {storiesExpanded
            ? "Show fewer stories ↑"
            : `Show ${hidden} more ${hidden === 1 ? "story" : "stories"} ↓`}
        </button>
      ) : null}
    </div>
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
