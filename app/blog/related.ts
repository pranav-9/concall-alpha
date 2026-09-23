// The post page's "Next read" and read-time helpers. Pure and node-dep-free
// (BlogPostMeta in, BlogPostMeta out), so they stay testable and never
// hand-curate per company — the related set falls out of the frontmatter and
// of which company pages a post links.

import type { BlogPostMeta } from "./posts";

export const NEXT_READ_MAX = 3;
const WORDS_PER_MINUTE = 200;

/** Whether an MDX body links a company's portal page (`/company/<CODE>`), on a code boundary. */
export function linksCompanyPage(content: string, code: string): boolean {
  if (!code) return false;
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\]\\(/company/${escaped}(?![A-Z0-9])`).test(content);
}

/**
 * What to read after `current`, newest first, at most NEXT_READ_MAX:
 *  - a company write-up → the company's other stories, then any other company
 *    post (a comparison) whose body links this company's page;
 *  - a Notebook post → the newest other posts in the same category.
 * `posts` must be newest-first (as `getAllPostMeta` returns). `bodyLinks` is
 * asked only for company posts that are not the company's own stories, so the
 * caller can lazily read those files.
 */
export function nextReads(
  current: BlogPostMeta,
  posts: BlogPostMeta[],
  bodyLinks: (post: BlogPostMeta, code: string) => boolean,
): BlogPostMeta[] {
  const others = posts.filter((p) => p.slug !== current.slug);
  if (current.category !== "companies") {
    return others.filter((p) => p.category === current.category).slice(0, NEXT_READ_MAX);
  }
  const code = current.companyCode ?? "";
  const companyPosts = others.filter((p) => p.category === "companies");
  const own = code ? companyPosts.filter((p) => p.companyCode === code) : [];
  const mentions = code ? companyPosts.filter((p) => p.companyCode !== code && bodyLinks(p, code)) : [];
  return [...own, ...mentions].slice(0, NEXT_READ_MAX);
}

/** Minutes to read an MDX body at 200 wpm, JSX tags stripped, never below 1. */
export function readMinutes(content: string): number {
  const words = content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

// The company posts open with a literal JSX figure:
//   <figure className="my-6">
//     <img src="/blog/<code>-story-<date>.png" alt="…" className="…" />
//   </figure>
// MDX passes literal lowercase JSX through untouched (the `components` map only
// covers Markdown-generated nodes), so the poster is lifted into a component
// here, before the source reaches MDXRemote. Anything that does not match is
// left exactly as written.
const POSTER_FIGURE =
  /<figure\b[^>]*>\s*<img\b([^>]*?)\/?>\s*<\/figure>/g;
const ATTR = (name: string, attrs: string) => attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

/** Replace each poster `<figure><img/></figure>` with `<PostPoster src alt />`. */
export function liftPoster(content: string): string {
  return content.replace(POSTER_FIGURE, (whole, attrs: string) => {
    const src = ATTR("src", attrs);
    const alt = ATTR("alt", attrs) ?? "";
    if (!src || !/^\/blog\/[a-z0-9-]+-story-\d{4}-\d{2}-\d{2}\.(?:png|jpe?g)$/i.test(src)) return whole;
    return `<PostPoster src="${src}" alt="${alt}" />`;
  });
}
