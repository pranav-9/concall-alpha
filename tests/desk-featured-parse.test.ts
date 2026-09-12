import assert from "node:assert/strict";

import { parseFeaturedRead, type DeskFeaturedReadRow } from "../lib/desk-featured/types";

// A schema-valid row; each case overrides one field.
const mkRow = (over: Partial<DeskFeaturedReadRow> = {}): DeskFeaturedReadRow => ({
  id: "guidance-SUZLON-2026Q1",
  company_code: "SUZLON",
  company_name: "Suzlon Energy",
  sector: "Capital Goods",
  section: "guidance",
  tag_label: "Guidance re-read",
  change_kind: "upgraded",
  headline: "From turbine-maker to full-stack renewable developer",
  summary: "The bet: move up the value stack.",
  section_href: "/company/SUZLON#guidance-history",
  feature_weight: 70,
  published_at: "2026-09-12T08:00:00Z",
  status: "eligible",
  ...over,
});

const name = (company_name: string | null) =>
  parseFeaturedRead(mkRow({ company_name }))?.companyName;

// --- legal-suffix stripping: the name is now the card heading, so producer-typed
// names must read as one style across the strip ---
assert.equal(name("Suzlon Energy"), "Suzlon Energy");
assert.equal(name("Physicswallah Limited"), "Physicswallah");
assert.equal(name("Transrail Lighting Limited"), "Transrail Lighting");
assert.equal(name("Netweb Technologies India Ltd"), "Netweb Technologies India");
assert.equal(name("Kalyan Jewellers India Ltd."), "Kalyan Jewellers India");
assert.equal(name("ather energy LIMITED"), "ather energy", "case-insensitive");
assert.equal(name("  One 97 Communications Limited  "), "One 97 Communications", "trims first");
console.log("  ok  trailing Limited / Ltd / Ltd. is stripped by rule");

// Only a TRAILING suffix is stripped — a name that merely contains the word is left alone.
assert.equal(name("Limited Edition Foods"), "Limited Edition Foods");
assert.equal(name("Unlimited Power"), "Unlimited Power");
assert.equal(name("Ltd Holdings Group"), "Ltd Holdings Group");
console.log("  ok  non-trailing 'Limited' is preserved");

// A name that IS only the suffix keeps its original text rather than collapsing to empty.
assert.equal(name("Limited"), "Limited");
console.log("  ok  suffix-only name is kept, not blanked");

// Empty / null name still fails the required-field gate.
assert.equal(parseFeaturedRead(mkRow({ company_name: null })), null);
assert.equal(parseFeaturedRead(mkRow({ company_name: "   " })), null);
console.log("  ok  missing company_name drops the row");

// Unrelated fields are untouched by the normalization.
const parsed = parseFeaturedRead(mkRow({ company_name: "Suzlon Energy Limited" }));
assert.ok(parsed);
assert.equal(parsed.companyCode, "SUZLON");
assert.equal(parsed.headline, "From turbine-maker to full-stack renewable developer");
assert.equal(parsed.sector, "Capital Goods");
console.log("  ok  other fields pass through unchanged");

console.log("\nAll desk-featured parse tests passed.");
