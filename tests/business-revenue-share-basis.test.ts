import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BusinessMixShift } from "../app/company/components/business-mix-shift";
import { normalizeBusinessSnapshot } from "../lib/business-snapshot/normalize";
import {
  DERIVED_SHARE_TITLE,
  isDerivedShare,
  parseRevenueShareBasis,
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

// ---------------------------------------------------------------------------
// Rendered markup (the Mix shift card, static markup)
// ---------------------------------------------------------------------------
const card = (rows: unknown[]) => renderToStaticMarkup(React.createElement(BusinessMixShift, { segments: segmentsOf(rows), history: null, summary: null }));

test("mix shift card: only derived shares carry the 'derived' cue with its tooltip; legacy renders none", () => {
  const derivedHtml = card([
    row("Bulk", 78, { revenue_share_basis: "derived" }),
    row("Brands", 22, { revenue_share_basis: "derived" }),
  ]);
  assert.equal(count(derivedHtml, ">derived</span>"), 2);
  assert.equal(count(derivedHtml, `title="${attr(DERIVED_SHARE_TITLE)}"`), 2);

  const mixedHtml = card([
    row("Coffee", 60, { revenue_share_basis: "reported" }),
    row("Brands", 25, { revenue_share_basis: "derived" }),
    row("Other", 15),
  ]);
  assert.equal(count(mixedHtml, ">derived</span>"), 1, "only the derived segment");

  for (const extra of [{}, { revenue_share_basis: "reported" }, { revenue_share_basis: "estimated" }]) {
    const html = card([row("Coffee", 60, extra), row("Tea", 40, extra)]);
    assert.equal(count(html, ">derived</span>"), 0, JSON.stringify(extra));
    assert.ok(!html.includes("title="), JSON.stringify(extra));
  }
});

test("mix shift card: a derived segment with no share shows no share, so no cue", () => {
  const html = card([
    row("Coffee", 70, { revenue_share_basis: "reported" }),
    row("Tea", 30, { revenue_share_basis: "reported" }),
    row("Unsized", null, { revenue_share_basis: "derived" }),
  ]);
  assert.equal(count(html, ">derived</span>"), 0);
});

console.log("business-revenue-share-basis: all assertions passed");
