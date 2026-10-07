// "Where the list sits" — the sector, sub-sector and Hot Theme make-up of a
// watchlist. PURE (no React, no Supabase) so tests/watchlist-analytics.test.ts
// can pin it. Sectors and sub-sectors come off the `company` table as stored
// (the same columns the Industry tab's Covered peers block keys on); themes
// are the featured editorial `theme` rows and their memberships. Nothing is
// re-classified here: a company with no sector is listed as unclassified,
// never guessed into one.

import { slugifySector } from "@/app/sector/utils";

import type {
  DistributionBucket,
  ThemeBucket,
  WatchlistCompany,
  WatchlistDistribution,
} from "./types";

export type ThemeMembershipInput = { themeSlug: string; code: string };
export type ThemeInput = { slug: string; title: string; hotness: number | null };

const key = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const byCountThenLabel = (a: { count: number; label: string }, b: { count: number; label: string }) =>
  b.count - a.count || a.label.localeCompare(b.label);

function bucketBy(
  companies: WatchlistCompany[],
  pick: (company: WatchlistCompany) => string | null,
  hrefFor: (label: string) => string | null,
): { buckets: DistributionBucket[]; unclassified: string[] } {
  const byKey = new Map<string, { label: string; codes: string[] }>();
  const unclassified: string[] = [];
  for (const company of companies) {
    const raw = pick(company);
    const k = key(raw);
    if (!k || !raw) {
      unclassified.push(company.code);
      continue;
    }
    const bucket = byKey.get(k);
    if (bucket) bucket.codes.push(company.code);
    else byKey.set(k, { label: raw.trim(), codes: [company.code] });
  }
  const total = companies.length;
  const buckets = [...byKey.values()]
    .map((b) => ({
      label: b.label,
      count: b.codes.length,
      share: total > 0 ? b.codes.length / total : 0,
      codes: [...b.codes].sort(),
      href: hrefFor(b.label),
    }))
    .sort(byCountThenLabel);
  return { buckets, unclassified: unclassified.sort() };
}

/** "Capital Goods is 42% of the list (8 of 19)" / "Spread across 7 sectors; …" */
export function concentrationLine(total: number, sectors: DistributionBucket[]): string | null {
  if (total < 2 || sectors.length === 0) return null;
  const top = sectors[0];
  const pct = Math.round(top.share * 100);
  if (sectors.length === 1) return `Every name on the list is ${top.label}.`;
  if (top.share >= 0.4) return `${top.label} is ${pct}% of the list (${top.count} of ${total}).`;
  return `Spread across ${sectors.length} sectors; the largest, ${top.label}, is ${top.count} of ${total}.`;
}

/**
 * @param companies  the list's companies, in list order
 * @param memberships  theme_membership rows (any theme, any company — filtered here)
 * @param themes  the FEATURED theme rows; a membership in an unfeatured theme is ignored,
 *                as it is on /themes
 * @param sectorsWithPage  lowercase sector keys that have a /sector/<slug> page
 *                         (a sector with a discovery-listed company); others get no link
 */
export function buildDistribution(
  companies: WatchlistCompany[],
  memberships: ThemeMembershipInput[],
  themes: ThemeInput[],
  sectorsWithPage: ReadonlySet<string> = new Set(),
): WatchlistDistribution {
  const { buckets: sectors, unclassified } = bucketBy(
    companies,
    (c) => c.sector,
    (label) => (sectorsWithPage.has(key(label)) ? `/sector/${slugifySector(label)}` : null),
  );
  const { buckets: subSectors } = bucketBy(companies, (c) => c.subSector, () => null);

  const onList = new Set(companies.map((c) => c.code));
  const themeBySlug = new Map(themes.map((t) => [t.slug, t]));
  const codesBySlug = new Map<string, Set<string>>();
  for (const m of memberships) {
    const code = m.code.trim().toUpperCase();
    if (!onList.has(code) || !themeBySlug.has(m.themeSlug)) continue;
    const set = codesBySlug.get(m.themeSlug) ?? new Set<string>();
    set.add(code);
    codesBySlug.set(m.themeSlug, set);
  }
  const themeBuckets: ThemeBucket[] = [...codesBySlug.entries()]
    .map(([slug, codes]) => {
      const theme = themeBySlug.get(slug)!;
      return { slug, title: theme.title, hotness: theme.hotness, count: codes.size, codes: [...codes].sort() };
    })
    .sort((a, b) => b.count - a.count || (b.hotness ?? 0) - (a.hotness ?? 0) || a.title.localeCompare(b.title));

  return {
    total: companies.length,
    sectors,
    subSectors,
    themes: themeBuckets,
    unclassified,
    line: concentrationLine(companies.length, sectors),
  };
}
