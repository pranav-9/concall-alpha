import { SegmentHistoryPanel } from "concall-alpha";
import type {
  NormalizedSegmentHistoryAnnual,
  NormalizedSegmentHistoryQuarterly,
} from "@/lib/business-snapshot/types";

// "Segment & multi-period history" — the tri-axis table at the foot of Business
// Snapshot. It is an inline <details open>, not a drawer: supporting tables stay
// in the reading flow. It takes the two normalized slots off the snapshot
// (`segmentHistoryQuarterly`, `segmentHistoryAnnual`) and nothing else.
//
// Behaviour worth teaching:
//   * Quarterly is the default when present, and the table shows only the
//     latest 6 columns however many periods you pass — the sparkline and the
//     trailing-CAGR columns still run over the FULL series.
//   * The Quarterly/Annual toggle appears only when both axes exist. Annual
//     prefers a real annual slot; when there is none it derives one from the
//     year-end (Q4) columns and labels it "year-end (derived)".
//   * CAGR columns change with the axis: 4Q/12Q quarterly, 3Y/5Y annual.
//   * Rows sort by latest mix %, and past four rows collapse behind "Show more".
//   * Both slots null renders nothing at all.
//
// Running example: Anvira Speciality Chemicals (ANVIRACHEM), segment revenue in
// Rs cr through Q1 FY27.

const Q_PERIODS = [
  "Q1FY24", "Q2FY24", "Q3FY24", "Q4FY24",
  "Q1FY25", "Q2FY25", "Q3FY25", "Q4FY25",
  "Q1FY26", "Q2FY26", "Q3FY26", "Q4FY26",
  "Q1FY27",
];

const byQuarter = (values: number[]): Record<string, number | null> =>
  Object.fromEntries(Q_PERIODS.map((p, i) => [p, values[i]]));

const QUARTERLY: NormalizedSegmentHistoryQuarterly = {
  periods: Q_PERIODS,
  rows: [
    {
      segment: "CDMO & Custom Synthesis",
      amountByPeriod: byQuarter([118, 132, 148, 168, 152, 170, 186, 204, 191, 211, 229, 251, 248]),
      unit: "Rs cr",
      mixPctLatest: 45.8,
      comparabilityLabel: "reported",
    },
    {
      segment: "Agrochemical Intermediates",
      amountByPeriod: byQuarter([121, 118, 124, 123, 109, 113, 121, 125, 128, 138, 146, 153, 139]),
      unit: "Rs cr",
      mixPctLatest: 25.6,
      comparabilityLabel: "reported",
    },
    {
      segment: "Performance Additives",
      amountByPeriod: byQuarter([68, 71, 75, 77, 72, 77, 80, 83, 76, 80, 82, 85, 79]),
      unit: "Rs cr",
      mixPctLatest: 14.6,
      comparabilityLabel: "reported",
    },
    {
      segment: "Pigment Intermediates",
      amountByPeriod: byQuarter([34, 36, 40, 39, 37, 37, 42, 44, 38, 41, 47, 52, 39]),
      unit: "Rs cr",
      mixPctLatest: 7.2,
      comparabilityLabel: "reported",
    },
    {
      segment: "Pharma & Bulk Chemicals",
      amountByPeriod: byQuarter([31, 34, 37, 36, 35, 34, 39, 40, 35, 38, 44, 50, 37]),
      unit: "Rs cr",
      mixPctLatest: 6.8,
      comparabilityLabel: "reported",
    },
  ],
  insights: [
    "CDMO & Custom Synthesis: four straight quarters above Rs 190 cr — Block 2 is now running at design rate.",
    "Agrochemical Intermediates: back above the pre-destocking run-rate from Q3 FY26, and Q1 FY27 gave a little of it back.",
    "Pigment Intermediates: Q4 FY26 carried a catch-up shipment; Q1 FY27 is the cleaner base.",
  ],
};

const A_PERIODS = ["FY21", "FY22", "FY23", "FY24", "FY25", "FY26"];

