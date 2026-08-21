import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  GROWTH_BANDS,
  GROWTH_BAND_ORDER,
  bandForGrowthScore,
  type GrowthBandKey,
} from "../lib/growth-band";

// Cross-repo contract: tests/fixtures/growth-band-cuts.json is the ONE place the
// growth-band lower cuts live. concallyser/scripts/recompute_growth_scores.py
// loads the same file for its band-split report (pinned by its pytest), so a
// retune that edits only one side fails a test on the other. Same pattern as
// composite-score-cross-impl.json for the composite formula.
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/growth-band-cuts.json", import.meta.url), "utf8"),
) as Array<[GrowthBandKey, number]>;

assert.equal(fixture.length, 5, "fixture carries the five lower cuts (weak is the open tail)");

// Descending, strictly.
for (let i = 1; i < fixture.length; i += 1) {
  assert.ok(fixture[i - 1][1] > fixture[i][1], `cuts must descend: ${fixture[i - 1][0]} > ${fixture[i][0]}`);
}

// Fixture order mirrors GROWTH_BAND_ORDER minus the open "weak" tail.
assert.deepEqual(
  fixture.map(([key]) => key),
  GROWTH_BAND_ORDER.filter((key) => key !== "weak"),
);

// bandForGrowthScore honours each cut exactly at the boundary and just below it.
for (let i = 0; i < fixture.length; i += 1) {
  const [key, cut] = fixture[i];
  assert.equal(bandForGrowthScore(cut), key, `score == ${cut} lands in ${key}`);
  const below = Math.round((cut - 0.1) * 10) / 10;
  const expectedBelow: GrowthBandKey = i + 1 < fixture.length ? fixture[i + 1][0] : "weak";
  assert.equal(bandForGrowthScore(below), expectedBelow, `score ${below} lands in ${expectedBelow}`);
}

// The human-readable descriptions on GROWTH_BANDS start with the same cut.
for (const [key, cut] of fixture) {
  const description = GROWTH_BANDS[key].description;
  assert.ok(
    description.startsWith(`≥ ${cut}`) || description.startsWith(`${cut.toFixed(1)} –`),
    `${key} description "${description}" must lead with its lower cut ${cut}`,
  );
}
assert.equal(GROWTH_BANDS.weak.description, `< ${fixture[fixture.length - 1][1].toFixed(1)}`);

console.log("growth-band-cuts: all assertions passed");
