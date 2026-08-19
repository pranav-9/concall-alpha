import { CompetitiveStrategyDisplay } from "concall-alpha";
import type { ConsolidatedStrategy } from "@/app/company/types";

// Competitive strategy, read out of successive annual reports and concall
// transcripts. It takes RAW `consolidated_strategy` rows and does the grouping
// itself: one heading per `segment_name`, strategies under it ordered as given.
//
// Two behaviours a design agent has to get right:
//   * the FIRST strategy in each segment is always open and non-clickable (its
//     timeline is showing); every later one is a collapsed disclosure row with
//     a chevron. There is no "all collapsed" state.
//   * `timeline` is an open-ended map of period -> detail object. The renderer
//     shows three period cards at a time, starting at the LATEST three, and
//     only paginates once there are more than three. A detail carrying
//     `key_transition: true` turns the card amber and prints the strategic
//     shift underneath.
//
// The period cards are a fixed 288px wide, so three of them plus the arrows do
// not fit a narrow container — see the batch learnings note on card mode.
//
// Running example: Anvira Speciality Chemicals (ANVIRACHEM), strategy as stated
// through FY26 and reaffirmed on the Q1 FY27 call.

const base = {
  company: "ANVIRACHEM",
  overall_strategy_notes: null,
  strategic_evolution: null,
  key_transitions: null,
  extracted_at: "2026-07-04T09:12:00+05:30",
  created_at: "2026-07-04T09:12:00+05:30",
  updated_at: "2026-08-12T10:20:00+05:30",
};

const CDMO_TIMELINE_FY25 = {
  status: "delivered",
  outcome: "Block 2 mechanically complete",
  revenue_impact: "LOW",
  overview: "Second CDMO block finished eight weeks late; no revenue in FY25.",
  key_events: [
    "Block 2 mechanically complete, March 2025",
    "Two innovator audits cleared",
  ],
  evidence_points: ["Capex of Rs 340 cr against a Rs 310 cr budget"],
};

const CDMO_TIMELINE_FY26 = {
  status: "on track",
  outcome: "At design rate",
  revenue_impact: "HIGH",
  impact_level: "HIGH",
  timeline: "Block 3 civil work starts Q3 FY27",
  overview: "Block 2 reached design rate by Q4 FY26; two of four target molecules are commercial.",
  key_events: [
    "Take-or-pay signed with a second innovator",
    "Third molecule entered validation, Q3 FY26",
    "Block 2 at design rate, Q4 FY26",
    "Debottlenecking added 8% capacity",
  ],
  evidence_points: ["CDMO revenue Rs 882 cr in FY26 against Rs 712 cr in FY25"],
  evolution_notes: "Moved from a single dedicated customer to a two-customer shared block.",
};

const CANONICAL: ConsolidatedStrategy[] = [
  {
    ...base,
    id: 9101,
    segment_name: "CDMO & Custom Synthesis",
    strategy_rank: 1,
    strategy_name: "Scale the Dahej CDMO block to four commercial molecules",
    description:
      "Convert the Block 2 investment into contracted volume before committing to Block 3.",
    timeline: {
      FY2025: {
        status: "delivered",
        outcome: "Block 2 mechanically complete",
        overview: "Finished eight weeks late; no revenue in FY25.",
      },
      FY2026: {
        status: "on track",
        outcome: "At design rate",
        revenue_impact: "HIGH",
        overview: "Two of four target molecules are commercial.",
      },
    },
  },
  {
    ...base,
    id: 9102,
    segment_name: "CDMO & Custom Synthesis",
    strategy_rank: 2,
    strategy_name: "Move the lead intermediate to a continuous-flow route",
    description: "Cut step count and solvent load on the largest agrochemical intermediate.",
    timeline: {
      FY2026: {
        status: "in progress",
        outcome: "Pilot validated",
        overview: "Commercial conversion slips to FY28.",
      },
    },
  },
  {
    ...base,
    id: 9103,
    segment_name: "Agrochemical Intermediates",
    strategy_rank: 1,
    strategy_name: "Rebuild channel inventory with the top three agro majors",
    description:
      "Trade price for volume commitments until global channel inventory normalises.",
    timeline: {
      FY2025: {
        status: "under pressure",
        outcome: "Volumes down 9%",
        revenue_impact: "HIGH",
        overview: "Destocking ran a year longer than guided.",
      },
      FY2026: {
        status: "recovering",
        outcome: "Volumes up 17%",
        revenue_impact: "HIGH",
        overview: "Two of the three majors returned to contracted offtake.",
      },
    },
  },
];

