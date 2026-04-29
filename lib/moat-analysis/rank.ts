import type { MoatRatingKey, MoatTier } from "./types";

export const MOAT_RATING_ORDER: Record<MoatRatingKey, number> = {
  wide_moat: 0,
  narrow_moat: 1,
  moat_at_risk: 2,
  no_moat: 3,
  unknown: 4,
};

export const MOAT_TIER_ORDER: Record<MoatTier, number> = {
  strong: 0,
  mid: 1,
  weak: 2,
};

export const moatTierRank = (tier: MoatTier | null): number =>
  tier == null ? 3 : MOAT_TIER_ORDER[tier];
