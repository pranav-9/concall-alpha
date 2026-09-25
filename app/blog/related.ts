// Pure helpers for the post page, node-dep-free so they stay testable and never
// hand-curate per company: the "Next read" set (derived from frontmatter and
// from which company pages a post links), the read time, the lift that turns a
// post's literal poster figure into the <PostPoster/> component, and where the
// sign-up gate cuts a post.

import type { BlogPostMeta } from "./posts";

export const NEXT_READ_MAX = 3;
const WORDS_PER_MINUTE = 200;

/** A company post's one-page poster: `/blog/<code>-story-<date>.png|jpg`. The one gate for the lift and the component. */
export const POSTER_SRC = /^\/blog\/[a-z0-9-]+-story-\d{4}-\d{2}-\d{2}\.(?:png|jpe?g)$/i;

/** Whether an MDX body links a company's portal page (`/company/<CODE>`), on a code boundary, any case. */
export function linksCompanyPage(content: string, code: string): boolean {
  if (!code) return false;
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\]\\(/company/${escaped}(?![A-Za-z0-9&._-])`, "i").test(content);
}

/**
 * What to read after `current`, newest first, at most NEXT_READ_MAX:
 *  - a company write-up → the company's other stories, then any other company
 *    post (a comparison) whose body links this company's page;
 *  - a Notebook post → the newest other posts in the same category;
 *  - a post with no known category → nothing (never pair up frontmatter typos).
 * `posts` must be newest-first (as `getAllPostMeta` returns). `bodyLinks` is
 * asked only for company posts that are not the company's own stories, so the
 * caller can lazily read those files.
 */
export function nextReads(
  current: BlogPostMeta,
  posts: BlogPostMeta[],
  bodyLinks: (post: BlogPostMeta, code: string) => boolean,
): BlogPostMeta[] {
  if (!current.category) return [];
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
  // `[^<>]*` — a lone `<` in prose must not re-scan to the end of the file.
  const words = content.replace(/<[^<>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

// The company posts open with a literal JSX figure:
//   <figure className="my-6">
//     <img src="/blog/<code>-story-<date>.png" alt="…" className="…" />
//   </figure>
// MDX passes literal lowercase JSX through untouched (the `components` map only
// covers Markdown-generated nodes), so the poster is lifted into a component
// here, before the source reaches MDXRemote. Anything that does not match is
// left exactly as written; a poster figure the lift cannot read throws, so a
// malformed post fails the build instead of quietly shipping the wrong paint.
const FENCE = /(```[\s\S]*?```)/;
const POSTER_FIGURE = /<figure\b[^>]*>\s*<img\b([^>]*?)\/?>\s*<\/figure>/g;
const attr = (name: string, attrs: string) => attrs.match(new RegExp(`(?<![\\w-])${name}="([^"]*)"`))?.[1];

/** Replace each poster `<figure><img/></figure>` with `<PostPoster src alt />`. Code fences are left alone. */
export function liftPoster(content: string): string {
  return content
    .split(FENCE)
    .map((segment, i) => (i % 2 === 1 ? segment : liftSegment(segment)))
    .join("");
}

function liftSegment(segment: string): string {
  const out = segment.replace(POSTER_FIGURE, (whole, attrs: string) => {
    const src = attr("src", attrs);
    if (!src || !POSTER_SRC.test(src)) return whole;
    if (/(?<![\w-])alt=(?!")/.test(attrs)) {
      throw new Error(`poster ${src}: write alt as a plain double-quoted string (alt={…} and alt='…' are not lifted)`);
    }
    const alt = attr("alt", attrs) ?? "";
    return `<PostPoster src="${src}" alt="${alt}" />`;
  });
  // A poster still sitting in an <img> after the lift means the figure had a shape the
  // regex does not read (a `>` inside alt, a figcaption). Fail the build, not the reader.
  for (const m of out.matchAll(/<img\b/g)) {
    const tag = out.slice(m.index, out.indexOf("</figure>", m.index) === -1 ? undefined : out.indexOf("</figure>", m.index));
    const src = attr("src", tag);
    if (src && POSTER_SRC.test(src)) {
      throw new Error(`poster ${src}: its <figure> was not lifted — keep the figure to one <img> with double-quoted attributes and no ">" inside alt`);
    }
  }
  return out;
}

// ── Sign-up gate cut ────────────────────────────────────────────────────────
// Logged-out readers get a post's opening; the gate clips the rest (see
// lib/signup-gate.ts). The cut sits before a `## ` heading, derived from the
// post's own structure, never chosen per post:
//   1. the first numbered section (`## 1. …`) — company stories and comparisons
//      open with a takeaway and "At a glance", then number their sections;
//   2. else the first heading after "At a glance";
//   3. else the second heading (a Notebook post's intro + first section).
// A post with fewer than two headings is not cut. The card's "below" list is
// the next few hidden headings, so it names what the reader is missing.
export const GATE_CUT_TAG = "<GateCut />";
const GATE_BELOW_MAX = 3;

type Heading = { line: number; text: string };

function h2Headings(lines: string[]): Heading[] {
  const out: Heading[] = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) inFence = !inFence;
    else if (!inFence && /^## /.test(line)) out.push({ line: i, text: line.slice(3).trim() });
  });
  return out;
}

/** A heading as the card shows it: no section number, no Markdown marks. */
export function plainHeading(text: string): string {
  return text
    .replace(/^\d+\.\s+/, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

/** The post with `<GateCut />` inserted before the cut heading, plus the hidden headings; null = no cut. */
export function gatePost(content: string): { source: string; below: string[] } | null {
  const lines = content.split("\n");
  const headings = h2Headings(lines);
  const glance = headings.findIndex((h) => /^at a glance$/i.test(plainHeading(h.text)));
  let cut = headings.findIndex((h) => /^\d+\.\s/.test(h.text));
  if (cut === -1 && glance !== -1 && glance + 1 < headings.length) cut = glance + 1;
  if (cut === -1 && headings.length >= 2) cut = 1;
  if (cut === -1) return null;
  const at = headings[cut].line;
  return {
    source: [...lines.slice(0, at), GATE_CUT_TAG, "", ...lines.slice(at)].join("\n"),
    below: headings.slice(cut, cut + GATE_BELOW_MAX).map((h) => plainHeading(h.text)),
  };
}
