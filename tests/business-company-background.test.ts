import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BusinessCompanyBackground } from "../app/company/components/business-company-background";
import { normalizeBusinessSnapshot } from "../lib/business-snapshot/normalize";

// The top of the Business Snapshot: "The business" and "What is changing?" as one
// split card, then the company timeline. The change's optional headline number
// (`what_changed.stat`) is the only element whose text is computed at render time.

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
const timeline = [
  { year: 2018, title: "Lists on the NSE", sources: [source] },
  { year: 2001, title: "Founded in Mysuru", sources: [source] },
  { year: 2026, title: "Defence reaches 46% of the mix", detail: "A share position, not a one-off order.", sources: [source] },
];

const render = (aboutCompany: Record<string, unknown>) => {
  const snapshot = normalizeBusinessSnapshot({
    companyCode: "TEST",
    companyWebsite: null,
    snapshotRow: { company: "TEST", business_snapshot: { about_company: aboutCompany } },
  });
  const about = snapshot?.aboutCompany ?? null;
  return renderToStaticMarkup(
    React.createElement(BusinessCompanyBackground, {
      about,
      headline: about?.aboutShort ?? null,
      supportingText: about?.aboutLong ?? null,
    }),
  );
};

const base = { about_short: "Builds electronics for defence customers.", about_long: "A longer account of the business." };
const withStat = (stat: unknown, period = change.period) => render({ ...base, what_changed: { ...change, period, stat } });
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
// Whole class tokens: a substring count would also match lg:border-l-0 or bg-background/75.
const classTokens = (html: string) => [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
const tokenCount = (html: string, token: string) => classTokens(html).filter((t) => t === token).length;
const classesOf = (openingTag: string) => (openingTag.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/).filter(Boolean);
const statNumberTag = (html: string) => html.match(/<p class="flex shrink-0[^"]*">/)?.[0] ?? "";

// ---------------------------------------------------------------------------
// The change's headline number
// ---------------------------------------------------------------------------
test("stat: number, unit and caption render; a 'to' range reads as an arrow", () => {
  const html = withStat({ value: "+17", unit: "pts", label: "defence share" });
  assert.ok(html.includes(">+17<"), "the number is shown as the producer wrote it");
  assert.ok(html.includes(">pts<"));
  assert.ok(html.includes("defence share,"));
  assert.ok(html.includes("FY22<span aria-hidden=\"true\"> → </span>"), "range shows an arrow");
  assert.ok(html.includes("<span class=\"sr-only\"> to </span>FY26"), "screen readers still hear 'to'");
  assert.ok(!html.includes("FY22 to FY26"), "the period is not repeated as plain text beside the stat");
});

test("stat: a negative value gets a real minus sign; 'x' reads as a multiplication sign", () => {
  const html = withStat({ value: "-4.5", unit: "x", label: "order-book cover" });
  assert.ok(html.includes(">−4.5<"));
  assert.ok(html.includes(">×<"));
  assert.ok(!html.includes(">-4.5<"));
});

test("stat: with no unit (absent or null) the number stands alone; a period that is not a 'to' range is kept as written", () => {
  for (const unit of [undefined, null]) {
    const html = withStat({ value: "36", unit, label: "segment growth a year" }, "FY24–FY26");
    assert.ok(html.includes(">36</span></p>"), "nothing follows the number inside its paragraph");
    assert.ok(html.includes("FY24–FY26"));
    assert.ok(!html.includes("→"), "no arrow without a 'to' range");
  }
  const multi = withStat({ value: "5", label: "share" }, "FY22 to FY24 to FY26");
  assert.ok(multi.includes("FY22 to FY24 to FY26"), "more than one 'to' is not a range: leave it alone");
});

test("stat: a range needs a period on both sides; other 'to' phrases stay as written", () => {
  for (const period of ["Up to FY26", "FY26 year to date", "Compared to FY25", "H1 FY26 compared to H1 FY25", "Year to March 2026"]) {
    const html = withStat({ value: "+3", unit: "pts", label: "share" }, period);
    assert.ok(html.includes(period), `${period} is kept as written`);
    assert.ok(!html.includes("→"), `no arrow for ${period}`);
  }
  for (const period of ["FY22 to FY26", "FY24 to H1 FY26", "Q1 FY26 to Q1 FY27", "30 June to 11 August 2026", "March 2025 to March 2026", "FY24 TO FY26"]) {
    assert.ok(withStat({ value: "+3", label: "share" }, period).includes("→"), `${period} reads as a range`);
  }
});

test("stat: a negative number is drawn neutral, not in the panel's emerald accent", () => {
  const negative = classesOf(statNumberTag(withStat({ value: "-6.5", unit: "pts", label: "EBITDA margin" })));
  const positive = classesOf(statNumberTag(withStat({ value: "+6.5", unit: "pts", label: "EBITDA margin" })));
  assert.ok(negative.includes("text-foreground") && !negative.some((c) => c.includes("emerald")));
  assert.ok(positive.includes("text-emerald-700") && !positive.includes("text-foreground"));
});

test("stat: % and × sit tight against the number; word units keep a small gap", () => {
  const gap = (unit: string) => classesOf(statNumberTag(withStat({ value: "36", unit, label: "growth" }))).includes("gap-1");
  assert.equal(gap("%"), false);
  assert.equal(gap("x"), false);
  assert.equal(gap("pts"), true);
  assert.equal(gap("bps"), true);
});

test("stat: the caption breaks long words instead of overflowing the card", () => {
  const html = withStat({ value: "+3", unit: "pts", label: "a_very_long_unbroken_label_of_forty_chars_x" });
  assert.ok(html.includes('<p class="max-w-[9.5rem] break-words'));
});

test("no stat: the period stays a plain footer line and no big number is drawn", () => {
  for (const html of [render({ ...base, what_changed: change }), withStat(null), withStat(undefined)]) {
    assert.ok(html.includes("FY22 to FY26"));
    assert.ok(!html.includes("text-[26px]"));
    assert.ok(html.includes("Sources (2)"), "two sources read as a count");
  }
});

// ---------------------------------------------------------------------------
// The split card
// ---------------------------------------------------------------------------
test("hero: business and change share one card with a divider and equal columns from lg", () => {
  const html = render({ ...base, what_changed: change });
  assert.equal(tokenCount(html, "lg:grid-cols-2"), 1);
  assert.equal(tokenCount(html, "lg:border-l"), 1, "one vertical divider between the two halves from lg");
  assert.equal(tokenCount(html, "border-emerald-500/25"), 1, "and a horizontal one when they stack");
  assert.equal(tokenCount(html, "lg:border-t-0"), 1, "which gives way to the vertical one from lg");
  assert.ok(html.includes("The business") && html.includes("What is changing?"));
  assert.ok(html.includes("id=\"business-overview-about\""));
  assert.ok(html.includes("More about the business"));
});

test("hero: the business alone is one full-width panel with no divider or change label", () => {
  const html = render(base);
  assert.equal(tokenCount(html, "lg:grid-cols-2"), 0);
  assert.equal(tokenCount(html, "lg:border-l"), 0);
  assert.ok(!html.includes("What is changing?"));
});

test("hero: a change without a business intro is one panel with no divider", () => {
  const html = render({ what_changed: change });
  assert.ok(html.includes("What is changing?"));
  assert.ok(!html.includes("The business"));
  assert.equal(tokenCount(html, "lg:border-l"), 0);
  assert.equal(tokenCount(html, "border-emerald-500/25"), 0);
});

test("hero: the divider count holds when a timeline follows (lg:border-l-0 is not a divider)", () => {
  const html = render({ ...base, what_changed: change, company_timeline: timeline });
  assert.equal(tokenCount(html, "lg:border-l"), 1);
  assert.equal(tokenCount(html, "lg:border-l-0"), 3, "each milestone drops its left rail from lg");
});

// ---------------------------------------------------------------------------
// The timeline
// ---------------------------------------------------------------------------
test("timeline: oldest first, one column per milestone, only the latest dot filled", () => {
  const html = render({ ...base, company_timeline: timeline });
  assert.ok(html.indexOf("2001") < html.indexOf("2018") && html.indexOf("2018") < html.indexOf("2026"));
  assert.ok(html.includes("--milestone-count:3"));
  assert.equal(tokenCount(html, "bg-emerald-600"), 1, "only the last milestone is a filled dot");
  assert.equal(tokenCount(html, "bg-background"), 2, "the earlier milestones are hollow");
  assert.ok(html.includes("A share position, not a one-off order."));
  assert.ok(html.includes("id=\"business-overview-timeline\""));
});

test("timeline: absent when the profile has no milestones", () => {
  const html = render({ ...base, what_changed: change });
  assert.ok(!html.includes("Company timeline"));
  assert.ok(!html.includes("How it got here"));
});

console.log("business company background: split card, change stat and timeline passed");
