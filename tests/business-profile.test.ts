import assert from "node:assert/strict";
import { normalizeBusinessSnapshot } from "../lib/business-snapshot/normalize";
import { businessProfileSchema, normalizeBusinessProfile } from "../lib/business-snapshot/profile";
import { buildBusinessMixPeriods, buildDeltaShareBySegment, getBaselineToLatestPpDelta, pickComparisonPeriods } from "../lib/business-snapshot/mix-history";
import type { NormalizedRevenueMixHistoryBySegment, NormalizedRevenueMixHistoryBySegmentRow } from "../lib/business-snapshot/types";

const source = { label: "FY26 annual report", url: "https://example.test/report.pdf", locator: "p. 12" };
const milestone = { year: 2010, title: "Founded", sources: [source] };
const fact = { category: "customers", title: "Customer concentration", text: "Top five customers contribute 54% of consolidated revenue.", period: "FY26", sources: [source] };
const profile = { business_intro: "Builds components for industrial customers.", company_timeline: [{ ...milestone, year: 2023, title: "Second plant opened" }, milestone], business_facts: [fact], what_changed: { headline: "A broader manufacturing footprint", text: "The second plant is now operating.", period: "FY26", sources: [source] } };

assert.equal(businessProfileSchema.safeParse(profile).success, true);
assert.deepEqual(normalizeBusinessProfile(profile).timeline.map((event) => event.year), [2010, 2023]);
assert.equal(profile.company_timeline[0].year, 2023, "normalization must not mutate the input");

for (const bad of [
  { company_timeline: [{ ...milestone, sources: [] }] },
  { company_timeline: [{ ...milestone, year: "2010" }] },
  { company_timeline: Array(7).fill(milestone) },
  { business_facts: [{ ...fact, period: " " }] },
  { business_facts: [{ ...fact, category: "valuation" }] },
  { business_facts: [{ ...fact, sources: [{ ...source, url: "javascript:alert(1)" }] }] },
  { business_facts: [{ ...fact, sources: [{ ...source, url: "https://example.test/a b" }] }] },
  { what_changed: { ...profile.what_changed, unsupported_extra: true } },
  { business_facts: [{ ...fact, metrics: [] }] },
  { business_facts: [{ ...fact, metrics: Array(7).fill({ label: "Top 5", value: 62, unit: "%" }) }] },
  { business_facts: [{ ...fact, metrics: [{ label: "Top 5", value: -1, unit: "%" }] }] },
  { business_facts: [{ ...fact, metrics: [{ label: "Top 5", value: 62 }] }] },
]) {
  assert.equal(businessProfileSchema.safeParse(bad).success, false, JSON.stringify(bad));
  assert.equal(normalizeBusinessProfile(bad).hasInvalidProfile, true);
}

const metrics = [{ label: "Top 5", value: 62, unit: "%" }, { label: "6-10", value: 12, unit: "%" }];
const withMetrics = { ...profile, business_facts: [{ ...fact, metrics }] };
assert.equal(businessProfileSchema.safeParse(withMetrics).success, true, "a fact may carry prose + structured metrics together");
assert.deepEqual(normalizeBusinessProfile(withMetrics).facts[0].metrics, metrics);
assert.equal(normalizeBusinessProfile(profile).facts[0].metrics, undefined, "a fact without metrics stays prose-only, not an empty array");
console.log("business fact metrics: optional, additive, and schema-validated passed");

const normalize = (row: Record<string, unknown>) => normalizeBusinessSnapshot({ companyCode: "TEST", companyWebsite: null, snapshotRow: { company: "TEST", ...row } });
const about = { about_short: "Component maker", about_long: "A longer explanation.", ...profile };
for (const row of [
  { about_company: about },
  { business_snapshot: { about_company: about } },
  { details: { business_snapshot: { about_company: about } } },
  { details: { details: { business_snapshot: { about_company: about } } } },
  { about_company: JSON.stringify(about) },
]) {
  const normalized = normalize(row)!;
  assert.equal(normalized.aboutCompany?.timeline.length, 2);
  assert.equal(normalized.aboutCompany?.facts[0].period, "FY26");
  assert.equal(normalized.aboutCompany?.change?.headline, profile.what_changed.headline);
}
const legacy = normalize({ business_snapshot: { business_summary_short: "Legacy maker", business_summary_long: "Legacy description" } });
assert.equal(legacy?.aboutCompany?.aboutShort, "Legacy maker");
assert.deepEqual(legacy?.aboutCompany?.timeline, []);
assert.equal(legacy?.aboutCompany?.hasInvalidProfile, false);
const invalid = normalize({ about_company: { about_short: "Keep this", ...profile, company_timeline: [{ ...milestone, sources: [] }] } });
assert.equal(invalid?.aboutCompany?.aboutShort, "Keep this");
assert.deepEqual(invalid?.aboutCompany?.timeline, []);
assert.equal(invalid?.aboutCompany?.facts.length, 1, "bad timeline should not remove valid facts");
assert.equal(invalid?.aboutCompany?.hasInvalidProfile, true);
assert.equal(normalize({ about_company: { business_facts: [fact] } })?.aboutCompany?.facts.length, 1);
assert.equal(normalizeBusinessSnapshot({ companyCode: "TEST", companyWebsite: null, snapshotRow: null }), null);
console.log("business profile: optional fields, provenance, invalid data, and legacy storage paths passed");

