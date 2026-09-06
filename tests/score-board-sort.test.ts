import assert from "node:assert/strict";

import {
  defaultDirectionForKey,
  deriveRows,
  sortRows,
  type ScoreBoardRow,
  type SortKey,
} from "../lib/score-board-sort";

const row = (
  code: string,
  legs: { concall: number | null; growth: number | null; valuation: number | null },
  name = `${code} Ltd`,
): ScoreBoardRow => ({
  companyCode: code,
  companyName: name,
  concallScore: legs.concall,
  fourConcallScore: legs.concall,
  latestConcallScore: legs.concall,
  latestQuarterLabel: "Q1 FY27",
  growthScore: legs.growth,
  valuationScore: legs.valuation,
  belowCut: false,
});

// Default directions: rank and name open ascending, every score opens descending.
{
  const keys: SortKey[] = [
    "coverageRank",
    "companyName",
    "latestScore",
    "fourQScore",
    "growthScore",
    "valuationScore",
    "read",
  ];
  assert.deepEqual(
    keys.map((k) => [k, defaultDirectionForKey(k)]),
    [
      ["coverageRank", "asc"],
      ["companyName", "asc"],
      ["latestScore", "desc"],
      ["fourQScore", "desc"],
      ["growthScore", "desc"],
      ["valuationScore", "desc"],
      ["read", "desc"],
    ],
  );
}

const universe = [
  row("AAA", { concall: 8.5, growth: 8.0, valuation: 6.0 }),
  row("BBB", { concall: 7.0, growth: 7.5, valuation: 5.0 }),
  row("CCC", { concall: 6.0, growth: 6.5, valuation: 9.0 }),
  row("DDD", { concall: null, growth: null, valuation: null }), // unscored → no Read
];

// Rank derivation: # follows Read; an unscored row has no rank and greys when
// a coverage cut is supplied (the leaderboard), never on a watchlist.
{
  const board = deriveRows(universe, 2);
  const byCode = new Map(board.map((r) => [r.companyCode, r]));
  assert.equal(byCode.get("AAA")!.effectiveRank, 1);
  assert.equal(byCode.get("BBB")!.effectiveRank, 2);
  assert.equal(byCode.get("CCC")!.effectiveRank, 3);
  assert.equal(byCode.get("DDD")!.effectiveRank, Number.POSITIVE_INFINITY);
  assert.deepEqual(
    board.map((r) => [r.companyCode, r.dim]).sort(),
    [
      ["AAA", false],
      ["BBB", false],
      ["CCC", true],
      ["DDD", true],
    ],
    "rank 3 sits past a cut of 2 → dim; unranked → dim",
  );

  const watchlist = deriveRows(universe);
  assert.ok(watchlist.every((r) => r.dim === false), "no coverageCutRank → nothing greys");
}

// Greyed rows pin to the bottom under EVERY sort key and direction.
{
  const board = deriveRows(universe, 2);
  const keys: SortKey[] = ["coverageRank", "companyName", "latestScore", "growthScore", "valuationScore", "read"];
  for (const key of keys) {
    for (const direction of ["asc", "desc"] as const) {
      const codes = sortRows(board, { key, direction }).map((r) => r.companyCode);
      assert.deepEqual(codes.slice(2).sort(), ["CCC", "DDD"], `${key} ${direction}: dim rows last`);
    }
  }
}

// Null scores sort last in BOTH directions (null is "unknown", not zero).
{
  const rows = deriveRows([
    row("HI", { concall: 9, growth: 9, valuation: null }),
    row("LO", { concall: 5, growth: 5, valuation: 2 }),
    row("MID", { concall: 7, growth: 7, valuation: 6 }),
  ]);
  assert.deepEqual(
    sortRows(rows, { key: "valuationScore", direction: "desc" }).map((r) => r.companyCode),
    ["MID", "LO", "HI"],
  );
  assert.deepEqual(
    sortRows(rows, { key: "valuationScore", direction: "asc" }).map((r) => r.companyCode),
    ["LO", "MID", "HI"],
  );
}

// Company sort is case-insensitive and ties break on code.
{
  const rows = deriveRows([
    row("Z1", { concall: 7, growth: 7, valuation: 7 }, "alpha Industries"),
    row("A1", { concall: 7, growth: 7, valuation: 7 }, "Alpha Industries"),
    row("B1", { concall: 7, growth: 7, valuation: 7 }, "Beta Ltd"),
  ]);
  assert.deepEqual(
    sortRows(rows, { key: "companyName", direction: "asc" }).map((r) => r.companyCode),
    ["A1", "Z1", "B1"],
  );
}

// Default sort (coverageRank asc) == Read desc for the ranked block.
{
  const board = deriveRows(universe, 100);
  const byRank = sortRows(board, { key: "coverageRank", direction: "asc" }).map((r) => r.companyCode);
  const byRead = sortRows(board, { key: "read", direction: "desc" }).map((r) => r.companyCode);
  assert.deepEqual(byRank.slice(0, 3), byRead.slice(0, 3));
}

console.log("score-board-sort: all assertions passed");
