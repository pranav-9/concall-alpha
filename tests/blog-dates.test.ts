import assert from "node:assert/strict";

import { shortDateLabel } from "../app/blog/dates";

assert.equal(shortDateLabel("2026-09-21", "x"), "21 Sep 2026");
assert.equal(shortDateLabel("2026-01-05", "x"), "5 Jan 2026", "no zero-padding on the day");
assert.equal(shortDateLabel("2026-12-31T00:00:00", "x"), "31 Dec 2026", "tolerates a time suffix");
assert.equal(shortDateLabel("not-a-date", "21 September 2026"), "21 September 2026", "falls back to the label");
assert.equal(shortDateLabel("2026-13-01", "fallback"), "fallback", "bad month → fallback");
assert.equal(shortDateLabel("2026-09-40", "fallback"), "fallback", "bad day → fallback");
console.log("blog-dates: ok");
