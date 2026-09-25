import assert from "node:assert/strict";

import {
  daysAgo,
  isFresh,
  istToday,
  relativeDayLabel,
  shortDateLabel,
  weekGroup,
  weekRanges,
} from "../app/blog/dates";

assert.equal(shortDateLabel("2026-09-21", "x"), "21 Sep 2026");
assert.equal(shortDateLabel("2026-01-05", "x"), "5 Jan 2026", "no zero-padding on the day");
assert.equal(shortDateLabel("2026-12-31T00:00:00", "x"), "31 Dec 2026", "tolerates a time suffix");
assert.equal(shortDateLabel("not-a-date", "21 September 2026"), "21 September 2026", "falls back to the label");
assert.equal(shortDateLabel("2026-13-01", "fallback"), "fallback", "bad month → fallback");
assert.equal(shortDateLabel("2026-09-40", "fallback"), "fallback", "bad day → fallback");
console.log("blog-dates: ok");
assert.equal(shortDateLabel("2026-00-10", "fallback"), "fallback", "month 00 → fallback");
assert.equal(shortDateLabel("2026-09-00", "fallback"), "fallback", "day 00 → fallback");
assert.equal(shortDateLabel("", "fallback"), "fallback", "missing frontmatter date → fallback");
assert.equal(shortDateLabel("2026-02-31", "fallback"), "fallback", "calendar-impossible day → fallback");
assert.equal(shortDateLabel("2024-02-29", "x"), "29 Feb 2024", "leap day is real");
assert.equal(shortDateLabel("2026-02-29", "fallback"), "fallback", "non-leap Feb 29 → fallback");
console.log("blog-dates boundaries: ok");
assert.equal(shortDateLabel("2026-09-21garbage", "fallback"), "fallback", "trailing garbage → fallback");
assert.equal(shortDateLabel("2026-09-21T10:00:00Z", "x"), "21 Sep 2026", "time part still accepted");
console.log("blog-dates suffixes: ok");

// --- IST relative dates (2026-09-25 is a Friday; the week starts Mon 21 Sep)
assert.equal(istToday(new Date("2026-09-24T18:29:00Z")), "2026-09-24", "23:59 IST is still the 24th");
assert.equal(istToday(new Date("2026-09-24T18:30:00Z")), "2026-09-25", "00:00 IST is the 25th");
assert.equal(daysAgo("2026-09-20", "2026-09-25"), 5);
assert.equal(daysAgo("bad", "2026-09-25"), null);
assert.equal(relativeDayLabel("2026-09-25", "x", "2026-09-25"), "Today");
assert.equal(relativeDayLabel("2026-09-24", "x", "2026-09-25"), "Yesterday");
assert.equal(relativeDayLabel("2026-09-18", "x", "2026-09-25"), "7 days ago");
assert.equal(relativeDayLabel("2026-09-17", "x", "2026-09-25"), "17 Sep 2026", "past a week → absolute");
assert.equal(relativeDayLabel("2026-09-26", "x", "2026-09-25"), "26 Sep 2026", "future-dated → absolute");
assert.equal(isFresh("2026-09-24", "2026-09-25"), true);
assert.equal(isFresh("2026-09-23", "2026-09-25"), false);
assert.equal(weekGroup("2026-09-21", "2026-09-25"), "this", "Monday opens this week");
assert.equal(weekGroup("2026-09-20", "2026-09-25"), "last");
assert.equal(weekGroup("2026-09-14", "2026-09-25"), "last");
assert.equal(weekGroup("2026-09-13", "2026-09-25"), "earlier");
assert.equal(weekGroup("2026-09-20", "2026-09-20"), "this", "on a Sunday the week is Mon–Sun");
assert.deepEqual(weekRanges("2026-09-25"), {
  this: "21 Sep – 25 Sep",
  last: "14 Sep – 20 Sep",
  earlier: "Before 14 Sep",
});
assert.equal(weekRanges("2026-09-21").this, "21 Sep", "a Monday's week is one day");
console.log("blog-dates relative: ok");
