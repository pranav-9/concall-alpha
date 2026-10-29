import assert from "node:assert/strict";

import {
  RESEARCH_SLOTS,
  SELECTION_ORDER,
  selectResearchUpdates,
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
  image: null,
  pinnedUntilRaw: null,
});

// Most cases below were written against the three-slot strip; they hold for any
// slot count, so they keep three and the list's own size is checked on its own.
const SLOTS = 3;
const pick = (reads: FeaturedRead[], nowMs: number = Date.now()) => selectResearchUpdates(reads, nowMs, SLOTS);
const codes = (reads: FeaturedRead[]) => pick(reads).map((r) => r.companyCode);

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
pick(virgin);
assert.deepEqual(virgin.map((r) => r.companyCode), virginOrder, "input order preserved");
console.log("  ok  does not mutate the cached pool");

// --- the contract: every slot is the freshest, newest first ---
assert.deepEqual(codes(pool), ["AVANTIFEED", "PAYTM", "PWL"]);
console.log("  ok  every slot is a freshest read, newest first");

assert.equal(selectResearchUpdates(pool).length, RESEARCH_SLOTS, "the default is the list's size");
assert.deepEqual(
  selectResearchUpdates(pool).map((r) => r.companyCode),
  ["AVANTIFEED", "PAYTM", "PWL", "TRANSRAILL", "NETWEB", "KALYANKJIL", "ATHERENERG"],
);
console.log("  ok  the desk list holds RESEARCH_SLOTS rows by default");

// One row per company: a company's older card never takes a second slot.
assert.deepEqual(
  codes([mk("PAYTM", "2026-09-14T00:00:00Z"), mk("PAYTM", "2026-09-13T00:00:00Z"), mk("PWL", "2026-09-12T00:00:00Z")]),
  ["PAYTM", "PWL"],
);
console.log("  ok  one row per company, its newest card");

// Journal cards belong to the Journal block, not the research list.
assert.deepEqual(
  codes([{ ...mk("EMS", "2026-09-14T00:00:00Z"), section: "journal" }, mk("PWL", "2026-09-12T00:00:00Z")]),
  ["PWL"],
);
console.log("  ok  Journal cards are left to the Journal block");

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
assert.equal(codes(pool).length, SLOTS);
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
  "a pool of exactly the slot count is sorted but not truncated",
);
console.log("  ok  returns at most the slot count and degrades on a short pool");

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
// list.
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

// --- the editorial pin (2026-10-11): a live pin leads regardless of age ---
const NOW = Date.parse("2026-10-11T12:00:00Z");
const pin = (companyCode: string, publishedAtRaw: string, pinnedUntilRaw: string | null): FeaturedRead => ({
  ...mk(companyCode, publishedAtRaw, 80),
  id: `guidance-${companyCode}-2026-10-11`,
  pinnedUntilRaw,
});
const withPin = [...pool, pin("EMS", "2026-09-01T00:00:00Z", "2026-10-18T12:00:00Z")];
assert.deepEqual(
  pick(withPin, NOW).map((r) => r.companyCode),
  ["EMS", "AVANTIFEED", "PAYTM"],
  "a live pin leads; the freshest reads follow",
);
console.log("  ok  a live pin leads ahead of fresher reads");

assert.deepEqual(
  pick(withPin, Date.parse("2026-10-18T12:00:01Z")).map((r) => r.companyCode),
  ["AVANTIFEED", "PAYTM", "PWL"],
  "an expired pin is ordinary recency again (and here too old to show)",
);
console.log("  ok  an expired pin falls back to recency");

const unreadable = [...pool, pin("EMS", "2026-09-01T00:00:00Z", "not a date")];
assert.deepEqual(pick(unreadable, NOW).map((r) => r.companyCode), ["AVANTIFEED", "PAYTM", "PWL"]);
console.log("  ok  an unreadable pinned_until is no pin");

const twoPins = [
  ...pool,
  pin("OLDPIN", "2026-09-01T00:00:00Z", "2026-10-18T12:00:00Z"),
  pin("NEWPIN", "2026-09-05T00:00:00Z", "2026-10-18T12:00:00Z"),
];
assert.deepEqual(pick(twoPins, NOW).map((r) => r.companyCode), ["NEWPIN", "OLDPIN", "AVANTIFEED"]);
console.log("  ok  several live pins order by recency among themselves");

const pinnedVirgin = [pin("B", "2026-09-01T00:00:00Z", "2026-10-18T12:00:00Z"), mk("A", "2026-09-12T00:00:00Z")];
pick(pinnedVirgin, NOW);
assert.deepEqual(pinnedVirgin.map((r) => r.companyCode), ["B", "A"], "pin path does not mutate the pool either");
console.log("  ok  the pin path leaves the cached pool untouched");
