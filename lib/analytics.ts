import posthog from "posthog-js";

/**
 * Thin, fail-safe wrapper around PostHog custom events.
 *
 * PostHog is initialized (browser-only) in `instrumentation-client.ts` and is
 * silently off when `NEXT_PUBLIC_POSTHOG_KEY` is empty — this helper mirrors
 * that guard so calls become no-ops in dev/preview without a key, and never
 * throw into the UI. Import only from client components; server components must
 * not pull `posthog-js` into their bundle.
 *
 * Event names + property keys are the durable analytics contract — keep them
 * snake_case and stable. The PostHog funnels/insights are defined against these.
 */

const ENABLED = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

function track(event: string, props?: AnalyticsProps) {
  if (!ENABLED || typeof window === "undefined") return;
  try {
    posthog.capture(event, props);
  } catch {
    // Analytics must never break the app.
  }
}

export const analytics = {
  /** A covered company's page was opened. `company_code` is the join key to our data. */
  companyPageView: (companyCode: string) =>
    track("company_page_view", { company_code: companyCode }),

  /** A section tab was made active on a company page — the real "depth of engagement" signal. */
  sectionView: (sectionId: string, companyCode?: string) =>
    track("section_view", { section_id: sectionId, company_code: companyCode }),

  /**
   * A leaderboard row's company name was clicked. `below_cut` turns the old
   * dead-click frustration into a measurable funnel drop (2026-08-01 replay).
   */
  leaderboardRowClick: (params: {
    companyCode: string;
    board: string;
    belowCut: boolean;
    rank?: number;
  }) =>
    track("leaderboard_row_click", {
      company_code: params.companyCode,
      board: params.board,
      below_cut: params.belowCut,
      rank: Number.isFinite(params.rank) ? params.rank : undefined,
    }),
};
