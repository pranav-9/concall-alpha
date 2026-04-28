import type { MoatRatingKey } from "./types";

export const MOAT_RATING_ORDER: Record<MoatRatingKey, number> = {
  wide_moat: 0,
  narrow_moat: 1,
  moat_at_risk: 2,
  no_moat: 3,
  unknown: 4,
};
