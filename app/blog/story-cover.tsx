// A company story's cover on the Journal index: the post's hand-drawn
// illustration (`cover:` frontmatter, drawn by scripts/journal-covers.mjs)
// with the company's name set over a fade at its foot. A post without a cover
// keeps the old top crop of its poster; one without either gets a text plate.
// No hooks, so the server and client paints share it.

import Image from "next/image";

import type { BlogPostMeta } from "./posts";

// The illustration is a light plate in both themes (like the posters), so the
// fade and the type on it are fixed colours, not house tokens.
const PLATE_INK = "#101a18";
const PLATE_INK_SOFT = "#556661";

function coverName(post: BlogPostMeta): string {
  if (post.comparison) return `${post.comparison.a.name} vs ${post.comparison.b.name}`;
  return post.company ?? "Company story";
}

function coverCode(post: BlogPostMeta): string | undefined {
  if (post.comparison) return `${post.comparison.a.code} · ${post.comparison.b.code}`;
  return post.companyCode;
}

export function StoryCover({
  post,
  sizes,
  eager = false,
}: {
  post: BlogPostMeta;
  /** For the poster fallback only — the illustration is an SVG served as-is. */
  sizes: string;
  /** Start the fetch with the HTML (the phone's featured story). Never `priority`: both paints are in the server HTML. */
  eager?: boolean;
}) {
  const loading = eager ? "eager" : "lazy";
  const frame =
    "relative block aspect-[16/9] w-full overflow-hidden rounded-[6px] border border-[var(--rule)] bg-[var(--paper-2)]";

  if (post.cover) {
    const code = coverCode(post);
    return (
      <span className={frame}>
        <Image src={post.cover} alt="" fill unoptimized loading={loading} className="object-cover" />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-white via-white/85 to-transparent"
        />
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-[18px] pb-4">
          <span
            className="house-display text-[19px] leading-[1.15] [text-wrap:balance]"
            style={{ color: PLATE_INK }}
          >
            {coverName(post)}
          </span>
          {code ? (
            <span
              className="house-data text-[10px] uppercase tracking-[0.16em]"
              style={{ color: PLATE_INK_SOFT }}
            >
              {code}
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  if (post.image) {
    return (
      <span className={frame}>
        <Image
          src={post.image}
          alt={post.imageAlt ?? ""}
          fill
          sizes={sizes}
          loading={loading}
          className="object-cover object-top"
        />
      </span>
    );
  }

  return (
    <span className={`${frame} flex flex-col justify-between p-4`}>
      <span className="house-data text-[10px] uppercase tracking-[0.16em] text-[var(--signal)]">
        Company story
      </span>
      <span>
        <span className="house-display block text-[24px] leading-tight">{coverName(post)}</span>
        <span aria-hidden className="mt-2.5 block h-[3px] w-12 bg-[var(--mark)]" />
      </span>
    </span>
  );
}

/** The row-sized cover: the illustration alone (the row prints the company beside it). */
export function StoryThumb({ post, className = "" }: { post: BlogPostMeta; className?: string }) {
  const src = post.cover ?? post.image;
  return (
    <span
      aria-hidden
      className={`relative block aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="96px"
          unoptimized={Boolean(post.cover)}
          className={post.cover ? "object-cover" : "object-cover object-top"}
        />
      ) : (
        <span className="flex h-full flex-col justify-end p-1.5">
          <span className="house-display block text-[11px] leading-tight">{coverName(post)}</span>
          <span className="mt-1 block h-[2px] w-5 bg-[var(--mark)]" />
        </span>
      )}
    </span>
  );
}
