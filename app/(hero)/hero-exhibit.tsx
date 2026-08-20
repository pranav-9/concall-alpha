import Link from "next/link";

import { CompanySearch } from "@/components/company-search";
import type { CompanySearchRow } from "@/lib/company-search-cache";
import { getCachedFeaturedReads } from "@/lib/home-featured-read";
import { getCachedHomeTrails } from "@/lib/home-trails";
import ReadEquation from "./read-equation";
import ScorePlate from "./score-plate";
import WhyDifferent from "./why-different";
import CompareSectors from "./compare-sectors";

export function HeroExhibitFallback() {
  // Approximates the loaded hero (eyebrow + copy + equation-circle row) so the
  // Suspense boundary doesn't flash a mismatched shape before hydration.
  return (
    <div className="flex flex-col gap-6">
      <div className="h-3 w-48 rounded bg-[var(--rule)]" />
      <div className="m-1.5 grid min-h-[22rem] grid-cols-1 rounded border border-[var(--rule)] bg-[var(--paper-2)] lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <div className="space-y-3 border-b border-[var(--rule)] p-6 lg:border-b-0 lg:border-r">
          <div className="h-8 w-3/4 rounded bg-[var(--rule)]" />
          <div className="h-4 w-2/3 rounded bg-[var(--rule)]" />
          <div className="h-10 w-full rounded bg-[var(--rule)]" />
        </div>
        <div className="flex items-center justify-center gap-4 p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-12 rounded-full bg-[var(--rule)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

// The hero's left cell — the platform's thesis, plus the search. Shared by both
// the equation hero and the trail fallback so the copy can't drift.
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
          Go beyond the numbers — a fundamental research platform
        </h1>
        <p className="house-display mt-3 text-lg text-[var(--ink)]">
          Ranking India&apos;s top 100 mid- &amp; small-cap companies.
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

// Band 02 — "why + compare". Fetches the same cached reads as the hero (one
// cache entry, so no real second fetch) and renders nothing when the pool is
// empty, matching the hero's fallback state.
export async function HeroSecondBand() {
  const reads = await getCachedFeaturedReads();
  if (reads.length === 0) return null;

  return (
    <section aria-label="Why it's different, and a cross-sector comparison" className="house-block">
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-2">
        <WhyDifferent />
        <CompareSectors reads={reads.slice(0, 3)} />
      </div>
    </section>
  );
}

export default async function HeroExhibit({ companies }: { companies: CompanySearchRow[] }) {
  const [{ exhibits, sectorCount }, reads] = await Promise.all([
    getCachedHomeTrails(),
    getCachedFeaturedReads(),
  ]);

  if (reads.length === 0 && exhibits.length === 0) return <HeroExhibitFallback />;

  const copy = <HeroCopy companies={companies} sectorCount={sectorCount} />;

  // Primary hero: the read equation. Present whenever at least one covered
  // company clears all three legs with a positive verdict.
  if (reads.length > 0) {
    return (
      <div className="flex flex-col gap-5">
        <p className="house-data house-micro w-fit rounded-full border border-[var(--rule)] px-3 py-1 text-[var(--ink-soft)]">
          Source-document research
        </p>
        <figure className="house-plate">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
            <div className="house-plate-cell border-b border-[var(--rule)] lg:border-b-0 lg:border-r">
              {copy}
            </div>
            <div className="house-plate-cell flex items-center">
              <ReadEquation featured={reads[0]} />
            </div>
          </div>
        </figure>
      </div>
    );
  }

  // Fallback: no company currently clears all three legs (e.g. valuations went
  // stale as a cohort). Show the scored-trail plate instead of an empty hero.
  return <ScorePlate trails={exhibits}>{copy}</ScorePlate>;
}
