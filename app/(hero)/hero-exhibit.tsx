import Link from "next/link";

import { CompanySearch } from "@/components/company-search";
import type { CompanySearchRow } from "@/lib/company-search-cache";
import { getCachedFeaturedRead } from "@/lib/home-featured-read";
import { getCachedHomeTrails } from "@/lib/home-trails";
import ScorePlate from "./score-plate";
import VerdictVenn from "./verdict-venn";

export function HeroExhibitFallback() {
  return (
    <div className="m-1.5 grid min-h-[26rem] grid-cols-1 rounded border border-[var(--rule)] bg-[var(--paper-2)] lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
      <div className="border-b border-[var(--rule)] p-6 lg:border-b-0 lg:border-r" />
      <div className="p-6" />
    </div>
  );
}

// The left cell — the platform's thesis in three lines, plus the search. Shared
// by both the Venn hero and the trail fallback so the copy can't drift.
function HeroCopy({
  companies,
  sectorCount,
}: {
  companies: CompanySearchRow[];
  sectorCount: number;
}) {
  return (
    <div className="flex h-full flex-col justify-between gap-8">
      <div>
        <h1 className="house-display text-[2rem] leading-[1.05] sm:text-[2.4rem] lg:text-[2.1rem] xl:text-[2.5rem]">
          A fundamental research platform
        </h1>
        <p className="house-display mt-3 text-lg text-[var(--ink)]">
          Fundamental research on India&apos;s top 100 mid- &amp; small-cap companies.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
          Prices follow earnings — so we track each company&apos;s earnings trajectory, quarter by
          quarter, from its concalls, presentations and filings.
        </p>
      </div>

      <div className="space-y-3">
        <CompanySearch className="w-full" instanceId="hero-search" initialCompanies={companies} />
        <p className="house-data house-micro flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[var(--ink-soft)]">
          <span>{sectorCount} sectors</span>
          <Link href="/coverage" prefetch={false} className="house-link whitespace-nowrap">
            how coverage works
          </Link>
        </p>
      </div>
    </div>
  );
}

export default async function HeroExhibit({ companies }: { companies: CompanySearchRow[] }) {
  const [{ exhibits, sectorCount }, featured] = await Promise.all([
    getCachedHomeTrails(),
    getCachedFeaturedRead(),
  ]);

  if (!featured && exhibits.length === 0) return <HeroExhibitFallback />;

  const copy = <HeroCopy companies={companies} sectorCount={sectorCount} />;

  // Primary hero: the three-lens read. Present whenever at least one covered
  // company has all three legs and a positive verdict.
  if (featured) {
    return (
      <figure className="house-plate">
        <figcaption className="house-plate-bar">
          <span className="house-data house-micro whitespace-nowrap">Plate 01 — The read</span>
          <span className="house-data house-micro truncate text-[var(--ink)]">
            three lenses, one verdict
          </span>
        </figcaption>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
          <div className="house-plate-cell border-b border-[var(--rule)] lg:border-b-0 lg:border-r">
            {copy}
          </div>
          <div className="house-plate-cell">
            <VerdictVenn featured={featured} />
          </div>
        </div>
      </figure>
    );
  }

  // Fallback: no company currently clears all three legs (e.g. valuations went
  // stale as a cohort). Show the scored-trail plate instead of an empty hero.
  return <ScorePlate trails={exhibits}>{copy}</ScorePlate>;
}
