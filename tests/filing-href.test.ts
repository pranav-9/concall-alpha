import assert from "node:assert/strict";

import { safeFilingHref } from "../lib/exchange-desk/filing-href";

// Accepts the exchange hosts the scraper writes.
assert.equal(
  safeFilingHref("https://www.bseindia.com/xml-data/corpfiling/AttachLive/a.pdf"),
  "https://www.bseindia.com/xml-data/corpfiling/AttachLive/a.pdf",
);
assert.equal(safeFilingHref("https://nseindia.com/x.pdf"), "https://nseindia.com/x.pdf");
assert.equal(safeFilingHref("https://archives.nseindia.com/x.pdf"), "https://archives.nseindia.com/x.pdf");
// Case-insensitive host.
assert.equal(safeFilingHref("https://WWW.BSEINDIA.COM/a.pdf"), "https://www.bseindia.com/a.pdf");

// Rejects everything else.
assert.equal(safeFilingHref(null), null);
assert.equal(safeFilingHref(undefined), null);
assert.equal(safeFilingHref(""), null);
assert.equal(safeFilingHref("not a url"), null);
assert.equal(safeFilingHref("javascript:alert(1)"), null);
assert.equal(safeFilingHref("data:text/html,hi"), null);
assert.equal(safeFilingHref("http://www.bseindia.com/a.pdf"), null, "plain http rejected");
assert.equal(safeFilingHref("https://evil.com/bseindia.com/a.pdf"), null, "path lookalike rejected");
assert.equal(safeFilingHref("https://bseindia.com.evil.com/a.pdf"), null, "suffix lookalike rejected");
assert.equal(safeFilingHref("https://notbseindia.com/a.pdf"), null, "substring host rejected");

console.log("filing-href: ok");
