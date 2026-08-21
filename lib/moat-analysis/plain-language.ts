import type { MoatRatingKey, MoatTier } from "./types";

// The one-line moat verdict phrase, from (rating, tier). Shared by the moat
// section and the company overview so the two never disagree on wording.
// Trajectory intentionally omitted — no history is stored, so we never claim
// "widening" / "was weaker".
export const edgePhrase = (rating: MoatRatingKey, tier: MoatTier | null): string => {
  switch (rating) {
    case "no_moat":
      return "No real edge";
    case "moat_at_risk":
      return "Edge under threat";
    case "wide_moat":
      return tier === "strong" ? "Wide, well-protected edge" : "Wide edge";
    case "narrow_moat":
      if (tier === "strong") return "Solid, defensible edge";
      if (tier === "weak") return "Slim edge";
      return "Moderate edge";
    default:
      return "Edge unclear";
  }
};
