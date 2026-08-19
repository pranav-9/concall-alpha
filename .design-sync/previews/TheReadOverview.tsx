import { Star } from "lucide-react";

import { Button, TheReadOverview } from "concall-alpha";
// `read` is DERIVED from the three leg scores, never stored — a hand-written
// read could name a configuration the legs beside it contradict. The cache
// layer calls classifyBoardRead; so does this preview. lib/board-read is pure
// arithmetic over three numbers.
import { BOARD_READS, classifyBoardRead } from "@/lib/board-read";

// Trishul Speciality Chemicals (TRISHULCH) — CDMO + performance intermediates
// + agro actives, out of Dahej and Ankleshwar. Mid cap, Q1 FY27.
//
// THREE VOCABULARIES MEET HERE and none of them is interchangeable. The three
// ring gauges read on lib/score-band (quarterly sentiment), lib/growth-band
// (forward outlook) and lib/valuation-band (price) respectively; the headline
// word beside the big number is a lib/board-read CONFIGURATION — "Quality at a
// fair price", "Priced for it" — which is not a band at all.
const deriveRead = (
  concallScore: number | null,
  growthScore: number | null,
  valuationScore: number | null,
) => {
  const r = classifyBoardRead({ concallScore, growthScore, valuationScore });
  return {
    score: r.score,
    key: r.key,
    label: BOARD_READS[r.key].label,
    description: r.description,
  };
};

const QUARTER_SERIES = [5.4, 5.1, 5.6, 5.4, 5.9, 6.0, 5.8, 6.2, 6.1, 6.3, 6.6, 7.0, 7.2, 7.6];

const SEGMENT_MIX = [
  { name: "CDMO", sharePct: 46.1 },
  { name: "Performance Intermediates", sharePct: 33.8 },
  { name: "Agro Actives", sharePct: 20.1 },
];

const TAKEAWAYS = {
  moatHeadline:
    "Switching costs are real once a molecule is validated, but only seven of them are commercial — the moat is narrow and molecule-by-molecule.",
  growthBasePct: "23.5",
  growthFiscalYear: "FY27",
  companyRevenueCagrPct: 15.4,
  keyVariableLead: "CDMO commercial-molecule count · 7 commercial against 9 in validation",
  keyVariableTrend: "widening",
};

const FULL_AVAILABILITY = {
  industryContext: true,
  subSector: true,
  businessSnapshot: true,
  moatAnalysis: true,
  keyVariables: true,
  futureGrowth: true,
  guidanceHistory: true,
  valuationCheck: true,
};

const base = {
  company_code: "TRISHULCH",
  company_name: "Trishul Speciality Chemicals",
  is_new: false,
  sector: "Chemicals",
  sub_sector: "Speciality Chemicals",
  market_cap_band: "mid",
  latest_score: 7.6,
  quarter_4q_avg: 7.1,
  quarter_label: "Q1 FY27",
  qoq_delta: 0.4,
  quarter_series: QUARTER_SERIES,
  quarter_rank: 12,
  quarter_total: 100,
  quarter_percentile: 88,
  growth_score: 7.8,
  growth_rank: 14,
  growth_total: 100,
  growth_percentile: 86,
  growth_scenarios: { bear: "12%", base: "23.5%", bull: "30%" },
  valuation_score: 5.2,
  valuation_priced_as_of: "2026-08-18",
  valuation_stale: false,
  sector_rank: 3,
  sector_total: 11,
  sector_percentile: 82,
  moat_label: "NARROW",
  moat_tier_label: "Tier 2",
  key_variable_count: 5,
  guidance_count: 11,
  guidance_verdict_key: "delivers",
  guidance_verdict_label: "Management delivers",
  revenue_guidance_label: "22-26% in FY27",
  business_segment_mix: SEGMENT_MIX,
  overview_takeaways: TAKEAWAYS,
  section_availability: FULL_AVAILABILITY,
  read: deriveRead(7.1, 7.8, 5.2),
  refreshed_at: "2026-08-18T20:05:00+05:30",
};

