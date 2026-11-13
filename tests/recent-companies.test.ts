import assert from "node:assert/strict";

import { displayCompanyName, listingExchange, matchRange } from "../lib/company-search-match";
import {
  clearRecentCompanies,
  readRecentCompanies,
  RECENT_COMPANIES_KEY,
  RECENT_COMPANIES_MAX,
  refreshRecentCompanies,
  rememberRecentCompany,
} from "../lib/recent-companies";

// ── exchange tag ─────────────────────────────────────────────────────────────
// The company.exchange column comes in every spelling: "BSE,NSE", "BSE, NSE",
// "NSE,BSE", "NSE", "BSE", null.

assert.equal(listingExchange("BSE,NSE"), "NSE");
assert.equal(listingExchange("BSE, NSE"), "NSE");
assert.equal(listingExchange("nse,bse"), "NSE");
assert.equal(listingExchange("NSE"), "NSE");
assert.equal(listingExchange("BSE"), "BSE");
assert.equal(listingExchange("NSE SME"), "NSE");
assert.equal(listingExchange(null), null);
assert.equal(listingExchange(""), null);
assert.equal(listingExchange("MSEI"), null);

// ── match range for bolding ──────────────────────────────────────────────────

assert.deepEqual(matchRange("Sona BLW Precision Forgings", "blw"), [5, 8]);
assert.deepEqual(matchRange("SONACOMS", "NSE:sona"), [0, 4], "decoration stripped, case ignored");
assert.equal(matchRange("Neuland Laboratories", "xyz"), null);
assert.equal(matchRange("Neuland", ""), null);
assert.equal(matchRange(null, "neu"), null);

// ── row name ─────────────────────────────────────────────────────────────────

assert.equal(displayCompanyName("Laurus Labs Limited", "LAURUSLABS"), "Laurus Labs");
assert.equal(displayCompanyName("AARTI PHARMALABS LIMITED", "AARTIPHARM"), "AARTI PHARMALABS");
assert.equal(displayCompanyName("Sona BLW Precision Forgings Ltd.", "SONACOMS"), "Sona BLW Precision Forgings");
assert.equal(displayCompanyName("Limited Brands", "X"), "Limited Brands", "only a trailing suffix goes");
assert.equal(displayCompanyName(null, "E2E"), "E2E");

// ── recent companies (in-memory store) ───────────────────────────────────────

function memoryStore(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(RECENT_COMPANIES_KEY, initial);
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const store = memoryStore();
assert.deepEqual(readRecentCompanies(store), [], "empty store reads empty");
assert.deepEqual(readRecentCompanies(null), [], "no storage reads empty");

rememberRecentCompany({ code: "e2e", name: "E2E Networks Limited", exchange: "BSE,NSE", sector: "IT" }, store);
rememberRecentCompany({ code: "SONACOMS", name: "Sona BLW" }, store);
let list = rememberRecentCompany({ code: "E2E", name: "E2E Networks Limited" }, store);
assert.deepEqual(list.map((r) => r.code), ["E2E", "SONACOMS"], "re-opening moves to the front, no duplicate");
assert.equal(list[0].exchange, null, "the newest pick's fields win");
assert.deepEqual(readRecentCompanies(store).map((r) => r.code), ["E2E", "SONACOMS"], "persisted");

for (const code of ["A1", "A2", "A3", "A4", "A5", "A6", "A7"]) rememberRecentCompany({ code, name: code }, store);
list = readRecentCompanies(store);
assert.equal(list.length, RECENT_COMPANIES_MAX, "capped");
assert.equal(list[0].code, "A7", "newest first");

clearRecentCompanies(store);
assert.deepEqual(readRecentCompanies(store), []);

// junk in storage never throws
assert.deepEqual(readRecentCompanies(memoryStore("{not json")), []);
assert.deepEqual(readRecentCompanies(memoryStore('{"code":"X"}')), [], "not an array");
assert.deepEqual(
  readRecentCompanies(memoryStore(JSON.stringify([null, 3, { code: "" }, { code: "OK", name: 5 }, { code: "OK" }]))),
  [{ code: "OK", name: null, exchange: null, sector: null }],
  "bad rows dropped, duplicates collapsed, non-string fields nulled",
);

// a store that throws on write still returns the list for this page view
const throwing = {
  getItem: () => null,
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};
assert.deepEqual(rememberRecentCompany({ code: "X", name: "X" }, throwing).map((r) => r.code), ["X"]);
assert.doesNotThrow(() => clearRecentCompanies(throwing));

// ── refresh against the live list ────────────────────────────────────────────

const live = [
  { code: "E2E", name: "E2E Networks Limited", exchange: "BSE,NSE", sector: "Information Technology" },
  { code: "SONACOMS", name: "Sona BLW Precision Forgings Ltd.", exchange: "NSE", sector: "Automobile" },
];
const stored = [
  { code: "JIOFIN", name: "Jio Financial Services" }, // removed from coverage since it was opened
  { code: "SONACOMS", name: "old name" },
  { code: "E2E", name: "E2E" },
];
assert.deepEqual(
  refreshRecentCompanies(stored, live).map((r) => [r.code, r.name]),
  [
    ["SONACOMS", "Sona BLW Precision Forgings Ltd."],
    ["E2E", "E2E Networks Limited"],
  ],
  "live fields win, order kept, removed companies dropped",
);
assert.deepEqual(refreshRecentCompanies(stored, []), stored, "no live list: stored rows stand");

console.log("recent-companies: ok");
