import assert from "node:assert/strict";

import { boardShareLabel } from "../lib/board-share";

// The company page's "Where it sits" chip. With the coverage cut gone (2026-11-21)
// every company is ranked, so the chip must not wear a positive "Top N%" for the
// bottom of the board: a company ranked 185th of 190 is not "Top 97%".

// Top half: "Top N%", positive.
assert.deepEqual(boardShareLabel(1, 190), { label: "Top 1%", topHalf: true });
assert.deepEqual(boardShareLabel(11, 81), { label: "Top 14%", topHalf: true }, "the original rank 11/81 example");
assert.deepEqual(boardShareLabel(95, 190), { label: "Top 50%", topHalf: true }, "exactly half is still the top half");

// Bottom half: "Bottom N%" = the share of the board at or below it, muted.
assert.deepEqual(boardShareLabel(96, 190), { label: "Bottom 50%", topHalf: false });
assert.deepEqual(boardShareLabel(185, 190), { label: "Bottom 3%", topHalf: false });
assert.deepEqual(boardShareLabel(190, 190), { label: "Bottom 1%", topHalf: false }, "last place never reads 0%");
assert.doesNotMatch(boardShareLabel(185, 190).label, /^Top /, "a near-bottom company never wears 'Top'");

// A one-company board is the top.
assert.deepEqual(boardShareLabel(1, 1), { label: "Top 100%", topHalf: true });

console.log("board-share-label: ok");
