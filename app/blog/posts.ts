import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { asCategory } from "./categories";
import type { BlogCategory } from "./categories";
import { parseComparison } from "./comparison";
import type { Comparison } from "./comparison";

export { CATEGORY_LABELS } from "./categories";
export type { BlogCategory } from "./categories";
export type { Comparison } from "./comparison";

// Server-only: reads the MDX files in app/blog/posts at request/build time.
const POSTS_DIR = path.join(process.cwd(), "app/blog/posts");

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export type BlogPostMeta = {
  slug: string;
  /** ISO yyyy-mm-dd, used for sorting and <time dateTime>. */
  date: string;
  /** Human label, e.g. "2 June 2026". */
  dateLabel: string;
  title: string;
  summary: string;
  /** Topical bucket; drives the filter pills. */
  category?: BlogCategory;
  /** Short descriptive tags shown as pills on each row. */
  tags: string[];
  /**
   * Optional cover: a path under public/ (e.g. "/blog/market-voted.png").
   * Shown as a thumbnail beside the title on the Journal index and used as the
   * post's share card. NOT rendered on the post page — a post that wants a hero
   * places it inline at the top of its MDX, at its natural aspect ratio.
   * Remote URLs are ignored (no next/image remotePatterns).
   */
  image?: string;
  /** Alt text for the cover; omit when the image is purely decorative. */
  imageAlt?: string;
  /**
   * Company write-ups only: the company's display name (e.g. "Neuland
   * Laboratories"). Drives the "Company Stories" lane — grouping a company's
   * stories together and numbering its stories (story N of M).
   */
  company?: string;
  /**
   * Company write-ups only: the portal company CODE (e.g. "NEULANDLAB"). Used
   * as the stable grouping key and to link a company to its /company/<CODE>
   * page. Falls back to `company`/`slug` for grouping when absent.
   */
  companyCode?: string;
  /**
   * Head-to-head posts only: the two peers and their shared industry. Tagged
   * posts leave Company Stories for the Head to head lane (desktop).
   */
  comparison?: Comparison;
};

export type BlogPost = BlogPostMeta & { content: string };

// 2026-06-02-making-it-worth-your-time.mdx -> making-it-worth-your-time
function fileToSlug(filename: string): string {
  return filename.replace(/\.mdx?$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function listPostFiles(): string[] {
  // readdir order is filesystem-dependent (APFS sorts, ext4 on Vercel does
  // not); sort so same-date posts and the Notebook's "No." agree everywhere.
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .sort();
}

function readMeta(file: string): BlogPostMeta {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
  const { data } = matter(raw);
  // A numeric BSE scrip code arrives from YAML as a number.
  const companyCode =
    typeof data.companyCode === "string" || typeof data.companyCode === "number"
      ? String(data.companyCode).toUpperCase()
      : undefined;
  const category = asCategory(data.category);
  return {
    slug: fileToSlug(file),
    date: String(data.date ?? ""),
    dateLabel: String(data.dateLabel ?? data.date ?? ""),
    title: String(data.title ?? ""),
    summary: String(data.summary ?? ""),
    category,
    tags: toStringArray(data.tags),
    image:
      typeof data.image === "string" && data.image.startsWith("/")
        ? data.image
        : undefined,
    imageAlt: typeof data.imageAlt === "string" ? data.imageAlt : undefined,
    company: typeof data.company === "string" ? data.company : undefined,
    companyCode,
    comparison: parseComparison(data.comparison, file, { companyCode, category }),
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
