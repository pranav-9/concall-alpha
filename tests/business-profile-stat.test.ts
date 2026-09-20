import assert from "node:assert/strict";

import { businessProfileSchema, changeStatSchema, normalizeBusinessProfile } from "../lib/business-snapshot/profile";
import { businessProfilePreview } from "./fixtures/business-profile-preview";

// what_changed.stat is optional and strict. business-profile.test.ts pins the
// happy shapes, one bad value, one bad unit, a blank label and an unknown key;
// this file pins the edges of the grammar and what a bad stat does to the rest
// of the profile (the reader drops the number alone and flags the profile; the
// change's own text, the intro and the timeline stay).

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

const source = { label: "FY26 annual report", url: "https://example.test/report.pdf" };
const change = { headline: "Defence is a larger part of the mix.", text: "Defence rose from 29% to 46% of revenue.", period: "FY22 to FY26", sources: [source] };
const okStat = (stat: unknown) => changeStatSchema.safeParse(stat).success;
const label = (value: unknown) => JSON.stringify(value) ?? String(value);

test("value: signed or unsigned, up to four digits and two decimals", () => {
  for (const value of ["+17", "-4.5", "36", "0", "+0.05", "9999", "1234.56"]) {
    assert.equal(okStat({ value, label: "share" }), true, value);
  }
});

test("value: anything that is not a bare number is refused", () => {
  const bad: unknown[] = [
    "", "+", "-", ".5", "5.", "12345", "1.234", "1,200", "17%", "17 pts", " 17", "17 ", "17\n", "1e3", "--3", "+-3",
    "−17", // the renderer draws the real minus sign; the producer writes an ASCII "-"
    "\uff11\uff17", "\u0967\u096d", // fullwidth and Devanagari digits: \d means them in the pipeline's regex engines, [0-9] does not
    17, null, undefined, {}, ["17"],
  ];
  for (const value of bad) assert.equal(okStat({ value, label: "share" }), false, label(value));
});

test("unit: the four stored spellings pass; the display glyph and near-misses do not", () => {
  for (const unit of ["pts", "%", "x", "bps", null, undefined]) {
    assert.equal(okStat({ value: "5", unit, label: "share" }), true, label(unit));
  }
  for (const unit of ["percent", "", "PTS", "pp", " pts", "×", 5, false]) {
    assert.equal(okStat({ value: "5", unit, label: "share" }), false, label(unit));
  }
});

test("label: 1 to 48 visible characters, and label and value are both required", () => {
  assert.equal(okStat({ value: "5", label: "a" }), true);
  assert.equal(okStat({ value: "5", label: "x".repeat(48) }), true, "48 is the cap");
  for (const bad of ["", " ", "x".repeat(49), 5, null]) {
    assert.equal(okStat({ value: "5", label: bad }), false, label(bad));
  }
  assert.equal(okStat({ value: "5" }), false, "no label");
  assert.equal(okStat({ label: "share" }), false, "no value");
  assert.equal(okStat({}), false);
});

test("stat must be an object, or null, or absent, on the change", () => {
  for (const stat of ["+17 pts", 17, true, ["+17"]]) {
    assert.equal(businessProfileSchema.safeParse({ what_changed: { ...change, stat } }).success, false, label(stat));
  }
});

test("a malformed stat is dropped on its own: the change and the rest of the profile stay", () => {
  const profile = {
    business_intro: "Builds components for industrial customers.",
    company_timeline: [{ year: 2010, title: "Founded", sources: [source] }],
    what_changed: change,
  };
  for (const stat of [{ value: "+17 pts", label: "defence share" }, { value: "+17", unit: "percent", label: "defence share" }, "+17 pts", 17, {}]) {
    const result = normalizeBusinessProfile({ ...profile, what_changed: { ...change, stat } });
    assert.equal(result.change?.headline, change.headline, `the change's own text survives ${label(stat)}`);
    assert.equal(result.change?.text, change.text);
    assert.deepEqual(result.change?.sources, change.sources, "with its citations");
    assert.equal(result.change?.stat, undefined, "only the number is dropped");
    assert.equal(result.hasInvalidProfile, true, "and the profile is flagged, so the notice shows");
    assert.equal(result.intro, profile.business_intro, "optional additions validate independently");
    assert.equal(result.timeline.length, 1);
  }

  // a valid stat, an absent one and a null one are all left alone (and not flagged)
  for (const stat of [{ value: "+17", unit: "pts", label: "defence share" }, null, undefined]) {
    const result = normalizeBusinessProfile({ ...profile, what_changed: { ...change, stat } });
    assert.equal(result.hasInvalidProfile, false, label(stat));
    assert.deepEqual(result.change?.stat, stat);
  }

  // dropping the stat does not excuse a broken change or an unknown key beside it
  const stat = { value: "+17", unit: "pts", label: "defence share" };
  assert.equal(normalizeBusinessProfile({ ...profile, what_changed: { ...change, headline: " ", stat: { value: "x", label: "y" } } }).change, null);
  assert.equal(normalizeBusinessProfile({ ...profile, what_changed: { ...change, stat, unsupported_extra: true } }).change, null);

  // the schema itself stays strict: it is the mirror of the pipeline's contract
  assert.equal(businessProfileSchema.safeParse({ what_changed: { ...change, stat: { value: "+17 pts", label: "defence share" } } }).success, false);
});

test("the synthetic preview fixture stays a valid payload that carries a stat and an arrow-shaped period", () => {
  const profile = normalizeBusinessProfile(businessProfilePreview.about_company);
  assert.equal(profile.hasInvalidProfile, false, "an invalid fixture would blank the change panel in /dev/business-snapshot?state=synthetic");
  assert.ok(profile.change?.stat, "the preview is the only place the stat can be seen");
  assert.equal(profile.change?.period.split(/\s+to\s+/).length, 2, "one 'to', so the preview shows the arrow rendering");
});

console.log("business profile stat: grammar edges, isolated stat failure and preview fixture passed");
