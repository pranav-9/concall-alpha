import { BusinessSegmentsMosaic } from "concall-alpha";
import type { NormalizedRevenueBreakdownItem } from "@/lib/business-snapshot/types";

// "Business Segments" — the L2 block inside Business Snapshot. It is the only
// caller of BusinessSegmentMixBar in the portal: it draws the mix strip when at
// least two segments carry a disclosed share, then the segment cards under it.
// The top four by share render as cards; the rest go behind "Show more (n)".
// Card dots reuse the strip's palette so a segment keeps one hue in both.
//
// It takes `snapshot.revenueBreakdown.bySegment` — already normalized — and
// returns null on an empty array.
//
// Running example: Anvira Speciality Chemicals (ANVIRACHEM), a mid-cap CDMO and
// agrochemical-intermediates maker, FY26 disclosed mix as read in Q1 FY27.

const ANVIRA_SEGMENTS: NormalizedRevenueBreakdownItem[] = [
  {
    name: "CDMO & Custom Synthesis",
    description:
      "Late-stage intermediates made to innovator specifications under multi-year supply contracts.",
    revenueSharePercent: 41.2,
    marginProfile: "high_margin",
    marginProfileNote:
      "Cost-plus contracts with a validated-process premium; runs roughly 8pp above the blended EBITDA margin.",
    rolePill: "core_engine",
    growthDirectionPill: "accelerating",
  },
  {
    name: "Agrochemical Intermediates",
    description: "Herbicide and fungicide intermediates sold to global agro majors.",
    revenueSharePercent: 26.4,
    marginProfile: "improving",
    marginProfileNote:
      "Margin recovering off the FY24 destocking trough as channel inventory normalises.",
    rolePill: "support_engine",
    growthDirectionPill: "stable",
  },
  {
    name: "Performance Additives",
    description: "Antioxidants and rubber chemicals for tyre and polymer customers.",
    revenueSharePercent: 15.1,
    marginProfile: "high_margin",
    marginProfileNote: "Formulation-led pricing; volumes track domestic tyre build.",
    rolePill: "support_engine",
    growthDirectionPill: "stable",
  },
  {
    name: "Pigment Intermediates",
    description: "Naphthalene-derived intermediates supplied to pigment and dye formulators.",
    revenueSharePercent: 8.3,
    marginProfile: "improving",
    marginProfileNote: "Captive naphthalene cracking lifted contribution margin from FY25.",
    rolePill: "support_engine",
    growthDirectionPill: "stable",
  },
  {
    name: "Pharma Intermediates",
    description: "Off-patent API intermediates sold on the merchant market.",
    revenueSharePercent: 5.2,
    marginProfile: "pre_scale",
    marginProfileNote: "Sub-scale block; guided to fold into CDMO by FY28.",
    rolePill: "emerging",
    growthDirectionPill: "accelerating",
  },
  {
    name: "Bulk & Traded Chemicals",
    description: "Low-margin solvent and acid trading that fills spare tankage.",
    revenueSharePercent: 2.6,
    marginProfile: "drag",
    marginProfileNote: "Pass-through economics; kept to hold logistics contracts.",
    rolePill: "drag",
    growthDirectionPill: "declining",
  },
];

/**
 * Canonical: six disclosed segments. Mix strip on top, the four largest as
 * cards, the two smallest behind "Show more (2)".
 */
export const SixSegments = () => <BusinessSegmentsMosaic segments={ANVIRA_SEGMENTS} />;

/** A two-segment filer: strip still renders, both cards visible, no overflow. */
export const TwoSegments = () => (
  <BusinessSegmentsMosaic segments={ANVIRA_SEGMENTS.slice(0, 2)} />
);

/**
 * Segments named in the annual report but with no disclosed share. Below two
 * share-bearing segments the mix strip is suppressed and the block degrades to
 * cards with no percentage pill — which is the honest read, not a broken card.
 */
export const SharesNotDisclosed = () => (
  <BusinessSegmentsMosaic
    segments={[
      {
        name: "CDMO & Custom Synthesis",
        description:
          "Named as the growth engine on the Q1 FY27 call; no segment revenue split published.",
        revenueSharePercent: null,
        marginProfile: "unknown",
        marginProfileNote: "Segment margin not disclosed.",
        rolePill: "core_engine",
        growthDirectionPill: "accelerating",
      },
      {
        name: "Agrochemical Intermediates",
        description: "Herbicide and fungicide intermediates sold to global agro majors.",
        revenueSharePercent: null,
        marginProfile: "unknown",
        marginProfileNote: "Segment margin not disclosed.",
        rolePill: "support_engine",
        growthDirectionPill: "stable",
      },
      {
        name: "Performance Additives",
        description: "Antioxidants and rubber chemicals for tyre and polymer customers.",
        revenueSharePercent: null,
        marginProfile: "unknown",
        marginProfileNote: "Segment margin not disclosed.",
        rolePill: "support_engine",
        growthDirectionPill: "unknown",
      },
    ]}
  />
);

/**
 * An empty breakdown returns null — the Business Snapshot section simply has no
 * Business Segments block. Captioned beside the rendering case, since the empty
 * render is a zero-height node.
 */
export const EmptyRendersNothing = () => (
  <div className="space-y-3">
    <div className="rounded-md border border-dashed border-border/60 p-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <code className="text-foreground">segments={"{[]}"}</code> — the block
        returns <code className="text-foreground">null</code>. Nothing renders
        below this line; Business Snapshot moves straight to Business Momentum.
      </p>
      <BusinessSegmentsMosaic segments={[]} />
    </div>
    <BusinessSegmentsMosaic segments={ANVIRA_SEGMENTS.slice(0, 2)} />
  </div>
);
