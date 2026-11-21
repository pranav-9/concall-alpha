import assert from "node:assert/strict";

import { isAdmittedLargeCap, isDiscoveryListed } from "../lib/coverage-policy";

// One gate (2026-11-21): only the admission gate keeps a company off discovery
// surfaces. The composite coverage cut is gone, so a row whose stale
// `excluded_from_discovery` flag is still true lists like any other — the portal
// no longer reads that column.
const staleCutFlag = { market_cap_band_at_admission: "small", excluded_from_discovery: true };
const mid = { market_cap_band_at_admission: "mid" };
const largeCap = { market_cap_band_at_admission: "large" };
const unclassified = { market_cap_band_at_admission: null };

assert.equal(isDiscoveryListed(staleCutFlag), true, "a stale cut flag no longer hides a company");
assert.equal(isDiscoveryListed(mid), true);
assert.equal(isDiscoveryListed(unclassified), true, "NULL band fails open");
assert.equal(isDiscoveryListed(largeCap), false, "large-cap admissions stay off");
assert.equal(isAdmittedLargeCap(largeCap), true);
assert.equal(isAdmittedLargeCap(mid), false);

// String form (callers holding only the band).
assert.equal(isDiscoveryListed("large"), false);
assert.equal(isDiscoveryListed("small"), true);
assert.equal(isDiscoveryListed(null), true);

console.log("coverage-policy: ok");
