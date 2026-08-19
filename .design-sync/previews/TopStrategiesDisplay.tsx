import { TopStrategiesDisplay } from "concall-alpha";
import type { TopStrategyLatest } from "@/app/company/types";

// The ranked strategy board: for each of the most recent fiscal years, the top
// three stated strategies with an impact reading. It takes RAW
// `top_strategies_latest` rows and does the work itself - sorts by fiscal year
// descending then by rank, keeps the five most recent years, and lays each
// year's three ranks out side by side.
//
// Things worth teaching:
//   * `impact_level` only has a colour for "HIGH"; "LOW" and null stay neutral.
//     The scale is deliberately two-valued - there is no medium.
//   * `evidence_points` may arrive as a real array OR as a JSON string, because
//     the extraction pipeline writes both. The component parses either, and a
//     malformed string degrades to no evidence rather than throwing.
//   * The detail (description, quantified impact, evidence) is behind a per-card
//     "Show more", so the default read is three headlines per year.
//
// Running example: Anvira Speciality Chemicals (ANVIRACHEM), a mid-cap CDMO and
// agrochemical-intermediates maker, as stated through Q1 FY27.

const base = {
  company: "ANVIRACHEM",
  source_transcripts: ["ANVIRACHEM_Q4FY26_transcript.pdf", "ANVIRACHEM_AR_FY26.pdf"],
  extraction_date: "2026-07-04",
};

const FY26: TopStrategyLatest[] = [
  {
    ...base,
    id: 7301,
    latest_fiscal_year: "FY2026",
    strategy_rank: 1,
    strategy_name: "Scale the Dahej CDMO block to four commercial molecules",
    impact_level: "HIGH",
    impact_summary: "Adds roughly Rs 420 cr of peak revenue once all four molecules are commercial.",
    impact_value: 420,
    impact_units: "Rs cr peak revenue",
    description:
      "Two of the four target molecules are commercial and the third is in validation. Block 3 is only sanctioned once Block 2 holds design rate for four quarters.",
    timeline: "Block 3 commissioning guided for Q3 FY27",
    evidence_points: [
      "CDMO revenue Rs 882 cr in FY26 against Rs 712 cr in FY25",
      "\"Block 2 is at design rate\" - Q4 FY26 earnings call",
      "Take-or-pay signed with a second innovator in H2 FY26",
    ],
  },
  {
    ...base,
    id: 7302,
    latest_fiscal_year: "FY2026",
    strategy_rank: 2,
    strategy_name: "Backward-integrate the nitro intermediate",
    impact_level: "HIGH",
    impact_summary: "Removes an imported input that was 11% of raw-material cost in FY26.",
    impact_value: 180,
    impact_units: "bps gross margin",
    description:
      "The nitro intermediate is currently bought from two Chinese suppliers. The captive line covers roughly 70% of internal demand at design rate.",
    timeline: "Line hot by Q1 FY28",
    evidence_points: [
      "Rs 145 cr sanctioned at the Q2 FY26 board meeting",
      "Imported input was 11% of raw-material cost in FY26",
    ],
  },
  {
    ...base,
    id: 7303,
    latest_fiscal_year: "FY2026",
    strategy_rank: 3,
    strategy_name: "Exit third-party solvent trading",
    impact_level: "LOW",
    impact_summary: "Releases about Rs 60 cr of working capital and two tanks.",
    impact_value: 60,
    impact_units: "Rs cr working capital",
    description:
      "The trading book exists to hold logistics contracts. Management has committed to a full exit and repurposed two tanks to the pigment line.",
    timeline: "Full exit guided for FY28",
    evidence_points: ["Segment revenue down to Rs 56 cr, 2.6% of the mix"],
  },
];

const FY25: TopStrategyLatest[] = [
  {
    ...base,
    id: 7311,
    latest_fiscal_year: "FY2025",
    strategy_rank: 1,
    strategy_name: "Qualify the continuous-flow route with two innovators",
    impact_level: "HIGH",
    impact_summary: "Cuts step count on the largest intermediate from seven stages to four.",
    impact_value: null,
    impact_units: null,
    description:
      "Pilot line validated in Q2 FY26; commercial conversion has since slipped to FY28 on customer audit scheduling.",
    timeline: "Commercial conversion FY28",
    // The pipeline sometimes writes this column as a JSON string rather than an
    // array. The component parses both; this row is the string case.
    evidence_points: '["Solvent recovery up to 91% on the pilot line","Two innovator audits cleared in FY25"]',
  },
  {
    ...base,
    id: 7312,
    latest_fiscal_year: "FY2025",
    strategy_rank: 2,
    strategy_name: "Debottleneck the agrochemical intermediate line",
    impact_level: "LOW",
    impact_summary: "Adds 8% capacity for Rs 24 cr, without a new environmental clearance.",
    impact_value: 8,
    impact_units: "% capacity",
    description:
      "Chosen over a greenfield line while channel destocking was still running. Completed inside FY25.",
    timeline: "Completed Q4 FY25",
    evidence_points: ["Rs 24 cr spent against a Rs 30 cr budget"],
  },
  {
    ...base,
    id: 7313,
    latest_fiscal_year: "FY2025",
    strategy_rank: 3,
    strategy_name: "Commission the 12 MW captive solar block",
    impact_level: "LOW",
    impact_summary: "Covers about a fifth of Dahej power draw at a fixed tariff.",
    impact_value: 12,
    impact_units: "MW",
    description: null,
    timeline: "Commissioned Q3 FY25",
    evidence_points: null,
  },
];

/**
 * Canonical: the latest fiscal year, ranks 1 to 3 side by side. Two HIGH-impact
 * strategies carry the amber badge; the third is neutral. Detail sits behind
 * each card's "Show more".
 */
export const LatestFiscalYear = () => <TopStrategiesDisplay strategies={FY26} />;

/**
 * Two years of strategy stacked newest first - the read the section is actually
 * for, because a strategy that drops out of the top three is as informative as
 * one that enters. The FY2025 rank-1 row carries `evidence_points` as a JSON
 * string, the shape the extractor sometimes writes.
 */
export const TwoFiscalYears = () => (
  <TopStrategiesDisplay strategies={[...FY25, ...FY26]} />
);

/**
 * Nothing extracted for this company yet - one muted line, no empty scaffolding.
 */
export const NoStrategyData = () => <TopStrategiesDisplay strategies={[]} />;
