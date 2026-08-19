import { MoatAnalysisSection, SectionCard } from "concall-alpha";
// The section takes a NormalizedMoatAnalysis, never a Supabase row. Building it
// through the real normalizer means the v15 zod schema in
// lib/moat-analysis/types.ts validates these fixtures: a payload that drifts
// off-schema would silently fall back to the "Schema mismatch" notice instead
// of quietly rendering wrong. Pure validation + field mapping — no React, no
// Supabase.
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";

// Moat Analysis is the company page's durability section. Two halves:
//   * the hero chips (rating + tier) come from PROMOTED DB columns and render
//     whatever the payload's state, and
//   * the v15 detail block — economic proof, gatekeeper, the four moat sources,
//     and a "More evidence" drawer — renders only when assessment_payload
//     validates as v15. Anything older shows the schema notice instead.
// The four sources are always all four: the ones that apply become cards, the
// ones ruled out go behind "Also considered" with their rationale. A company
// where none apply is a real verdict, not missing data.
//
// The section renders the INTERIOR only — MoatAnalysisPanel supplies the
// SectionCard shell on the real page, which is why these stories do too.
// `generatedAtShort` is formatShortDate() output at the call site ("12 Aug"),
// not an ISO string.
//
// Running example: Anvira Speciality Chemicals (ANVIRACHEM), a mid-cap CDMO and
// agrochemical-intermediates maker, assessed after the Q1 FY27 call. The rating
// sweep needs companies with genuinely different verdicts, so the wide and no-
// moat cells use two covered names.

const ANVIRA_ROW: MoatAnalysisRow = {
  company_code: "ANVIRACHEM",
  company_name: "Anvira Speciality Chemicals",
  industry: "Specialty Chemicals - CDMO & Intermediates",
  rating: "Narrow Moat",
  tier: "MID",
  cycle_tested: true,
  assessment_version: "v15",
  updated_at: "2026-08-12T10:20:00+05:30",
  assessment_payload: {
    version: "v15",
    name: "Anvira Speciality Chemicals",
    ticker: "ANVIRACHEM",
    industry: "Specialty Chemicals - CDMO & Intermediates",
    call: "NARROW MOAT",
    tier: "MID",
    headline:
      "Narrow moat: an 18-24 month re-filing keeps validated CDMO customers in place.",
    step_0: {
      posture: "Confirmed excess returns",
      tier_anchor_phrase: "at the moderate-to-strong end",
      headline:
        "ROCE has cleared its cost of capital in eight of the last ten years, including through the FY24 destocking trough.",
      evidence: [
        "Ten-year average ROCE of 18.4% against an estimated 12% cost of capital; the spread narrowed in FY24 but never went negative.",
        "Gross margin held at 41-44% across the FY24 destocking cycle while merchant-market peers gave up 600-900 bps.",
        "Free cash flow was positive in nine of the last ten years despite two greenfield capex cycles at Dahej.",
      ],
    },
    sources: [
      {
        source_type: "Intangible Assets",
        subcategory: "Regulatory licence",
        applies: true,
        does_not_apply_reason: null,
        presence: [
          "Both Dahej blocks are USFDA-inspected and REACH-registered, which is what makes the innovator contracts possible at all.",
          "Fourteen granted process patents cover the continuous-flow route used for the lead agrochemical intermediate.",
        ],
        durability: [
          "Site approvals renew on inspection, not on price, so a competitor cannot buy the status.",
          "The process patents run to FY33 and the operating know-how is not disclosed in the filings.",
        ],
      },
      {
        source_type: "Switching Costs",
        subcategory: "Financial or contractual exit costs",
        applies: true,
        does_not_apply_reason: null,
        presence: [
          "An innovator has to re-file the intermediate source with the regulator to move it - an 18 to 24 month exercise.",
          "Three of the top five CDMO contracts carry take-or-pay minimums running to FY29.",
        ],
        durability: [
          "Lock-in scales with how late in the route the intermediate sits, and Anvira's is one step from the API.",
        ],
      },
      {
        source_type: "Network Effects",
        subcategory: null,
        applies: false,
        does_not_apply_reason:
          "Chemistry is sold bilaterally under contract; no customer is better off because another customer uses the same site.",
        presence: null,
        durability: null,
      },
      {
        source_type: "Cost Advantages",
        subcategory: null,
        applies: false,
        does_not_apply_reason:
          "Backward integration into the nitro intermediate is real, but two domestic peers have it too, so it is table stakes rather than an edge.",
        presence: null,
        durability: null,
      },
    ],
    why_this_tier: [
      "Two of four sources apply, and the stronger one protects the site rather than the customer relationship.",
      "Qualification lock-in is genuine but concentrated: the top five customers are 58% of CDMO revenue.",
      "The agrochemical block, a quarter of revenue, competes on price and drags blended durability down.",
    ],
    gatekeeper: {
      answer: "probably_not_situational",
      barrier_strength: "moderate",
      attackers: [
        "Divi's Laboratories",
        "Laurus Labs",
        "PI Industries",
        "A China CDMO onshoring into India",
      ],
      rationale:
        "An entrant can build the plant in three years, but still needs a customer willing to re-file.",
    },
    what_would_change_the_call: [
      "Upgrade to wide: top-five CDMO concentration falls below 40% of segment revenue while gross margin holds above 40% for two full years.",
      "Downgrade to no moat: an innovator moves a validated molecule to a second source inside twelve months, which would show the qualification lock is soft.",
      "Downgrade: consolidated ROCE spends two consecutive years below the 12% cost of capital outside a destocking year.",
    ],
    financial_check: {
      cycle_tested: true,
      data_limitations: [
        "Segment ROCE is not disclosed, so the returns work is done at the consolidated level only.",
        "FY22 and FY23 segment revenue was restated when the pigment block was folded into intermediates.",
      ],
    },
  },
};

