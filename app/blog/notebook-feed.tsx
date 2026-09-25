"use client";

import { useMemo } from "react";
import Link from "next/link";

import { CATEGORY_LABELS } from "./categories";
import { shortDateLabel } from "./dates";
import { filterNotebook, notebookCatalog } from "./lanes";
import { useNotebookFilter } from "./journal-view-state";
import { FOCUS_RING, PlateHeader, PlateTitle, ROW_FOCUS, plateLabel } from "./plate-header";
import type { BlogPostMeta } from "./posts";

// The Notebook lane: Product / How-I-invest essays. Company write-ups live in
// their own "Company Stories" section, so this feed's filter covers only the
// two notebook categories. `posts` arrives newest-first, notebook-only. The
// filter lives in JournalViewProvider (shared with the phone paint); the
// catalog (stable "No.", categories, counts) comes from lanes.ts.
export function NotebookFeed({ posts, plate }: { posts: BlogPostMeta[]; plate: number }) {
  const { filter, setFilter } = useNotebookFilter();
  const { numberFor, categories, counts } = useMemo(() => notebookCatalog(posts), [posts]);
  const visible = filterNotebook(posts, filter);

  return (
    <section aria-labelledby="notebook-heading" className="mt-[72px]">
      <PlateHeader label={plateLabel(plate, "The Notebook")} />
      <PlateTitle
        id="notebook-heading"
        title="The Notebook"
        blurb={<>What I&rsquo;m building, how I invest, and the method behind the scores.</>}
        aside={
          <div className="flex flex-wrap gap-2.5 sm:justify-end" role="group" aria-label="Filter notebook entries">
            <FilterPill
              active={filter === "all"}
              count={posts.length}
              onClick={() => setFilter("all")}
            >
              All
            </FilterPill>
            {categories.map((cat) => (
              <FilterPill
                key={cat}
                active={filter === cat}
                count={counts[cat]}
                onClick={() => setFilter(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </FilterPill>
            ))}
          </div>
        }
      />

      <ol className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] gap-x-12 border-t border-[var(--rule)]">
        {visible.map((post) => (
          <li key={post.slug} className="border-b border-[var(--rule)]">
            <NotebookRow post={post} no={numberFor.get(post.slug) ?? ""} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function NotebookRow({ post, no }: { post: BlogPostMeta; no: string }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`grid h-full grid-cols-[56px_1fr] gap-4 px-2.5 py-[22px] transition-colors duration-150 hover:bg-[var(--paper-2)] ${ROW_FOCUS}`}
    >
      <span className="house-display text-[30px] leading-none text-[var(--ink-soft)]">{no}</span>
      <span className="min-w-0">
        <span className="house-data flex items-center gap-2 text-[10px] uppercase tracking-[0.12em]">
          {post.category ? (
            <span className="text-[var(--signal)]">{CATEGORY_LABELS[post.category]}</span>
          ) : null}
          <time dateTime={post.date || undefined} className="text-[var(--ink-soft)]">
            {shortDateLabel(post.date, post.dateLabel)}
          </time>
        </span>
        <span className="house-display mt-2 block text-[21px] leading-[1.22] [text-wrap:pretty]">
          {post.title}
        </span>
        <span className="mt-2 line-clamp-2 text-[13px] leading-[1.55] text-[var(--ink-soft)]">
          {post.summary}
        </span>
        {post.tags.length ? (
          <span className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="house-data whitespace-nowrap rounded-full border border-[var(--rule)] px-2 py-0.5 text-[10px] text-[var(--ink-soft)]"
              >
                {tag}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function FilterPill({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`house-data inline-flex items-center gap-2 rounded-full border px-[15px] py-2 text-[12px] transition-colors duration-150 ${FOCUS_RING} ${
        active
          ? "border-[var(--ink)] bg-[var(--ink)] font-semibold text-[var(--paper-2)]"
          : "border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink-soft)] hover:border-[var(--ink-soft)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
      {typeof count === "number" ? (
        // Full-strength --ink-soft on an inactive pill: at 55% it fell below AA.
        <span className={`tabular-nums ${active ? "opacity-70" : ""}`}>{count}</span>
      ) : null}
    </button>
  );
}
