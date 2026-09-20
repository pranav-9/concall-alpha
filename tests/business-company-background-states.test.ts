import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BusinessCompanyBackground } from "../app/company/components/business-company-background";
import { normalizeBusinessSnapshot } from "../lib/business-snapshot/normalize";
import type { NormalizedAboutCompany } from "../lib/business-snapshot/types";

// The states of the Business Snapshot's top block that business-company-
// background.test.ts leaves open: no card at all, the legacy summary fallback,
// the intro paragraph and the "More about the business" disclosure, a malformed
// profile (and the notice that says so), source labels, and timeline size limits.

// tsconfig has jsx: "preserve" (Next compiles JSX itself), so under tsx the
// component's JSX uses the classic React.createElement transform and needs a
// React binding in scope.
(globalThis as { React?: typeof React }).React = React;

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

const source = { label: "FY26 investor presentation", url: "https://example.test/deck.pdf", locator: "Slide 6" };
const second = { label: "Q2 FY26 call", url: "https://example.test/call.pdf" };
const change = {
  headline: "Defence is a larger part of the mix.",
  text: "Defence rose from 29% of revenue in FY22 to 46% in FY26.",
  period: "FY22 to FY26",
  sources: [source, second],
};
const goodStat = { value: "+17", unit: "pts", label: "defence share" };
const base = { about_short: "Builds electronics for defence customers.", about_long: "A longer account of the business." };

const aboutOf = (aboutCompany: Record<string, unknown>): NormalizedAboutCompany | null =>
  normalizeBusinessSnapshot({
    companyCode: "TEST",
    companyWebsite: null,
    snapshotRow: { company: "TEST", business_snapshot: { about_company: aboutCompany } },
  })?.aboutCompany ?? null;
const paint = (about: NormalizedAboutCompany | null, headline: string | null, supportingText: string | null) =>
  renderToStaticMarkup(React.createElement(BusinessCompanyBackground, { about, headline, supportingText }));
// The way the section derives its props from the normalized about block.
const render = (aboutCompany: Record<string, unknown>) => {
  const about = aboutOf(aboutCompany);
  return paint(about, about?.aboutShort ?? null, about?.aboutLong ?? null);
};
const withStat = (stat: unknown, period = change.period) => render({ ...base, what_changed: { ...change, period, stat } });
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

// ---------------------------------------------------------------------------
// The split card, and when it is not there
// ---------------------------------------------------------------------------
test("hero: with no headline, no intro and no change there is no card, and the timeline stands alone", () => {
  const timelineOnly = aboutOf({ company_timeline: [{ year: 2001, title: "Founded in Mysuru", sources: [source] }] });
  const html = paint(timelineOnly, null, null);
  assert.ok(!html.includes("The business") && !html.includes("What is changing?"));
  assert.ok(!html.includes("business-overview-about"));
  assert.ok(!html.includes("rounded-xl"), "no empty card shell");
  assert.ok(html.includes("Company timeline") && html.includes("Founded in Mysuru"), "the timeline does not depend on the card");
  assert.equal(paint(null, null, null), "", "nothing to say renders nothing");
});

test("hero: a snapshot with no about block falls back to the legacy summary fields", () => {
  const both = paint(null, "Legacy short.", "Legacy long.");
  assert.ok(both.includes(">Legacy short.<") && both.includes("More about the business") && both.includes(">Legacy long.<"));
  assert.ok(!both.includes("What is changing?"));
  const onlyLong = paint(null, null, "Legacy long.");
  assert.equal(count(onlyLong, ">Legacy long.<"), 1, "shown once, as the headline");
  assert.ok(!onlyLong.includes("More about the business"));
});

test("intro: a distinct business_intro sits under the headline; one that repeats it is dropped", () => {
  const distinct = render({ about_short: "Short.", business_intro: "Intro paragraph.", about_long: "Long paragraph." });
  assert.equal(count(distinct, ">Intro paragraph.<"), 1);
  assert.ok(distinct.indexOf(">Short.<") < distinct.indexOf(">Intro paragraph."), "under the headline");
  assert.ok(distinct.indexOf(">Intro paragraph.<") < distinct.indexOf("More about the business"), "above the disclosure");
  assert.equal(count(render({ about_short: "Short.", business_intro: "Short." }), ">Short.<"), 1, "a repeat of the headline is dropped");
  assert.equal(count(render({ business_intro: "Intro only." }), ">Intro only.<"), 1, "with no headline the intro is the headline, not both");
});

test("disclosure: 'More about the business' appears only when the long text adds something", () => {
  const shown = render({ about_short: "Short.", about_long: "Long paragraph." });
  assert.ok(shown.includes("More about the business") && shown.includes("Show less") && shown.includes(">Long paragraph.<"));
  for (const about of [
    { about_short: "Short." }, // nothing more to say
    { about_short: "Same.", about_long: "Same." }, // the long text repeats the headline
    { about_short: "Short.", business_intro: "Intro.", about_long: "Intro." }, // ...or the intro paragraph
  ]) {
    assert.ok(!render(about).includes("More about the business"), JSON.stringify(about));
  }
});

