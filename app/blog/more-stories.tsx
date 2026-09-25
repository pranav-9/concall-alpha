"use client";

import Image from "next/image";
import Link from "next/link";

import { rowDateLabel, weekRanges, type WeekGroup } from "./dates";
import { useStoriesExpanded } from "./journal-view-state";
import type { CompanyStory } from "./lanes";
import { MORE_STORIES_ROWS, moreStoriesView, storyLabel } from "./lanes";
import { FOCUS_RING, ROW_FOCUS } from "./plate-header";

const GROUP_LABELS: Record<WeekGroup, string> = {
  this: "This week",
  last: "Last week",
  earlier: "Earlier",
};

// The Company Stories archive: company stories from #4 on, first MORE_STORIES_ROWS shown,
// grouped by week (lanes.ts `moreStoriesView`). Client only for the toggle; the
// flag lives in JournalViewProvider (shared with the phone fold, so a resize
// across `sm` keeps it). `today` is the server's IST date, passed in so
// grouping is identical on server and client.
export function MoreStories({ stories, today }: { stories: CompanyStory[]; today: string }) {
  const { storiesExpanded, setStoriesExpanded } = useStoriesExpanded();
  const { canFold, expanded, groups } = moreStoriesView(stories, today, storiesExpanded);
  const ranges = weekRanges(today);

  return (
    <div className="mt-14">
      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] pb-3">
        <h3 className="house-display text-[26px] leading-tight">More stories</h3>
        <span className="house-data text-[11px] text-[var(--ink-soft)]">
          {expanded
            ? `${stories.length} ${stories.length === 1 ? "story" : "stories"}`
            : `Latest ${MORE_STORIES_ROWS} of ${stories.length}`}
        </span>
      </div>

      <div id="more-stories-rows">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="house-data mt-6 flex items-center gap-3 pb-1 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              <span className="font-semibold text-[var(--ink)]">{GROUP_LABELS[g.key]}</span>
              <span>{ranges[g.key]}</span>
              <span aria-hidden className="h-px flex-1 bg-[var(--rule)]" />
              <span>
                {g.rows.length} {g.rows.length === 1 ? "story" : "stories"}
              </span>
            </div>
            <ul>
              {g.rows.map((story) => (
                <li key={story.slug}>
                  <StoryRow story={story} today={today} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {canFold ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="more-stories-rows"
          onClick={() => setStoriesExpanded(!storiesExpanded)}
          className={`house-data mt-5 w-full rounded-lg border border-dashed border-[var(--rule)] bg-transparent p-[13px] text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)] transition-colors duration-150 hover:border-[var(--ink-soft)] hover:text-[var(--ink)] ${FOCUS_RING}`}
        >
          {expanded ? "Show fewer ↑" : `Show all ${stories.length} stories ↓`}
        </button>
      ) : null}
    </div>
  );
}

function StoryRow({ story, today }: { story: CompanyStory; today: string }) {
  return (
    <Link
      href={`/blog/${story.slug}`}
      className={`-mx-2.5 grid grid-cols-[62px_64px_minmax(0,1fr)] gap-[18px] border-b border-[var(--rule)] px-2.5 py-4 transition-colors duration-150 hover:bg-[var(--paper-2)] ${ROW_FOCUS}`}
    >
      <time
        dateTime={story.date || undefined}
        className="house-data pt-0.5 text-[11px] text-[var(--ink-soft)]"
      >
        {rowDateLabel(story.date, story.dateLabel, today)}
      </time>

      <span className="relative block aspect-[4/5] w-16 overflow-hidden rounded-[3px] border border-[var(--rule)] bg-[var(--paper-2)]">
        {story.image ? (
          <Image src={story.image} alt="" fill sizes="64px" className="object-cover object-top" />
        ) : null}
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="house-data text-[10px] uppercase tracking-[0.12em] text-[var(--signal)]">
            {story.company ?? "Company"}
          </span>
          {story.storyTotal > 1 ? (
            <span className="house-data rounded-full border border-[var(--ink-soft)] px-1.5 py-px text-[9px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
              {storyLabel(story)}
            </span>
          ) : null}
        </span>
        <span className="house-display mt-1.5 block text-[19px] leading-[1.25] [text-wrap:pretty]">
          {story.title}
        </span>
        <span className="mt-1.5 line-clamp-2 max-w-[72ch] text-[13px] leading-[1.55] text-[var(--ink-soft)]">
          {story.summary}
        </span>
      </span>
    </Link>
  );
}
