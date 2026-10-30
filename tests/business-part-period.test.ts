import assert from "node:assert/strict";

import { partPeriodColumn } from "../lib/business-snapshot/part-period";
import type { NormalizedRevenueHistoryBySegment } from "../lib/business-snapshot/types";

// The segment revenue table shows a results-season half (or quarter) as its own column after the fiscal years,
// never inside the year series (MTARTECH 2026-10-30: H1 FY27 Rs 767.5 Cr beside FY26 Rs 876.2 Cr read as a fall).

const row = (segment: string, latestPeriodRevenue: number | null) => ({
  segment,
  isTotal: segment === "Consolidated",
  revenueByYear: { FY25: 676.0, FY26: 876.2 },
  comparabilityLabel: "reported",
  growthMetricPeriod: "FY22-FY26",
  growthMetricPercent: 28,
  latestPeriodRevenue,
});

const base = (over: Partial<NormalizedRevenueHistoryBySegment>): NormalizedRevenueHistoryBySegment => ({
  years: ["FY25", "FY26"],
  rows: [row("Consolidated", 767.5), row("Aerospace & Defence", 80.2)],
  insights: [],
  latestPeriod: "H1 FY27",
  ...over,
});

// A half-year after the fiscal years gets its own column.
assert.equal(partPeriodColumn(base({})), "H1 FY27");

// Already a year column: nothing extra (an annual-only row whose latest period is the last year).
assert.equal(partPeriodColumn(base({ latestPeriod: "FY26" })), null);

// No period, or a blank one: nothing.
assert.equal(partPeriodColumn(base({ latestPeriod: null })), null);
assert.equal(partPeriodColumn(base({ latestPeriod: "  " })), null);

// A period with no figure on any row draws no empty column.
assert.equal(
  partPeriodColumn(base({ rows: [row("Consolidated", null), row("Aerospace & Defence", null)] })),
  null,
);

// One row with a figure is enough; the others print a dash.
assert.equal(
  partPeriodColumn(base({ rows: [row("Consolidated", 767.5), row("Aerospace & Defence", null)] })),
  "H1 FY27",
);

console.log("business-part-period: ok");
