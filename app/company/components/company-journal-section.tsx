// The company page's Journal tab: every Journal post about this company — its
// own stories and the head-to-heads it appears in — as links into /blog. The
// set comes from post frontmatter (`companyJournal` in app/blog/lanes.ts), so
// nothing here is curated per company. The page only mounts this tab when the
// set is non-empty. Server component.

import Image from "next/image";
import Link from "next/link";

import { comparisonTitle } from "@/app/blog/comparison";
import { shortDateLabel } from "@/app/blog/dates";
import {
  storyLabel,
  type CompanyJournal,
  type CompanyStory,
  type ComparisonPost,
} from "@/app/blog/lanes";
import { MOBILE_FOCUS } from "@/components/mobile-card";
import { SectionCard } from "./section-card";

const ROW_CLASS = `flex w-full gap-3 rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-3 transition-colors hover:border-[var(--ink-soft)] active:bg-[var(--paper-2)] ${MOBILE_FOCUS}`;

function GroupLabel({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <p className="house-data text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ink-soft)]">
        {title}
      </p>
      <span className="house-data text-[10px] text-[var(--ink-soft)]">{count}</span>
    </div>
  );
}

function RowFooter({ date, dateLabel, cta }: { date: string; dateLabel: string; cta: string }) {
  return (
    <span className="mt-auto flex items-center justify-between gap-2 pt-2.5">
      <time
        dateTime={date || undefined}
        className="house-data whitespace-nowrap text-[10px] text-[var(--ink-soft)]"
      >
        {shortDateLabel(date, dateLabel)}
      </time>
      <span className="house-data text-[10px] text-[var(--ink)]">{cta}</span>
    </span>
  );
}

function StoryRow({ story }: { story: CompanyStory }) {
  return (
    <Link href={`/blog/${story.slug}`} className={ROW_CLASS}>
      <span
        aria-hidden
        className="relative block aspect-[4/5] w-[72px] shrink-0 overflow-hidden rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)]"
      >
        {story.image ? (
          <Image src={story.image} alt="" fill sizes="72px" className="object-cover object-top" />
        ) : (
          <span className="flex h-full flex-col justify-end p-1.5">
            <span className="mt-1 block h-[2px] w-5 bg-[var(--mark)]" />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="house-data self-start whitespace-nowrap rounded-full border border-[var(--rule)] px-1.5 py-px text-[9px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          {storyLabel(story)}
        </span>
        <span className="house-display mt-1.5 line-clamp-2 text-[16px] leading-snug [text-wrap:pretty]">
          {story.title}
        </span>
        {story.summary ? (
          <span className="mt-1 line-clamp-2 text-[13px] leading-[1.5] text-[var(--ink-soft)]">
            {story.summary}
          </span>
        ) : null}
        <RowFooter date={story.date} dateLabel={story.dateLabel} cta="Read →" />
      </span>
    </Link>
  );
}

function ComparisonRow({ post }: { post: ComparisonPost }) {
  const c = post.comparison;
  return (
    <Link href={`/blog/${post.slug}`} className={ROW_CLASS}>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="house-data truncate text-[9px] uppercase tracking-[0.14em] text-[var(--signal)]">
          {c.a.name} vs {c.b.name} · {c.industry}
        </span>
        <span className="house-display mt-1.5 line-clamp-2 text-[16px] leading-snug [text-wrap:pretty]">
          {comparisonTitle(post.title, c.a.name)}
        </span>
        {post.summary ? (
          <span className="mt-1 line-clamp-2 text-[13px] leading-[1.5] text-[var(--ink-soft)]">
            {post.summary}
          </span>
        ) : null}
        <RowFooter date={post.date} dateLabel={post.dateLabel} cta="Read the comparison →" />
      </span>
    </Link>
  );
}

export function CompanyJournalSection({
  journal,
  companyName,
}: {
  journal: CompanyJournal;
  companyName: string;
}) {
  const { stories, headToHead } = journal;
  return (
    <SectionCard id="company-journal" title="Journal">
      <div className="house-tokens flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Our write-ups on {companyName} from the Journal, newest first.
        </p>
        {stories.length ? (
          <div>
            <GroupLabel title="Company stories" count={stories.length} />
            <ul className="grid gap-3 lg:grid-cols-2">
              {stories.map((story) => (
                <li key={story.slug} className="flex">
                  <StoryRow story={story} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {headToHead.length ? (
          <div>
            <GroupLabel title="Head to head" count={headToHead.length} />
            <ul className="grid gap-3 lg:grid-cols-2">
              {headToHead.map((post) => (
                <li key={post.slug} className="flex">
                  <ComparisonRow post={post} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
