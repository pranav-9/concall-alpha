import assert from "node:assert/strict";

import {
  buildFilingHistory,
  categoryChips,
  defaultTapeFilter,
  deriveActivity,
  fiscalQuarterFromIndex,
  fiscalQuarterOf,
  historyHeadline,
  matchesTapeFilter,
  quarterHeadline,
  scaleLine,
  tierOf,
  windowRows,
  type HistorySlot,
} from "../lib/announcement-tape";
import type { ExchangeCategory, ExchangeImpact } from "../lib/exchange-desk/types";

const NOW = new Date("2026-10-03T06:00:00Z");

const row = (filedRaw: string, impact: ExchangeImpact = "neutral", category: ExchangeCategory = "business_update") => ({
  filedRaw,
  impact,
  category,
});

// --- fiscal quarters (April–March, read in IST) ---
assert.equal(fiscalQuarterOf("2026-10-02T10:00:00+05:30")?.label, "Q3 FY27");
assert.equal(fiscalQuarterOf("2026-09-30T10:00:00+05:30")?.label, "Q2 FY27");
assert.equal(fiscalQuarterOf("2026-05-16T23:12:13+00:00")?.label, "Q1 FY27");
assert.equal(fiscalQuarterOf("2026-03-31T10:00:00+05:30")?.label, "Q4 FY26");
assert.equal(fiscalQuarterOf("2026-01-01T10:00:00+05:30")?.label, "Q4 FY26");
// 19:30 UTC on 30 June is 01:00 IST on 1 July — Q2, not Q1.
assert.equal(fiscalQuarterOf("2026-06-30T19:30:00Z")?.label, "Q2 FY27");
assert.equal(fiscalQuarterOf("not a date"), null);

const q3 = fiscalQuarterOf(NOW)!;
assert.deepEqual(
  [q3.startDate, q3.endDate, q3.key],
  ["2026-10-01", "2026-12-31", "FY27Q3"],
);
assert.equal(fiscalQuarterFromIndex(q3.index - 1).label, "Q2 FY27");
assert.deepEqual(
  [fiscalQuarterFromIndex(q3.index - 3).label, fiscalQuarterFromIndex(q3.index - 3).startDate, fiscalQuarterFromIndex(q3.index - 3).endDate],
  ["Q4 FY26", "2026-01-01", "2026-03-31"],
);
assert.equal(fiscalQuarterFromIndex(q3.index - 2).endDate, "2026-06-30");

// --- tiers ---
assert.equal(tierOf("severe"), "negative");
assert.equal(tierOf("neutral"), "routine");

// --- history slots: young archive pads to four, marks partial / before-record ---
const updates = [
  row("2026-10-02T10:00:00+05:30", "positive", "order_win"),
  row("2026-09-02T10:00:00+05:30", "positive", "fundraise"),
  row("2026-08-14T10:00:00+05:30", "transformative", "order_win"),
  row("2026-07-22T10:00:00+05:30", "positive", "order_win"),
  row("2026-07-10T10:00:00+05:30", "negative", "rating"),
  row("2026-07-05T10:00:00+05:30", "neutral"),
  row("2026-06-24T10:00:00+05:30", "positive", "product_approval"),
  row("2026-05-20T10:00:00+05:30", "severe"),
  row("2027-01-01T10:00:00+05:30", "positive"), // future-dated: ignored
];
const slots = buildFilingHistory(updates, NOW);
assert.deepEqual(slots.map((s) => s.label), ["Q4 FY26", "Q1 FY27", "Q2 FY27", "Q3 FY27"]);
assert.deepEqual(slots.map((s) => s.total), [0, 2, 5, 1]);
assert.deepEqual(slots.map((s) => s.beforeRecord), [true, false, false, false]);
assert.deepEqual(slots.map((s) => s.partial), [false, true, false, false]);
assert.deepEqual(slots.map((s) => s.current), [false, false, false, true]);
assert.deepEqual(slots[2].counts, { transformative: 1, positive: 2, routine: 1, negative: 1 });
assert.equal(slots[1].counts.negative, 1); // severe folds into negative

// A backfilled row before the record start fills its slot instead of reading "before record".
const backfilled = buildFilingHistory([...updates, row("2026-02-10T10:00:00+05:30", "positive")], NOW);
assert.equal(backfilled[0].label, "Q4 FY26");
assert.equal(backfilled[0].beforeRecord, false);
// Capped at eight slots however old the oldest row is.
assert.equal(buildFilingHistory([row("2020-02-10T10:00:00+05:30")], NOW).length, 8);
assert.equal(buildFilingHistory([], NOW).length, 4);

