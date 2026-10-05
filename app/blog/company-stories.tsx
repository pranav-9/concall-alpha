// The Company Stories plate — the Journal's flagship lane on desktop: the three newest company
// stories as illustrated cover cards, then the archive ("More stories", more-stories.tsx).
// Comparison posts are not here — they have their own plate (head-to-head.tsx).
// Server component; `today` (IST yyyy-mm-dd) comes from the page so every
// relative date on it agrees.

import Link from "next/link";

import { isFresh, relativeDayLabel } from "./dates";
import type { CompanyStory } from "./lanes";
import { MoreStories } from "./more-stories";
import { FOCUS_RING, PlateHeader, plateLabel } from "./plate-header";
import { StoryCover } from "./story-cover";

const LATEST = 3;

export function CompanyStories({
  stories,
  companyNameCount,
  today,
  plate,
}: {
  stories: CompanyStory[];
  companyNameCount: number;
  today: string;
  /** This plate's number on the page (page.tsx counts the plates it paints). */
  plate: number;
}) {
  if (!stories.length) return null;
  const latest = stories.slice(0, LATEST);
  const rest = stories.slice(LATEST);

  return (
    <section aria-labelledby="company-stories-heading" className="mt-[52px]">
      <h2 id="company-stories-heading" className="sr-only">
        Company Stories
      </h2>
      <PlateHeader
        label={plateLabel(plate, "Company Stories")}
        right={`${stories.length} ${stories.length === 1 ? "story" : "stories"} · ${companyNameCount} ${
          companyNameCount === 1 ? "company" : "companies"
        }`}
      />

      <div className="mt-[26px] grid grid-cols-1 gap-4 min-[860px]:grid-cols-3">
        {latest.map((story) => (
          <LatestCard key={story.slug} story={story} today={today} />
        ))}
      </div>

      {rest.length ? <MoreStories stories={rest} today={today} /> : null}
    </section>
  );
}

function LatestCard({ story, today }: { story: CompanyStory; today: string }) {
  const fresh = isFresh(story.date, today);
  return (
    <Link
      href={`/blog/${story.slug}`}
      className={`flex flex-col rounded-[14px] border border-[var(--rule)] bg-[var(--paper-2)] p-[22px] transition-colors duration-150 hover:border-[var(--ink)] ${FOCUS_RING}`}
    >
      {/* Lazy (the default), never `priority`: this paint is also in the
          phone's HTML, hidden — a preload would cost the phone a fetch. */}
      <StoryCover post={story} sizes="(min-width: 860px) 360px, 100vw" />

      <span className="house-data mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.1em]">
        <span
          aria-hidden
          className={`h-[7px] w-[7px] shrink-0 rounded-full ${fresh ? "bg-[var(--signal)]" : "bg-[var(--rule)]"}`}
        />
        <time dateTime={story.date || undefined} className="font-semibold text-[var(--ink)]">
          {relativeDayLabel(story.date, story.dateLabel, today)}
        </time>
      </span>

      <span className="house-display mt-3 block text-[22px] leading-[1.2] tracking-[-0.01em] [text-wrap:pretty]">
        {story.title}
      </span>
    </Link>
  );
}
