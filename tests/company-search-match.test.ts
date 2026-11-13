import assert from "node:assert/strict";

import {
  dedupeCompanies,
  normalizeSearchQuery,
  searchCompanies,
  stripExchangeDecoration,
} from "../lib/company-search-match";
import {
  findRemovedCompany,
  formatRemovedOn,
  REMOVED_COMPANIES,
  removedReasonLine,
  searchRemovedCompanies,
} from "../lib/removed-from-coverage";

// ── pasted broker / charting symbols ─────────────────────────────────────────
// Pasted symbols like "NSE:BLUESTARCO" were real zero-result searches.

for (const raw of ["NSE:BLUESTARCO", "nse : BLUESTARCO", ":BLUESTARCO", "BLUESTARCO.NS", "BLUESTARCO.BO", "BLUESTARCO-EQ", "  BLUESTARCO  "]) {
  assert.equal(normalizeSearchQuery(raw), "bluestarco", raw);
}
assert.equal(stripExchangeDecoration("BSE:SONACOMS"), "SONACOMS", "case is kept for display");
assert.equal(normalizeSearchQuery("bse"), "bse", "a bare exchange name is a query, not decoration");
assert.equal(normalizeSearchQuery("BSE Limited"), "bse limited");
assert.equal(normalizeSearchQuery(null), "");

// ── ranking ──────────────────────────────────────────────────────────────────

const ROWS = [
  { code: "SONACOMS", name: "Sona BLW Precision Forgings Limited" },
  { code: "E2E", name: "E2E Networks Limited" },
  { code: "NEULANDLAB", name: "Neuland Laboratories Limited" },
  { code: "AARTIPHARM", name: "Aarti Pharmalabs Limited" },
  { code: "MTARTECH", name: "MTAR Technologies Limited" },
];

assert.deepEqual(searchCompanies(ROWS, "NSE:SONACOMS").map((r) => r.code), ["SONACOMS"]);
assert.deepEqual(searchCompanies(ROWS, "sona").map((r) => r.code), ["SONACOMS"]);
assert.deepEqual(searchCompanies(ROWS, "e2e").map((r) => r.code), ["E2E"], "exact code first");
assert.deepEqual(searchCompanies(ROWS, "labs").map((r) => r.code), ["AARTIPHARM"], "name contains");
assert.deepEqual(searchCompanies(ROWS, "hdfc bank"), []);
assert.deepEqual(searchCompanies(ROWS, "   "), []);
assert.equal(searchCompanies([...ROWS, ...ROWS, ...ROWS], "e", 2).length, 2, "limit holds");

// code-prefix beats name-prefix beats contains
const ORDER = [
  { code: "XNEU", name: "Neu Alpha" },
  { code: "NEUZ", name: "Zeta" },
  { code: "ANEU", name: "Beta" },
];
assert.deepEqual(searchCompanies(ORDER, "neu").map((r) => r.code), ["NEUZ", "XNEU", "ANEU"]);

assert.deepEqual(
  dedupeCompanies([{ code: "E2E", name: "a" }, { code: "e2e ", name: "b" }, { code: "", name: "c" }]),
  [{ code: "E2E", name: "a" }],
);

// ── removed from coverage ────────────────────────────────────────────────────

const codes = REMOVED_COMPANIES.map((r) => r.code);
assert.equal(new Set(codes).size, codes.length, "no duplicate codes");
assert.equal(REMOVED_COMPANIES.filter((r) => r.removedOn === "2026-11-06").length, 29);
assert.equal(REMOVED_COMPANIES.filter((r) => r.removedOn === "2026-11-10").length, 13);
for (const row of REMOVED_COMPANIES) {
  assert.match(row.code, /^[A-Z0-9&]+$/, row.code);
  assert.match(row.removedOn, /^\d{4}-\d{2}-\d{2}$/, row.code);
}

assert.equal(findRemovedCompany("JIOFIN")?.name, "Jio Financial Services");
assert.equal(findRemovedCompany("jiofin")?.code, "JIOFIN");
assert.equal(findRemovedCompany("NSE:JIOFIN")?.code, "JIOFIN");
assert.equal(findRemovedCompany("SONACOMS"), null);
assert.equal(findRemovedCompany(""), null);

// "jio" was a real zero-result search after JIOFIN was removed.
assert.deepEqual(searchRemovedCompanies("jio").map((r) => r.code), ["JIOFIN"]);
assert.deepEqual(searchRemovedCompanies("hdfc").map((r) => r.code), ["HDFCLIFE"]);
assert.deepEqual(searchRemovedCompanies("icici"), [], "never covered ≠ removed");
assert.equal(searchRemovedCompanies("tata", 2).length, 2);

assert.equal(formatRemovedOn("2026-11-06"), "6 Nov 2026");
assert.equal(formatRemovedOn("2026-11-10"), "10 Nov 2026");
assert.match(removedReasonLine("large_cap"), /large cap/);
assert.match(removedReasonLine("lender"), /bank or NBFC/);
assert.ok(removedReasonLine(null).length > 0);

console.log("company-search-match: ok");
