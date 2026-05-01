import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isCompanyNew } from "@/lib/company-freshness";
import { slugifySector } from "@/app/sector/utils";

type CompanyRow = {
  code: string;
  name?: string | null;
  sector?: string | null;
  created_at?: string | null;
};

type CoverageUniverseData = {
  totalCompanies: number;
  totalSectors: number;
  newCompanyCount: number;
  topSectors: Array<{ sector: string; companyCount: number }>;
  recentlyAddedCompanies: Array<{
    code: string;
    name: string;
    sector: string | null;
    createdAtLabel: string | null;
    isNew: boolean;
  }>;
};

const formatDate = (value: string | null) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

function buildCoverageUniverse(
  companies: CompanyRow[],
  now: Date,
): CoverageUniverseData {
  const totalCompanies = companies.length;

  const sectorCounts = new Map<string, number>();
  companies.forEach((company) => {
    const sector = company.sector?.trim();
    if (!sector) return;
    sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
  });

  const topSectors = Array.from(sectorCounts.entries())
    .map(([sector, companyCount]) => ({ sector, companyCount }))
    .sort((a, b) => b.companyCount - a.companyCount || a.sector.localeCompare(b.sector))
    .slice(0, 4);
  const totalSectors = sectorCounts.size;

  const recentlyAddedCandidates: Array<{
    code: string;
    name: string;
    sector: string | null;
    createdAtLabel: string;
    isNew: boolean;
    createdAtSort: number;
  }> = [];

  companies.forEach((company) => {
    const createdAt = company.created_at ?? null;
    if (!createdAt) return;
    const createdAtMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdAtMs)) return;
    recentlyAddedCandidates.push({
      code: company.code,
      name: company.name ?? company.code,
      sector: company.sector ?? null,
      createdAtLabel: `Added ${formatDate(createdAt)}`,
      isNew: isCompanyNew(createdAt, now),
      createdAtSort: createdAtMs,
    });
  });

  const recentlyAddedCompanies = recentlyAddedCandidates
    .sort((a, b) => b.createdAtSort - a.createdAtSort || a.name.localeCompare(b.name))
    .slice(0, 4)
    .map((company) => {
      const { createdAtSort, ...rest } = company;
      void createdAtSort;
      return rest;
    });
  const newCompanyCount = companies.filter((company) =>
    isCompanyNew(company.created_at ?? null, now),
  ).length;

  return {
    totalCompanies,
    totalSectors,
    newCompanyCount,
    topSectors,
    recentlyAddedCompanies,
  };
}

export function HeroCoverageStatsFallback() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[88px] rounded-2xl border border-border/45 bg-background/40"
          />
        ))}
      </div>
      <div className="h-[120px] rounded-[1.5rem] border border-border/50 bg-background/40" />
    </>
  );
}

export default async function HeroCoverageStats() {
  const supabase = await createClient();
  const now = new Date();
  const { data: companyRows } = await supabase
    .from("company")
    .select("code, name, sector, created_at");

  const coverageData = buildCoverageUniverse(
    (companyRows ?? []) as CompanyRow[],
    now,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/45 bg-background/72 px-4 py-3.5 last:col-span-2 sm:px-5 sm:py-4 sm:last:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Companies
          </p>
          <p className="mt-2 text-[1.75rem] font-black leading-none text-foreground sm:text-[2rem]">
            {coverageData.totalCompanies}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">In active coverage</p>
        </div>
        <div className="rounded-2xl border border-border/45 bg-background/72 px-4 py-3.5 last:col-span-2 sm:px-5 sm:py-4 sm:last:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Sectors
          </p>
          <p className="mt-2 text-[1.75rem] font-black leading-none text-foreground sm:text-[2rem]">
            {coverageData.totalSectors}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across the universe</p>
        </div>
        <div className="rounded-2xl border border-border/45 bg-background/72 px-4 py-3.5 last:col-span-2 sm:px-5 sm:py-4 sm:last:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Fresh adds
          </p>
          <p className="mt-2 text-[1.75rem] font-black leading-none text-foreground sm:text-[2rem]">
            {coverageData.newCompanyCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Recently added</p>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border/50 bg-background/68 px-4 py-3 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.35)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-start">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Most covered sectors
              </p>
              <span className="text-[10px] text-muted-foreground">Top 3</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {coverageData.topSectors.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sector coverage will appear here as data becomes available.
                </p>
              ) : (
                coverageData.topSectors.slice(0, 3).map((sector) => (
                  <Link
                    key={sector.sector}
                    href={`/sector/${slugifySector(sector.sector)}`}
                    prefetch={false}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/70"
                  >
                    <span className="truncate">{sector.sector}</span>
                    <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {sector.companyCount}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                New coverage
              </p>
              <span className="text-[10px] text-muted-foreground">Latest 2</span>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {coverageData.recentlyAddedCompanies.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Recently added companies will appear here once coverage history is available.
                </p>
              ) : (
                coverageData.recentlyAddedCompanies.slice(0, 2).map((company) => (
                  <Link
                    key={company.code}
                    href={`/company/${company.code}`}
                    prefetch={false}
                    className="flex items-center justify-between gap-3 rounded-xl border border-transparent bg-background/65 px-3 py-2 transition-colors hover:border-border/40 hover:bg-accent/70"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-medium text-foreground">
                        {company.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        {company.sector && <span>{company.sector}</span>}
                        {company.createdAtLabel && <span>{company.createdAtLabel}</span>}
                      </div>
                    </div>
                    {company.isNew && (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                        New
                      </span>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
