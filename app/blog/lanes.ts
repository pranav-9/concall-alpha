// Splits the flat post list into the Journal's lanes:
//   - Company Stories: the "companies" write-ups, grouped by company so each
//     name builds a tracked history (story N of M).
//   - Head to head (desktop only): posts tagged with a `comparison` block.
//   - The Notebook: the Product / How-I-invest essays.
// Pure and node-dep-free (derives from BlogPostMeta only), so it stays testable
// and can run in either a server or client context. Nothing here is
// hand-curated per company — the grouping falls out of the frontmatter.

import { CATEGORY_ORDER, NOTEBOOK_CATEGORIES, type BlogCategory } from "./categories";
import type { BlogPostMeta } from "./posts";

/** Two-digit counter ("06") — the lane count and the Notebook's "No." gutter. */
export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export type CompanyStory = BlogPostMeta & {
  /** 1-based position in this company's history, oldest story = 1. */
  storyIndex: number;
  /** How many stories this company has in the Journal. */
  storyTotal: number;
};

export type JournalLanes = {
  /** Newest company write-up, given the featured treatment. */
  featured: CompanyStory | null;
  /** The remaining company write-ups, newest-first. */
  companyRest: CompanyStory[];
  /** Product / How-I-invest posts, newest-first. */
  notebook: BlogPostMeta[];
  /** Total company stories. */
  companyCount: number;
  /** Distinct companies covered. */
  companyNameCount: number;
};

function companyKey(p: BlogPostMeta): string {
  return p.companyCode ?? p.company ?? p.slug;
}

/**
 * Number a newest-first run of company posts: storyIndex counts up
 * chronologically (oldest = 1) within each company, storyTotal is the
 * company's count within the SAME run.
 */
function indexStories(companyPosts: BlogPostMeta[]): {
  stories: CompanyStory[];
  totals: Map<string, number>;
} {
  const totals = new Map<string, number>();
  for (const p of companyPosts) {
    const k = companyKey(p);
    totals.set(k, (totals.get(k) ?? 0) + 1);
  }
  const runningIndex = new Map<string, number>();
  const indexBySlug = new Map<string, number>();
  for (const p of [...companyPosts].reverse()) {
    const k = companyKey(p);
    const next = (runningIndex.get(k) ?? 0) + 1;
    runningIndex.set(k, next);
    indexBySlug.set(p.slug, next);
  }
  const stories = companyPosts.map((p) => ({
    ...p,
    storyIndex: indexBySlug.get(p.slug) ?? 1,
    storyTotal: totals.get(companyKey(p)) ?? 1,
  }));
  return { stories, totals };
}

/**
 * The phone paint's lanes. Comparison posts still count as company stories
 * here — the phone Journal predates the Head to head lane and is unchanged.
 * `posts` must be newest-first (as `getAllPostMeta` returns).
 */
export function deriveJournalLanes(posts: BlogPostMeta[]): JournalLanes {
  const companyPosts = posts.filter((p) => p.category === "companies");
  const notebook = posts.filter(
    (p) => p.category !== undefined && NOTEBOOK_CATEGORIES.includes(p.category),
  );
  const { stories, totals } = indexStories(companyPosts);

  const [featured = null, ...companyRest] = stories;

  return {
    featured,
    companyRest,
    notebook,
    companyCount: companyPosts.length,
    companyNameCount: totals.size,
  };
}

export type DesktopJournal = {
  /** Company write-ups minus comparisons, newest-first, numbered among themselves. */
  stories: CompanyStory[];
  /** Posts tagged with a `comparison` block, newest-first. */
  headToHead: BlogPostMeta[];
  /** Product / How-I-invest posts, newest-first. */
  notebook: BlogPostMeta[];
  /** Distinct companies across `stories`. */
  companyNameCount: number;
};

/**
 * The desktop paint's three lanes. A post with a `comparison` block appears
 * only in Head to head, so Company Stories counts and "Story N of M" ignore
 * it. `posts` must be newest-first.
 */
export function deriveDesktopJournal(posts: BlogPostMeta[]): DesktopJournal {
  const headToHead = posts.filter((p) => p.comparison);
  const plain = posts.filter((p) => !p.comparison);
  const { stories, totals } = indexStories(plain.filter((p) => p.category === "companies"));
  const notebook = plain.filter(
    (p) => p.category !== undefined && NOTEBOOK_CATEGORIES.includes(p.category),
  );
  return { stories, headToHead, notebook, companyNameCount: totals.size };
}

/** Rows "More stories" shows before "Show all". */
export const MORE_STORIES_ROWS = 5;

/** A comparison title without its leading "Company:" prefix. */
export function comparisonTitle(title: string): string {
  return title.replace(/^[^:]+:\s*/, "");
}

/**
 * The Notebook's catalog, derived once from the unfiltered newest-first list so
 * both paints number and filter identically: a stable "No." per post (a post
 * keeps its number under a filter), the categories that actually have posts
 * (in NOTEBOOK_CATEGORIES order), and a count per category.
 */
export type NotebookCatalog = {
  numberFor: Map<string, string>;
  categories: BlogCategory[];
  counts: Record<BlogCategory, number>;
};

export function notebookCatalog(posts: BlogPostMeta[]): NotebookCatalog {
  const numberFor = new Map<string, string>();
  posts.forEach((p, i) => numberFor.set(p.slug, pad(i + 1)));
  // Zeroed from the category list itself, so a new BlogCategory can never be
  // missing here (a missing key would count to NaN and vanish from the strip).
  const counts = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<
    BlogCategory,
    number
  >;
  for (const p of posts) if (p.category) counts[p.category] += 1;
  const categories = NOTEBOOK_CATEGORIES.filter((cat) => counts[cat] > 0);
  return { numberFor, categories, counts };
}

/** Posts visible under a Notebook filter ("all" or one category). */
export function filterNotebook(
  posts: BlogPostMeta[],
  filter: BlogCategory | "all",
): BlogPostMeta[] {
  return filter === "all" ? posts : posts.filter((p) => p.category === filter);
}

/** "Story 2 of 3", or "Story 1" for a company's only story so far. */
export function storyLabel(story: CompanyStory): string {
  return story.storyTotal > 1
    ? `Story ${story.storyIndex} of ${story.storyTotal}`
    : "Story 1";
}

/**
 * Link text for the prior-story line: `priorStory` returns the story directly
 * before this one, which is only "the first" when this is the second.
 */
export function priorLinkLabel(story: CompanyStory): string {
  return story.storyIndex === 2 ? "read the first" : "read the previous";
}

/**
 * The story immediately before `featured` for the same company, if any — used
 * to surface "this is the second story, see the first" on the featured card.
 */
export function priorStory(
  featured: CompanyStory,
  rest: CompanyStory[],
): CompanyStory | null {
  if (featured.storyTotal < 2) return null;
  const key = featured.companyCode ?? featured.company ?? featured.slug;
  return (
    rest.find(
      (s) =>
        (s.companyCode ?? s.company ?? s.slug) === key &&
        s.storyIndex === featured.storyIndex - 1,
    ) ?? null
  );
}
