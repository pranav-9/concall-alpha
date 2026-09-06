import assert from "node:assert/strict";

import { hasAnyNumericValue } from "../lib/business-snapshot/has-any-numeric-value";

type Row = { name: string; byYear: Record<string, number | null> };
const pick = (row: Row) => row.byYear;
const years = ["FY25", "FY26"];

// All-null grid → false (this is the "table of dashes" case the guard exists for).
assert.equal(
  hasAnyNumericValue(
    [
      { name: "Prime", byYear: { FY25: null, FY26: null } },
      { name: "CMS", byYear: { FY25: null, FY26: null } },
    ],
    years,
    pick,
  ),
  false,
);

// One finite number anywhere → true.
assert.equal(
  hasAnyNumericValue(
    [
      { name: "Prime", byYear: { FY25: null, FY26: null } },
      { name: "CMS", byYear: { FY25: null, FY26: 156.7 } },
    ],
    years,
    pick,
  ),
  true,
);

// Zero is a value.
assert.equal(hasAnyNumericValue([{ name: "x", byYear: { FY25: 0 } }], years, pick), true);

// NaN is not a value (typeof NaN === "number" would have passed a naive check).
assert.equal(hasAnyNumericValue([{ name: "x", byYear: { FY25: Number.NaN } }], years, pick), false);

// A value in a period that is not displayed does not count.
assert.equal(hasAnyNumericValue([{ name: "x", byYear: { FY24: 10 } }], years, pick), false);

// Empty rows or empty periods → false.
assert.equal(hasAnyNumericValue([], years, pick), false);
assert.equal(hasAnyNumericValue([{ name: "x", byYear: { FY25: 1 } }], [], pick), false);

console.log("has-any-numeric-value: all assertions passed");
