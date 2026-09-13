import assert from "node:assert/strict";

import {
  FEATURED_SLOTS,
  SELECTION_ORDER,
  selectFeaturedReads,
} from "../lib/desk-featured/select";
import type { FeaturedRead } from "../lib/desk-featured/types";

// Minimal read; only the fields selection reads (recency + weight) vary.
const mk = (
  companyCode: string,
  publishedAtRaw: string,
  weight = 60,
): FeaturedRead => ({
  id: `guidance-${companyCode}-2026Q1`,
  companyCode,
  companyName: companyCode,
  sector: "Capital Goods",
  section: "guidance",
  tagLabel: "Guidance re-read",
  changeKind: "upgraded",
  headline: `${companyCode} headline`,
  summary: "The bet: something specific.",
  href: `/company/${companyCode}#guidance-history`,
  weight,
  publishedAtRaw,
});

const codes = (reads: FeaturedRead[]) => selectFeaturedReads(reads).map((r) => r.companyCode);

// The live pool as of 2026-09-13, deliberately handed over in NON-recency order
// so the test proves selection sorts rather than trusting the caller's order.
const pool = [
  mk("KALYANKJIL", "2026-09-11T03:00:00+00:00", 62),
  mk("AVANTIFEED", "2026-09-13T13:46:41+00:00", 64),
  mk("SUZLON", "2026-09-10T12:30:00+00:00", 64),
  mk("TRANSRAILL", "2026-09-11T05:00:00+00:00", 68),
  mk("PAYTM", "2026-09-12T10:20:58+00:00", 66),
  mk("NETWEB", "2026-09-11T04:00:00+00:00", 66),
  mk("ATHERENERG", "2026-09-11T02:00:00+00:00", 60),
  mk("PWL", "2026-09-12T08:30:07+00:00", 62),
];

// --- the cached pool must not be mutated ---
// getCachedDeskFeaturedReads hands the SAME array to every request in the
// revalidate window, so an in-place sort would reorder a shared value. Run this
// FIRST on its own array: snapshotting after other calls would compare a
// mutated pool against an already-mutated copy and pass no matter what.
const virgin = [
  mk("OLD", "2026-09-10T00:00:00Z", 50),
  mk("NEW", "2026-09-12T00:00:00Z", 50),
];
const virginOrder = ["OLD", "NEW"];
selectFeaturedReads(virgin);
assert.deepEqual(virgin.map((r) => r.companyCode), virginOrder, "input order preserved");
console.log("  ok  does not mutate the cached pool");

// --- the contract: hero AND both secondaries are the three freshest ---
assert.deepEqual(codes(pool), ["AVANTIFEED", "PAYTM", "PWL"]);
console.log("  ok  all three slots are the freshest reads, hero first");

