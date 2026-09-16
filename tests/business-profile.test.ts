import assert from "node:assert/strict";
import { normalizeBusinessSnapshot } from "../lib/business-snapshot/normalize";
import { businessProfileSchema, normalizeBusinessProfile } from "../lib/business-snapshot/profile";
import { buildBusinessMixPeriods } from "../lib/business-snapshot/mix-history";
import type { NormalizedRevenueMixHistoryBySegmentRow } from "../lib/business-snapshot/types";

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
]) {
  assert.equal(businessProfileSchema.safeParse(bad).success, false, JSON.stringify(bad));
  assert.equal(normalizeBusinessProfile(bad).hasInvalidProfile, true);
}

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
