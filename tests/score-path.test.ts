import assert from "node:assert/strict";

import { buildScorePath } from "../lib/score-path";

// quarterLabels arrive LATEST-FIRST (selectedQuarters[0] is newest). The
// sparkline reads left-to-right, so the path must come out oldest -> newest.
{
  const row = { "Q3 FY26": 8.2, "Q2 FY26": 7.7, "Q1 FY26": 7.1 };
  const labels = ["Q3 FY26", "Q2 FY26", "Q1 FY26"];
  const path = buildScorePath(row, labels);
  assert.deepEqual(
    path.map((p) => p.period),
    ["Q1 FY26", "Q2 FY26", "Q3 FY26"],
    "reverses latest-first labels to oldest-first path",
  );
  assert.deepEqual(path.map((p) => p.value), [7.1, 7.7, 8.2], "values track the reversed order");
}

// Non-numeric cells (missing quarter, unscored, stray string/NaN) become null
// IN PLACE — never dropped, so the x-axis gaps line up with reality.
{
  const row: Record<string, unknown> = { A: 5, B: null, C: "x", D: undefined, E: Number.NaN };
  const path = buildScorePath(row, ["E", "D", "C", "B", "A"]);
  assert.deepEqual(
    path.map((p) => p.value),
    [5, null, null, null, null],
    "only finite numbers survive; positions preserved",
  );
}

// No quarters -> empty path (new company); the sparkline renders its placeholder.
assert.deepEqual(buildScorePath({ A: 1 }, []), [], "no labels -> empty path");

console.log("score-path.test.ts ok");