const NEULAND_ROW: MoatAnalysisRow = {
  company_code: "NEULANDLAB",
  company_name: "Neuland Laboratories",
  industry: "Pharmaceuticals - CDMO & APIs",
  rating: "Wide Moat",
  tier: "STRONG",
  cycle_tested: true,
  assessment_version: "v15",
  updated_at: "2026-08-05T18:40:00+05:30",
  assessment_payload: {
    version: "v15",
    name: "Neuland Laboratories",
    ticker: "NEULANDLAB",
    industry: "Pharmaceuticals - CDMO & APIs",
    call: "WIDE MOAT",
    tier: "STRONG",
    headline:
      "Wide moat: a customer can only leave by re-filing with its own regulator.",
    step_0: {
      posture: "Confirmed excess returns",
      tier_anchor_phrase: "at the very best end",
      headline:
        "Return on capital has beaten its cost in eleven of twelve years and widened through the FY24 pricing reset.",
      evidence: [
        "Twelve-year average ROCE of 21.7% against a 12% cost of capital, with the trough year still above 14%.",
        "CDMO revenue compounded in the high twenties while the generic API block was deliberately shrunk.",
        "Working capital days fell 34 days over five years even as the mix became more custom.",
      ],
    },
    sources: [
      {
        source_type: "Intangible Assets",
        subcategory: "Patent",
        applies: true,
        does_not_apply_reason: null,
        presence: [
          "A DMF and CEP portfolio filed across the US, EU and Japan that the customer's own dossier points at.",
          "Two peptide platforms with published yield advantages that competitors have not matched at scale.",
        ],
        durability: [
          "Filings are customer-specific, so they do not lapse the way a product patent does.",
          "The peptide know-how sits in people and process, not in a licence that can be bought.",
        ],
      },
      {
        source_type: "Switching Costs",
        subcategory: "Financial or contractual exit costs",
        applies: true,
        does_not_apply_reason: null,
        presence: [
          "Changing an API source forces a regulatory variation in every market the drug is sold in.",
          "Commercial CDMO contracts run five to seven years with volume commitments.",
        ],
        durability: [
          "The cost of switching rises with each additional market the customer has already filed in.",
        ],
      },
      {
        source_type: "Network Effects",
        subcategory: null,
        applies: false,
        does_not_apply_reason:
          "Nothing about one customer's presence makes the platform more useful to the next; every programme is bilateral.",
        presence: null,
        durability: null,
      },
      {
        source_type: "Cost Advantages",
        subcategory: "Process-based",
        applies: true,
        does_not_apply_reason: null,
        presence: [
          "Continuous-flow and enzymatic routes cut step count on two of the three largest molecules.",
          "Solvent recovery above 90% at Unit III, against peers in the seventies.",
        ],
        durability: [
          "Process advantage is held as know-how rather than patents, so it erodes slowly and quietly.",
        ],
      },
    ],
    why_this_tier: [
      "Three of four sources apply and all three point at the same lock: the customer's own regulatory filing.",
      "The excess return is wide and has survived a full pricing cycle, not just a demand upcycle.",
      "Customer concentration fell while margin rose, which is the harder version of that trade.",
    ],
    gatekeeper: {
      answer: "clearly_no",
      barrier_strength: "strong",
      attackers: ["Divi's Laboratories", "Piramal Pharma Solutions", "Lonza", "WuXi STA"],
      rationale:
        "An attacker can buy reactors but not the customer's filed dossier.",
    },
    what_would_change_the_call: [
      "Downgrade: two large CDMO programmes lost to a competitor inside one year, which would say the filing lock is weaker than assumed.",
      "Downgrade: ROCE falls below the cost of capital for two consecutive years outside a capex build year.",
    ],
    financial_check: {
      cycle_tested: true,
      data_limitations: [
        "Peptide platform economics are not disclosed separately from the wider CDMO block.",
      ],
    },
  },
};

