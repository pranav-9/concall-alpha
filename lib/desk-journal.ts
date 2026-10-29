// The desk's "Featured reads · from the Journal" block (2026-10-29 redesign):
// one large card and two small ones, picked from the Journal's own posts.
//
//   large  — the newest company story (or a live editorial pin)
//   small  — the next company story, from a different company
//   small  — the newest Notebook essay (Product / How I invest / Sector maps)
//
// Pure and node-dep-free (derives from BlogPostMeta only), so it is testable
// and nothing here is hand-curated per post — the pick falls out of the
// frontmatter and the post dates.

import { CATEGORY_LABELS, NOTEBOOK_CATEGORIES } from "@/app/blog/categories";
import type { BlogPostMeta } from "@/app/blog/posts";

export type DeskJournalCard = {
  post: BlogPostMeta;
  /** Eyebrow, kind first: ["Company story", "Latest"], ["Notebook", "Product"]. */
  eyebrow: [string, string | null];
};

export type DeskJournal = {
  lead: DeskJournalCard | null;
  side: DeskJournalCard[];
};

function companyKey(p: BlogPostMeta): string {
  return p.companyCode ?? p.company ?? p.slug;
}

const isCompanyPost = (p: BlogPostMeta) => p.category === "companies";
const isNotebookPost = (p: BlogPostMeta) =>
  p.category !== undefined && NOTEBOOK_CATEGORIES.includes(p.category);

/**
 * "N of M" for a plain company story: its place in that company's run of
 * stories, oldest = 1. Comparisons are left out of the count, as the Journal's
 * desktop lanes do (they live in Head to head there).
 */
function storyPosition(post: BlogPostMeta, posts: BlogPostMeta[]): { index: number; total: number } {
  const key = companyKey(post);
  const run = posts
    .filter((p) => isCompanyPost(p) && !p.comparison && companyKey(p) === key)
    .sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
  return { index: run.findIndex((p) => p.slug === post.slug) + 1, total: run.length };
}

function eyebrowFor(post: BlogPostMeta, posts: BlogPostMeta[], lead: "latest" | "pinned" | null): DeskJournalCard["eyebrow"] {
  if (isNotebookPost(post)) {
    return ["Notebook", post.category ? CATEGORY_LABELS[post.category] : null];
  }
  if (post.comparison) {
    return ["Head to head", post.comparison.industry || null];
  }
  if (lead === "latest") return ["Company story", "Latest"];
  if (lead === "pinned") return ["Company story", "Featured"];
  const { index, total } = storyPosition(post, posts);
  return ["Company story", total > 1 && index > 0 ? `${index} of ${total}` : null];
}

/**
 * Pick the block's three cards from every post, newest first (getAllPostMeta's
 * order). `pinnedSlug` is a live editorial pin (a Journal card on
 * desk_featured_read with pinned_until ahead): it takes the large card for as
 * long as the pin lasts. Fewer posts give fewer cards, never a padded slot.
 */
export function selectDeskJournal(posts: BlogPostMeta[], pinnedSlug?: string | null): DeskJournal {
  const ordered = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const pinned = pinnedSlug ? ordered.find((p) => p.slug === pinnedSlug) ?? null : null;
  const leadPost = pinned ?? ordered.find(isCompanyPost) ?? ordered.find(isNotebookPost) ?? null;
  if (!leadPost) return { lead: null, side: [] };

  const used = new Set([leadPost.slug]);
  const side: DeskJournalCard[] = [];

  // A second company story, never the lead's company again.
  const secondStory = ordered.find(
    (p) => isCompanyPost(p) && !used.has(p.slug) && (!isCompanyPost(leadPost) || companyKey(p) !== companyKey(leadPost)),
  );
  if (secondStory) {
    used.add(secondStory.slug);
    side.push({ post: secondStory, eyebrow: eyebrowFor(secondStory, ordered, null) });
  }

  // The newest essay; with none on file, another company story holds the slot.
  const essay =
    ordered.find((p) => isNotebookPost(p) && !used.has(p.slug)) ??
    ordered.find((p) => isCompanyPost(p) && !used.has(p.slug));
  if (essay) side.push({ post: essay, eyebrow: eyebrowFor(essay, ordered, null) });

  return {
    lead: { post: leadPost, eyebrow: eyebrowFor(leadPost, ordered, pinned ? "pinned" : "latest") },
    side,
  };
}

/**
 * A company's first Journal story — its initiation — for the "New to coverage"
 * card's link. Comparisons don't count: an initiation is the company's own.
 */
export function initiationStory(posts: BlogPostMeta[], code: string): BlogPostMeta | null {
  const key = code.trim().toUpperCase();
  const own = posts
    .filter((p) => isCompanyPost(p) && !p.comparison && p.companyCode === key)
    .sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
  return own[0] ?? null;
}
