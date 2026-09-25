import type { Metadata } from "next";

import { JournalMarkSeen } from "@/components/journal-mark-seen";
import { TelegramJoinLink } from "@/components/telegram-join-link";
import { BelowSm, FromSm } from "@/components/viewport-gate";
import { getTelegramJoinUrl } from "@/lib/community";

import { CompanyStories } from "./company-stories";
import { JournalPhone } from "./journal-phone";
import { istToday } from "./dates";
import { HeadToHead } from "./head-to-head";
import { deriveDesktopJournal, deriveJournalLanes } from "./lanes";
import { NotebookFeed } from "./notebook-feed";
import { JournalViewProvider } from "./journal-view-state";
import { getAllPostMeta } from "./posts";

export const metadata: Metadata = {
  title: "Journal – Story of a Stock",
  description:
    "What I'm building, how I think as an investor, and the companies I'm digging into.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = getAllPostMeta();
  const lanes = deriveJournalLanes(posts);
  // One empty-state rule for both paints, keyed off what the lanes will paint
  // (not the raw post count): posts with no known category join neither lane.
  const hasPosts = lanes.companyCount + lanes.notebook.length > 0;
  const desktop = deriveDesktopJournal(posts);
  // IST date for the desktop paint's "Today", fresh dot and week groups. The
  // route renders per request (the root layout reads the session), so it
  // never goes stale.
  const today = istToday();
  const latestDate = posts[0]?.date ?? "";
  const telegramUrl = getTelegramJoinUrl();

  return (
    <main className="house min-h-screen">
      <JournalMarkSeen latestKey={latestDate} />
      {/* Phone (<sm) and desktop paints of the same lanes; the hidden one
          unmounts after hydration (components/viewport-gate.tsx). Reader state
          (Notebook filter, stories fold) sits above both so a resize across
          `sm` keeps it. */}
      <JournalViewProvider>
      <BelowSm>
        <JournalPhone lanes={lanes} telegramUrl={telegramUrl} hasPosts={hasPosts} />
      </BelowSm>
      <FromSm>
      <div className="mx-auto w-full max-w-[1240px] px-8 pb-16 pt-11">
        <header className="flex flex-col gap-5 border-b border-[var(--ink)] pb-[18px] md:flex-row md:items-end md:justify-between md:gap-10">
          <div>
            <h1 className="house-display text-[56px] leading-[0.95] tracking-[-0.04em]">
              Journal
            </h1>
            <p className="mt-3.5 max-w-[58ch] text-[15px] leading-[1.6] text-[var(--ink-soft)]">
              What I&rsquo;m building, how I think as an investor, and the
              companies I&rsquo;m digging into — with every number traceable back
              to a transcript, a deck, or a broker note.
            </p>
          </div>
          {telegramUrl ? (
            <TelegramJoinLink
              href={telegramUrl}
              surface="journal_index"
              className="house-data shrink-0 text-[12px] text-[var(--ink)] underline decoration-[var(--mark)] decoration-2 underline-offset-4 transition-colors duration-150 hover:text-[var(--signal)]"
            >
              Get updates on Telegram →
            </TelegramJoinLink>
          ) : null}
        </header>

        {!desktop.stories.length && !desktop.headToHead.length && !desktop.notebook.length ? (
          <p className="mt-10 text-sm text-[var(--ink-soft)]">No posts yet.</p>
        ) : (
          <>
            <CompanyStories
              stories={desktop.stories}
              companyNameCount={desktop.companyNameCount}
              today={today}
            />
            <HeadToHead posts={desktop.headToHead} />
            {desktop.notebook.length ? <NotebookFeed posts={desktop.notebook} /> : null}
          </>
        )}

        <footer className="mt-[72px] border-t border-[var(--rule)] pt-[18px]">
          <div className="house-data flex flex-col gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)] md:flex-row md:items-center md:justify-between md:gap-8">
            <span>Story of a Stock — Journal</span>
            <span>
              Experimental research workflow for Indian equity scuttlebutt. Not investment advice.
            </span>
          </div>
        </footer>
      </div>
      </FromSm>
      </JournalViewProvider>
    </main>
  );
}
