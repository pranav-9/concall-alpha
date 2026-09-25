// Plate 01 — the Journal's flagship lane on desktop: the three newest company
// stories as poster cards, then the archive ("More stories", more-stories.tsx).
// Comparison posts are not here — they have their own plate (head-to-head.tsx).
// Server component; `today` (IST yyyy-mm-dd) comes from the page so every
// relative date on it agrees.

import Image from "next/image";
import Link from "next/link";

import { isFresh, relativeDayLabel } from "./dates";
import type { CompanyStory } from "./lanes";
import { MoreStories } from "./more-stories";
import { CARD_CTA, PlateHeader } from "./plate-header";

const LATEST = 3;

export function CompanyStories({
  stories,
  companyNameCount,
  today,
}: {
  stories: CompanyStory[];
  companyNameCount: number;
  today: string;
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
        label="Plate 01 — Company Stories"
        right={`${stories.length} stories · ${companyNameCount} companies`}
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
      className="flex flex-col rounded-[14px] border border-[var(--rule)] bg-[var(--paper-2)] p-[18px] transition-colors duration-150 hover:border-[var(--ink)]"
    >
      <span className="m-[5px] block rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] p-2 shadow-[0_0_0_4px_var(--paper-2),0_0_0_5px_var(--rule)]">
        <span className="relative block aspect-[16/10] overflow-hidden rounded-[2px] border border-[var(--rule)] bg-[var(--paper-2)]">
          {story.image ? (
            // Lazy (the default), never `priority`: this paint is also in the
            // phone's HTML, hidden — a preload would cost the phone a fetch.
            <Image
              src={story.image}
              alt={story.imageAlt ?? story.title}
              fill
              sizes="(min-width: 860px) 360px, 100vw"
              className="object-cover object-top"
            />
          ) : null}
        </span>
      </span>

      <span className="house-data mt-5 flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.08em]">
        <span
          aria-hidden
          className={`h-[7px] w-[7px] shrink-0 rounded-full ${fresh ? "bg-[var(--signal)]" : "bg-[var(--rule)]"}`}
        />
        <time dateTime={story.date || undefined} className="shrink-0 font-semibold text-[var(--ink)]">
          {relativeDayLabel(story.date, story.dateLabel, today)}
        </time>
        <span aria-hidden className="text-[var(--rule)]">
          /
        </span>
        <span className="truncate text-[var(--signal)]">{story.company ?? "Company"}</span>
      </span>

      <span className="house-display mt-2.5 block text-[22px] leading-[1.18] tracking-[-0.01em] [text-wrap:pretty]">
        {story.title}
      </span>
      <span className="mt-2.5 line-clamp-3 text-[13px] leading-[1.6] text-[var(--ink-soft)]">
        {story.summary}
      </span>

      <span className="mt-auto pt-4">
        <span className={CARD_CTA}>Read the story →</span>
      </span>
    </Link>
  );
}
