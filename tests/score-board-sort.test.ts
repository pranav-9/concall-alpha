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
    "moat",
    "checks",
    "guidance",
    "management",
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
      ["moat", "desc"],
      ["checks", "desc"],
      ["guidance", "desc"],
      ["management", "desc"],
    ],
  );
}

// The watchlist's categorical columns sort best-first on desc and pin a row
// without the signal last in both directions — the same null rule as a score.
{
  const withSignals = (code: string, signals: ScoreBoardRow["signals"]): ScoreBoardRow => ({
    ...row(code, { concall: 7, growth: 7, valuation: 5 }),
    signals,
  });
  const none = { moat: null, forensics: null, guidance: null, management: null };
  const rows = [
    withSignals("NAR", {
      ...none,
      moat: { rating: "narrow_moat", tier: "strong" },
      forensics: { clean: 5, watch: 3, flag: 1, assessed: 9 },
      guidance: { ambition: "ambitious", evidence: "thinly_evidenced" },
      management: { tier: "mixed", tierLabel: "Mixed", metCount: 2, countedCount: 4, verdictSource: "counted" },
    }),
    withSignals("WID", {
      ...none,
      moat: { rating: "wide_moat", tier: "mid" },
      forensics: { clean: 8, watch: 1, flag: 0, assessed: 9 },
      guidance: { ambition: "measured", evidence: "well_evidenced" },
      management: { tier: "reliable", tierLabel: "Reliable", metCount: 4, countedCount: 4, verdictSource: "counted" },
    }),
    withSignals("NON", none),
    withSignals("NOM", {
      ...none,
      moat: { rating: "no_moat", tier: null },
      forensics: { clean: 3, watch: 3, flag: 3, assessed: 9 },
      guidance: { ambition: "conservative", evidence: "partly_evidenced" },
      management: { tier: "low_trust", tierLabel: "Low trust", metCount: 1, countedCount: 4, verdictSource: "scored" },
    }),
  ];
  const derived = deriveRows(rows);
  const order = (key: SortKey, direction: "asc" | "desc") =>
    sortRows(derived, { key, direction }).map((r) => r.companyCode);
  assert.deepEqual(order("moat", "desc"), ["WID", "NAR", "NOM", "NON"], "wide > narrow > none; missing last");
  assert.deepEqual(order("moat", "asc"), ["NOM", "NAR", "WID", "NON"], "missing still last ascending");
  assert.deepEqual(order("checks", "desc"), ["WID", "NAR", "NOM", "NON"], "fewest flags first");
  assert.deepEqual(order("guidance", "desc"), ["WID", "NOM", "NAR", "NON"], "best-evidenced first");
  assert.deepEqual(order("management", "desc"), ["WID", "NAR", "NOM", "NON"], "tier first");
}

const universe = [
  row("AAA", { concall: 8.5, growth: 8.0, valuation: 6.0 }),
  row("BBB", { concall: 7.0, growth: 7.5, valuation: 5.0 }),
  row("CCC", { concall: 6.0, growth: 6.5, valuation: 9.0 }),
  row("DDD", { concall: null, growth: null, valuation: null }), // unscored → no Read
];

// Rank derivation: # follows Read across EVERY row — no coverage cut greys or
// pins anyone (removed 2026-11-21); an unscored row has no rank.
{
  const board = deriveRows(universe);
  const byCode = new Map(board.map((r) => [r.companyCode, r]));
  assert.equal(byCode.get("AAA")!.effectiveRank, 1);
  assert.equal(byCode.get("BBB")!.effectiveRank, 2);
  assert.equal(byCode.get("CCC")!.effectiveRank, 3);
  assert.equal(byCode.get("DDD")!.effectiveRank, Number.POSITIVE_INFINITY);
}

// An unranked row (no Read) sorts last on # in BOTH directions — "no rank", not
// "the worst rank".
{
  const board = deriveRows(universe);
  assert.deepEqual(
    sortRows(board, { key: "coverageRank", direction: "asc" }).map((r) => r.companyCode),
    ["AAA", "BBB", "CCC", "DDD"],
  );
  assert.deepEqual(
    sortRows(board, { key: "coverageRank", direction: "desc" }).map((r) => r.companyCode),
    ["CCC", "BBB", "AAA", "DDD"],
  );
}

// Several unranked rows tie on #: they stay last together and fall to the A-Z
// name tie-break in BOTH directions, whatever order they arrive in.
{
  const board = deriveRows([
    row("ZZZ", { concall: null, growth: null, valuation: null }, "Zeta Ltd"),
    ...universe,
    row("ABC", { concall: null, growth: null, valuation: null }, "Alpha Ltd"),
  ]);
  for (const direction of ["asc", "desc"] as const) {
    const codes = sortRows(board, { key: "coverageRank", direction }).map((r) => r.companyCode);
    assert.deepEqual(codes.slice(-3), ["ABC", "DDD", "ZZZ"], `${direction}: unranked rows last, A-Z by name`);
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
  const board = deriveRows(universe);
  const byRank = sortRows(board, { key: "coverageRank", direction: "asc" }).map((r) => r.companyCode);
  const byRead = sortRows(board, { key: "read", direction: "desc" }).map((r) => r.companyCode);
  assert.deepEqual(byRank.slice(0, 3), byRead.slice(0, 3));
}

console.log("score-board-sort: all assertions passed");
