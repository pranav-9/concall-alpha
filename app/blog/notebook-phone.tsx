"use client";

import { useMemo } from "react";
import Link from "next/link";

import {
  MOBILE_CARD,
  MOBILE_CHIP_STRIP,
  MOBILE_LI,
  MOBILE_LINK,
  mobileChipClass,
} from "@/components/mobile-card";

import { CATEGORY_LABELS } from "./categories";
import { shortDateLabel } from "./dates";
import { filterNotebook, notebookCatalog } from "./lanes";
import { useNotebookFilter } from "./journal-view-state";
import type { BlogPostMeta } from "./posts";

// The Notebook lane on the phone: a chip strip over one list card, no cover
// plates. The filter is the same JournalViewProvider state the desktop feed
// reads (so a crossing of `sm` keeps the reader's choice), and the catalog
// (stable "No.", categories, counts) is lanes.ts's, so the two paints cannot
// drift. `posts` arrives newest-first, notebook-only.
export function NotebookPhone({ posts }: { posts: BlogPostMeta[] }) {
  const { filter, setFilter } = useNotebookFilter();
  const { numberFor, categories, counts } = useMemo(() => notebookCatalog(posts), [posts]);
  const visible = filterNotebook(posts, filter);

  return (
    <section aria-labelledby="notebook-phone-heading" className="mt-3.5">
      {/* The visible label is MobileDivider's span above; this keeps the lane
          reachable by heading navigation, as the desktop <h2> does. */}
      <h2 id="notebook-phone-heading" className="sr-only">
        The Notebook
      </h2>
      <div className={`${MOBILE_CHIP_STRIP} px-4`} role="group" aria-label="Filter notebook entries">
        <FilterChip active={filter === "all"} count={posts.length} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {categories.map((cat) => (
          <FilterChip
            key={cat}
            active={filter === cat}
            count={counts[cat]}
            onClick={() => setFilter(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </FilterChip>
        ))}
      </div>

      <ol className={`${MOBILE_CARD} mt-3.5`}>
        {visible.map((post) => (
          <li key={post.slug} className={MOBILE_LI}>
            <Link href={`/blog/${post.slug}`} className={`${MOBILE_LINK} flex gap-3 px-3.5 py-3.5`}>
              <span className="house-data w-[30px] shrink-0 pt-0.5 text-[10px] leading-[1.3] text-[var(--ink-soft)]">
                No.
                <br />
                {numberFor.get(post.slug) ?? ""}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                {post.category ? (
                  <span className="house-data text-[9px] uppercase tracking-[0.14em] text-[var(--signal)]">
                    {CATEGORY_LABELS[post.category]}
                  </span>
                ) : null}
                <span className="house-display mt-1 text-[16px] leading-snug [text-wrap:pretty]">
                  {post.title}
                </span>
                <span className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-[var(--ink-soft)]">
                  {post.summary}
                </span>
                <span className="mt-3 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 flex-wrap gap-1.5 overflow-hidden">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="house-data whitespace-nowrap rounded-full border border-[var(--rule)] px-2 py-0.5 text-[9px] text-[var(--ink-soft)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                  <time
                    dateTime={post.date || undefined}
                    className="house-data shrink-0 whitespace-nowrap text-[10px] text-[var(--ink-soft)]"
                  >
                    {shortDateLabel(post.date, post.dateLabel)}
                  </time>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={mobileChipClass(active)}>
      {children}
      <span className={`ml-1.5 tabular-nums ${active ? "opacity-70" : "opacity-60"}`}>{count}</span>
    </button>
  );
}
