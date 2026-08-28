import posthog from "posthog-js";

/**
 * Thin, fail-safe wrapper around PostHog — the single source of truth for our
 * custom event names and their property shapes.
 *
 * PostHog is initialized (browser-only) in `instrumentation-client.ts` and is
 * silently off when `NEXT_PUBLIC_POSTHOG_KEY` is empty — this helper mirrors
 * that guard so calls become no-ops in dev/preview without a key, and never
 * throw into the UI. Import only from client components; server components must
 * not pull `posthog-js` into their bundle.
 *
 * Naming contract: event names + property keys are snake_case and stable. The
 * PostHog funnels / retention cohorts / insights are defined against these — do
 * not rename without updating those. Events are grouped by the decision they
 * feed: Discovery (the door), Depth (are they reading), Monitoring (the
 * subscription thesis), Intent (monetization), Frustration (leaks), Identity.
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

export type LeaderboardBoard =
  | "overall"
  | "quarter"
  | "growth"
  | "moat"
  | "watchlist"
  // The /desk leaderboard surfaces these two board views in addition.
  | "latest"
  | "twist";
export type WatchlistSource = "company_page" | "leaderboard" | "watchlist" | "other";

/** Which page a shared module/board event fired on. Lets /desk, the homepage,
 *  and /leaderboards reuse the same event names while staying separable in
 *  breakdowns — instead of forking near-identical events per surface. */
export type AnalyticsSurface = "home" | "desk" | "leaderboards";