const mixRow = (segment: string, value: number | null, comparabilityLabel = "reported", isTotal = false): NormalizedRevenueMixHistoryBySegmentRow => ({ segment, mixPercentByYear: { FY26: value }, isTotal, comparabilityLabel, directionLabel: null, latestMixPercent: value });
const mix = (rows: NormalizedRevenueMixHistoryBySegmentRow[]) => buildBusinessMixPeriods({ years: ["FY26"], rows, insights: [], latestPeriod: null })[0];
const partial = mix([mixRow("A", 45), mixRow("B", 25), mixRow("C", null), mixRow("Total", 100, "reported", true)]);
assert.equal(partial.total, 70, "never rescale a partial mix or count a consolidated total twice");
assert.equal(partial.valid, true);
assert.equal(mix([mixRow("A", 70), mixRow("B", 40)]).valid, false, "over-full totals must not look like a valid mix");
assert.equal(mix([mixRow("A", 70), mixRow("B", 30, "estimated")]).valid, false, "estimated data is not reported history");
assert.equal(mix([mixRow("A", 70), mixRow("B", 30, "restated")]).valid, true);
assert.equal(mix([mixRow("A", null), mixRow("B", null)]).valid, false);
assert.equal(mix([mixRow("A", NaN), mixRow("B", Infinity)]).valid, false);
console.log("business mix history: partial, missing, estimated, restated and inconsistent totals passed");

const mixRowYears = (segment: string, valuesByYear: Record<string, number | null>, comparabilityLabel = "reported", isTotal = false): NormalizedRevenueMixHistoryBySegmentRow => {
  const years = Object.keys(valuesByYear);
  return { segment, mixPercentByYear: valuesByYear, isTotal, comparabilityLabel, directionLabel: null, latestMixPercent: valuesByYear[years[years.length - 1]] };
};
const history = (years: string[], rows: NormalizedRevenueMixHistoryBySegmentRow[]): NormalizedRevenueMixHistoryBySegment => ({ years, rows, insights: [], latestPeriod: years[years.length - 1] });

const fiveYear = history(["FY22", "FY23", "FY24", "FY25", "FY26"], [
  mixRowYears("Alpha", { FY22: 60, FY23: 58, FY24: 55, FY25: 52, FY26: 50 }),
  mixRowYears("Beta", { FY22: 40, FY23: 42, FY24: 45, FY25: 48, FY26: 50 }),
]);
const fiveYearPeriods = buildBusinessMixPeriods(fiveYear);
const cmp = pickComparisonPeriods(fiveYearPeriods)!;
assert.equal(cmp.baseline.year, "FY22", "picks the earliest valid period as the baseline");
assert.equal(cmp.latest.year, "FY26", "picks the latest valid period");

// FY22 is single-segment (not comparable — buildBusinessMixPeriods requires >=2
// known segments), so the baseline must skip to the first genuinely VALID year,
// not assume years[0].
const staggeredHistory = history(["FY22", "FY23", "FY24"], [
  mixRowYears("Alpha", { FY22: 100, FY23: 58, FY24: 55 }),
  mixRowYears("Beta", { FY22: null, FY23: 42, FY24: 45 }),
]);
const staggeredCmp = pickComparisonPeriods(buildBusinessMixPeriods(staggeredHistory))!;
assert.equal(staggeredCmp.baseline.year, "FY23", "baseline is the first VALID year, not years[0]");
assert.equal(staggeredCmp.latest.year, "FY24");

assert.equal(pickComparisonPeriods(buildBusinessMixPeriods(history(["FY26"], [mixRowYears("Alpha", { FY26: 60 }), mixRowYears("Beta", { FY26: 40 })]))), null, "fewer than 2 valid periods returns null, not a same-period compare");
console.log("pickComparisonPeriods: earliest/latest VALID period selection passed");

const periods3 = ["FY24", "FY25", "FY26"];
assert.equal(getBaselineToLatestPpDelta({ FY24: 30, FY25: 35, FY26: 42 }, periods3), 12, "latest minus baseline, in points");
assert.equal(getBaselineToLatestPpDelta({ FY24: 30, FY25: 35, FY26: null }, periods3), null, "missing latest value with no fallback yields no delta");
assert.equal(getBaselineToLatestPpDelta({ FY24: 30, FY25: 35, FY26: null }, periods3, 42), 12, "latestFallback covers a row whose latest period is unset but has a disclosed latest value");
assert.equal(getBaselineToLatestPpDelta({ FY24: null, FY25: 35, FY26: 42 }, periods3), null, "missing baseline value yields no delta even when latest is known");
assert.equal(getBaselineToLatestPpDelta({}, []), null, "empty period list yields no delta");
console.log("getBaselineToLatestPpDelta: baseline-to-latest point delta passed");

const deltaMap = buildDeltaShareBySegment(history(["FY22", "FY26"], [
  mixRowYears(" Defence & Aerospace ", { FY22: 29, FY26: 46 }),
  mixRowYears("industrial electronics", { FY22: 34, FY26: 27 }),
  mixRowYears("Total", { FY22: 100, FY26: 100 }, "reported", true),
]));
assert.equal(deltaMap.get("defence & aerospace"), 17, "matched by trim+lowercase, independent of the caller's own casing/whitespace");
assert.equal(deltaMap.get("industrial electronics"), -7);
assert.equal(deltaMap.has("total"), false, "the isTotal row is excluded — it is not a real segment");
assert.equal(deltaMap.get("medical electronics"), undefined, "a segment_history_annual name with no match in revenue-mix-history is silently absent, not fuzzy-matched");
assert.deepEqual([...buildDeltaShareBySegment(null).entries()], [], "no history slot yields an empty map, not a throw");
console.log("buildDeltaShareBySegment: segment-name matching for the Δ Share column passed");
