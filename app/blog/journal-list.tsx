"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type BlogCategory,
} from "./categories";
import type { BlogPostMeta } from "./posts";

type Filter = BlogCategory | "all";

const pillBase =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors";

export function JournalList({ posts }: { posts: BlogPostMeta[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  // Only offer a pill for a category that actually has posts.
  const availableCategories = useMemo(
    () => CATEGORY_ORDER.filter((cat) => posts.some((p) => p.category === cat)),
    [posts],
  );

  const countFor = (cat: BlogCategory) =>
    posts.filter((p) => p.category === cat).length;

  const visible =
    filter === "all" ? posts : posts.filter((p) => p.category === filter);

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        <FilterPill
          active={filter === "all"}
          count={posts.length}
          onClick={() => setFilter("all")}
        >
          All
        </FilterPill>
        {availableCategories.map((cat) => (
          <FilterPill
            key={cat}
            active={filter === cat}
            count={countFor(cat)}
            onClick={() => setFilter(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </FilterPill>
        ))}
      </div>

      <ol className="space-y-5">
        {visible.map((post) => (
          <li
            key={post.slug}
            className="border-b border-border pb-5 last:border-0 last:pb-0"
          >
            <Link href={`/blog/${post.slug}`} className="group block">
              <h2 className="text-base font-semibold text-foreground group-hover:underline sm:text-lg">
                {post.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {post.category ? (
                  <span
                    className={`${pillBase} border-border/60 bg-muted/50 text-foreground`}
                  >
                    {CATEGORY_LABELS[post.category]}
                  </span>
                ) : null}
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`${pillBase} border-border/50 bg-background/50 text-muted-foreground`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <PostDate
                iso={post.date}
                label={post.dateLabel}
                className="mt-2 block text-xs text-muted-foreground"
              />
            </Link>
          </li>
        ))}
      </ol>
    </>
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
      className={`${pillBase} ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border/60 bg-background/50 text-muted-foreground hover:border-border hover:text-foreground"
      }`}
    >
      {children}
      {typeof count === "number" ? (
        <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
      ) : null}
    </button>
  );
}

// Renders the absolute date on the server / first paint (so SSR and hydration
// match), then upgrades to a relative label ("3 days ago") on the client for
// posts within the last week.
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