export const analytics = {
  // ── Discovery — is the door working, and what do people look for? ──────────
  /** A covered company's page was opened. `company_code` is the join key to our data. */
  companyPageView: (companyCode: string) =>
    track("company_page_view", { company_code: companyCode }),

  /** A search was executed. `zero_results` is the coverage-demand signal. */
  searchPerformed: (query: string, resultsCount: number) =>
    track("search_performed", {
      query,
      results_count: resultsCount,
      zero_results: resultsCount === 0,
    }),

  /** A search result was clicked. `position` is the 0-based rank in the list. */
  searchResultClick: (query: string, companyCode: string, position: number) =>
    track("search_result_click", { query, company_code: companyCode, position }),

  /** Leaderboard tab switched — which board is the real front door. `surface`
   *  separates the /leaderboards page from the /desk board that shares this event. */
  leaderboardTabChange: (from: string, to: string, surface?: AnalyticsSurface) =>
    track("leaderboard_tab_change", { from, to, surface }),

  /** A leaderboard column was sorted — what ranking dimension people value. */
  leaderboardSort: (board: LeaderboardBoard, column: string, direction: "asc" | "desc") =>
    track("leaderboard_sort", { board, column, direction }),

  /** A leaderboard/watchlist row's company name was clicked. `below_cut` turns the
   *  old dead-click frustration into a measurable funnel drop (2026-08-01 replay). */
  leaderboardRowClick: (params: {
    companyCode: string;
    board: LeaderboardBoard;
    belowCut: boolean;
    rank?: number;
    surface?: AnalyticsSurface;
  }) =>
    track("leaderboard_row_click", {
      company_code: params.companyCode,
      board: params.board,
      below_cut: params.belowCut,
      rank: Number.isFinite(params.rank) ? params.rank : undefined,
      surface: params.surface,
    }),

  /** A sector page was viewed. */
  sectorView: (sector: string) => track("sector_view", { sector }),

  /** A company was opened from a sector page. */
  sectorCompanyClick: (sector: string, companyCode: string) =>
    track("sector_company_click", { sector, company_code: companyCode }),

  /** A homepage module was clicked (hero / carousel / scoreplate / trail).
   *  `surface` defaults to "home" so the existing homepage call sites are tagged
   *  automatically; pass another surface if this event ever fires off-homepage. */
  homepageModuleClick: (
    module: string,
    companyCode?: string,
    surface: AnalyticsSurface = "home",
  ) => track("homepage_module_click", { module, company_code: companyCode, surface }),

  // ── Depth — are they reading the research, or bouncing? ────────────────────
  /** A section tab became active — depth-of-engagement signal (one panel at a time). */
  sectionView: (sectionId: string, companyCode?: string) =>
    track("section_view", { section_id: sectionId, company_code: companyCode }),

  /** Time spent on a section before leaving it — turns section_view into engagement.
   *  `path` is the relative URL (pathname + search) snapshotted when the dwell
   *  STARTED. Dwell fires on leave (tab switch / unmount), by which point App
   *  Router may have already swapped the URL, so PostHog's auto-filled $pathname
   *  would attribute the dwell to the wrong page. Passing $pathname/$current_url
   *  explicitly overrides the auto-enriched values and pins the event to where it
   *  actually happened. $pathname is the path alone (matching PostHog's
   *  convention); $current_url keeps the query string so it agrees with the
   *  $pageview recorded for the same load (UTM/deep-link attribution). NOTE: a
   *  single section visit can emit MORE THAN ONE section_dwell — one per tab-hide
   *  (see the visibilitychange flush in company-page-workspace) plus one on
   *  leave. Aggregate dwell by SUMMING ms, not by counting events per view. */
  sectionDwell: (sectionId: string, ms: number, companyCode?: string, path?: string) =>
    track("section_dwell", {
      section_id: sectionId,
      ms: Math.round(ms),
      company_code: companyCode,
      $pathname: path ? path.split("?")[0] : undefined,
      $current_url:
        path && typeof window !== "undefined" ? window.location.origin + path : undefined,
    }),

  /** An evidence/detail drawer was opened — the deep readers. */
  drawerOpen: (sectionId: string, drawerType: string, companyCode?: string) =>
    track("drawer_open", {
      section_id: sectionId,
      drawer_type: drawerType,
      company_code: companyCode,
    }),

  /** A link to the underlying source (transcript/PPT/AR) was clicked — verification,
   *  the core value prop being consumed. */
  sourceLinkClick: (sectionId: string, companyCode: string, sourceType?: string) =>
    track("source_link_click", {
      section_id: sectionId,
      company_code: companyCode,
      source_type: sourceType,
    }),

  /** The scoring methodology page was viewed — high trust-intent. */
  howScoresWorkView: (tab?: string) => track("how_scores_work_view", { tab }),

  // ── Monitoring — the subscription thesis ──────────────────────────────────
  /** A company was added to a watchlist — the strongest monitoring-intent signal we
   *  currently have (proxy for "keep tracking this" until the T7 email capture ships). */
  watchlistAdd: (companyCode: string, source: WatchlistSource) =>
    track("watchlist_add", { company_code: companyCode, source }),

  /** A company was removed from a watchlist. */
  watchlistRemove: (companyCode: string, source: WatchlistSource) =>
    track("watchlist_remove", { company_code: companyCode, source }),

  /** A watchlist was viewed — the return loop itself. */
  watchlistView: (count?: number) =>
    track("watchlist_view", { count: Number.isFinite(count) ? count : undefined }),

  // ── Intent — Q2 intent check, Q3 monetize ─────────────────────────────────
  /** A "cover this company" request was submitted — demand + a contactable engaged user. */
  requestIntakeSubmit: (companyCode?: string, textLen?: number) =>
    track("request_intake_submit", {
      company_code: companyCode,
      text_len: Number.isFinite(textLen) ? textLen : undefined,
    }),

  /** A one-click "Request this section" was submitted from a company page — a
   *  pre-signup intent signal (someone asks for the missing/withheld content in
   *  front of them). Fires on a successful POST to /api/user-requests, not on the
   *  raw click, so failed/duplicate attempts don't inflate it. Was previously
   *  invisible: the click survived only as a generic `$autocapture`. */
  sectionRequestSubmitted: (companyCode: string, sectionId: string) =>
    track("section_request_submitted", {
      company_code: companyCode,
      section_id: sectionId,
      surface: "company_page",
    }),

  /** A section helpfulness poll was answered — which sections deliver felt value. */
  feedbackPollResponse: (sectionId: string, value: string, companyCode?: string) =>
    track("feedback_poll_response", {
      section_id: sectionId,
      value,
      company_code: companyCode,
    }),

  /** A Journal post was opened — the believer cohort. */
  journalPostView: (slug: string) => track("journal_post_view", { slug }),

  /** A Journal post was read to the bottom (or near it). */
  journalReadComplete: (slug: string, scrollPct: number) =>
    track("journal_read_complete", { slug, scroll_pct: Math.round(scrollPct) }),

  // Monetization surfaces that don't exist yet — names reserved so Q3 is a wiring
  // job, not a redesign. Call sites land when the pages do.
  pricingView: () => track("pricing_view"),
  upgradeClick: (source: string) => track("upgrade_click", { source }),
  paywallHit: (feature: string) => track("paywall_hit", { feature }),

  // ── Frustration / quality — where the product leaks ───────────────────────
  /** A section rendered empty/withheld for a reader — the highest-ROI backfill map. */
  emptySectionView: (sectionId: string, companyCode: string, reason?: string) =>
    track("empty_section_view", {
      section_id: sectionId,
      company_code: companyCode,
      reason,
    }),

  /** The valuation verdict was withheld because it's older than the freshness window. */
  staleValuationWithheld: (companyCode: string, daysStale: number) =>
    track("stale_valuation_withheld", {
      company_code: companyCode,
      days_stale: Number.isFinite(daysStale) ? daysStale : undefined,
    }),
};

// ── Identity — stitch anonymous → known so events aren't a soup of sessions ──

/** Tie the current anonymous session to a known user (call on sign-up / log-in). */
export function identifyUser(distinctId: string, props?: AnalyticsProps) {
  if (!ENABLED || typeof window === "undefined") return;
  try {
    posthog.identify(distinctId, props);
  } catch {
    /* never break auth */
  }
}

/** Update person properties on the already-identified user. */
export function setPersonProps(props: AnalyticsProps) {
  if (!ENABLED || typeof window === "undefined") return;
  try {
    posthog.setPersonProperties(props);
  } catch {
    /* noop */
  }
}

/** Clear identity on logout so the next session starts anonymous. */
export function resetIdentity() {
  if (!ENABLED || typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch {
    /* noop */
  }
}