const byYear = (values: number[]): Record<string, number | null> =>
  Object.fromEntries(A_PERIODS.map((p, i) => [p, values[i]]));

const ANNUAL: NormalizedSegmentHistoryAnnual = {
  periods: A_PERIODS,
  rows: [
    {
      segment: "CDMO & Custom Synthesis",
      amountByPeriod: byYear([188, 274, 421, 566, 712, 882]),
      unit: "Rs cr",
      mixPctLatest: 41.7,
      comparabilityLabel: "reported",
    },
    {
      segment: "Agrochemical Intermediates",
      amountByPeriod: byYear([402, 471, 512, 486, 468, 565]),
      unit: "Rs cr",
      mixPctLatest: 26.7,
      comparabilityLabel: "reported",
    },
    {
      segment: "Performance Additives",
      amountByPeriod: byYear([214, 238, 268, 291, 312, 323]),
      unit: "Rs cr",
      mixPctLatest: 15.3,
      comparabilityLabel: "reported",
    },
    {
      segment: "Pigment Intermediates",
      amountByPeriod: byYear([118, 129, 141, 149, 160, 178]),
      unit: "Rs cr",
      mixPctLatest: 8.4,
      comparabilityLabel: "reported",
    },
    {
      segment: "Pharma & Bulk Chemicals",
      amountByPeriod: byYear([113, 125, 135, 138, 148, 167]),
      unit: "Rs cr",
      mixPctLatest: 7.9,
      comparabilityLabel: "restated",
    },
  ],
  insights: [
    "CDMO & Custom Synthesis: compounded in the mid-30s over five years and is now the largest block by a wide margin.",
    "Agrochemical Intermediates: five-year growth is single-digit, and effectively all of it landed before FY23.",
  ],
};

/**
 * Canonical: both axes published, so the Quarterly/Annual toggle is live. The
 * table shows the latest six of thirteen quarters; the 12Q CAGR column and the
 * sparklines still run over all thirteen. Five segments, so the smallest sits
 * behind "Show more (1)".
 */
export const QuarterlyAndAnnual = () => (
  <SegmentHistoryPanel quarterly={QUARTERLY} annual={ANNUAL} />
);

/**
 * Annual only — no quarterly segment disclosure, so there is no toggle and the
 * CAGR columns switch to 3Y/5Y. Six fiscal years all render; the annual axis is
 * never trimmed.
 */
export const AnnualOnly = () => <SegmentHistoryPanel quarterly={null} annual={ANNUAL} />;

/**
 * A single-segment filer. One row, so no collapse control and Mix % is 100 by
 * construction. The toggle still appears because an annual view can be derived
 * from the year-end columns.
 */
export const SingleSegmentFiler = () => (
  <SegmentHistoryPanel
    quarterly={{
      periods: Q_PERIODS,
      rows: [
        {
          segment: "Speciality chemicals",
          amountByPeriod: byQuarter([
            372, 391, 424, 443, 405, 431, 468, 496, 468, 508, 548, 591, 542,
          ]),
          unit: "Rs cr",
          mixPctLatest: 100,
          comparabilityLabel: "reported",
        },
      ],
      insights: [
        "Speciality chemicals: one reportable segment, so the table is a revenue series rather than a mix.",
      ],
    }}
    annual={null}
  />
);

/**
 * Neither slot published — the panel returns null and Business Snapshot simply
 * ends after Business Momentum. Captioned beside a rendering case, because the
 * empty render is a zero-height node.
 */
export const NoHistoryRendersNothing = () => (
  <div className="space-y-3">
    <div className="rounded-md border border-dashed border-border/60 p-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <code className="text-foreground">quarterly={"{null}"}</code> and{" "}
        <code className="text-foreground">annual={"{null}"}</code> — the panel
        returns <code className="text-foreground">null</code>. Nothing renders
        between this line and the table below.
      </p>
      <SegmentHistoryPanel quarterly={null} annual={null} />
    </div>
    <SegmentHistoryPanel quarterly={null} annual={ANNUAL} />
  </div>
);
