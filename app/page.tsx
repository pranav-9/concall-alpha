import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isCompanyNew } from "@/lib/company-freshness";
import ConcallScore from "@/components/concall-score";
import { slugifySector } from "@/app/sector/utils";
import TopStocks from "./(hero)/top-stocks";
import RecentScoreUpdates from "./(hero)/recent-score-updates";

function TopStocksHeroFallback() {
  return (
    <section className="w-full">
      <div className="rounded-xl border border-border bg-card p-4 h-80 animate-pulse" />
    </section>
  );
}

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

export default async function Home() {
  const supabase = await createClient();
  const now = new Date();
  const { data: companyRows } = await supabase
    .from("company")
    .select("code, name, sector, created_at");

  const coverageData = buildCoverageUniverse(
    (companyRows ?? []) as CompanyRow[],
    now,
  );
  const signalPillars = [
    {
      title: "Quarterly temperature",
      body:
        "See where management tone, delivery, and operating momentum improved or weakened in the latest quarter.",
      accentClass: "bg-emerald-400/90",
    },
    {
      title: "Forward earnings path",
      body:
        "Track catalysts, scenarios, and guidance changes before the next few quarters are fully obvious in reported numbers.",
      accentClass: "bg-sky-400/90",
    },
    {
      title: "Business quality context",
      body:
        "Read operating structure, industry setup, moat signals, and execution evidence in one page instead of hopping between decks and transcripts.",
      accentClass: "bg-amber-400/90",
    },
  ];
  const investorAdvantages = [
    {
      title: "Industry Outlook",
      score: 8.7,
      eyebrow: "Qualitative context",
      body:
        "Score sector setup, sub-sector signals, and operating backdrop so investors can see where industry conditions are strengthening or weakening before it is obvious in the numbers.",
      example:
        "Example: stronger tailwinds and an improving cycle can push the outlook higher even before reported earnings move.",
    },
    {
      title: "Performance Score",
      score: 7.9,
      eyebrow: "Execution signal",
      body:
        "Translate management commentary, execution milestones, and quarter-level evidence into a structured performance score instead of relying only on the latest financial statement snapshot.",
      example:
        "Example: better delivery on capacity, pricing discipline, and operations can support a stronger score before the P&L fully reflects it.",
    },
    {
      title: "Future Growth Score",
      score: 9.2,
      eyebrow: "Forward earnings power",
      body:
        "Quantify catalysts, scenarios, and management confidence into a forward-looking growth score so investors can compare future earnings potential across companies on one scale.",
      example:
        "Example: when catalysts are de-risking and the upside case is strengthening, the growth score makes that shift visible at a glance.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-x-0 -top-28 -z-10 h-[42rem] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_36%),linear-gradient(180deg,_rgba(15,23,42,0.03),_transparent_58%)]" />
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:gap-10 lg:px-10 lg:py-10">
        <section className="grid grid-cols-1 gap-6 lg:min-h-[80vh] supports-[height:100dvh]:lg:min-h-[80dvh] lg:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)] lg:items-stretch">
          <div className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92),rgba(240,249,255,0.88))] p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.35)] sm:p-8 lg:h-full lg:p-8 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(17,24,39,0.94),rgba(8,47,73,0.72))]">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="rounded-full border border-emerald-300/60 bg-emerald-100/80 px-3 py-1 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/25 dark:text-emerald-200">
                    Business Analysis portal
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1">
                    Built for long-term investors
                  </span>
                </div>

                <div className="max-w-4xl space-y-3">
                  <h1 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl">
                    India&apos;s first fudamental screener
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-foreground/78 sm:text-base">
                    We turn commentary, guidance, and business context into a structured research
                    layer on top of quantitative data, so the numbers come with a real story.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/45 bg-background/72 px-5 py-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Companies
                    </p>
                    <p className="mt-2 text-[2rem] font-black leading-none text-foreground">
                      {coverageData.totalCompanies}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">In active coverage</p>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-background/72 px-5 py-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Sectors
                    </p>
                    <p className="mt-2 text-[2rem] font-black leading-none text-foreground">
                      {coverageData.totalSectors}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Across the universe</p>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-background/72 px-5 py-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Fresh adds
                    </p>
                    <p className="mt-2 text-[2rem] font-black leading-none text-foreground">
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
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:h-full">
            <RecentScoreUpdates heroPanel />
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-border/60 bg-card/95 p-4 shadow-[0_18px_70px_-42px_rgba(15,23,42,0.45)] sm:p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold leading-tight text-foreground">
                Fundamental Screeners
              </h2>
            </div>
            <Suspense fallback={<TopStocksHeroFallback />}>
              <TopStocks heroPanel />
            </Suspense>
          </div>

          <div className="rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.92),rgba(255,255,255,0.98))] p-6 shadow-[0_18px_70px_-42px_rgba(15,23,42,0.4)] dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.95),rgba(15,23,42,0.95),rgba(2,6,23,0.95))]">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Reading frame
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground">
              Prices chase earnings. The edge is reading the setup early.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Use this portal to move from raw commentary to an investable view: what changed,
              what management is guiding, what the business structure looks like, and what may
              matter over the next few quarters.
            </p>

            <div className="mt-6 space-y-3">
              {signalPillars.map((item) => (
                <div
                  key={`rail-${item.title}`}
                  className="rounded-2xl border border-border/45 bg-background/72 px-4 py-3"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className={`h-2 w-2 rounded-full ${item.accentClass}`} />
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border/60 bg-card/95 p-5 shadow-[0_18px_70px_-42px_rgba(15,23,42,0.45)] sm:p-6 lg:p-8">
          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Investor lens
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              Three views that help you understand long-term earnings power
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              This product is built for investors who want to connect operating context,
              management behavior, and forward catalysts into one consistent research surface.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {investorAdvantages.map((feature, index) => (
              <div
                key={feature.title}
                className="min-h-48 rounded-2xl border border-border/50 bg-muted/20 p-4 transition-colors hover:bg-accent/60 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          index === 0
                            ? "bg-emerald-400/90"
                            : index === 1
                              ? "bg-sky-400/90"
                              : "bg-amber-400/90"
                        }`}
                      />
                      {feature.eyebrow}
                    </p>
                    <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">
                      {feature.title}
                    </h3>
                  </div>
                  <ConcallScore score={feature.score} size="sm" className="ring-2" />
                </div>

                <p className="mt-4 text-sm leading-6 text-muted-foreground">{feature.body}</p>
                <div className="mt-4 rounded-xl border border-border/45 bg-background/72 px-3 py-2.5">
                  <p className="text-[11px] leading-6 text-foreground/90">{feature.example}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
