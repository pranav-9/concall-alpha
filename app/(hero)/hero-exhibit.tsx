import Link from "next/link";

import { CompanySearch } from "@/components/company-search";
import type { CompanySearchRow } from "@/lib/company-search-cache";
import { getCachedHomeTrails } from "@/lib/home-trails";
import ScorePlate from "./score-plate";

export function HeroExhibitFallback() {
  return (
    <div className="m-1.5 grid min-h-[26rem] grid-cols-1 rounded border border-[var(--rule)] bg-[var(--paper-2)] lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
      <div className="border-b border-[var(--rule)] p-6 lg:border-b-0 lg:border-r" />
      <div className="p-6" />
    </div>
  );
}

export default async function HeroExhibit({
  companies,
}: {
  companies: CompanySearchRow[];
}) {
  const { exhibits, companyCount, sectorCount, quarterCount } = await getCachedHomeTrails();
  if (exhibits.length === 0) return <HeroExhibitFallback />;

  return (
    <ScorePlate trails={exhibits}>
      <div className="flex h-full flex-col justify-between gap-8">
        {/* A first-time reader has to be told what this is before a score can
         * mean anything to them. The line about what a trail's SHAPE implies is
         * the plate's caption, not the page's opening claim. */}
        <div>
          <h1 className="house-display text-[2.1rem] leading-[1.03] sm:text-[2.6rem] lg:text-[2.3rem] xl:text-[2.7rem]">
            Every concall, read for you.
          </h1>
          <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">
            We score each quarter from the company&apos;s own documents and keep the
            trail. <span className="house-data text-[var(--ink)]">{quarterCount}</span>{" "}
            quarters so far, across{" "}
            <span className="house-data text-[var(--ink)]">{companyCount}</span> mid- and
            small-cap companies.
          </p>
        </div>

        <div className="space-y-3">
          <CompanySearch
            className="w-full"
            instanceId="hero-search"
            initialCompanies={companies}
          />
          <p className="house-data house-micro flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[var(--ink-soft)]">
            {/* Company count lives in the paragraph above; repeating it here
             * was the same number twice in one cell. */}
            <span>{sectorCount} sectors</span>
            <Link href="/coverage" prefetch={false} className="house-link whitespace-nowrap">
              how coverage works
            </Link>
          </p>
        </div>
      </div>
    </ScorePlate>
  );
}
