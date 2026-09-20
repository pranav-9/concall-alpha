import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BusinessSegmentMixBar } from "../app/company/components/business-segment-mix-bar";
import { BusinessSegmentsMosaic } from "../app/company/components/business-segments-mosaic";
import { normalizeBusinessSnapshot } from "../lib/business-snapshot/normalize";
import {
  DERIVED_SHARE_TITLE,
  isDerivedShare,
  parseRevenueShareBasis,
  revenueMixCaptionWord,
} from "../lib/business-snapshot/revenue-share-basis";
import type { NormalizedRevenueBreakdownItem } from "../lib/business-snapshot/types";

// revenue_breakdown.by_segment[].revenue_share_basis: "reported" | "derived" |
// absent. A company that reports one segment gets its split from management's
// other figures (brand sales vs turnover); those shares are "derived" and must
// not read as "disclosed". Rows written before the field existed carry no
// basis and keep today's "disclosed" caption.

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

const row = (segment: string, share: number | null, extra: Record<string, unknown> = {}) => ({
  segment,
  segment_explained: `${segment} in one line.`,
  revenue_share_percent: share,
  role_pill: "core_engine",
  growth_direction_pill: "stable",
  margin_profile: "improving",
  margin_profile_note: "Margins improving on mix.",
  ...extra,
});

const segmentsOf = (rows: unknown[]): NormalizedRevenueBreakdownItem[] => {
  const snapshot = normalizeBusinessSnapshot({
    companyCode: "TEST",
    companyWebsite: null,
    snapshotRow: { company: "TEST", revenue_breakdown: { by_segment: rows } },
  });
  return snapshot?.revenueBreakdown?.bySegment ?? [];
};

// Entity-escape the way React writes attribute values, so the title can be
// looked up in markup.
const attr = (value: string) => value.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------
test("normalizer: derived and reported parse to revenueShareBasis", () => {
  const [derived, reported] = segmentsOf([
    row("Bulk", 78, { revenue_share_basis: "derived" }),
    row("Brands", 22, { revenue_share_basis: "reported" }),
  ]);
  assert.equal(derived.revenueShareBasis, "derived");
  assert.equal(reported.revenueShareBasis, "reported");
  // nothing else about the item moved
  assert.equal(derived.name, "Bulk");
  assert.equal(derived.revenueSharePercent, 78);
  assert.equal(derived.rolePill, "core_engine");
});

test("normalizer: legacy rows without the field, and unknown values, read as no basis", () => {
  const items = segmentsOf([
    row("Legacy", 40),
    row("Estimated", 30, { revenue_share_basis: "estimated" }),
    row("Blank", 20, { revenue_share_basis: "  " }),
    row("Nullish", 10, { revenue_share_basis: null }),
    row("Boolean", 5, { revenue_share_basis: true }),
  ]);
  assert.deepEqual(
    items.map((item) => item.revenueShareBasis),
    [null, null, null, null, null],
  );
});

test("normalizer: the value is trimmed and case-insensitive", () => {
  const [item] = segmentsOf([row("Bulk", 78, { revenue_share_basis: " Derived " })]);
  assert.equal(item.revenueShareBasis, "derived");
});

