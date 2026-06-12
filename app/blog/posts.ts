import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

// Server-only: reads the MDX files in app/blog/posts at request/build time.
const POSTS_DIR = path.join(process.cwd(), "app/blog/posts");

export type BlogPostMeta = {
  slug: string;
  /** ISO yyyy-mm-dd, used for sorting and <time dateTime>. */
  date: string;
  /** Human label, e.g. "2 June 2026". */
  dateLabel: string;
  title: string;
  summary: string;
};

export type BlogPost = BlogPostMeta & { content: string };

// 2026-06-02-making-it-worth-your-time.mdx -> making-it-worth-your-time
function fileToSlug(filename: string): string {
  return filename.replace(/\.mdx?$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function listPostFiles(): string[] {
  return fs.readdirSync(POSTS_DIR).filter((f) => /\.mdx?$/.test(f));
}

function readMeta(file: string): BlogPostMeta {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
  const { data } = matter(raw);
  return {
    slug: fileToSlug(file),
    date: String(data.date ?? ""),
    dateLabel: String(data.dateLabel ?? data.date ?? ""),
    title: String(data.title ?? ""),
    summary: String(data.summary ?? ""),
  };
}

// Newest first; same-date posts keep filename order (stable sort) so a
// follow-up post named alphabetically earlier lists above the one it cites.
export function getAllPostMeta(): BlogPostMeta[] {
  return listPostFiles()
    .map(readMeta)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string): BlogPost | null {
  const file = listPostFiles().find((f) => fileToSlug(f) === slug);
  if (!file) return null;
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
  const { content } = matter(raw);
  return { ...readMeta(file), content };
}
