import type { Metadata } from "next";

import { JournalMarkSeen } from "@/components/journal-mark-seen";
import { TelegramJoinLink } from "@/components/telegram-join-link";
import { getTelegramJoinUrl } from "@/lib/community";

import { JournalList } from "./journal-list";
import { getAllPostMeta } from "./posts";

export const metadata: Metadata = {
  title: "Journal – Story of a Stock",
  description:
    "What I'm building, how I think as an investor, and the companies I'm digging into.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = getAllPostMeta();
  const latestDate = posts[0]?.date ?? "";
  const telegramUrl = getTelegramJoinUrl();

  return (
    <main>
      <JournalMarkSeen latestKey={latestDate} />
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Journal
          </h1>
          {telegramUrl ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Section updates and the odd question, as they happen, in the{" "}
              <TelegramJoinLink
                href={telegramUrl}
                surface="journal_index"
                className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
              >
                Telegram group
              </TelegramJoinLink>
              .
            </p>
          ) : null}
        </header>

        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <JournalList posts={posts} />
        )}
      </div>
    </main>
  );
}