// No clock dependence. Calling twice in one process would pass even for a
// day-index rotation, so freeze the clock on two different IST calendar days
// and demand the same three cards. A reintroduced rotation diverges here.
const onFrozenDay = (iso: string): string[] => {
  const RealDate = Date;
  const fixed = RealDate.parse(iso);
  class FrozenDate extends RealDate {
    constructor(...args: ConstructorParameters<typeof Date>) {
      super(...(args.length ? args : ([fixed] as unknown as ConstructorParameters<typeof Date>)));
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FrozenDate as DateConstructor;
  try {
    return codes(pool);
  } finally {
    globalThis.Date = RealDate;
  }
};
assert.deepEqual(
  onFrozenDay("2026-09-13T12:00:00Z"),
  onFrozenDay("2026-09-20T12:00:00Z"),
  "same pool, a week apart in IST, same cards",
);
assert.deepEqual(onFrozenDay("2026-09-20T12:00:00Z"), ["AVANTIFEED", "PAYTM", "PWL"]);
console.log("  ok  selection is a pure function of the pool, not of the date");

// --- weight never outranks recency ---
// TRANSRAILL carries the highest weight in the pool (68) and must still lose to
// three fresher reads: weight gates eligibility upstream, it does not promote.
assert.ok(!codes(pool).includes("TRANSRAILL"), "top weight does not jump the queue");
console.log("  ok  feature weight does not promote an older read over a newer one");

// Weight only breaks an exact recency tie.
const tied = [
  mk("LOW", "2026-09-12T00:00:00Z", 41),
  mk("HIGH", "2026-09-12T00:00:00Z", 99),
];
assert.deepEqual(codes(tied), ["HIGH", "LOW"]);
console.log("  ok  equal published_at falls back to weight");

// --- shape ---
assert.equal(codes(pool).length, FEATURED_SLOTS);
assert.deepEqual(codes([]), [], "empty pool renders nothing");
assert.deepEqual(codes([pool[1]]), ["AVANTIFEED"], "a single read is just the hero");
assert.deepEqual(
  codes([mk("A", "2026-09-12T00:00:00Z"), mk("B", "2026-09-11T00:00:00Z")]),
  ["A", "B"],
  "a short pool is returned whole, not padded",
);
assert.deepEqual(
  codes([
    mk("C", "2026-09-10T00:00:00Z"),
    mk("A", "2026-09-12T00:00:00Z"),
    mk("B", "2026-09-11T00:00:00Z"),
  ]),
  ["A", "B", "C"],
  "a pool of exactly FEATURED_SLOTS is sorted but not truncated",
);
console.log("  ok  returns at most FEATURED_SLOTS and degrades on a short pool");

// A missing or unparseable timestamp sorts last rather than throwing or winning
// on its weight. published_at is NOT NULL in the table, so null is defensive
// only — the row type allows it because the select is loosely typed.
assert.deepEqual(
  codes([mk("BAD", "not-a-date", 99), mk("GOOD", "2026-09-01T00:00:00Z", 40)]),
  ["GOOD", "BAD"],
  "unparseable",
);
assert.deepEqual(
  codes([mk("NULL", null as unknown as string, 99), mk("GOOD", "2026-09-01T00:00:00Z", 40)]),
  ["GOOD", "NULL"],
  "null",
);
assert.deepEqual(
  codes([mk("EMPTY", "", 99), mk("GOOD", "2026-09-01T00:00:00Z", 40)]),
  ["GOOD", "EMPTY"],
  "empty string",
);
console.log("  ok  a missing or malformed published_at sorts last");

// Postgres hands back "+00" offsets and the producer writes microseconds; both
// must parse, or a real row would sort as if it had no date at all.
assert.deepEqual(
  codes([
    mk("PG", "2026-09-14 05:00:00+00", 40),
    mk("MICROS", "2026-09-10T14:50:42.386272+00:00", 99),
  ]),
  ["PG", "MICROS"],
);
console.log("  ok  parses the timestamp shapes the table actually returns");

// A total tie (same published_at AND same weight) is decided by id, not by the
// order rows arrive in — Postgres guarantees no order among fully tied rows, so
// "keep the incoming order" would let hero and secondary swap between fetches.
// Hand them in reverse to prove id, not input order, decides.
const totalTie = [mk("SECOND", "2026-09-12T00:00:00Z", 60), mk("FIRST", "2026-09-12T00:00:00Z", 60)];
assert.deepEqual(codes(totalTie), ["FIRST", "SECOND"]);
assert.deepEqual(codes([...totalTie].reverse()), ["FIRST", "SECOND"], "input order irrelevant");
console.log("  ok  a total tie is decided by id, not by arrival order");

// --- the fetch order and the comparator are one contract ---
// data.ts drives its .order() calls from SELECTION_ORDER. The leading key is
// what keeps the freshest eligible rows inside READ_LIMIT, so reordering these
// (or flipping one to ascending) must fail a test, not silently un-lead the
// strip.
assert.deepEqual(
  SELECTION_ORDER.map((o) => [o.column, o.ascending]),
  [
    ["published_at", false],
    ["feature_weight", false],
    ["id", true],
  ],
  "recency leads (desc, or the fetch limit drops the freshest), weight then id break ties",
);
console.log("  ok  fetch order matches the selection comparator");

console.log("All desk featured selection tests passed.");