// ---------------------------------------------------------------------------
// A malformed profile
// ---------------------------------------------------------------------------
test("error state: a malformed stat drops only the number: the change panel and the split card stay, and the notice says so", () => {
  const html = render({ ...base, what_changed: { ...change, stat: { value: "+17 pts", label: "defence share" } } });
  assert.ok(html.includes("What is changing?") && html.includes("Defence rose from 29%"), "the change's own text is kept");
  assert.ok(html.includes("Sources (2)"), "with its citations");
  assert.ok(html.includes("FY22 to FY26"), "and its period as a plain footer line");
  assert.ok(!html.includes("text-[26px]"), "no big number is drawn");
  assert.ok(html.includes("The business") && html.includes(base.about_short));
  assert.equal(count(html, "lg:grid-cols-2"), 1, "still the split card");
  assert.ok(html.includes("Some company background details are temporarily unavailable."));
});

test("error state: a broken change (not its stat) is still withheld whole, leaving one business panel", () => {
  const html = render({ ...base, what_changed: { ...change, headline: " ", stat: goodStat } });
  assert.ok(!html.includes("What is changing?"), "the change panel is withheld");
  assert.ok(html.includes("The business") && html.includes(base.about_short));
  assert.equal(count(html, "lg:grid-cols-2"), 0, "one panel, not a half-empty split");
  assert.equal(count(html, "lg:border-l"), 0);
  assert.ok(html.includes("Some company background details are temporarily unavailable."));
});

test("error state: a valid profile shows no notice; a bad timeline does not touch a good stat", () => {
  assert.ok(!withStat(goodStat).includes("temporarily unavailable"));
  const html = render({
    ...base,
    company_timeline: [{ year: 2001, title: "Founded", sources: [] }],
    what_changed: { ...change, stat: goodStat },
  });
  assert.ok(html.includes("What is changing?") && html.includes(">+17<"), "the change and its stat still show");
  assert.ok(!html.includes("Company timeline"), "the bad timeline is the only thing withheld");
  assert.ok(html.includes("Some company background details are temporarily unavailable."));
});

// ---------------------------------------------------------------------------
// The change panel's footer
// ---------------------------------------------------------------------------
test("footer: one source reads 'Source', several read 'Sources (n)', with or without a stat", () => {
  for (const stat of [goodStat, undefined]) {
    const one = render({ ...base, what_changed: { ...change, sources: [source], stat } });
    assert.ok(one.includes("\">Source<svg") && !one.includes("Sources ("), JSON.stringify(stat));
    const many = render({ ...base, what_changed: { ...change, stat } });
    assert.ok(many.includes("\">Sources (2)<svg"), JSON.stringify(stat));
  }
});

test("footers: pinned to the card's bottom edge, and the change footer top-aligns while its source list is open", () => {
  // The pinning and the alignment flip are CSS (`mt-auto`, `has-[...]`), which
  // static markup cannot exercise; this only keeps the classes that implement
  // them from being dropped by accident.
  const html = withStat(goodStat);
  assert.ok(html.includes("class=\"group/about mt-auto pt-4\""), "the business panel's disclosure");
  assert.ok(html.includes("mt-auto flex flex-wrap items-end justify-between"), "the change panel's footer");
  assert.ok(html.includes("has-[details[open]]:items-start"));
});

test("stat: '%' and 'bps' units are shown as stored, beside the number", () => {
  const pct = withStat({ value: "12.5", unit: "%", label: "EBITDA margin" });
  assert.ok(pct.includes(">12.5<") && pct.includes(">%<"));
  assert.ok(!pct.includes("×"), "only 'x' becomes a multiplication sign");
  const bps = withStat({ value: "-250", unit: "bps", label: "gross margin" });
  assert.ok(bps.includes(">−250<") && bps.includes(">bps<"));
});

test("stat: the documented 'FY24 to H1 FY26' reads as a range with the whole right-hand side kept", () => {
  const html = withStat(goodStat, "FY24 to H1 FY26");
  assert.ok(html.includes("FY24<span aria-hidden=\"true\"> → </span><span class=\"sr-only\"> to </span>H1 FY26"));
});

// ---------------------------------------------------------------------------
// Timeline size limits
// ---------------------------------------------------------------------------
test("timeline: one milestone is one filled column; six (the schema cap) fill only the last", () => {
  const one = render({ ...base, company_timeline: [{ year: 2001, title: "Founded in Mysuru", sources: [source] }] });
  assert.ok(one.includes("--milestone-count:1"));
  assert.equal(count(one, "lg:left-0 bg-emerald-600"), 1, "the only milestone is the latest one");
  assert.equal(count(one, "lg:left-0 bg-background"), 0);

  const six = Array.from({ length: 6 }, (_, index) => ({ year: 2000 + index, title: `Milestone ${index}`, sources: [source] }));
  const html = render({ ...base, company_timeline: six });
  assert.ok(html.includes("--milestone-count:6"));
  assert.equal(count(html, "lg:left-0 bg-emerald-600"), 1);
  assert.equal(count(html, "lg:left-0 bg-background"), 5);
  const filled = html.indexOf("lg:left-0 bg-emerald-600");
  assert.ok(html.indexOf(">Milestone 4<") < filled && filled < html.indexOf(">2005<"), "and it is the newest milestone's dot, not the first");
});

console.log("business company background states: no card, fallbacks, malformed profile, footer and timeline limits passed");
