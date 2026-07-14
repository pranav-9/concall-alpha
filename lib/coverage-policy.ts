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
export function isDiscoveryListed(
  bandAtAdmission: string | null | undefined,
): boolean {
  return bandAtAdmission !== "large";
}

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