const SOLARA_ROW: MoatAnalysisRow = {
  company_code: "SOLARA",
  company_name: "Solara Active Pharma Sciences",
  industry: "Pharmaceuticals - Generic APIs",
  rating: "No Moat",
  tier: "WEAK",
  cycle_tested: false,
  assessment_version: "v15",
  updated_at: "2026-07-29T11:05:00+05:30",
  assessment_payload: {
    version: "v15",
    name: "Solara Active Pharma Sciences",
    ticker: "SOLARA",
    industry: "Pharmaceuticals - Generic APIs",
    call: "NO MOAT",
    tier: "WEAK",
    headline:
      "No moat: a merchant API book with no filing lock, sold into a market where price is the only variable.",
    step_0: {
      posture: "Mediocre excess returns",
      tier_anchor_phrase: "at the weakest end",
      headline:
        "Returns have sat below the cost of capital in five of the last six years, two of them loss-making.",
      evidence: [
        "Six-year average ROCE of 4.1% against an estimated 12% cost of capital.",
        "Gross margin moved 900 bps on ibuprofen pricing alone, with no offsetting mix shift.",
      ],
    },
    sources: [
      {
        source_type: "Intangible Assets",
        subcategory: null,
        applies: false,
        does_not_apply_reason:
          "DMFs exist, but on molecules with eight or more filed sources, so the filing confers no scarcity.",
        presence: null,
        durability: null,
      },
      {
        source_type: "Switching Costs",
        subcategory: null,
        applies: false,
        does_not_apply_reason:
          "Merchant API buyers dual-source by policy and requalify a second supplier as routine housekeeping.",
        presence: null,
        durability: null,
      },
      {
        source_type: "Network Effects",
        subcategory: null,
        applies: false,
        does_not_apply_reason:
          "Bilateral supply contracts; no buyer benefits from another buyer being on the same molecule.",
        presence: null,
        durability: null,
      },
      {
        source_type: "Cost Advantages",
        subcategory: null,
        applies: false,
        does_not_apply_reason:
          "Scale sits behind the Chinese cost base on every large molecule, and the plants are not the newest in the field.",
        presence: null,
        durability: null,
      },
    ],
    why_this_tier: [
      "All four sources were tested and none held, which is what the bottom call means.",
      "The one asset with any scarcity - the Vizag block - is a capacity argument, not a moat.",
    ],
    gatekeeper: {
      answer: "clearly_no",
      barrier_strength: "none",
      attackers: [
        "Any Chinese API maker with a US DMF",
        "Aarti Pharmalabs",
        "Divi's Laboratories",
      ],
      rationale:
        "Nothing here takes a decade to build; the same molecules already have more than eight qualified suppliers.",
    },
    what_would_change_the_call: [
      "Upgrade to narrow: a CDMO block reaches a third of revenue on contracted volumes, introducing the filing lock the merchant book lacks.",
      "Upgrade: two consecutive years of ROCE above the cost of capital through a pricing down-cycle.",
    ],
    financial_check: {
      cycle_tested: false,
      data_limitations: [
        "Molecule-level margins are not disclosed, so the price-taking claim rests on segment commentary.",
        "The FY24 restructuring makes FY22 and FY23 comparisons unreliable.",
      ],
    },
  },
};

