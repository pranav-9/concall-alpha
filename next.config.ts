import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old hardcoded-quarter tracker route; the tracker is evergreen now.
      { source: "/q4fy26", destination: "/quarter-tracker", permanent: true },
    ];
  },
  async rewrites() {
    return [
      // PostHog reverse proxy (US cloud) — first-party /ingest path so
      // ad-blockers don't drop events. Swap hosts to eu.i.posthog.com /
      // eu-assets.i.posthog.com if the PostHog project is EU-region.
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // PostHog API calls include trailing slashes; without this Next would
  // 308-redirect them and strip the request body.
  skipTrailingSlashRedirect: true,
  // The sitemap revalidates hourly on Vercel and reads app/blog/posts via fs,
  // but the tracer doesn't follow that read into the metadata route — without
  // this the regenerated sitemap silently drops every Journal post.
  outputFileTracingIncludes: {
    "/sitemap.xml": ["./app/blog/posts/**/*"],
  },
  experimental: {
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
