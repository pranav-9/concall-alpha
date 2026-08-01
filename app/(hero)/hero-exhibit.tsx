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
  const { exhibit, companyCount, sectorCount, quarterCount } = await getCachedHomeTrails();
  if (!exhibit) return <HeroExhibitFallback />;

  return (
    <ScorePlate trail={exhibit}>
      <div className="flex h-full flex-col justify-between gap-8">
        <div>
          <h1 className="house-display text-[1.9rem] leading-[1.05] sm:text-[2.3rem] lg:text-[1.95rem] xl:text-[2.3rem]">
            A 7 on the way up is a different stock from a 7 on the way down.
          </h1>
          <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">
            So we read every concall, score the quarter, and keep the trail.{" "}
            <span className="house-data text-[var(--ink)]">{quarterCount}</span> quarters
            read so far, across{" "}
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
            <span>
              {companyCount} companies · {sectorCount} sectors
            </span>
            <Link href="/coverage" prefetch={false} className="house-link whitespace-nowrap">
              how coverage works
            </Link>
          </p>
        </div>
      </div>
    </ScorePlate>
  );
}