// --- history headline ---
// One complete quarter only → the plain tally.
assert.equal(historyHeadline(slots), "8 filings since May 2026: 5 good news, 2 adverse.");
assert.equal(historyHeadline(buildFilingHistory([], NOW)), "No material filings since May 2026.");
assert.equal(
  historyHeadline(buildFilingHistory([row("2026-08-01T10:00:00+05:30"), row("2026-08-02T10:00:00+05:30")], NOW)),
  "2 filings since May 2026, all routine.",
);

const slot = (label: string, total: number, good: number, flags: Partial<HistorySlot> = {}): HistorySlot => ({
  key: label,
  label,
  index: 0,
  counts: { transformative: 0, positive: good, routine: total - good, negative: 0 },
  total,
  current: false,
  partial: false,
  beforeRecord: false,
  ...flags,
});
const mature = [slot("a", 4, 1), slot("b", 4, 1), slot("c", 8, 6), slot("d", 1, 1, { current: true })];
assert.equal(historyHeadline(mature), "A busier quarter than usual, and more of it was good news.");
assert.equal(
  historyHeadline([slot("a", 8, 4), slot("b", 8, 4), slot("c", 2, 0), slot("d", 0, 0, { current: true })]),
  "A quieter quarter than usual, and more of it was routine.",
);
assert.equal(
  historyHeadline([slot("a", 5, 2), slot("b", 5, 2), slot("d", 0, 0, { current: true })]),
  "A steady tape, quarter on quarter, with a similar mix.",
);

// --- quarter headline ---
// One complete quarter on record is not enough for a pace claim.
assert.equal(quarterHeadline("order_led", 7, slots), "Orders did most of the talking.");
assert.equal(quarterHeadline("order_led", 9, mature), "Busiest stretch on record, and orders did most of the talking.");
assert.equal(quarterHeadline("routine", 2, mature), "A quieter stretch than usual, and none of it moved the needle.");
assert.equal(quarterHeadline("deal_making", 5, mature), "A typical stretch, and deals did most of the talking.");
assert.equal(quarterHeadline("mixed", 5, mature), "A typical stretch, with no single theme.");
// No complete quarter on record → the activity clause alone.
assert.equal(
  quarterHeadline("mixed", 3, buildFilingHistory([row("2026-10-02T10:00:00+05:30")], NOW).map((s) => ({ ...s, partial: true }))),
  "A mixed tape, with no single theme.",
);

// --- fallback facts mirror the producer's rules ---
const windowed = windowRows(updates, NOW);
assert.equal(windowed.length, 5); // 5 Jul is the cutoff day; the future row is out
assert.equal(deriveActivity(windowed), "order_led");
assert.equal(deriveActivity([row("x", "neutral"), row("x", "neutral", "capex")]), "routine");
assert.equal(deriveActivity([row("x", "negative", "rating")]), "mixed");
assert.equal(deriveActivity([row("x", "positive", "ma"), row("x", "positive", "capex"), row("x", "positive", "fundraise")]), "mixed");
assert.deepEqual(categoryChips(windowed), [
  { label: "Orders", value: "3", detail: null },
  { label: "Fundraising", value: "1", detail: null },
]);

// --- tape filter ---
assert.equal(defaultTapeFilter(updates), "non_neutral");
assert.equal(defaultTapeFilter(updates.slice(0, 3)), "all");
assert.equal(matchesTapeFilter("neutral", "non_neutral"), false);
assert.equal(matchesTapeFilter("severe", "non_neutral"), true);
assert.equal(matchesTapeFilter("positive", "negative"), false);

// --- scale line ---
assert.equal(
  scaleLine(
    {
      valueCr: 410,
      valueLabel: "₹410 cr",
      valueBasis: "order value",
      basisLabel: "FY26 revenue",
      basisValueLabel: "₹500 cr",
      ratioPct: 82,
      ratioLabel: "≈ 82% of FY26 revenue",
    },
    { pctOfMcap: 18, softness: null },
  ),
  "₹410 cr, ≈ 82% of FY26 revenue, 18% of market cap",
);
assert.equal(scaleLine(null, { pctOfMcap: 27, softness: "framework" }), "27% of market cap · framework");
assert.equal(scaleLine(null, null), null);

console.log("announcement-tape: ok");
