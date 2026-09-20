import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BusinessSnapshotSection } from "../app/company/components/business-snapshot-section";
import { normalizeBusinessSnapshot } from "../lib/business-snapshot/normalize";
import type { BusinessSnapshotRow } from "../lib/business-snapshot/types";
import { businessProfilePreview } from "./fixtures/business-profile-preview";

// The Business Snapshot shell: which stack each snapshot state renders, and the
// sign-up gate's marker inside it. The Business tab is gated (lib/signup-gate.ts):
// the client clips the panel at its single `data-gate-cut` element and makes
// everything after it inert, so the marker's presence and its position relative
// to the blocks above and below it are part of the section's contract. This
// section lost its outer L2 wrapper box; the marker has to survive that.

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

const section = (snapshotRow: BusinessSnapshotRow | null) =>
  renderToStaticMarkup(
    React.createElement(BusinessSnapshotSection, {
      snapshot: normalizeBusinessSnapshot({ companyCode: "TEST", companyWebsite: null, snapshotRow }),
      companyCode: "TEST",
      companyName: "Test Co",
      generatedAtShort: null,
    }),
  );
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const at = (html: string, id: string) => html.indexOf(`id="${id}"`);

// The synthetic preview payload carries every block: split card, timeline, facts,
// segments, mix history, historical economics.
const structured = section({ company: "TEST", business_snapshot: businessProfilePreview });

test("structured: the block stack sits straight on the section shell, with no box around it", () => {
  assert.ok(
    structured.includes("<div class=\"flex flex-col gap-4\"><div class=\"space-y-4\"><div class=\"space-y-3\"><div class=\"rounded-xl border border-border/35"),
    "shell > stack > blocks, with the split card as the first block and no L2 wrapper between",
  );
  assert.ok(structured.includes("lg:grid-cols-2") && structured.includes("What is changing?"), "the split card renders inside it");
});

test("structured: exactly one data-gate-cut, on the segments block", () => {
  assert.equal(count(structured, "data-gate-cut"), 1);
  assert.ok(/<div id="business-overview-segments"[^>]*data-gate-cut/.test(structured), "the marker is the segments anchor itself");
});

test("structured: the hero, timeline and facts sit above the cut; the historical economics sit below it", () => {
  const cut = structured.indexOf("data-gate-cut");
  for (const above of ["business-overview-about", "business-overview-timeline", "business-overview-profile"]) {
    assert.ok(at(structured, above) !== -1 && at(structured, above) < cut, `${above} is above the cut`);
  }
  assert.ok(at(structured, "business-overview-momentum") > cut, "what the sign-up card promises is behind the gate");
});

test("legacy-only snapshot: the legacy blocks render, and with no marker the gate stays off", () => {
  const legacy = section({
    company: "TEST",
    business_snapshot: { mix_shift_summary: "Mix moved toward defence.", top_3_revenue_drivers: ["Defence orders"] },
  });
  assert.ok(legacy.includes("Mix moved toward defence.") && legacy.includes("Top Revenue Drivers"));
  assert.ok(legacy.includes("No business snapshot summary available yet."));
  assert.ok(!legacy.includes("The business"), "no split card without structured data");
  assert.equal(count(legacy, "data-gate-cut"), 0);
});

test("no usable snapshot: the not-ready state renders, with no marker", () => {
  for (const row of [null, { company: "TEST", business_snapshot: {} }]) {
    const html = section(row);
    assert.ok(html.includes("Business Snapshot is not ready yet for this company."), JSON.stringify(row));
    assert.equal(count(html, "data-gate-cut"), 0, JSON.stringify(row));
  }
});

console.log("business snapshot section: shell, gate marker, legacy and empty states passed");
