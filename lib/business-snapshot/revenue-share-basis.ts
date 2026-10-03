// Provenance of a segment's revenue share on the Business tab. A share is
// "reported" (read off the company's own segment disclosure) or "derived"
// (worked out from other management figures because the company reports one
// segment). Rows written before the field existed carry no basis and keep
// reading as disclosed.

import type { NormalizedRevenueBreakdownItem, RevenueShareBasis } from "@/lib/business-snapshot/types";

// Optional on purpose: legacy rows (and hand-built fixtures) omit the basis.
type ShareItem = Pick<NormalizedRevenueBreakdownItem, "revenueSharePercent"> & {
  revenueShareBasis?: RevenueShareBasis | null;
};

// Tooltip on the "derived" cue beside a share.
export const DERIVED_SHARE_TITLE = "Not a reported segment split — derived from management's own figures";

// Only the two known values pass; anything else reads as no basis (disclosed).
export const parseRevenueShareBasis = (value: unknown): RevenueShareBasis | null => {
  if (typeof value !== "string") return null;
  const basis = value.trim().toLowerCase();
  return basis === "reported" || basis === "derived" ? basis : null;
};

// A share that is shown and was derived, not reported (the Mix shift card).
export const isDerivedShare = (item: ShareItem): boolean =>
  item.revenueShareBasis === "derived" && item.revenueSharePercent != null;
