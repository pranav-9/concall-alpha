import assert from "node:assert/strict";

import { selectMostViewed, type CoveredInfo } from "../lib/desk-most-viewed";
import type { DeskRow } from "../lib/desk-leaderboard";

// Minimal DeskRow builder for the enrichment map.
const mkRow = (over: Partial<DeskRow> & { code: string }): DeskRow => ({
  name: over.code,
  sector: null,
  isNew: false,
  latestScore: null,
  delta: null,
  twistPct: null,
  sparkPoints: [],
  filedRaw: null,
  moatLabel: null,
  growthLabel: null,
  growthDownside: null,
  growthUpside: null,
  growthScore: null,
  ...over,
});

const covered = (entries: [string, CoveredInfo][]) =>
  new Map<string, CoveredInfo>(entries);

// Baseline covered universe used by most cases (keyed uppercase, as fetchCoverage stores).
const base = covered([
  ["AAA", { name: "Alpha Ltd", sector: "Tech" }],
  ["BBB", { name: "Beta Ltd", sector: "Auto" }],
  ["CCC", { name: "Gamma Ltd", sector: "Pharma" }],
  ["DDD", { name: "Delta Ltd", sector: "Bank" }],
]);

// 1. Order is the RPC/popularity order, not alphabetical or score-sorted.
{
  const out = selectMostViewed({
    orderedCodes: ["CCC", "AAA", "BBB"],
    coveredByCode: base,
    excludedKeys: new Set(),
    rowByCode: new Map([
      ["AAA", mkRow({ code: "AAA", latestScore: 9 })],
      ["BBB", mkRow({ code: "BBB", latestScore: 1 })],
      ["CCC", mkRow({ code: "CCC", latestScore: 5 })],
    ]),
    limit: 8,
  });
  assert.deepEqual(
    out.map((r) => r.code),
    ["CCC", "AAA", "BBB"],
    "order must follow orderedCodes",
  );
}

// 2. Off-discovery codes (in excludedKeys) are dropped.
{
  const out = selectMostViewed({
    orderedCodes: ["AAA", "BBB", "CCC"],
    coveredByCode: base,
    excludedKeys: new Set(["BBB"]),
    rowByCode: new Map(),
    limit: 8,
  });
  assert.deepEqual(
    out.map((r) => r.code),
    ["AAA", "CCC"],
    "excludedKeys code must not appear",
  );
}

// 3. Unknown/fake codes (not covered) are dropped.
{
  const out = selectMostViewed({
    orderedCodes: ["ZZZ", "AAA", "FAKE"],
    coveredByCode: base,
    excludedKeys: new Set(),
    rowByCode: new Map(),
    limit: 8,
  });
  assert.deepEqual(
    out.map((r) => r.code),
    ["AAA"],
    "codes absent from coveredByCode must drop",
  );
}

// 4. Covered-but-unscored (in coverage, not in rowByCode) still appears, no score.
{
  const out = selectMostViewed({
    orderedCodes: ["DDD"],
    coveredByCode: base,
    excludedKeys: new Set(),
    rowByCode: new Map(), // no concall enrichment
    limit: 8,
  });
  assert.equal(out.length, 1, "covered-but-unscored company must appear");
  assert.equal(out[0].code, "DDD");
  assert.equal(out[0].name, "Delta Ltd", "falls back to coverage name");
  assert.equal(out[0].latestScore, null, "no score chip when unscored");
}

// 4b. Enrichment wins when present (score + name from the concall row).
{
  const out = selectMostViewed({
    orderedCodes: ["AAA"],
    coveredByCode: base,
    excludedKeys: new Set(),
    rowByCode: new Map([["AAA", mkRow({ code: "AAA", name: "Alpha", latestScore: 7 })]]),
    limit: 8,
  });
  assert.equal(out[0].latestScore, 7, "uses enriched score");
}

// 5. Limit is respected.
{
  const out = selectMostViewed({
    orderedCodes: ["AAA", "BBB", "CCC", "DDD"],
    coveredByCode: base,
    excludedKeys: new Set(),
    rowByCode: new Map(),
    limit: 2,
  });
  assert.equal(out.length, 2, "must slice to limit");
  assert.deepEqual(out.map((r) => r.code), ["AAA", "BBB"]);
}

// 6. Empty input (the RPC fail-soft path) → empty output.
{
  const out = selectMostViewed({
    orderedCodes: [],
    coveredByCode: base,
    excludedKeys: new Set(),
    rowByCode: new Map(),
    limit: 8,
  });
  assert.deepEqual(out, [], "empty in → empty out");
}

// 7. Duplicate codes are de-duped (defensive: never list a company twice).
{
  const out = selectMostViewed({
    orderedCodes: ["AAA", "AAA", "BBB"],
    coveredByCode: base,
    excludedKeys: new Set(),
    rowByCode: new Map(),
    limit: 8,
  });
  assert.deepEqual(out.map((r) => r.code), ["AAA", "BBB"], "no duplicate rows");
}

// Case-insensitive lookup: RPC may hand back mixed case; coverage keys are upper.
{
  const out = selectMostViewed({
    orderedCodes: ["aaa"],
    coveredByCode: base,
    excludedKeys: new Set(),
    rowByCode: new Map(),
    limit: 8,
  });
  assert.equal(out.length, 1, "lowercase code resolves against uppercase coverage keys");
}

console.log("desk-most-viewed: all assertions passed");
