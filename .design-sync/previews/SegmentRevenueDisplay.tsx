import { SegmentRevenueDisplay } from "concall-alpha";
import type { SegmentRevenue } from "@/app/company/types";

// The multi-year segment revenue chart. Unlike the other Business Snapshot
// blocks this one takes RAW `segment_revenue` rows — one row per company ×
// financial year × segment, exactly as the extraction pipeline writes them —
// and does the pivot itself: group by financial_year, one series per
// segment_name, plotting `revenue_absolute_calculated`.
//
// Consequences worth teaching: rows may arrive in any order (the component
// sorts by the digits in `financial_year`), a segment that only appears in the
// later years simply starts its line there, and an empty array renders a plain
// muted sentence rather than an axis with no data.
//
// Running example: Anvira Speciality Chemicals (ANVIRACHEM), revenue in Rs cr
// as reported in the FY26 annual report.
//
// CAPTURE PLUMBING, not a usage pattern — do not copy this into product code.
// The component hardcodes `isAnimationActive` on every <Line>, so recharts
// spends 1.5s drawing the series in. The preview harness photographs the card
// about half a second after mount, which lands mid-animation and would publish
// a chart whose lines stop two thirds of the way across. There is no prop to
// turn it off, so the preview runs the animation clock forward instead: each
// frame callback is handed a timestamp far enough ahead that react-smooth
// treats the tween as finished, and the first painted frame is the final one.
if (typeof window !== "undefined" && !("__dsSettleRaf" in window)) {
  (window as unknown as Record<string, unknown>).__dsSettleRaf = true;
  const raf = window.requestAnimationFrame.bind(window);
  let skew = 0;
  window.requestAnimationFrame = (cb: FrameRequestCallback) =>
    raf((t) => {
      skew += 4000;
      cb(t + skew);
    });
}

let nextId = 4100;

const row = (
  financialYear: string,
  segment: string,
  revenueCr: number,
  companyTotalCr: number,
): SegmentRevenue => ({
  id: (nextId += 1),
  company: "ANVIRACHEM",
  financial_year: financialYear,
  source_document: `ANVIRACHEM_Annual_Report_${financialYear}.pdf`,
  segment_name: segment,
  revenue_contribution_percent: ((revenueCr / companyTotalCr) * 100).toFixed(1),
  revenue_absolute_reported: `${revenueCr.toFixed(1)}`,
  revenue_absolute_calculated: revenueCr,
  revenue_unit: "Rs cr",
  calculation_basis: "reported_segment_disclosure",
  page_number: 118,
  company_total_revenue: companyTotalCr,
  company_total_revenue_unit: "Rs cr",
  data_source_type: "annual_report",
  document_type: "annual_report",
  extracted_at: "2026-07-04T09:12:00+05:30",
  updated_at: "2026-07-04T09:12:00+05:30",
});

const TOTALS: Record<string, number> = {
  FY2023: 1477,
  FY2024: 1630,
  FY2025: 1800,
  FY2026: 2115,
};

const series = (segment: string, byYear: Record<string, number>) =>
  Object.entries(byYear).map(([fy, value]) => row(fy, segment, value, TOTALS[fy]));

const ANVIRA_SEGMENT_REVENUE: SegmentRevenue[] = [
  ...series("CDMO & Custom Synthesis", {
    FY2023: 421,
    FY2024: 566,
    FY2025: 712,
    FY2026: 882,
  }),
  ...series("Agrochemical Intermediates", {
    FY2023: 512,
    FY2024: 486,
    FY2025: 468,
    FY2026: 565,
  }),
  ...series("Performance Additives", {
    FY2023: 268,
    FY2024: 291,
    FY2025: 312,
    FY2026: 323,
  }),
  ...series("Pigment Intermediates", {
    FY2023: 141,
    FY2024: 149,
    FY2025: 160,
    FY2026: 178,
  }),
];

const Frame = ({ caption, children }: { caption: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border/25 bg-background/45 p-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">
      Segment revenue
    </p>
    <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{caption}</p>
    {children}
  </div>
);

/**
 * Canonical: four reportable segments over FY23-FY26. The CDMO line crossing
 * agrochemical intermediates in FY24 is the whole story of this company, and it
 * is the crossing — not any single number — that the chart is there to show.
 */
export const AnnualSegmentRevenue = () => (
  <Frame caption="Rs cr, as disclosed in the segment note. FY23-FY26.">
    <SegmentRevenueDisplay revenues={ANVIRA_SEGMENT_REVENUE} />
  </Frame>
);

/**
 * A segment first reported in FY25 (the pharma-intermediates block was carved
 * out of "other" that year). Its line simply starts where the disclosure does —
 * no zero-fill, no backfilled estimate.
 */
export const SegmentAddedMidHistory = () => (
  <Frame caption="Pharma Intermediates was first broken out in FY25, so its series starts there.">
    <SegmentRevenueDisplay
      revenues={[
        ...series("CDMO & Custom Synthesis", {
          FY2023: 421,
          FY2024: 566,
          FY2025: 712,
          FY2026: 882,
        }),
        ...series("Agrochemical Intermediates", {
          FY2023: 512,
          FY2024: 486,
          FY2025: 468,
          FY2026: 565,
        }),
        ...series("Pharma Intermediates", { FY2025: 96, FY2026: 111 }),
      ]}
    />
  </Frame>
);

/**
 * No extracted segment rows — a single-segment filer, or a company whose annual
 * reports are not yet through the pipeline. The block says so in one line
 * instead of drawing an empty pair of axes.
 */
export const NoSegmentData = () => (
  <Frame caption="Nothing extracted yet for this company.">
    <SegmentRevenueDisplay revenues={[]} />
  </Frame>
);
