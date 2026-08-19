import { BusinessSegmentMixBar } from "concall-alpha";
import type { NormalizedRevenueBreakdownItem } from "@/lib/business-snapshot/types";

// The one-line revenue-mix strip that sits at the top of Business Segments on a
// company page. It takes `revenueBreakdown.bySegment` straight off the
// normalized business snapshot — the same array the segment cards below it
// render — and draws each disclosed share as a slice of a 100-wide track.
//
// Two things the bar says that no caption repeats:
//   * widths are shares of 100, NOT of the disclosed total, so the empty track
//     at the right edge IS the undisclosed remainder;
//   * everything past the 5th segment (business-segment-mix-constants
//     `maxSlices`) collapses into a grey "Others" slice.
// It returns null below two slices — a single-segment filer has no mix to show.
//
// Running example across this batch: Anvira Speciality Chemicals (ANVIRACHEM),
// a mid-cap CDMO + agrochemical-intermediates maker, as of Q1 FY27.

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
    marginProfileNote: "Sub-scale block; management has guided to fold it into CDMO by FY28.",
    rolePill: "emerging",
    growthDirectionPill: "accelerating",
  },
  {
    name: "Bulk & Traded Chemicals",
    description: "Low-margin solvent and acid trading that fills spare tankage.",
    revenueSharePercent: 2.6,
    marginProfile: "drag",
    marginProfileNote: "Pass-through economics; kept only to hold logistics contracts.",
    rolePill: "drag",
    growthDirectionPill: "declining",
  },
];

/**
 * Canonical: Anvira's FY26 disclosed mix. Six segments, so the sixth folds into
 * the grey "Others" slice and the 1.2% the company never broke out shows as the
 * unfilled tail of the track.
 */
export const RevenueMix = () => (
  <div className="space-y-2">
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
      Business Segments
    </p>
    <BusinessSegmentMixBar segments={ANVIRA_SEGMENTS} />
  </div>
);

/**
 * The minimum rendering case — two disclosed segments adding to 100, so the
 * track is completely filled and the caption reads "Disclosed 100%".
 */
export const TwoSegmentSplit = () => (
  <BusinessSegmentMixBar
    segments={[
      {
        name: "CDMO & Custom Synthesis",
        description: "Contract manufacturing for innovator pharma.",
        revenueSharePercent: 58.4,
        marginProfile: "high_margin",
        marginProfileNote: "Validated-process premium holds through the cycle.",
        rolePill: "core_engine",
        growthDirectionPill: "accelerating",
      },
      {
        name: "Agrochemical Intermediates",
        description: "Herbicide and fungicide intermediates.",
        revenueSharePercent: 41.6,
        marginProfile: "improving",
        marginProfileNote: "Recovering off the destocking trough.",
        rolePill: "support_engine",
        growthDirectionPill: "stable",
      },
    ]}
  />
);

/**
 * A filer that names only three segments and leaves 28.5% of revenue in an
 * unnamed bucket. The bar shows the gap rather than captioning it away — this
 * is the disclosure-quality signal the strip exists for.
 */
export const LargeUndisclosedRemainder = () => (
  <BusinessSegmentMixBar
    segments={[
      {
        name: "CDMO & Custom Synthesis",
        description: "Contract manufacturing for innovator pharma.",
        revenueSharePercent: 34.1,
        marginProfile: "high_margin",
        marginProfileNote: "Only block with disclosed segment margin.",
        rolePill: "core_engine",
        growthDirectionPill: "accelerating",
      },
      {
        name: "Agrochemical Intermediates",
        description: "Herbicide and fungicide intermediates.",
        revenueSharePercent: 24.8,
        marginProfile: "unknown",
        marginProfileNote: "Segment margin not disclosed.",
        rolePill: "support_engine",
        growthDirectionPill: "stable",
      },
      {
        name: "Performance Additives",
        description: "Antioxidants and rubber chemicals.",
        revenueSharePercent: 12.6,
        marginProfile: "unknown",
        marginProfileNote: "Segment margin not disclosed.",
        rolePill: "support_engine",
        growthDirectionPill: "unknown",
      },
    ]}
  />
);

/**
 * Below two slices the bar renders nothing at all — a single-segment filer has
 * no mix. Shown as a caption beside the two-slice case rather than as a blank
 * card, because the empty render is a zero-height node.
 */
export const SingleSegmentRendersNothing = () => (
  <div className="space-y-3">
    <div className="rounded-md border border-dashed border-border/60 p-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        One disclosed segment (100% CDMO) — the bar returns{" "}
        <code className="text-foreground">null</code> and the Business Segments
        block falls back to the segment cards alone. Nothing renders below.
      </p>
      <BusinessSegmentMixBar
        segments={[
          {
            name: "CDMO & Custom Synthesis",
            description: "Single reportable segment.",
            revenueSharePercent: 100,
            marginProfile: "high_margin",
            marginProfileNote: "Whole business is one block.",
            rolePill: "core_engine",
            growthDirectionPill: "accelerating",
          },
        ]}
      />
    </div>
    <div className="space-y-1.5">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Add a second disclosed segment and the strip appears:
      </p>
      <BusinessSegmentMixBar
        segments={[
          {
            name: "CDMO & Custom Synthesis",
            description: "Contract manufacturing for innovator pharma.",
            revenueSharePercent: 71.9,
            marginProfile: "high_margin",
            marginProfileNote: "Validated-process premium.",
            rolePill: "core_engine",
            growthDirectionPill: "accelerating",
          },
          {
            name: "Agrochemical Intermediates",
            description: "Herbicide and fungicide intermediates.",
            revenueSharePercent: 28.1,
            marginProfile: "improving",
            marginProfileNote: "Recovering off the destocking trough.",
            rolePill: "support_engine",
            growthDirectionPill: "stable",
          },
        ]}
      />
    </div>
  </div>
);
