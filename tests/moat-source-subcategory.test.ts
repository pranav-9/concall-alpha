import assert from "node:assert/strict";

import { v15SourceSchema } from "../lib/moat-analysis/types";

// The pipeline's v15 schema (/schemas/moat_analysis_v15.json) added "Efficient scale" under
// Cost Advantages on 2026-10-09. A subcategory the portal's Zod enum lacks fails the parse and
// hides the whole moat card behind the "being refreshed" placeholder, so the two lists must match.
const source = (subcategory: string | null) => ({
  source_type: "Cost Advantages",
  subcategory,
  applies: true,
  does_not_apply_reason: null,
  presence: ["Four approved makers serve a ₹600 Cr niche; none has entered in five years."],
  durability: ["A fifth entrant would push returns below the cost of capital."],
});

assert.equal(v15SourceSchema.safeParse(source("Efficient scale")).success, true, "Efficient scale parses");
assert.equal(v15SourceSchema.safeParse(source("Scale-based")).success, true, "existing subcategory still parses");
assert.equal(v15SourceSchema.safeParse(source(null)).success, true, "null subcategory parses");
assert.equal(v15SourceSchema.safeParse(source("Market structure")).success, false, "unknown subcategory is rejected");

console.log("moat-source-subcategory: ok");