test("normalizer: the segment_profiles fallback path parses it too", () => {
  const snapshot = normalizeBusinessSnapshot({
    companyCode: "TEST",
    companyWebsite: null,
    snapshotRow: {
      company: "TEST",
      segment_profiles: [
        { segment_name: "Bulk", revenue_share_percent: 78, revenue_share_basis: "derived" },
        { segment_name: "Brands", revenue_share_percent: 22 },
      ],
    },
  });
  assert.deepEqual(
    snapshot?.revenueBreakdown?.bySegment.map((item) => item.revenueShareBasis),
    ["derived", null],
  );
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
test("parseRevenueShareBasis: only the two known values pass", () => {
  assert.equal(parseRevenueShareBasis("reported"), "reported");
  assert.equal(parseRevenueShareBasis("derived"), "derived");
  for (const raw of ["estimated", "", "disclosed", 1, true, null, undefined, {}]) {
    assert.equal(parseRevenueShareBasis(raw), null, String(raw));
  }
});

test("isDerivedShare: a derived basis on a shown share", () => {
  assert.equal(isDerivedShare({ revenueSharePercent: 25, revenueShareBasis: "derived" }), true);
  assert.equal(isDerivedShare({ revenueSharePercent: 0, revenueShareBasis: "derived" }), true, "0% is still a shown share");
  assert.equal(isDerivedShare({ revenueSharePercent: null, revenueShareBasis: "derived" }), false, "no share shown, nothing to flag");
  assert.equal(isDerivedShare({ revenueSharePercent: 25, revenueShareBasis: "reported" }), false);
  assert.equal(isDerivedShare({ revenueSharePercent: 25, revenueShareBasis: null }), false);
  assert.equal(isDerivedShare({ revenueSharePercent: 25 }), false, "legacy item without the field");
});

test("revenueMixCaptionWord: derived once any bar-filling segment is derived, else disclosed", () => {
  // legacy and reported keep today's caption
  assert.equal(revenueMixCaptionWord([]), "disclosed");
  assert.equal(revenueMixCaptionWord([{ revenueSharePercent: 60 }, { revenueSharePercent: 40 }]), "disclosed");
  assert.equal(
    revenueMixCaptionWord([
      { revenueSharePercent: 60, revenueShareBasis: "reported" },
      { revenueSharePercent: 40, revenueShareBasis: null },
    ]),
    "disclosed",
  );
  // any derived segment that carries a share flips it, wholly or mixed
  assert.equal(
    revenueMixCaptionWord([
      { revenueSharePercent: 78, revenueShareBasis: "derived" },
      { revenueSharePercent: 22, revenueShareBasis: "derived" },
    ]),
    "derived",
  );
  assert.equal(
    revenueMixCaptionWord([
      { revenueSharePercent: 60, revenueShareBasis: "reported" },
      { revenueSharePercent: 25, revenueShareBasis: "derived" },
    ]),
    "derived",
  );
  // a derived segment that carries no share (null or 0) is not on the bar
  assert.equal(
    revenueMixCaptionWord([
      { revenueSharePercent: 70, revenueShareBasis: "reported" },
      { revenueSharePercent: 30, revenueShareBasis: "reported" },
      { revenueSharePercent: null, revenueShareBasis: "derived" },
      { revenueSharePercent: 0, revenueShareBasis: "derived" },
    ]),
    "disclosed",
  );
});

// ---------------------------------------------------------------------------
// Rendered markup (real components, static markup)
// ---------------------------------------------------------------------------
const bar = (rows: unknown[]) => renderToStaticMarkup(React.createElement(BusinessSegmentMixBar, { segments: segmentsOf(rows) }));
const mosaic = (rows: unknown[]) => renderToStaticMarkup(React.createElement(BusinessSegmentsMosaic, { segments: segmentsOf(rows) }));

test("mix bar: legacy, reported and unknown-basis rows keep the exact 'disclosed' caption, with no tooltip", () => {
  for (const extra of [{}, { revenue_share_basis: "reported" }, { revenue_share_basis: "estimated" }]) {
    const html = bar([row("Coffee", 60, extra), row("Tea", 40, extra)]);
    assert.ok(html.includes(">100%</span> disclosed</span>"), JSON.stringify(extra));
    assert.ok(!html.includes("derived"), JSON.stringify(extra));
    assert.ok(!html.includes("title="), JSON.stringify(extra));
  }
});

test("mix bar: a derived share reads '<total>% derived' with the explanatory tooltip", () => {
  const all = bar([
    row("Bulk", 78, { revenue_share_basis: "derived" }),
    row("Brands", 22, { revenue_share_basis: "derived" }),
  ]);
  assert.ok(all.includes(">100%</span> derived</span>"));
  assert.ok(!all.includes("disclosed"));
  assert.ok(all.includes(`title="${attr(DERIVED_SHARE_TITLE)}"`));

  // one derived share among reported ones is enough
  const mixed = bar([
    row("Coffee", 60, { revenue_share_basis: "reported" }),
    row("Brands", 25, { revenue_share_basis: "derived" }),
    row("Other", 15),
  ]);
  assert.ok(mixed.includes(">100%</span> derived</span>"));
});

test("mix bar: the undisclosed-remainder logic is untouched next to the derived caption", () => {
  const html = bar([
    row("Bulk", 60, { revenue_share_basis: "derived" }),
    row("Brands", 20, { revenue_share_basis: "derived" }),
  ]);
  assert.ok(html.includes(">80%</span> derived</span>"), "caption total is the summed shares");
  assert.ok(html.includes("Revenue mix: Bulk 60%, Brands 20%, undisclosed 20%."), "the unfilled 20% is still called undisclosed");
  // a full mix shows no remainder, derived or not
  assert.ok(!bar([row("Bulk", 78, { revenue_share_basis: "derived" }), row("Brands", 22, { revenue_share_basis: "derived" })]).includes("undisclosed"));
});

test("mix bar: a derived segment with no share does not change the caption", () => {
  const html = bar([
    row("Coffee", 70, { revenue_share_basis: "reported" }),
    row("Tea", 30, { revenue_share_basis: "reported" }),
    row("Unsized", null, { revenue_share_basis: "derived" }),
  ]);
  assert.ok(html.includes(">100%</span> disclosed</span>"));
});

test("mosaic: only derived shares carry the 'derived' cue (phone + sm variants), legacy renders none", () => {
  const derivedHtml = mosaic([
    row("Bulk", 78, { revenue_share_basis: "derived" }),
    row("Brands", 22, { revenue_share_basis: "derived" }),
  ]);
  // two share elements per segment (phone row + sm hero) x two segments
  assert.equal(count(derivedHtml, ">derived</span>"), 4);
  assert.equal(count(derivedHtml, `title="${attr(DERIVED_SHARE_TITLE)}"`), 4 + 1, "four cues + the bar caption");
  // the phone variant stacks the cue under the number; the sm hero keeps it inline
  assert.equal(count(derivedHtml, 'class="text-[10px] font-normal tracking-normal text-muted-foreground block text-right leading-tight"'), 2);
  assert.equal(count(derivedHtml, 'class="text-[10px] font-normal tracking-normal text-muted-foreground ml-1"'), 2);

  const mixedHtml = mosaic([
    row("Coffee", 60, { revenue_share_basis: "reported" }),
    row("Brands", 25, { revenue_share_basis: "derived" }),
    row("Other", 15),
  ]);
  assert.equal(count(mixedHtml, ">derived</span>"), 2, "only the derived segment, in both variants");

  for (const extra of [{}, { revenue_share_basis: "reported" }, { revenue_share_basis: "estimated" }]) {
    const html = mosaic([row("Coffee", 60, extra), row("Tea", 40, extra)]);
    assert.equal(count(html, ">derived</span>"), 0, JSON.stringify(extra));
    assert.ok(!html.includes("title="), JSON.stringify(extra));
  }
});

test("mosaic: a derived segment with no share shows no share, so no cue", () => {
  const html = mosaic([
    row("Coffee", 70, { revenue_share_basis: "reported" }),
    row("Tea", 30, { revenue_share_basis: "reported" }),
    row("Unsized", null, { revenue_share_basis: "derived" }),
  ]);
  assert.equal(count(html, ">derived</span>"), 0);
});

console.log("business-revenue-share-basis: all assertions passed");
