export type MarketCapBand = "large" | "mid" | "small";

/**
 * Coverage policy: the platform covers mid- and small-cap companies (AMFI
 * classification). Discovery surfaces (leaderboards, homepage, sectors, the
 * Desk, themes) exclude companies ADMITTED as large cap; their pages stay
 * directly reachable and searchable. Every other covered company is listed and
 * ranked everywhere — there is no composite cut (removed 2026-11-21; it used to
 * hide everything ranked below the top 100).
 *
 * Keyed off market_cap_band_at_admission, not the current band, so covered
 * companies that later graduate to large cap stay listed (retention rule).
 * NULL/undefined (unclassified — recent listings, pre-backfill rows) counts
 * as included.
 */
export type CoverageFields = {
  market_cap_band_at_admission?: string | null;
};

export function isDiscoveryListed(
  company: CoverageFields | string | null | undefined,
): boolean {
  // String form kept for callers that only have the band to hand.
  if (typeof company === "string" || company == null) {
    return company !== "large";
  }
  return !isAdmittedLargeCap(company);
}

/**
 * The ADMISSION gate. The platform covers mid/small caps; a company admitted as
 * a large cap is outside the positioning entirely. Hidden from discovery
 * surfaces outright; its page stays reachable.
 */
export function isAdmittedLargeCap(
  company: CoverageFields | null | undefined,
): boolean {
  return company?.market_cap_band_at_admission === "large";
}

/** Columns every discovery-surface `company` select must include. */
export const COVERAGE_SELECT = "market_cap_band_at_admission";

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
