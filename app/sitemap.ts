import type { MetadataRoute } from "next";

import { getAllPostMeta } from "@/app/blog/posts";
import { getCachedCompanySearchRows } from "@/lib/company-search-cache";
import { getCachedSectorSlugs } from "@/lib/sector-slug-cache";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 3600;

const STATIC_ROUTES = [
  "/company",
  "/leaderboards",
  "/sectors",
  "/activity",
  "/coverage",
  "/how-scores-work",
  "/quarter-tracker",
  "/changelog",
  "/blog",
  "/requests",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  // A Supabase hiccup should degrade to a static-only sitemap, not fail the build.
  const [companies, sectorSlugs] = await Promise.all([
    getCachedCompanySearchRows().catch(() => []),
    getCachedSectorSlugs().catch(() => []),
  ]);

  let posts: ReturnType<typeof getAllPostMeta> = [];
  try {
    posts = getAllPostMeta();
  } catch {
    posts = [];
  }

  return [
    {
      url: `${base}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    ...STATIC_ROUTES.map((route) => ({
      url: `${base}${route}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...companies.map((company) => ({
      url: `${base}/company/${encodeURIComponent(company.code)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...sectorSlugs.map((slug) => ({
      url: `${base}/sector/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
