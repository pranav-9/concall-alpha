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
  return (
    company.market_cap_band_at_admission !== "large" &&
    company.excluded_from_discovery !== true
  );
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
