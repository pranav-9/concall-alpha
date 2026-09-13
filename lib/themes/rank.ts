// The one ranking + collapse rule for a theme's member board, shared by the
// desktop block (app/themes/theme-block.tsx), the phone block
// (app/themes/theme-block-phone.tsx) and the desk's theme card
// (app/desk/desk-hot-themes.tsx), so a company can't carry one rank on one
// paint and another on the next. Members arrive ordered by Read from
// lib/themes/data.ts; this only numbers and slices them.

import type { ThemeMember } from "./types";

export type RankedThemeMember = { member: ThemeMember; rank: number | null };

/** Rows shown before the collapse. */
export const THEME_VISIBLE_ROWS = 3;

/**
 * Rank every member in order. Below-cut and unscored members carry no rank and
 * don't advance the counter, matching the Overall board's treatment.
 */
export function rankThemeMembers(members: readonly ThemeMember[]): RankedThemeMember[] {
  let rank = 0;
  return members.map((member) => {
    const showRank = !member.belowCut && member.readScore != null;
    if (showRank) rank += 1;
    return { member, rank: showRank ? rank : null };
  });
}

/**
 * Split into the rows shown and the rows behind the "Show N more" toggle.
 * Collapse only when it saves more than one row — a 4-member theme just shows
 * all four rather than hiding a single row behind a control.
 */
export function splitThemeRows<T>(rows: readonly T[]): { visible: T[]; hidden: T[] } {
  const collapse = rows.length > THEME_VISIBLE_ROWS + 1;
  return {
    visible: collapse ? rows.slice(0, THEME_VISIBLE_ROWS) : [...rows],
    hidden: collapse ? rows.slice(THEME_VISIBLE_ROWS) : [],
  };
}

/** Mean Read over the ranked (in-coverage, scored) members; null when none. */
export function themeAvgRead(members: readonly ThemeMember[]): number | null {
  const scored = members.filter((m) => !m.belowCut && m.readScore != null);
  if (scored.length === 0) return null;
  return scored.reduce((sum, m) => sum + (m.readScore ?? 0), 0) / scored.length;
}
