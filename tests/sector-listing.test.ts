import assert from "node:assert/strict";

import { isDiscoveryListed, isSectorListed } from "../lib/coverage-policy";

// Sectors list every covered company (user call 2026-11-10): the coverage cut
// does not apply there, only the admission gate does.
const belowCut = { market_cap_band_at_admission: "small", excluded_from_discovery: true };
const listed = { market_cap_band_at_admission: "mid", excluded_from_discovery: false };
const largeCap = { market_cap_band_at_admission: "large", excluded_from_discovery: false };
const unclassified = { market_cap_band_at_admission: null, excluded_from_discovery: null };

assert.equal(isSectorListed(belowCut), true, "below-cut companies are on sector pages");
assert.equal(isSectorListed(listed), true);
assert.equal(isSectorListed(unclassified), true, "NULL band fails open");
assert.equal(isSectorListed(largeCap), false, "large-cap admissions stay off");

// The other discovery surfaces still apply the cut.
assert.equal(isDiscoveryListed(belowCut), false);
assert.equal(isDiscoveryListed(listed), true);

console.log("sector-listing: ok");
