export type MarketCapBand = "large" | "mid" | "small";

/**
 * Coverage policy: the platform covers mid- and small-cap companies (AMFI
 * classification). Discovery surfaces (leaderboards, homepage, sectors)
 * exclude companies ADMITTED as large cap; their pages stay directly
 * reachable and searchable.
 *
 * Keyed off market_cap_band_at_admission, not the current band, so covered
 * companies that later graduate to large cap stay listed (retention rule).
 * NULL/undefined (unclassified — recent listings, pre-backfill rows) counts
 * as included.
 */
export type CoverageFields = {
  market_cap_band_at_admission?: string | null;
  /** True when the composite score put the company below the coverage cut. */
  excluded_from_discovery?: boolean | null;
};

export function isDiscoveryListed(
  company: CoverageFields | string | null | undefined,
): boolean {
  // String form kept for callers that only have the band to hand.
  if (typeof company === "string" || company == null) {
    return company !== "large";
  }
  return !isAdmittedLargeCap(company) && !isBelowCoverageCut(company);
}

/**
 * Gate 1 — ADMISSION. The platform covers mid/small caps; a company admitted as
 * a large cap is outside the positioning entirely, not merely ranked low. These
 * are hidden from discovery surfaces outright.
 *
 * Split out from isDiscoveryListed because the leaderboard needs to treat the
 * two gates differently: below-the-cut companies are shown greyed out (they're
 * in the universe, just not in the top 100), while large caps aren't shown at
 * all. Conflating them would put 24 large caps into the greyed tail.
 */
export function isAdmittedLargeCap(
  company: CoverageFields | null | undefined,
): boolean {
  return company?.market_cap_band_at_admission === "large";
}

/**
 * Gate 2 — COVERAGE CUT. Inside the mid/small universe but below the composite
 * cut line (concallyser/scripts/compute_composite_score.py --target 100). Still
 * one of ours; just not in the ranked hundred.
 */
export function isBelowCoverageCut(
  company: CoverageFields | null | undefined,
): boolean {
  return company?.excluded_from_discovery === true;
}

/** Columns every discovery-surface `company` select must include. */
export const COVERAGE_SELECT = "market_cap_band_at_admission, excluded_from_discovery";

export function marketCapBandLabel(
  band: string | null | undefined,
): string | null {
  switch (band) {
    case "large":
      return "Large cap";
    case "mid":
      return "Mid cap";
    case "small":
      return "Small cap";
    default:
      return null;
  }
}