// A newly onboarded company: two transcripts scored, nothing else built yet.
// Two of the three legs are missing, so no configuration can be named and every
// unbuilt section offers the reader a way to ask for it.
const thin = {
  ...base,
  is_new: true,
  latest_score: 6.4,
  quarter_4q_avg: 6.2,
  quarter_label: "Q1 FY27",
  qoq_delta: -0.3,
  quarter_series: [6.0, 6.7, 6.4],
  quarter_rank: null,
  quarter_total: null,
  quarter_percentile: null,
  growth_score: null,
  growth_rank: null,
  growth_total: null,
  growth_percentile: null,
  growth_scenarios: null,
  valuation_score: null,
  valuation_priced_as_of: null,
  valuation_stale: false,
  moat_label: null,
  moat_tier_label: null,
  guidance_count: null,
  business_segment_mix: null,
  overview_takeaways: null,
  section_availability: {
    ...FULL_AVAILABILITY,
    businessSnapshot: false,
    moatAnalysis: false,
    keyVariables: false,
    futureGrowth: false,
    guidanceHistory: false,
    valuationCheck: false,
  },
  read: deriveRead(6.2, null, null),
};

// Phase 12 decays on the calendar: a valuation priced more than four days ago
// is dropped from the live Read entirely. The quality legs still stand, so the
// configuration becomes "No price read" rather than disappearing.
const stalePrice = {
  ...base,
  valuation_score: null,
  valuation_priced_as_of: "2026-07-16",
  valuation_stale: true,
  read: deriveRead(7.1, 7.8, null),
};

// Stand-ins for the two server slots. The shells are the real ones —
// company-watchlist-slot.tsx's WatchlistSlotShell and overall-rank-slot.tsx's
// pill link — so the header composes exactly as it does on the page; only the
// Supabase-backed innards are replaced.
const WatchlistSlot = () => (
  <div className="shrink-0 self-start rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm backdrop-blur-sm lg:ml-auto lg:pt-1">
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      Track this name
    </p>
    <Button variant="outline" size="sm" className="gap-1.5">
      <Star className="h-3.5 w-3.5" />
      Add to watchlist
    </Button>
  </div>
);

const RankSlot = () => (
  <a
    href="/leaderboards"
    className="inline-flex w-fit items-center gap-1 rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/60"
  >
    Overall Rank #9/100
    <span className="text-muted-foreground">· Top 9%</span>
    <span aria-hidden className="text-muted-foreground/70">
      →
    </span>
  </a>
);

const caption = "text-[11px] leading-relaxed text-muted-foreground";

/**
 * Canonical company-page header. The two slots are ReactNodes the server fills
 * in — the watchlist control and the live Overall-board rank, which streams in
 * behind Suspense so this client component stays board-math-free.
 */
export const QualityAtAFairPrice = () => (
  <TheReadOverview
    overview={base}
    watchlistSlot={<WatchlistSlot />}
    overallRankSlot={<RankSlot />}
  />
);

/** Both slots omitted — a signed-out visitor before the rank resolves. */
export const WithoutSlots = () => (
  <div className="space-y-2">
    <TheReadOverview overview={base} />
    <p className={caption}>
      watchlistSlot and overallRankSlot default to null; the header and the Read band close
      up around them rather than reserving empty space.
    </p>
  </div>
);

/**
 * Two of three legs missing. No configuration can be named from one leg, so the
 * Read reads "No read", the growth and value dials go dashed, and five of the
 * six evidence cards switch to their request-this-section state.
 */
export const NewlyOnboarded = () => (
  <TheReadOverview overview={thin} watchlistSlot={<WatchlistSlot />} />
);

/**
 * The valuation leg dropped for age. The Value dial shows the Stale marker
 * instead of a number and the configuration falls back to "No price read" —
 * a different statement from a fair price, and labelled as one.
 */
export const StaleValuationLeg = () => (
  <TheReadOverview
    overview={stalePrice}
    watchlistSlot={<WatchlistSlot />}
    overallRankSlot={<RankSlot />}
  />
);
