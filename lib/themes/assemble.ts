// Pure assembly: editorial theme rows + memberships + the live board -> rendered
// theme blocks. No Supabase, no server-only imports, so it is unit-testable in
// isolation (see lib/themes/assemble.test.ts). All the decisions the reviews
// argued over live here: integrity drop, best-read selection, in-theme ranking.

import { classifyBoardRead } from "@/lib/board-read";
import { logger } from "@/lib/logger";
import type { ScoreBoardRow } from "@/components/score-board-table";

import type { ThemeBlock, ThemeMember, ThemeMembershipRow, ThemeRow } from "./types";

export function assembleThemeBlocks(
  themes: ThemeRow[],
  memberships: ThemeMembershipRow[],
  boardRows: ScoreBoardRow[],
): ThemeBlock[] {
  const boardByCode = new Map<string, ScoreBoardRow>();
  for (const row of boardRows) boardByCode.set(row.companyCode.toUpperCase(), row);

  const membershipsByTheme = new Map<string, ThemeMembershipRow[]>();
  for (const m of memberships) {
    const list = membershipsByTheme.get(m.theme_slug) ?? [];
    list.push(m);
    membershipsByTheme.set(m.theme_slug, list);
  }

  const blocks: ThemeBlock[] = [];

  for (const theme of themes) {
    const members: ThemeMember[] = [];

    for (const m of membershipsByTheme.get(theme.slug) ?? []) {
      const code = m.company_code.toUpperCase();
      const board = boardByCode.get(code);
      if (!board) {
        // Build-time integrity check: an unknown / typo'd / large-cap / uncovered
        // code is dropped with a warning, never silently vanished from a hand-typed
        // table. The editor sees the warning in logs (and the SQL validation query).
        logger.warn("Hot Themes: membership code not on the board, dropping row", {
          theme: theme.slug,
          companyCode: code,
        });
        continue;
      }

      const read = classifyBoardRead({
        quarterScore: board.quarterScore,
        growthScore: board.growthScore,
        valuationScore: board.valuationScore,
      });
      const hasRead = read.key !== "no_read" && read.score != null;

      members.push({
        companyCode: code,
        companyName: board.companyName,
        quarterScore: board.quarterScore,
        growthScore: board.growthScore,
        valuationScore: board.valuationScore,
        readScore: hasRead ? read.score : null,
        readKey: read.key,
        belowCut: board.belowCut === true,
        isBestRead: false, // assigned after the in-theme sort below
        rationale: m.rationale ?? null,
        notYetScored: board.quarterScore == null,
        quarterSourceStatus: board.quarterSourceStatus,
        quarterScoredWithin24h: board.quarterScoredWithin24h,
      });
    }

    // Empty theme (no resolved members) is hidden — never an empty shell.
    if (members.length === 0) continue;

    // Rank within the theme: by Read desc (nulls last), below-cut pinned to the
    // bottom — the same ordering grammar the Overall board uses.
    members.sort((a, b) => {
      if (a.belowCut !== b.belowCut) return a.belowCut ? 1 : -1;
      const av = a.readScore ?? Number.NEGATIVE_INFINITY;
      const bv = b.readScore ?? Number.NEGATIVE_INFINITY;
      if (av !== bv) return bv - av;
      return a.companyName.localeCompare(b.companyName);
    });

    // Best read = the highest-Read DISCOVERY-LISTED (not below-cut) SCORED member.
    // After the sort that is simply the first eligible row; a below-cut company or
    // an unscored one can never carry the tag, and a theme with zero scored members
    // shows no best-read at all.
    const best = members.find((member) => !member.belowCut && member.readScore != null);
    if (best) best.isBestRead = true;

    blocks.push({
      slug: theme.slug,
      title: theme.title,
      blurb: theme.blurb ?? null,
      memberCount: members.length,
      members,
    });
  }

  return blocks;
}
