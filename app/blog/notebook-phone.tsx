"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  MOBILE_CARD,
  MOBILE_CHIP_STRIP,
  MOBILE_LI,
  MOBILE_LINK,
  mobileChipClass,
} from "@/components/mobile-card";

import {
  CATEGORY_LABELS,
  NOTEBOOK_CATEGORIES,
  type BlogCategory,
} from "./categories";
import { shortDateLabel } from "./dates";
import type { BlogPostMeta } from "./posts";

type Filter = BlogCategory | "all";

// The Notebook lane on the phone: a chip strip over one list card, no cover
// plates. Own filter state — only one of the two Journal paints survives
// hydration (components/viewport-gate.tsx), so it can't diverge from the
// desktop feed's. `posts` arrives newest-first, notebook-only.
export function NotebookPhone({ posts }: { posts: BlogPostMeta[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  // Stable catalog number per post from the unfiltered order, so a post keeps
  // its "No." under a filter — same rule as the desktop feed.
  const numberFor = useMemo(() => {
    const map = new Map<string, string>();
    posts.forEach((p, i) => map.set(p.slug, String(i + 1).padStart(2, "0")));
    return map;
  }, [posts]);

  const availableCategories = useMemo(
    () => NOTEBOOK_CATEGORIES.filter((cat) => posts.some((p) => p.category === cat)),
    [posts],
  );
  const countFor = (cat: BlogCategory) => posts.filter((p) => p.category === cat).length;
  const visible = filter === "all" ? posts : posts.filter((p) => p.category === filter);

  return (
    <section aria-label="The Notebook" className="mt-3.5">
      <div className={`${MOBILE_CHIP_STRIP} px-4`} role="group" aria-label="Filter notebook entries">
        <FilterChip active={filter === "all"} count={posts.length} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {availableCategories.map((cat) => (
          <FilterChip
            key={cat}
            active={filter === cat}
            count={countFor(cat)}
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
                <span className="mt-1.5 line-clamp-2 text-[12.5px] leading-5 text-[var(--ink-soft)]">
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
                    dateTime={post.date}
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
