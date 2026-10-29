// "Featured reads · from the Journal" (2026-10-29 redesign): the newest company
// story large, the next company story and the newest Notebook essay small
// (lib/desk-journal.ts picks them). A company story's hand-drawn cover sits
// faintly behind its text — decoration, so it is hidden from assistive tech.
// Reads the MDX frontmatter at request time: next.config.ts traces
// app/blog/posts and the covers into this route.

import Image from "next/image";

import { getAllPostMeta } from "@/app/blog/posts";
import { HomepageModuleLink } from "@/components/homepage-module-link";
import { getCachedDeskFeaturedReads } from "@/lib/desk-featured/data";
import { isPinned } from "@/lib/desk-featured/types";
import { selectDeskJournal, type DeskJournalCard } from "@/lib/desk-journal";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { CardEyebrow, DESK_CARD, DESK_FOCUS, DESK_HOVER, DeskSection } from "./desk-ui";
import { DeskSectionTracker } from "./desk-section-tracker";

const POST_HREF = /^\/blog\/([a-z0-9-]+)\/?$/;

/** A live editorial pin on a Journal card (desk_featured_read) names the post to lead with. */
async function pinnedJournalSlug(nowMs: number): Promise<string | null> {
  const reads = await getCachedDeskFeaturedReads();
  const pin = reads
    .filter((r) => r.section === "journal" && isPinned(r, nowMs))
    .sort((a, b) => Date.parse(b.publishedAtRaw ?? "") - Date.parse(a.publishedAtRaw ?? "") || 0)[0];
  return pin ? POST_HREF.exec(pin.href)?.[1] ?? null : null;
}

function Cover({ src, className }: { src: string; className: string }) {
  return (
    // The covers are light plates (like the posters): multiplied into the paper
    // they leave only their linework; on the dark paper they would read as a
    // grey slab, so they sit out dark mode.
    <span
      aria-hidden
      className={cn("pointer-events-none absolute select-none opacity-[0.18] mix-blend-multiply dark:hidden", className)}
    >
      <Image src={src} alt="" fill unoptimized className="object-contain" />
    </span>
  );
}

function LeadCard({ card }: { card: DeskJournalCard }) {
  const { post } = card;
  return (
    <HomepageModuleLink
      module="desk_journal_lead"
      companyCode={post.companyCode}
      surface="desk"
      href={`/blog/${post.slug}`}
      className={cn("relative flex min-h-[19rem] flex-col p-5 sm:p-8", DESK_HOVER, DESK_FOCUS)}
    >
      {post.cover ? <Cover src={post.cover} className="inset-y-6 right-6 hidden w-[58%] sm:block" /> : null}
      <span className="relative flex flex-1 flex-col">
        <CardEyebrow parts={card.eyebrow} />
        <span className="house-display mt-4 block max-w-[34rem] text-[26px] leading-[1.06] [text-wrap:balance] sm:text-[34px]">
          {post.title}
        </span>
        {post.summary ? (
          <span className="mt-4 block max-w-[36rem] text-[15px] leading-relaxed text-[var(--ink-soft)] [text-wrap:pretty]">
            {post.summary}
          </span>
        ) : null}
        <span className="mt-auto block pt-6">
          <span className="flex justify-end border-t border-[var(--ink-soft)] pt-3.5">
            <span className="house-data text-xs text-[var(--ink)]">Read the story →</span>
          </span>
        </span>
      </span>
    </HomepageModuleLink>
  );
}

function SideCard({ card }: { card: DeskJournalCard }) {
  const { post } = card;
  return (
    <HomepageModuleLink
      module="desk_journal_side"
      companyCode={post.companyCode}
      surface="desk"
      href={`/blog/${post.slug}`}
      className={cn("relative block flex-1 p-5 sm:p-6", DESK_HOVER, DESK_FOCUS)}
    >
      {post.cover ? <Cover src={post.cover} className="inset-y-3 right-4 hidden w-[42%] sm:block" /> : null}
      <span className="relative block">
        <CardEyebrow parts={card.eyebrow} />
        <span className="house-display mt-3 block text-lg leading-snug [text-wrap:balance] sm:text-xl">{post.title}</span>
        {post.summary ? (
          <span className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-[var(--ink-soft)] [text-wrap:pretty]">
            {post.summary}
          </span>
        ) : null}
      </span>
    </HomepageModuleLink>
  );
}

export async function DeskJournalReads() {
  let journal;
  try {
    journal = selectDeskJournal(getAllPostMeta(), await pinnedJournalSlug(Date.now()));
  } catch (error) {
    // An untraced posts folder (ENOENT) must not take the desk down with it.
    logger.warn("desk journal: posts unreadable; hiding the block", { error });
    return null;
  }
  if (!journal.lead) return null;

  return (
    <DeskSectionTracker sectionId="desk_journal_reads">
      <DeskSection
        id="desk-journal-reads"
        eyebrow="Featured reads · from the Journal"
        link={{ href: "/blog", label: "All stories →" }}
      >
        <div className={cn(DESK_CARD, "grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]")}>
          <LeadCard card={journal.lead} />
          {journal.side.length > 0 ? (
            <div className="flex flex-col divide-y divide-[var(--rule)] border-t border-[var(--rule)] lg:border-l lg:border-t-0">
              {journal.side.map((card) => (
                <SideCard key={card.post.slug} card={card} />
              ))}
            </div>
          ) : null}
        </div>
      </DeskSection>
    </DeskSectionTracker>
  );
}
