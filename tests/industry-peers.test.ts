import assert from "node:assert/strict";

import { selectIndustryPeers, type PeerCompanyRow } from "../lib/industry-peers";

const company = (code: string, sub_sector: string | null, extra: Partial<PeerCompanyRow> = {}): PeerCompanyRow => ({
  code,
  name: code,
  sector: "Capital Goods",
  sub_sector,
  market_cap_band_at_admission: "small",
  excluded_from_discovery: false,
  ...extra,
});

const companies: PeerCompanyRow[] = [
  company("HFCL", "Cables - Electricals"),
  company("STLTECH", "cables - electricals "),
  company("KEI", "Cables - Electricals"),
  company("POLYCAB", "Cables - Electricals", { market_cap_band_at_admission: "large" }),
  company("DYCL", "Cables - Electricals", { excluded_from_discovery: true }),
  company("AZAD", "Aerospace & Defense"),
  company("OTHER", "Cables - Electricals", { sector: "Consumer Durables" }),
  company("LONE", "Packaging"),
  company("BLANK", null),
];

// The company leads, peers follow A–Z; a large cap and a below-cut company drop out,
// and so does a same-named sub-sector in another sector.
assert.deepEqual(selectIndustryPeers("hfcl", companies), {
  subSector: "Cables - Electricals",
  sector: "Capital Goods",
  codes: ["HFCL", "KEI", "STLTECH"],
});

// The page's own company is on its own board even when discovery hides it.
assert.deepEqual(selectIndustryPeers("POLYCAB", companies)?.codes, ["POLYCAB", "HFCL", "KEI", "STLTECH"]);
assert.deepEqual(selectIndustryPeers("DYCL", companies)?.codes, ["DYCL", "HFCL", "KEI", "STLTECH"]);

// Nothing to compare against → no block.
assert.equal(selectIndustryPeers("LONE", companies), null);
assert.equal(selectIndustryPeers("AZAD", companies), null);
assert.equal(selectIndustryPeers("BLANK", companies), null);
assert.equal(selectIndustryPeers("MISSING", companies), null);

console.log("industry-peers: ok");
