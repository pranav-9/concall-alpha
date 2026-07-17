// Canonical site origin for metadataBase, sitemap, robots, and canonical URLs.
// NEXT_PUBLIC_SITE_URL is the authority once the custom domain exists;
// VERCEL_PROJECT_PRODUCTION_URL keeps production sane before that. Never use
// VERCEL_URL here — it is the per-deployment (preview-hash) URL.
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const raw = explicit || (production ? `https://${production}` : "http://localhost:3000");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}
