import assert from "node:assert/strict";

import { clampHotness, formatInFocusUpdated } from "../lib/in-focus";
import { themeRowSchema } from "../lib/themes/types";

// clampHotness: null passes through; out-of-range clamps; fractions round.
assert.equal(clampHotness(null), null, "null -> null (no meter)");
assert.equal(clampHotness(undefined), null, "undefined -> null");
assert.equal(clampHotness(0), 1, "0 clamps up to 1");
assert.equal(clampHotness(6), 5, "6 clamps down to 5");
assert.equal(clampHotness(3.4), 3, "3.4 rounds to 3");
assert.equal(clampHotness(4.6), 5, "4.6 rounds to 5");
assert.equal(clampHotness(2), 2, "2 stays 2");

// formatInFocusUpdated: empty/invalid -> undefined; valid ISO -> a non-empty string.
assert.equal(formatInFocusUpdated(null), undefined, "null date -> undefined");
assert.equal(formatInFocusUpdated(""), undefined, "empty date -> undefined");
assert.equal(formatInFocusUpdated("not-a-date"), undefined, "garbage date -> undefined");
assert.ok(
  (formatInFocusUpdated("2026-08-30T00:00:00Z") ?? "").length > 0,
  "valid ISO -> formatted string",
);

// themeRowSchema hotness is fail-open: an out-of-range value coerces to null
// (renders no meter) rather than failing the row and vanishing the theme.
function parseHotness(h: unknown): number | null | undefined {
  const row = themeRowSchema.parse({
    slug: "t",
    title: "T",
    is_featured: true,
    sort: 0,
    hotness: h,
  });
  return row.hotness;
}
assert.equal(parseHotness(3), 3, "valid 3 kept");
assert.equal(parseHotness(1), 1, "valid 1 kept");
assert.equal(parseHotness(5), 5, "valid 5 kept");
assert.equal(parseHotness(null), null, "null kept");
assert.equal(parseHotness(0), null, "0 -> null (fail-open, not a dropped row)");
assert.equal(parseHotness(6), null, "6 -> null (fail-open)");
assert.equal(parseHotness(1.5), null, "1.5 -> null (fail-open)");

// A bad hotness must NOT drop the whole theme row.
const row = themeRowSchema.safeParse({
  slug: "t",
  title: "T",
  is_featured: true,
  sort: 0,
  hotness: 99,
});
assert.equal(row.success, true, "row still parses with an out-of-range hotness");

console.log("in-focus: all assertions passed");
