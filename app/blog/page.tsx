import type { Metadata } from "next";

import { JournalMarkSeen } from "@/components/journal-mark-seen";

import { JournalList } from "./journal-list";
import { getAllPostMeta } from "./posts";

export const metadata: Metadata = {
  title: "Journal – Story of a Stock",
  description:
    "What I'm building, how I think as an investor, and the companies I'm digging into.",
};

export default function BlogIndexPage() {
  const posts = getAllPostMeta();
  const latestDate = posts[0]?.date ?? "";

  return (
    <main>
      <JournalMarkSeen latestKey={latestDate} />
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Journal
          </h1>
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
