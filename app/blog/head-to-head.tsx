// The Head to head plate: comparison posts, one matchup card each. Membership comes from the
// post's `comparison` frontmatter (comparison.ts), never from its slug. The two
// companies get identical type: neither side is styled as the primary.
// Server component.

import Link from "next/link";

import { comparisonTitle, type ComparisonSide } from "./comparison";
import { pad, type ComparisonPost } from "./lanes";
import { CARD_CTA, FOCUS_RING, PlateHeader, PlateTitle, plateLabel } from "./plate-header";

export function HeadToHead({ posts, plate }: { posts: ComparisonPost[]; plate: number }) {
  if (!posts.length) return null;
  return (
    <section aria-labelledby="head-to-head-heading" className="mt-[72px]">
      <PlateHeader label={plateLabel(plate, "Head to head")} />
      <PlateTitle
        id="head-to-head-heading"
        title="Head to head"
        blurb="Two listed peers in the same business, read side by side from their own filings."
        aside={
          <span className="house-data shrink-0 text-[11px] text-[var(--ink-soft)]">
            {pad(posts.length)} {posts.length === 1 ? "comparison" : "comparisons"}
          </span>
        }
      />

      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,460px),1fr))] gap-5">
        {posts.map((post) => (
          <MatchupCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}

function MatchupCard({ post }: { post: ComparisonPost }) {
  const c = post.comparison;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`flex flex-col overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] transition-colors duration-150 hover:border-[var(--ink)] ${FOCUS_RING}`}
    >
      <span className="flex items-center justify-center gap-3 border-b border-[var(--rule)] px-4 py-[11px]">
        <span className="house-data text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          Same industry
        </span>
        <span aria-hidden className="h-px w-[18px] bg-[var(--rule)]" />
        <span className="house-display text-[16px] leading-tight">{c.industry}</span>
      </span>

      <span className="relative grid grid-cols-2 border-b border-[var(--rule)] bg-[var(--paper)]">
        <Side side={c.a} />
        <span className="sr-only"> versus </span>
        <Side side={c.b} />
        <span aria-hidden className="absolute bottom-3.5 left-1/2 top-3.5 w-px bg-[var(--rule)]" />
        <span
          aria-hidden
          className="house-display absolute left-1/2 top-1/2 flex h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--paper-2)] text-[13px] text-[var(--ink-soft)]"
        >
          vs
        </span>
      </span>

      <span className="flex flex-1 flex-col px-[22px] pb-[22px] pt-5">
        <span className="house-data flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          <span>Head to head</span>
          <time dateTime={post.date || undefined}>{post.dateLabel}</time>
        </span>
        <span className="house-display mt-3 block text-[20px] leading-[1.25] [text-wrap:pretty]">
          {comparisonTitle(post.title, c.a.name)}
        </span>
        <span className="mt-2.5 line-clamp-3 text-[13px] leading-[1.55] text-[var(--ink-soft)]">
          {post.summary}
        </span>
        <span className="mt-auto pt-4">
          <span className={CARD_CTA}>Read the comparison →</span>
        </span>
      </span>
    </Link>
  );
}

function Side({ side }: { side: ComparisonSide }) {
  return (
    <span className="flex min-h-[92px] flex-col items-center justify-center px-5 py-[22px] text-center">
      <span className="house-display text-[22px] leading-[1.1] [text-wrap:balance]">{side.name}</span>
      <span className="house-data mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
        {side.code}
      </span>
    </span>
  );
}
