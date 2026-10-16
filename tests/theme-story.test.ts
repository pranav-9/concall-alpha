import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { earliestQuarterLabel, parseQuarterLabel, parseThemeStories, themeStorySchema } from "../lib/themes/story";
import { shortCompanyName, themeIndexLabel } from "../app/themes/theme-card";

// --- the shipped stories file must be fully valid: a dropped story is a card without tiles ---
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "themes", "stories.json"), "utf8"));
const { stories, errors } = parseThemeStories(raw);
assert.deepEqual(errors, [], `stories.json has invalid entries: ${errors.join(" | ")}`);
assert.ok(stories.size >= 1);
for (const [slug, story] of stories) {
  assert.equal(story.theme_slug, slug);
  assert.ok(story.kpis.length >= 1 && story.kpis.length <= 3, `${slug}: 1-3 kpis`);
  for (const kpi of story.kpis) {
    assert.ok(kpi.source.note.length >= 8, `${slug}/${kpi.label}: every tile cites its source`);
  }
}

// --- schema mirror: estimates must trail actuals; a series is never a single point ---
const base = {
  schema_version: "theme_story_v1",
  theme_slug: "x-y",
  driver: { kind: "capex", title: "Capex", line: "Something pulls the roster along." },
};
assert.ok(
  themeStorySchema.safeParse({
    ...base,
    kpis: [{ label: "Demand", value: "1 GW", source: { note: "Somebody said so, Q1 FY27 call." }, series: [{ period: "CY25", value: 1 }, { period: "CY30", value: 5, est: true }] }],
  }).success,
);
assert.equal(
  themeStorySchema.safeParse({
    ...base,
    kpis: [{ label: "Demand", value: "1 GW", source: { note: "Somebody said so, Q1 FY27 call." }, series: [{ period: "CY25", value: 1, est: true }, { period: "CY30", value: 5 }] }],
  }).success,
  false,
  "an actual after an estimate is rejected",
);
assert.equal(
  themeStorySchema.safeParse({
    ...base,
    kpis: [{ label: "Demand", value: "1 GW", source: { note: "Somebody said so, Q1 FY27 call." }, series: [{ period: "CY25", value: 1 }] }],
  }).success,
  false,
  "a one-point series is rejected",
);
assert.equal(themeStorySchema.safeParse({ ...base, kpis: [] }).success, false, "no tiles is rejected");
assert.equal(
  themeStorySchema.safeParse({ ...base, driver: { ...base.driver, kind: "vibes" }, kpis: [{ label: "Demand", value: "1", source: { note: "Somebody said so, Q1 FY27 call." } }] }).success,
  false,
  "driver kind is a closed vocabulary",
);

// --- duplicate slugs are dropped with a reason, not merged ---
const dup = parseThemeStories({ stories: [{ ...base, kpis: [{ label: "Alpha", value: "1", source: { note: "Somebody said so, Q1 FY27 call." } }] }, { ...base, kpis: [{ label: "Beta", value: "2", source: { note: "Somebody said so, Q1 FY27 call." } }] }] });
assert.equal(dup.stories.size, 1);
assert.equal(dup.errors.length, 1);
assert.match(dup.errors[0], /duplicate/);

// --- SINCE quarter: both spellings parse; earliest wins; unparseable ignored ---
assert.deepEqual(parseQuarterLabel("Q1FY27"), { fy: 2027, qtr: 1 });
assert.deepEqual(parseQuarterLabel("Q3 FY26"), { fy: 2026, qtr: 3 });
assert.equal(parseQuarterLabel("FY26"), null);
assert.equal(earliestQuarterLabel(["Q2FY27", "Q1 FY27", "Q3FY26", null, "garbage"]), "Q3 FY26");
assert.equal(earliestQuarterLabel(["Q4FY26", "Q1FY27"]), "Q4 FY26");
assert.equal(earliestQuarterLabel([null, undefined, ""]), null);

// --- card index label ---
assert.equal(themeIndexLabel(1), "Theme 01");
assert.equal(themeIndexLabel(12), "Theme 12");
assert.equal(shortCompanyName("E2E Networks Limited"), "E2E Networks");
assert.equal(shortCompanyName("HFCL Ltd."), "HFCL");
assert.equal(shortCompanyName("Limited"), "Limited", "never blanks a name");

console.log("theme-story: ok");
