// Hot Themes types. Derived from the SQL shape in lib/supabase/hot_themes.sql,
// NOT from a peer Supabase row (stale rows exist). The Zod schemas are the
// frontend's own validation gate for the two editorial tables; the scored
// display shapes are composed in lib/themes/data.ts from the live board.

import { z } from "zod";

import type { BoardReadKey } from "@/lib/board-read";
import type { ScoreSourceStatus } from "@/lib/score-freshness";

// --- Raw editorial rows (validated on read) ---

export const themeRowSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  blurb: z.string().nullable().optional(),
  is_featured: z.boolean(),
  sort: z.number(),
});
export type ThemeRow = z.infer<typeof themeRowSchema>;

export const themeMembershipRowSchema = z.object({
  theme_slug: z.string().min(1),
  company_code: z.string().min(1),
  rationale: z.string().nullable().optional(),
  as_of_quarter: z.string().nullable().optional(),
  last_reviewed_at: z.string().nullable().optional(),
});
export type ThemeMembershipRow = z.infer<typeof themeMembershipRowSchema>;

// --- Display shapes (theme meta + live board scores) ---

/** One company inside a theme: the leaderboard's four scores + Read, joined live. */
export type ThemeMember = {
  companyCode: string;
  companyName: string;
  quarterScore: number | null;
  growthScore: number | null;
  valuationScore: number | null;
  /** Composite; null when there is no read (no quarter print / <2 legs). */
  readScore: number | null;
  readKey: BoardReadKey;
  /** Below the coverage cut: rendered greyed, pinned to the bottom, never "best read". */
  belowCut: boolean;
  /** The highest-Read discovery-listed scored member of the theme. Exactly one, or none. */
  isBestRead: boolean;
  rationale: string | null;
  /** True when the company has no scored quarter at all — renders a "not yet scored" chip. */
  notYetScored: boolean;
  quarterSourceStatus?: ScoreSourceStatus;
  quarterScoredWithin24h?: boolean;
};

export type ThemeBlock = {
  slug: string;
  title: string;
  blurb: string | null;
  /** Count of RESOLVED members (rendered). A theme with zero resolved members is hidden. */
  memberCount: number;
  members: ThemeMember[];
};

/** Homepage teaser: title + raw membership count only. No board build. */
export type ThemeTeaser = {
  slug: string;
  title: string;
  memberCount: number;
};
