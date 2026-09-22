// The Journal's flagship lane: company write-ups pulled out of the flat feed
// into an elevated, poster-led section, tracked per company so each name builds
// a visible history. Server component (static, no filter) — the theme filter
// lives on the Notebook feed below.

import Image from "next/image";
import Link from "next/link";

import type { CompanyStory, JournalLanes, LedgerEntry } from "./lanes";
import { pad, priorLinkLabel, priorStory, storyLabel } from "./lanes";

export function CompanyStories({ lanes }: { lanes: JournalLanes }) {
  const { featured, companyRest, ledger, companyCount, companyNameCount } =
    lanes;
  if (!featured) return null;
  const prior = priorStory(featured, companyRest);

  return (
    <section
      aria-labelledby="company-stories-heading"
      className="mt-10 rounded-2xl border border-[var(--rule)] bg-[var(--paper-2)] p-6 sm:mt-14 sm:p-8 lg:p-10"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="h-[3px] w-6 bg-[var(--signal)]" />
            <span className="house-data house-micro text-[var(--signal)]">
              The flagship lane
            </span>
          </div>
          <h2 id="company-stories-heading" className="house-display text-3xl sm:text-4xl">
            Company Stories
          </h2>
          <p className="max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
            The story of a company, read from its own filings — one poster per
            story, kept up as the story moves. Tracked by company, so each name
            builds a history.
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:items-end sm:gap-1">
          <span className="house-display text-4xl leading-none sm:text-5xl">
            {pad(companyCount)}
          </span>
          <span className="house-data house-micro text-[var(--ink-soft)]">
            stories · {companyNameCount} companies
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <span className="house-data house-micro mr-1 text-[var(--ink-soft)]">
          Tracked by company
        </span>
        {ledger.map((co) => (
          <LedgerChip key={co.code || co.name} co={co} />
        ))}
      </div>

      <div className="mt-6 h-px bg-[var(--rule)]" />

      {/* Featured — the newest company story */}
      <div className="mt-7 flex flex-col gap-7 md:flex-row md:items-center md:gap-10">
        <Link
          href={`/blog/${featured.slug}`}
          aria-label={featured.title}
          className="block w-full shrink-0 md:w-[360px]"
        >
          <PosterPlate
            src={featured.image}
            alt={featured.imageAlt ?? featured.title}
            name={featured.company}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="house-data flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] uppercase tracking-wide">
            <span className="font-semibold text-[var(--ink)]">Latest</span>
            <span className="text-[var(--rule)]">/</span>
            <span className="text-[var(--signal)]">{featured.company}</span>
            <span className="text-[var(--rule)]">/</span>
            <span className="text-[var(--ink-soft)]">
              {storyLabel(featured)} · {featured.dateLabel}
            </span>
          </div>
          <Link href={`/blog/${featured.slug}`} className="group mt-4 block">
            <h3 className="house-display text-2xl leading-tight transition-colors group-hover:text-[var(--signal)] sm:text-[2rem]">
              {featured.title}
            </h3>
          </Link>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--ink-soft)]">
            {featured.summary}
          </p>
          {prior ? (
            <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
              {storyLabel(featured)} on {featured.company} —{" "}
              <Link href={`/blog/${prior.slug}`} className="house-link">
                {priorLinkLabel(featured)}
              </Link>
              .
            </p>
          ) : null}
          <div className="mt-6">
            <Link
              href={`/blog/${featured.slug}`}
              className="house-link text-[15px] font-semibold"
            >
              Read the story →
            </Link>
          </div>
        </div>
      </div>

      {/* The rest of the company stories */}
      {companyRest.length ? (
        <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {companyRest.map((story) => (
            <CompanyCard key={story.slug} story={story} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LedgerChip({ co }: { co: LedgerEntry }) {
  const label = `${co.count} ${co.count === 1 ? "story" : "stories"}`;
  const cls =
    "house-data inline-flex items-center gap-2 rounded-full border border-[var(--rule)] bg-[var(--paper)] px-3 py-1.5 text-[11px] text-[var(--ink-soft)] transition-colors hover:border-[var(--ink-soft)]";
  const inner = (
    <>
      <span className="text-[var(--ink)]">{co.name}</span>
      <span aria-hidden className="text-[var(--rule)]">
        /
      </span>
      <span className="font-semibold text-[var(--ink)]">{label}</span>
    </>
  );
  return co.code ? (
    <Link href={`/company/${co.code}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

function PosterPlate({
  src,
  alt,
  name,
}: {
  src?: string;
  alt: string;
  name?: string;
}) {
  if (!src) {
    return (
      <div className="flex aspect-[4/5] w-full flex-col justify-between rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] p-6 shadow-[0_0_0_5px_var(--paper-2),0_0_0_6px_var(--rule)]">
        <span className="house-data house-micro text-[var(--signal)]">
          Company story
        </span>
        <div>
          <span className="house-display block text-3xl">{name}</span>
          <span aria-hidden className="mt-3 block h-[3px] w-12 bg-[var(--mark)]" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] p-3.5 shadow-[0_0_0_5px_var(--paper-2),0_0_0_6px_var(--rule)]">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2px] border border-[var(--rule)]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 768px) 360px, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}

function CompanyCard({ story }: { story: CompanyStory }) {
  return (
    <Link
      href={`/blog/${story.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-[var(--rule)] bg-[var(--paper)] transition-colors hover:border-[var(--ink)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-[var(--rule)]">
        {story.image ? (
          <Image
            src={story.image}
            alt={story.imageAlt ?? story.title}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 100vw"
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full flex-col justify-between bg-[var(--paper-2)] p-5">
            <span className="house-data house-micro text-[var(--signal)]">
              Company story
            </span>
            <div>
              <span className="house-display block text-2xl">
                {story.company ?? "Company story"}
              </span>
              <span aria-hidden className="mt-2 block h-[3px] w-10 bg-[var(--mark)]" />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="house-data house-micro truncate text-[var(--signal)]">
            {story.company ?? "Company"}
          </span>
          <span className="house-data shrink-0 rounded-full border border-[var(--rule)] px-2 py-0.5 text-[10px] text-[var(--ink-soft)]">
            {storyLabel(story)}
          </span>
        </div>
        <h3 className="house-display mt-3 line-clamp-2 text-lg leading-snug transition-colors group-hover:text-[var(--signal)]">
          {story.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-[var(--ink-soft)]">
          {story.summary}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="house-data text-[11px] text-[var(--ink-soft)]">
            {story.dateLabel}
          </span>
          <span className="house-data text-[11px] text-[var(--ink)]">Read →</span>
        </div>
      </div>
    </Link>
  );
}
