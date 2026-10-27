// Dev-only companions to fixture.ts: CCL's `quarterly_financials` rows as read
// 2026-10-27 (Q2 FY27 added by hand from the Q2 results so the latest fixture
// quarter has a Results card), and three highlights in the slim shape
// buildQuarterHighlights emits (one with a tracked guide → rail, two without →
// area line; one hurting the case). Not a production payload.
import type { QuarterFinancialsPoint } from "@/lib/quarter-results";
import type { QuarterHighlight } from "@/lib/key-variables-snapshot/highlights";

export const FINANCIALS_FIXTURE: QuarterFinancialsPoint[] = [
  { fy: 2027, qtr: 2, periodEnd: "2026-09-30", basis: "consolidated", revenueCr: 1211, operatingProfitCr: 217, opmPct: 17.9, netProfitCr: 130, eps: 9.74 },
  { fy: 2027, qtr: 1, periodEnd: "2026-06-30", basis: "consolidated", revenueCr: 1200, operatingProfitCr: 194, opmPct: 16, netProfitCr: 117, eps: 8.75 },
  { fy: 2026, qtr: 4, periodEnd: "2026-03-31", basis: "consolidated", revenueCr: 1224, operatingProfitCr: 192, opmPct: 16, netProfitCr: 115, eps: 8.58 },
  { fy: 2026, qtr: 3, periodEnd: "2025-12-31", basis: "consolidated", revenueCr: 1051, operatingProfitCr: 185, opmPct: 18, netProfitCr: 100, eps: 7.51 },
  { fy: 2026, qtr: 2, periodEnd: "2025-09-30", basis: "consolidated", revenueCr: 1127, operatingProfitCr: 197, opmPct: 18, netProfitCr: 101, eps: 7.55 },
  { fy: 2026, qtr: 1, periodEnd: "2025-06-30", basis: "consolidated", revenueCr: 1056, operatingProfitCr: 159, opmPct: 15, netProfitCr: 72, eps: 5.43 },
  { fy: 2025, qtr: 4, periodEnd: "2025-03-31", basis: "consolidated", revenueCr: 836, operatingProfitCr: 163, opmPct: 20, netProfitCr: 102, eps: 7.63 },
  { fy: 2025, qtr: 3, periodEnd: "2024-12-31", basis: "consolidated", revenueCr: 780, operatingProfitCr: 142, opmPct: 18, netProfitCr: 78, eps: 5.84 },
  { fy: 2025, qtr: 2, periodEnd: "2024-09-30", basis: "consolidated", revenueCr: 724, operatingProfitCr: 135, opmPct: 19, netProfitCr: 68, eps: 5.1 },
];

export const HIGHLIGHTS_FIXTURE: QuarterHighlight[] = [
  {
    variable: "Volume",
    headline: "Volume keeps compounding; the FY27 guide needs the second half to hold it.",
    thesisRole: "Sets the growth",
    unitPrefix: "",
    unitSuffix: "MT",
    latestValue: 20300,
    latestPeriod: "Q2 FY27",
    trendPeriods: ["Q3 FY25", "Q4 FY25", "Q1 FY26", "Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27", "Q2 FY27"],
    trendValues: [13900, 15200, 15800, 17400, 17600, 18900, 18200, 20300],
    changeLabel: "+46%",
    effect: "helps",
    guide: { label: "Guide ~22,000 · FY27 run-rate", value: 22000 },
  },
  {
    variable: "EBITDA per kg",
    headline: "Pricing held through the coffee spike, so each kilo earns what it did.",
    thesisRole: "Sets the margin",
    unitPrefix: "₹",
    unitSuffix: "",
    latestValue: 129,
    latestPeriod: "Q2 FY27",
    trendPeriods: ["Q3 FY25", "Q4 FY25", "Q1 FY26", "Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27", "Q2 FY27"],
    trendValues: [128, 133, 126, 134, 131, 129, 135, 129],
    changeLabel: "+1%",
    effect: "helps",
    guide: null,
  },
  {
    variable: "Net debt",
    headline: "Debt is still high for the earnings; the next two quarters' cash tells.",
    thesisRole: "Sets the risk",
    unitPrefix: "₹",
    unitSuffix: "cr",
    latestValue: 742,
    latestPeriod: "Q2 FY27",
    trendPeriods: ["Q4 FY25", "Q2 FY26", "Q4 FY26", "Q2 FY27"],
    trendValues: [540, 690, 810, 742],
    changeLabel: "+37%",
    effect: "hurts",
    guide: null,
  },
];
