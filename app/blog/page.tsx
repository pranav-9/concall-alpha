import type { Metadata } from "next";

import { JournalMarkSeen } from "@/components/journal-mark-seen";
import { TelegramJoinLink } from "@/components/telegram-join-link";
import { getTelegramJoinUrl } from "@/lib/community";

import { CompanyStories } from "./company-stories";
import { deriveJournalLanes } from "./lanes";
import { NotebookFeed } from "./notebook-feed";
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
  const latestDate = posts[0]?.date ?? "";
  const latestLabel = posts[0]?.dateLabel ?? "";
  const telegramUrl = getTelegramJoinUrl();

  return (
    <main className="house min-h-screen">
      <JournalMarkSeen latestKey={latestDate} />
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        {/* Masthead */}
        <header>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <div className="flex flex-col gap-3">
              <span className="house-data house-micro text-[var(--signal)]">
                Story of a Stock · Field notes
              </span>
              <h1 className="house-display text-6xl leading-none sm:text-7xl lg:text-8xl">
                Journal
              </h1>
            </div>
            <div className="house-data house-micro flex flex-col gap-1.5 text-[var(--ink-soft)] sm:items-end sm:text-right">
              <span>Est. May 2026</span>
              <span>
                {lanes.companyCount} company stories · {lanes.notebook.length}{" "}
                notebook entries
              </span>
              {latestLabel ? <span>Updated {latestLabel}</span> : null}
            </div>
          </div>

          <div aria-hidden className="mt-6 h-[3px] bg-[var(--ink)]" />
          <div aria-hidden className="mt-[3px] h-px bg-[var(--rule)]" />

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
            <p className="max-w-xl text-[15px] leading-6 text-[var(--ink-soft)] sm:text-base">
              What I&rsquo;m building, how I think as an investor, and the
              companies I&rsquo;m digging into — with every number traceable back
              to a transcript, a deck, or a broker note.
            </p>
            {telegramUrl ? (
              <TelegramJoinLink
                href={telegramUrl}
                surface="journal_index"
                className="house-data inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-2.5 text-[13px] text-[var(--ink)] transition-colors hover:border-[var(--ink)] sm:self-auto"
              >
                Updates land in the Telegram group →
              </TelegramJoinLink>
            ) : null}
          </div>
        </header>

        {posts.length === 0 ? (
          <p className="mt-10 text-sm text-[var(--ink-soft)]">No posts yet.</p>
        ) : (
          <>
            <CompanyStories lanes={lanes} />
            {lanes.notebook.length ? (
              <NotebookFeed posts={lanes.notebook} />
            ) : null}
          </>
        )}

        <footer className="mt-16 border-t border-[var(--rule)] pt-5 sm:mt-20">
          <div className="house-data house-micro flex flex-col gap-2 text-[var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between">
            <span>Story of a Stock — Journal</span>
            <span>Field notes on ~100 mid &amp; small-cap Indian companies</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
