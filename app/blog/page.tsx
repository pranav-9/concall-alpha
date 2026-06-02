import type { Metadata } from "next";
import Link from "next/link";

import { getAllPostMeta } from "./posts";

export const metadata: Metadata = {
  title: "Build log – Story of a Stock",
  description: "Notes on what I'm changing in the portal, and why.",
};

export default function BlogIndexPage() {
  const posts = getAllPostMeta();

  return (
    <main>
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Build log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Notes on what I&apos;m changing in the portal, and why.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <ol className="space-y-6">
            {posts.map((post) => (
              <li
                key={post.slug}
                className="border-b border-border pb-6 last:border-0 last:pb-0"
              >
                <Link href={`/blog/${post.slug}`} className="group block">
                  <time
                    dateTime={post.date}
                    className="text-xs text-muted-foreground"
                  >
                    {post.dateLabel}
                  </time>
                  <h2 className="mt-1 text-base font-semibold text-foreground group-hover:underline sm:text-lg">
                    {post.title}
                  </h2>
                  {post.summary ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {post.summary}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
