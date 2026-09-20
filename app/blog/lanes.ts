// Splits the flat post list into the Journal's two lanes:
//   - Company Stories: the "companies" write-ups, grouped by company so each
//     name builds a tracked history (story N of M) plus a per-company ledger.
//   - The Notebook: the Product / How-I-invest essays.
// Pure and node-dep-free (derives from BlogPostMeta only), so it stays testable
// and can run in either a server or client context. Nothing here is
// hand-curated per company — the grouping falls out of the frontmatter.

import { NOTEBOOK_CATEGORIES } from "./categories";
import type { BlogPostMeta } from "./posts";

export type CompanyStory = BlogPostMeta & {
  /** 1-based position in this company's history, oldest story = 1. */
  storyIndex: number;
  /** How many stories this company has in the Journal. */
  storyTotal: number;
};

export type LedgerEntry = {
  /** Portal CODE, "" when a post didn't set one. */
  code: string;
  name: string;
  /** Stories for this company. */
  count: number;
  /** Slug of the company's newest story, for a deep link. */
  latestSlug: string;
};

export type JournalLanes = {
  /** Newest company write-up, given the featured treatment. */
  featured: CompanyStory | null;
  /** The remaining company write-ups, newest-first. */
  companyRest: CompanyStory[];
  /** One row per company, newest-story-first. */
  ledger: LedgerEntry[];
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

/** `posts` must be newest-first (as `getAllPostMeta` returns). */
export function deriveJournalLanes(posts: BlogPostMeta[]): JournalLanes {
  const companyPosts = posts.filter((p) => p.category === "companies");
  const notebook = posts.filter(
    (p) => p.category !== undefined && NOTEBOOK_CATEGORIES.includes(p.category),
  );

  // Stories per company.
  const totals = new Map<string, number>();
  for (const p of companyPosts) {
    const k = companyKey(p);
    totals.set(k, (totals.get(k) ?? 0) + 1);
  }

  // storyIndex counts up chronologically (oldest = 1) within each company.
  const runningIndex = new Map<string, number>();
  const indexBySlug = new Map<string, number>();
  for (const p of [...companyPosts].reverse()) {
    const k = companyKey(p);
    const next = (runningIndex.get(k) ?? 0) + 1;
    runningIndex.set(k, next);
    indexBySlug.set(p.slug, next);
  }

  const stories: CompanyStory[] = companyPosts.map((p) => ({
    ...p,
    storyIndex: indexBySlug.get(p.slug) ?? 1,
    storyTotal: totals.get(companyKey(p)) ?? 1,
  }));

  const [featured = null, ...companyRest] = stories;

  // Ledger: first occurrence of each company wins (companyPosts is newest-first).
  const ledgerSeen = new Set<string>();
  const ledger: LedgerEntry[] = [];
  for (const p of companyPosts) {
    const k = companyKey(p);
    if (ledgerSeen.has(k)) continue;
    ledgerSeen.add(k);
    ledger.push({
      code: p.companyCode ?? "",
      name: p.company ?? p.companyCode ?? "Company",
      count: totals.get(k) ?? 1,
      latestSlug: p.slug,
    });
  }

  return {
    featured,
    companyRest,
    ledger,
    notebook,
    companyCount: companyPosts.length,
    companyNameCount: totals.size,
  };
}

/** "Story 2 of 3", or "Story 1" for a company's only story so far. */
export function storyLabel(story: CompanyStory): string {
  return story.storyTotal > 1
    ? `Story ${story.storyIndex} of ${story.storyTotal}`
    : "Story 1";
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
