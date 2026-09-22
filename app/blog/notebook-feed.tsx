"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { CATEGORY_LABELS } from "./categories";
import { filterNotebook, notebookCatalog } from "./lanes";
import { useNotebookFilter } from "./notebook-filter";
import type { BlogPostMeta } from "./posts";

// The Notebook lane: Product / How-I-invest essays. Company write-ups live in
// their own "Company Stories" section, so this feed's filter covers only the
// two notebook categories. `posts` arrives newest-first, notebook-only. The
// filter lives in NotebookFilterProvider (shared with the phone paint); the
// catalog (stable "No.", categories, counts) comes from lanes.ts.
export function NotebookFeed({ posts }: { posts: BlogPostMeta[] }) {
  const { filter, setFilter } = useNotebookFilter();
  const { numberFor, categories, counts } = useMemo(() => notebookCatalog(posts), [posts]);
  const visible = filterNotebook(posts, filter);

  return (
    <section aria-labelledby="notebook-heading" className="mt-14 sm:mt-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 id="notebook-heading" className="house-display text-2xl sm:text-3xl">
            The Notebook
          </h2>
          <span className="house-data house-micro text-[var(--ink-soft)]">
            What I&rsquo;m building · how I invest · the method behind the scores
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5 sm:justify-end">
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
      </div>

      <div className="mt-5 h-px bg-[var(--rule)]" />

      <ol className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((post) => (
          <li key={post.slug} className="flex">
            <NotebookCard post={post} no={numberFor.get(post.slug) ?? ""} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function NotebookCard({ post, no }: { post: BlogPostMeta; no: string }) {
  const coverWord =
    post.tags[0] ?? (post.category ? CATEGORY_LABELS[post.category] : "Note");
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] transition-colors hover:border-[var(--ink)]"
    >
      <div className="flex aspect-[16/10] flex-col justify-between border-b border-[var(--rule)] bg-[var(--paper)] p-5">
        <div className="house-data flex items-center justify-between text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">
          <span>No. {no}</span>
          <span>{post.dateLabel}</span>
        </div>
        <div>
          <span className="house-display block text-2xl leading-tight">
            {coverWord}
          </span>
          <span aria-hidden className="mt-3 block h-[3px] w-12 bg-[var(--mark)]" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="house-data flex items-center gap-2 text-[11px]">
          <span className="text-[var(--ink-soft)]">No.{no}</span>
          <span aria-hidden className="text-[var(--rule)]">
            /
          </span>
          {post.category ? (
            <span className="uppercase text-[var(--signal)]">
              {CATEGORY_LABELS[post.category]}
            </span>
          ) : null}
        </div>
        <h3 className="house-display mt-3.5 line-clamp-3 text-lg leading-snug transition-colors group-hover:text-[var(--signal)]">
          {post.title}
        </h3>
        <p className="mt-2.5 line-clamp-2 text-[13px] leading-6 text-[var(--ink-soft)]">
          {post.summary}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="house-data whitespace-nowrap rounded-full border border-[var(--rule)] px-2 py-1 text-[10px] text-[var(--ink-soft)]"
              >
                {tag}
              </span>
            ))}
          </div>
          <PostDate
            iso={post.date}
            label={post.dateLabel}
            className="house-data shrink-0 whitespace-nowrap text-[11px] text-[var(--ink-soft)]"
          />
        </div>
      </div>
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
      className={`house-data inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors ${
        active
          ? "border-[var(--ink)] bg-[var(--ink)] font-semibold text-[var(--paper-2)]"
          : "border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink-soft)] hover:border-[var(--ink-soft)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
      {typeof count === "number" ? (
        <span className="tabular-nums opacity-55">{count}</span>
      ) : null}
    </button>
  );
}

// Absolute date on the server / first paint (so SSR and hydration match), then
// a relative label ("3 days ago") on the client for posts within the last week.
function PostDate({
  iso,
  label,
  className,
}: {
  iso: string;
  label: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(label);

  useEffect(() => {
    setDisplay(relativeOrAbsolute(iso, label));
  }, [iso, label]);

  return (
    <time dateTime={iso} className={className}>
      {display}
    </time>
  );
}

function relativeOrAbsolute(iso: string, label: string): string {
  const then = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(then.getTime())) return label;
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days < 0) return label;
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return `${days} days ago`;
  return label;
}