// A pre-v15 row: the promoted columns are fine, the stored assessment is the
// old prose shape. This is the real state of the re-extract backlog.
const ANVIRA_LEGACY_ROW: MoatAnalysisRow = {
  company_code: "ANVIRACHEM",
  company_name: "Anvira Speciality Chemicals",
  industry: "Specialty Chemicals - CDMO & Intermediates",
  rating: "Narrow Moat",
  tier: "MID",
  cycle_tested: true,
  assessment_version: "v14",
  updated_at: "2025-11-18T16:00:00+05:30",
  assessment_payload: {
    version: "v14",
    moat_rating: "NARROW",
    summary:
      "Regulatory approvals and customer qualification give the CDMO block a defensible position; the agrochemical block does not have one.",
    sources_of_advantage: ["Regulatory approvals", "Customer qualification cycles"],
  },
};

const Shell = ({
  title,
  generatedAtShort,
  children,
}: {
  title: string;
  generatedAtShort: string;
  children: React.ReactNode;
}) => (
  <SectionCard
    id="moat-analysis"
    title={title}
    headerAction={
      <span className="text-[11px] text-muted-foreground">{generatedAtShort}</span>
    }
  >
    {children}
  </SectionCard>
);

/**
 * Canonical: the everyday verdict. Two sources apply and become cards, two are
 * ruled out and sit behind "Also considered", and the tier rationale, change
 * triggers and evidence limits are folded into "More evidence".
 */
export const NarrowMoatMidTier = () => (
  <Shell title="Moat Analysis - Anvira Speciality Chemicals" generatedAtShort="12 Aug">
    <MoatAnalysisSection
      analysis={normalizeMoatAnalysis(ANVIRA_ROW)!}
      generatedAtShort="12 Aug"
    />
  </Shell>
);

/**
 * The top of the rating scale, and the primary variant axis: the hero chip goes
 * emerald and the tier chip's arrow points up. Three of four sources apply, so
 * the source grid fills both columns.
 */
export const WideMoatStrongTier = () => (
  <Shell title="Moat Analysis - Neuland Laboratories" generatedAtShort="05 Aug">
    <MoatAnalysisSection
      analysis={normalizeMoatAnalysis(NEULAND_ROW)!}
      generatedAtShort="05 Aug"
    />
  </Shell>
);

/**
 * The bottom of the scale, and the branch most sections get wrong: when nothing
 * applies the source grid is replaced by an explicit "considered and ruled out"
 * statement. Zero applying sources is a verdict, not an empty state.
 */
export const NoMoatAllSourcesRuledOut = () => (
  <Shell title="Moat Analysis - Solara Active Pharma" generatedAtShort="29 Jul">
    <MoatAnalysisSection
      analysis={normalizeMoatAnalysis(SOLARA_ROW)!}
      generatedAtShort="29 Jul"
    />
  </Shell>
);

/**
 * A row whose assessment predates v15. The hero chips still render - they come
 * from promoted columns - and the detail block is replaced by the schema
 * notice. Nothing is invented to fill the gap.
 */
export const DeprecatedSchemaNotice = () => (
  <Shell title="Moat Analysis - Anvira Speciality Chemicals" generatedAtShort="18 Nov">
    <MoatAnalysisSection
      analysis={normalizeMoatAnalysis(ANVIRA_LEGACY_ROW)!}
      generatedAtShort="18 Nov"
    />
  </Shell>
);
