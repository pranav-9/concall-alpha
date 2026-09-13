import assert from "node:assert/strict";

import { rankThemeMembers, splitThemeRows, themeAvgRead, THEME_VISIBLE_ROWS } from "../lib/themes/rank";
import type { ThemeMember } from "../lib/themes/types";

const member = (code: string, readScore: number | null, belowCut = false): ThemeMember => ({
  companyCode: code,
  companyName: code,
  concallScore: null,
  growthScore: null,
  valuationScore: null,
  readScore,
  readKey: readScore == null ? "no_read" : "balanced",
  belowCut,
  isBestRead: false,
  rationale: null,
  notYetScored: readScore == null,
});

// rankThemeMembers: numbers in order; below-cut and unscored carry no rank and
// don't advance the counter.
{
  const ranked = rankThemeMembers([
    member("A", 8.1),
    member("B", 7.4, true), // below cut: pinned, unranked
    member("C", null), // not yet scored: unranked
    member("D", 7.0),
  ]);
  assert.deepEqual(
    ranked.map((r) => r.rank),
    [1, null, null, 2],
    "below-cut and unscored members don't consume a rank",
  );
  assert.equal(ranked[3].member.companyCode, "D", "order is preserved");
}
assert.deepEqual(rankThemeMembers([]), [], "empty theme -> no rows");

// splitThemeRows: collapse only when it saves more than one row.
assert.equal(THEME_VISIBLE_ROWS, 3, "three rows above the fold");
{
  const four = splitThemeRows([1, 2, 3, 4]);
  assert.deepEqual(four.visible, [1, 2, 3, 4], "4 rows -> all shown");
  assert.deepEqual(four.hidden, [], "4 rows -> nothing hidden");
  const five = splitThemeRows([1, 2, 3, 4, 5]);
  assert.deepEqual(five.visible, [1, 2, 3], "5 rows -> top 3 shown");
  assert.deepEqual(five.hidden, [4, 5], "5 rows -> 2 behind the toggle");
  const three = splitThemeRows([1, 2, 3]);
  assert.deepEqual(three.hidden, [], "3 rows -> nothing hidden");
  assert.deepEqual(splitThemeRows([]).visible, [], "empty -> empty");
}

// themeAvgRead: over ranked members only.
assert.equal(themeAvgRead([]), null, "no members -> null");
assert.equal(themeAvgRead([member("A", null)]), null, "all unscored -> null");
assert.equal(
  themeAvgRead([member("A", 8), member("B", 6), member("C", 1, true), member("D", null)]),
  7,
  "below-cut and unscored members are excluded from the mean",
);

console.log("All theme-rank tests passed.");
