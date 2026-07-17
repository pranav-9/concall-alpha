import { unstable_cache } from "next/cache";

import { slugifySector } from "@/app/sector/utils";
import {
  COVERAGE_SELECT,
  isDiscoveryListed,
  type CoverageFields,
} from "@/lib/coverage-policy";
import { createPublicReadClient } from "@/lib/supabase/public-read";

type SectorRow = CoverageFields & { sector: string | null };

// Mirrors the sector page's own 404 condition (discovery-listed companies'
// sectors only) so the sitemap never emits a dead /sector/<slug> URL.
async function fetchSectorSlugs(): Promise<string[]> {
  const supabase = createPublicReadClient();
  const { data, error } = await supabase
    .from("company")
    .select(`sector, ${COVERAGE_SELECT}`)
    .not("sector", "is", null);

  if (error) throw error;

  const slugs = new Set<string>();
  for (const row of (data ?? []) as unknown as SectorRow[]) {
    if (!isDiscoveryListed(row)) continue;
    const sector = row.sector?.trim();
    if (!sector) continue;
    const slug = slugifySector(sector);
    if (slug) slugs.add(slug);
  }
  return Array.from(slugs).sort();
}

export const getCachedSectorSlugs = unstable_cache(
  fetchSectorSlugs,
  ["sector-slugs-v1"],
  { revalidate: 600 },
);
