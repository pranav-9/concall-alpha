import assert from "node:assert/strict";

import { initials, signedArrow, signedColor } from "../components/mobile-card";

// initials: first letter of the first two words; a single word takes its first
// two letters; "&" is not a word.
assert.equal(initials(""), "", "empty name -> empty crest");
assert.equal(initials("&"), "", "ampersand alone -> empty crest");
assert.equal(initials("   "), "", "whitespace -> empty crest");
assert.equal(initials("A"), "A", "single letter -> that letter");
assert.equal(initials("Ethos"), "ET", "single word -> first two letters");
assert.equal(initials("L&T Finance"), "LT", "L&T splits on the ampersand");
assert.equal(initials("Tata & Sons"), "TS", "a standalone ampersand is skipped");
assert.equal(initials("ather energy"), "AE", "upper-cased");
assert.equal(initials("Garden Reach Shipbuilders & Engineers"), "GR", "only the first two words count");

// signedArrow / signedColor: sign, not magnitude.
assert.equal(signedArrow(2), "▲");
assert.equal(signedArrow(-0.1), "▼");
assert.equal(signedArrow(0), "•", "zero is a dot, not an arrow");
assert.equal(signedColor(0.5), "text-[var(--signal)]");
assert.equal(signedColor(-3), "text-[var(--alarm)]");
assert.equal(signedColor(0), "text-[var(--ink-soft)]", "zero is muted");

console.log("All mobile-card helper tests passed.");
