// Hot Themes server data layer. Reads the two editorial tables and joins members
// to the live board (lib/overall-board). Any query failure degrades to an empty
// result so the /themes section and the homepage teaser render nothing rather
// than breaking the page.

import { createPublicReadClient } from "@/lib/supabase/public-read";
import { logger } from "@/lib/logger";
import { getOverallBoardRows } from "@/lib/overall-board";

import { assembleThemeBlocks } from "./assemble";
import {
  themeMembershipRowSchema,
  themeRowSchema,
  type ThemeBlock,
  type ThemeMembershipRow,
  type ThemeRow,
  type ThemeTeaser,
} from "./types";

/** Featured themes with their members scored live off the board. Empty on any failure. */
export async function getFeaturedThemeBlocks(): Promise<ThemeBlock[]> {
  const supabase = createPublicReadClient();

  const { data: themeData, error: themeError } = await supabase
    .from("theme")
    .select("slug,title,blurb,is_featured,sort,hotness,updated_at")
    .eq("is_featured", true)
    // Ordering key: "In Focus" hotness desc (nulls last), sort as the stable
    // tiebreak. Both /themes and /desk consume this order (desk no longer
    // re-sorts by mean-Read), so the boards agree.
    .order("hotness", { ascending: false, nullsFirst: false })
    .order("sort", { ascending: true });

  if (themeError) {
    logger.warn("Hot Themes: featured theme query failed", { error: themeError.message });
    return [];
  }

  const themes: ThemeRow[] = (themeData ?? []).flatMap((row) => {
    const parsed = themeRowSchema.safeParse(row);
    if (!parsed.success) {
      logger.warn("Hot Themes: invalid theme row skipped", {
        slug: typeof row?.slug === "string" ? row.slug : "unknown",
      });
      return [];
    }
    return [parsed.data];
  });

  if (themes.length === 0) return [];

  const slugs = themes.map((theme) => theme.slug);

  const [membershipResult, boardRows] = await Promise.all([
    supabase
      .from("theme_membership")
      .select("theme_slug,company_code,rationale,as_of_quarter,last_reviewed_at")
      .in("theme_slug", slugs),
    getOverallBoardRows(),
  ]);

  if (membershipResult.error) {
    logger.warn("Hot Themes: membership query failed", {
      error: membershipResult.error.message,
    });
    return [];
  }

  const memberships: ThemeMembershipRow[] = (membershipResult.data ?? []).flatMap((row) => {
    const parsed = themeMembershipRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });

  return assembleThemeBlocks(themes, memberships, boardRows);
}

/**
 * Homepage teaser: featured titles + raw membership counts only. Deliberately does
 * NOT build the board — the teaser shows "N names", not scores, so the homepage
 * stays cheap. Themes with zero memberships are omitted.
 */
export async function getFeaturedThemeTeasers(): Promise<ThemeTeaser[]> {
  const supabase = createPublicReadClient();

  const { data: themeData, error } = await supabase
    .from("theme")
    .select("slug,title,hotness,updated_at")
    .eq("is_featured", true)
    .order("hotness", { ascending: false, nullsFirst: false })
    .order("sort", { ascending: true });

  if (error || !themeData || themeData.length === 0) return [];

  const slugs = themeData.map((theme) => String(theme.slug));

  const { data: memberData } = await supabase
    .from("theme_membership")
    .select("theme_slug")
    .in("theme_slug", slugs);

  const countBySlug = new Map<string, number>();
  for (const row of memberData ?? []) {
    const slug = String(row.theme_slug);
    countBySlug.set(slug, (countBySlug.get(slug) ?? 0) + 1);
  }

  return themeData
    .map((theme) => ({
      slug: String(theme.slug),
      title: String(theme.title),
      memberCount: countBySlug.get(String(theme.slug)) ?? 0,
      hotness: typeof theme.hotness === "number" ? theme.hotness : null,
      updatedAt: typeof theme.updated_at === "string" ? theme.updated_at : null,
    }))
    .filter((teaser) => teaser.memberCount > 0);
}
