import assert from "node:assert/strict";

import { splitVisionLabel } from "../lib/guidance-snapshot/vision-label";

// The long-term card sets `name` as its hero and leads the body with `detail`.
// Every case below is a vision_label stored on a live guidance_snapshot row.

// Nothing to show.
assert.equal(splitVisionLabel(null), null);
assert.equal(splitVisionLabel("   "), null);

// A quoted name on its own.
assert.deepEqual(splitVisionLabel("'Advait 2030'"), { name: "Advait 2030", detail: null, quoted: true });

// A quoted name, then what it stands for — colon or dash.
assert.deepEqual(splitVisionLabel("'Vision 2030': Rs. 2,500 crores by FY30"), {
  name: "Vision 2030",
  detail: "Rs. 2,500 crores by FY30",
  quoted: true,
});
assert.deepEqual(splitVisionLabel("'Vision 2030' — over 2 MTPA finished capacity"), {
  name: "Vision 2030",
  detail: "Over 2 MTPA finished capacity",
  quoted: true,
});

// An unquoted "Vision 2030"-style title is still the company's coinage.
assert.deepEqual(splitVisionLabel("Vision 2030"), { name: "Vision 2030", detail: null, quoted: true });
assert.deepEqual(splitVisionLabel("Vision 2030: $1 bn revenue, 25 GW"), {
  name: "Vision 2030",
  detail: "$1 bn revenue, 25 GW",
  quoted: true,
});

// A short unquoted name before a separator splits, without quote marks.
assert.deepEqual(splitVisionLabel("FY30 roadmap: Products INR1,000cr+, Aerospace INR600-700cr"), {
  name: "FY30 roadmap",
  detail: "Products INR1,000cr+, Aerospace INR600-700cr",
  quoted: false,
});

// A ratio's colon and a range's hyphen are not separators.
assert.deepEqual(splitVisionLabel("5k:1k — Rs 5,000cr / Rs 1,000cr+ EBITDA by FY29-30"), {
  name: "5k:1k",
  detail: "Rs 5,000cr / Rs 1,000cr+ EBITDA by FY29-30",
  quoted: false,
});
assert.deepEqual(splitVisionLabel("Rs 10,000 cr revenue by FY29-FY31"), {
  name: "Rs 10,000 cr revenue by FY29-FY31",
  detail: null,
  quoted: false,
});

// A trailing parenthetical moves to the detail.
assert.deepEqual(splitVisionLabel("$350-400mn revenue in FY31 (~3x FY26)"), {
  name: "$350-400mn revenue in FY31",
  detail: "~3x FY26",
  quoted: false,
});
assert.deepEqual(splitVisionLabel("18-20% a year over five years (aspiration, not guidance)"), {
  name: "18-20% a year over five years",
  detail: "Aspiration, not guidance",
  quoted: false,
});

// A quote mark in the middle of a label is not a leading name.
assert.deepEqual(splitVisionLabel("₹1,000cr revenue 'journey' (~3x FY26)"), {
  name: "₹1,000cr revenue 'journey'",
  detail: "~3x FY26",
  quoted: false,
});

// A long clause before a separator stays whole.
assert.deepEqual(splitVisionLabel("Double the B2B base over 3-5 years; ~100 ORIGEM stores"), {
  name: "Double the B2B base over 3-5 years; ~100 ORIGEM stores",
  detail: null,
  quoted: false,
});

console.log("guidance-vision-label: ok");
