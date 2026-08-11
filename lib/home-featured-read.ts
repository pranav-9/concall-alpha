// Cached data layer for the homepage hero's featured "read".
//
// Sourcing (all through the cookie-free public-read client so the homepage stays
// static/ISR — the leaderboard's own fetch is cookie-bound and can't be cached):
//   - quarter leg: the trailing 4-quarter mean (lib/quarter-composite), computed
//     from the already-cached home-trails wall (trail.points). The SAME standing
//     leg the leaderboard board and company page use, so the hero can't headline a
//     company on a hot single quarter it ranks mid-board on. No second scan.
//   - growth leg:  latest growth_outlook.growth_score per company.
//   - valuation:   valuation_check, published + rateable + NOT stale, rescaled to
//     0-10 with the same toValuationScale the leaderboard uses. Reusing
//     assessStaleness keeps the ~4-day decay identical to the company page.
//
// The verdict + composite come from classifyBoardRead (via the pure picker), so
// the hero can never disagree with the leaderboard's Read column.

import { unstable_cache } from "next/cache";

import { getCachedHomeTrails } from "./home-trails";
import { createPublicReadClient } from "./supabase/public-read";
import { toValuationScale } from "./valuation-band";
import { assessStaleness } from "./valuation-check/normalize";
import { mean4QFromSeries } from "./quarter-composite";
import { pickFeaturedRead, type FeaturedCandidate, type FeaturedRead } from "./home-featured-read-core";

export type { FeaturedRead } from "./home-featured-read-core";

type GrowthRow = { company: string | null; growth_score: number | string | null };
type ValuationRow = {
  company_code: string | null;
  score: number | null;
  rateable: boolean | null;
  verdict: string | null;
  priced_as_of: string | null;
  price_at_run: number | null;
};

async function fetchFeaturedRead(): Promise<FeaturedRead | null> {
  const supabase = createPublicReadClient();

  const [{ wall }, growthRes, valuationRes] = await Promise.all([
    getCachedHomeTrails(),
    supabase
      .from("growth_outlook")
      .select("company, growth_score, run_timestamp")
      // Newest-first, so the first row seen per company is its latest read.
      .order("run_timestamp", { ascending: false }),
    supabase
      .from("valuation_check")
      .select("company_code, score, rateable, verdict, priced_as_of, price_at_run")
      .eq("valuation_published", true),
  ]);

  const growthByCode = new Map<string, number>();
  for (const row of (growthRes.data ?? []) as GrowthRow[]) {
    const code = row.company?.toUpperCase();
    if (!code || growthByCode.has(code)) continue;
    const n =
      typeof row.growth_score === "number"
        ? row.growth_score
        : Number.parseFloat(String(row.growth_score));
    if (Number.isFinite(n)) growthByCode.set(code, n);
  }

  const valuationByCode = new Map<string, number>();
  for (const row of (valuationRes.data ?? []) as ValuationRow[]) {
    const code = row.company_code?.toUpperCase();
    // A leaderboard-grade valuation: rateable, has a verdict, and not stale. A
    // stale price is withheld here exactly as it is on the leaderboard.
    if (!code || !row.rateable || row.verdict == null) continue;
    const { stale } = assessStaleness({
      pricedAsOf: row.priced_as_of,
      priceAtRun: row.price_at_run,
    });
    if (stale) continue;
    const rescaled = toValuationScale(row.score);
    if (rescaled != null) valuationByCode.set(code, rescaled);
  }

  const candidates: FeaturedCandidate[] = wall.map((trail) => {
    const code = trail.code.toUpperCase();
    return {
      code: trail.code,
      name: trail.name,
      sector: trail.sector,
      // Standing quarter leg: trailing 4-quarter mean of this company's prints
      // (trail.points is oldest→newest). Matches the board and the company page.
      quarterScore: mean4QFromSeries(trail.points.map((p) => p.score)),
      growthScore: growthByCode.get(code) ?? null,
      valuationScore: valuationByCode.get(code) ?? null,
      trail,
    };
  });

  return pickFeaturedRead(candidates);
}

export const getCachedFeaturedRead = unstable_cache(fetchFeaturedRead, ["home-featured-read-v1"], {
  revalidate: 600,
});
