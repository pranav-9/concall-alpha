import { currentFiscalYear, isHistoricalGuidanceItem } from "../lib/guidance-tracking/normalize";
import type { NormalizedGuidanceItem } from "../lib/guidance-tracking/types";

const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error("FAIL", msg); process.exit(1); }
  console.log("ok  ", msg);
};

assert(currentFiscalYear(new Date("2026-05-28")) === "FY27", "May 2026 -> FY27");
assert(currentFiscalYear(new Date("2026-04-01")) === "FY27", "Apr 2026 -> FY27");
assert(currentFiscalYear(new Date("2026-03-31")) === "FY26", "Mar 2026 -> FY26");
assert(currentFiscalYear(new Date("2027-01-15")) === "FY27", "Jan 2027 -> FY27");
assert(currentFiscalYear(new Date("2027-04-01")) === "FY28", "Apr 2027 -> FY28");

const mk = (overrides: Partial<NormalizedGuidanceItem>): NormalizedGuidanceItem => ({
  id: 1, companyCode: "X", guidanceKey: "k", guidanceText: "t",
  guidanceFamily: null, metricSubtype: null, metricLabel: null,
  horizonType: "single_fy", appliesFrom: null, appliesTo: null,
  horizonLabel: null, valuePercent: null, valueText: null,
  firstMentionPeriod: null, latestMentionPeriod: null, mentionedPeriods: [],
  statusKey: "unknown", statusLabel: "Unknown", latestView: null, statusReason: null,
  confidence: null, generatedAtRaw: null, sourceMentions: [], trail: [],
  ...overrides,
});

assert(isHistoricalGuidanceItem(mk({ horizonType: "single_fy", appliesTo: "FY25" }), "FY27") === true, "FY25 single_fy historical vs FY27");
assert(isHistoricalGuidanceItem(mk({ horizonType: "single_fy", appliesTo: "FY26" }), "FY27") === true, "FY26 single_fy historical vs FY27");
assert(isHistoricalGuidanceItem(mk({ horizonType: "single_fy", appliesTo: "FY27" }), "FY27") === false, "FY27 single_fy current vs FY27");
assert(isHistoricalGuidanceItem(mk({ horizonType: "multi_fy", appliesTo: "FY27" }), "FY27") === false, "multi_fy ending FY27 is current (straddler)");
assert(isHistoricalGuidanceItem(mk({ horizonType: "multi_fy", appliesTo: "FY30" }), "FY27") === false, "multi_fy ending FY30 is current");
assert(isHistoricalGuidanceItem(mk({ horizonType: "unspecified", appliesTo: "ongoing" }), "FY27") === false, "unspecified/ongoing never historical");
assert(isHistoricalGuidanceItem(mk({ horizonType: "single_quarter", appliesTo: "Q3 FY26" }), "FY27") === true, "Q3 FY26 historical (parses FY token despite Q prefix)");
assert(isHistoricalGuidanceItem(mk({ appliesTo: null }), "FY27") === false, "null appliesTo not historical");

console.log("\nAll FY helper tests passed.");