/**
 * Canonical: two segments, three strategies. The first strategy under each
 * heading is open with its timeline showing; the second is a collapsed
 * disclosure row. Timeline details are deliberately sparse here so the segment
 * grouping is the thing you read - TimelineCarousel below shows a full detail
 * object.
 */
export const SegmentStrategies = () => <CompetitiveStrategyDisplay strategies={CANONICAL} />;

/**
 * Four tracked periods, which is where the timeline becomes a carousel: it opens
 * on the LATEST three, the left arrow appears, and the right arrow is already
 * spent. The third card is deliberately cut at the container edge - that peek is
 * how the reader knows there is more to the right.
 */
export const TimelineCarousel = () => (
  <CompetitiveStrategyDisplay
    strategies={[
      {
        ...base,
        id: 9110,
        segment_name: "CDMO & Custom Synthesis",
        strategy_rank: 1,
        strategy_name: "Scale the Dahej CDMO block to four commercial molecules",
        description: "Four years of the same strategy, restated each year with fresh evidence.",
        timeline: {
          FY2023: {
            status: "announced",
            outcome: "Board approval",
            overview: "Rs 310 cr Block 2 approved at the FY23 board meeting.",
          },
          FY2024: {
            status: "in progress",
            outcome: "Civil work complete",
            overview: "Civil and structural work finished; equipment ordering began.",
            evidence_points: ["Capital work in progress up to Rs 196 cr"],
          },
          FY2025: CDMO_TIMELINE_FY25,
          FY2026: CDMO_TIMELINE_FY26,
        },
      },
    ]}
  />
);

/**
 * A period flagged `key_transition` - the card turns amber, carries the "Key
 * Transition" badge, and prints the strategic shift in its own block. This is
 * the one visual the section exists to make findable across five annual reports.
 */
export const KeyTransitionMarked = () => (
  <CompetitiveStrategyDisplay
    strategies={[
      {
        ...base,
        id: 9120,
        segment_name: "Bulk & Traded Chemicals",
        strategy_rank: 1,
        strategy_name: "Exit third-party solvent trading",
        description: "Free up tankage and working capital for the intermediates book.",
        timeline: {
          FY2025: {
            status: "under review",
            outcome: "Volumes cut 30%",
            overview: "Trading book halved while logistics contracts were renegotiated.",
            evidence_points: ["Segment revenue Rs 52 cr, down from Rs 55 cr"],
          },
          FY2026: {
            status: "committed",
            outcome: "Exit by FY28",
            revenue_impact: "LOW",
            impact_level: "HIGH",
            key_transition: true,
            timeline: "Full exit guided for FY28",
            overview:
              "Management committed to a full exit and repurposed two tanks to the pigment line.",
            key_events: ["Two tanks repurposed to pigment intermediates"],
            evidence_points: ["\"We are out of trading by FY28\" - Q4 FY26 call"],
            strategic_shift:
              "From a volume-filling trading book to capital released for the intermediates business.",
          },
        },
      },
    ]}
  />
);

/**
 * No extracted strategy rows. One muted line, no scaffolding - the section
 * header above it already says what is missing.
 */
export const NoStrategyData = () => <CompetitiveStrategyDisplay strategies={[]} />;
