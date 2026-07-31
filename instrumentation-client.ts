import posthog from "posthog-js";

// Runs once in the browser before the app hydrates (Next 15.3+ convention).
// No key (e.g. local dev without .env entry) → analytics silently off.
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();

if (posthogKey) {
  posthog.init(posthogKey, {
    // Reverse-proxied through next.config.ts rewrites so ad-blockers
    // don't drop events; ui_host keeps the toolbar/app links working.
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    // 2025-05-24 defaults: SPA pageviews on history change, pageleave,
    // person profiles only for identified users.
    defaults: "2025-05-24",
    debug: process.env.NODE_ENV === "development",
  });
}
