import assert from "node:assert/strict";

import { canonicalSectionId, resolveSectionId } from "../lib/section-hash";

const ids = new Set(["overview", "business-overview", "quality", "business-overview-history"]);

// Exact section id.
assert.equal(resolveSectionId("#quality", ids, "overview"), "quality");
// Renamed section: the old Moat-tab links (and their sub-anchors) still land on Quality.
assert.equal(canonicalSectionId("moat-analysis"), "quality");
assert.equal(canonicalSectionId("moat-analysis-full"), "quality-full");
assert.equal(canonicalSectionId("moat-analysisx"), "moat-analysisx");
assert.equal(resolveSectionId("#moat-analysis", ids, "overview"), "quality");
assert.equal(resolveSectionId("#moat-analysis-sources", ids, "overview"), "quality");
assert.equal(resolveSectionId("business-overview", ids, "overview"), "business-overview");
// Sub-anchor keeps its parent section active.
assert.equal(resolveSectionId("#business-overview-about", ids, "overview"), "business-overview");
assert.equal(resolveSectionId("#business-overview-mix-shift", ids, "overview"), "business-overview");
// Longest matching section wins over a shorter prefix.
assert.equal(resolveSectionId("#business-overview-history-2024", ids, "overview"), "business-overview-history");
// Trailing dash alone still resolves to the parent.
assert.equal(resolveSectionId("#business-overview-", ids, "overview"), "business-overview");
// Near-miss without the dash separator is NOT a sub-anchor.
assert.equal(resolveSectionId("#business-overviewx", ids, "overview"), "overview");
// Unknown / empty hashes fall back.
assert.equal(resolveSectionId("#nope", ids, "overview"), "overview");
assert.equal(resolveSectionId("", ids, "overview"), "overview");
assert.equal(resolveSectionId("#", ids, "overview"), "overview");

console.log("All section-hash tests passed.");
