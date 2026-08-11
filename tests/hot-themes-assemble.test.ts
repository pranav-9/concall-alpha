import assert from "node:assert/strict";

import { assembleThemeBlocks } from "../lib/themes/assemble";
import type { ThemeMembershipRow, ThemeRow } from "../lib/themes/types";
import type { ScoreBoardRow } from "../components/score-board-table";

// Minimal board row. quarter+growth+valuation present -> classifyBoardRead yields
// a non-null Read; quarter null -> no read (notYetScored).
function boardRow(
  companyCode: string,
  companyName: string,
  quarterScore: number | null,
  growthScore: number | null,
  valuationScore: number | null,
  belowCut = false,
): ScoreBoardRow {
  return {
    companyCode,
    companyName,
    quarterScore,
    fourQuarterScore: quarterScore,
    latestQuarterScore: quarterScore,
    latestQuarterLabel: null,
    growthScore,
    valuationScore,
    belowCut,
  };
}

function theme(slug: string, sort: number): ThemeRow {
  return { slug, title: slug.toUpperCase(), blurb: null, is_featured: true, sort };
}

function member(themeSlug: string, code: string): ThemeMembershipRow {
  return { theme_slug: themeSlug, company_code: code };
}

// 1. Best read = highest-Read scored member; codes are upper-cased; unscored member
//    is excluded from best-read and sorts last.
{
  const board = [
    boardRow("A", "Alpha", 9, 9, 5),
    boardRow("B", "Bravo", 7, 7, 6),
    boardRow("C", "Charlie", null, 7, 6), // no quarter -> no read
  ];
  const [block] = assembleThemeBlocks(
    [theme("t1", 0)],
    [member("t1", "a"), member("t1", "B"), member("t1", "C")], // lowercase 'a' must resolve
    board,
  );
  assert.equal(block.members.length, 3, "all three resolve");
  assert.deepEqual(
    block.members.map((m) => m.companyCode),
    ["A", "B", "C"],
    "ranked by Read desc, unscored last",
  );
  assert.equal(block.members.find((m) => m.isBestRead)?.companyCode, "A", "A is best read");
  const c = block.members.find((m) => m.companyCode === "C");
  assert.equal(c?.notYetScored, true, "C has no quarter -> not yet scored");
  assert.equal(c?.isBestRead, false, "unscored can never be best read");
}

// 2. A theme whose members are all unscored shows NO best read.
{
  const board = [boardRow("X", "X", null, 7, 6), boardRow("Y", "Y", null, 6, 5)];
  const [block] = assembleThemeBlocks(
    [theme("t", 0)],
    [member("t", "X"), member("t", "Y")],
    board,
  );
  assert.equal(
    block.members.every((m) => !m.isBestRead),
    true,
    "no best read when nothing is scored",
  );
}

// 3. Integrity: a membership code not on the board is dropped, not silently vanished.
{
  const blocks = assembleThemeBlocks(
    [theme("t", 0)],
    [member("t", "A"), member("t", "GHOST")],
    [boardRow("A", "Alpha", 8, 8, 6)],
  );
  assert.equal(blocks[0].members.length, 1, "ghost code dropped");
  assert.equal(blocks[0].members[0].companyCode, "A");
}

// 4. Below-cut member pins to the bottom and can never be best read, even with a
//    higher Read than the discovery-listed members.
{
  const [block] = assembleThemeBlocks(
    [theme("t", 0)],
    [member("t", "A"), member("t", "D")],
    [boardRow("A", "Alpha", 7, 7, 6), boardRow("D", "Delta", 9.5, 9.5, 8, true)],
  );
  assert.deepEqual(
    block.members.map((m) => m.companyCode),
    ["A", "D"],
    "below-cut D pinned to bottom despite higher Read",
  );
  assert.equal(
    block.members.find((m) => m.isBestRead)?.companyCode,
    "A",
    "best read is the discovery-listed A, not below-cut D",
  );
  assert.equal(block.members.find((m) => m.companyCode === "D")?.belowCut, true);
}

// 5. A theme with zero resolved members is hidden (omitted from the output).
{
  const blocks = assembleThemeBlocks(
    [theme("real", 0), theme("ghosttheme", 1)],
    [member("real", "A"), member("ghosttheme", "NOPE")],
    [boardRow("A", "Alpha", 8, 8, 6)],
  );
  assert.equal(blocks.length, 1, "empty theme omitted");
  assert.equal(blocks[0].slug, "real");
}

console.log("hot-themes-assemble: all assertions passed");
