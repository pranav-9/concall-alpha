import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  topSectors: Array<{ sector: string; companyCount: number }>;
  recentlyAddedCompanies: Array<{
    code: string;
    name: string;
    sector: string | null;
    createdAtLabel: string | null;
  }>;
};

type RecentStockRequest = {
  subjectTarget: string;
  createdAt: string | null;
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
    .slice(0, 5);

  const recentlyAddedCandidates: Array<{
    code: string;
    name: string;
    sector: string | null;
    createdAtLabel: string;
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
      createdAtSort: createdAtMs,
    });
  });

  const recentlyAddedCompanies = recentlyAddedCandidates
    .sort((a, b) => b.createdAtSort - a.createdAtSort || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map(({ createdAtSort: _createdAtSort, ...company }) => company);

  return {
    totalCompanies,
    topSectors,
    recentlyAddedCompanies,
  };
}

export default async function Home() {
  const supabase = await createClient();
  const { data: companyRows } = await supabase
    .from("company")
    .select("code, name, sector, created_at");

  const coverageData = buildCoverageUniverse(
    (companyRows ?? []) as CompanyRow[],
  );

  let recentStockRequests: RecentStockRequest[] = [];
  let requestsUnavailable = false;

  try {
    const admin = createAdminClient();
    const { data: requestRows, error } = await admin
      .from("user_requests")
      .select("subject_target, created_at")
      .eq("request_type", "stock_addition")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      requestsUnavailable = true;
    } else {
      recentStockRequests = ((requestRows ?? []) as Array<{
        subject_target: string;
        created_at?: string | null;
      }>).map((row) => ({
        subjectTarget: row.subject_target,
        createdAt: row.created_at ?? null,
      }));
    }
  } catch {
    requestsUnavailable = true;
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-[90%] sm:w-full flex flex-col gap-0 justify-items-center items-center">
        {/* <Navbar></Navbar> */}
        <div className="hidden lg:block w-[95%] sm:w-[90%] pt-6 sm:pt-8">
          <div className="grid grid-cols-3 gap-6 items-start">
            <div className="col-span-2">
              <Suspense fallback={<TopStocksHeroFallback />}>
                <TopStocks heroPanel />
              </Suspense>
            </div>
            <div className="col-span-1">
              <RecentScoreUpdates heroPanel />
            </div>
          </div>
        </div>

        <div className="lg:hidden w-[95%] sm:w-[90%] pt-6 sm:pt-8 space-y-6">
          <Suspense fallback={<TopStocksHeroFallback />}>
            <TopStocks heroPanel />
          </Suspense>
          <RecentScoreUpdates heroPanel />
        </div>
        <section className="w-[95%] sm:w-[90%] pt-6 sm:pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:p-6">
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Coverage Universe
              </p>
              <h2 className="mt-2 text-xl sm:text-2xl font-bold text-foreground leading-tight">
                What&apos;s Covered on the Portal
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
                A quick view of the tracked stock universe, the sectors we cover most, and the names most recently added into our research flow.
              </p>

              <div className="mt-5 rounded-2xl border border-border bg-gradient-to-r from-muted/40 via-card to-muted/20 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-4xl sm:text-5xl font-extrabold text-foreground">
                      {coverageData.totalCompanies}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Companies covered
                    </p>
                  </div>
                  <div className="space-y-1 sm:text-right">
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                      Top sectors by coverage
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                      Newest additions to the portal
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                  <p className="text-[11px] sm:text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Top Sectors
                  </p>
                  <div className="mt-3 space-y-2">
                    {coverageData.topSectors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sector coverage will appear here as data becomes available.
                      </p>
                    ) : (
                      coverageData.topSectors.map((sector, index) => (
                        <div
                          key={sector.sector}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/70 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="w-4 shrink-0 text-xs text-muted-foreground">
                              {index + 1}.
                            </span>
                            <span className="truncate text-sm font-medium text-foreground">
                              {sector.sector}
                            </span>
                          </div>
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {sector.companyCount} companies
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                  <p className="text-[11px] sm:text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Recently Added
                  </p>
                  <div className="mt-3 space-y-2">
                    {coverageData.recentlyAddedCompanies.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Recently added companies will appear here once coverage history is available.
                      </p>
                    ) : (
                      coverageData.recentlyAddedCompanies.map((company) => (
                        <Link
                          key={company.code}
                          href={`/company/${company.code}`}
                          prefetch={false}
                          className="block rounded-lg border border-border/40 bg-background/70 px-3 py-2 transition-colors hover:bg-accent"
                        >
                          <div className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400/80" />
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-sm font-medium text-foreground">
                                {company.name}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {company.sector && (
                                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                    {company.sector}
                                  </span>
                                )}
                                {company.createdAtLabel && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {company.createdAtLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 lg:p-6">
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground">
                User Demand
              </p>
              <h2 className="mt-2 text-xl sm:text-2xl font-bold text-foreground leading-tight">
                Recent Stock Requests
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The latest stocks users have asked us to add to the portal.
              </p>

              <div className="mt-5 rounded-xl border border-border/50 bg-muted/15">
                {requestsUnavailable ? (
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Recent request activity is temporarily unavailable.
                    </p>
                  </div>
                ) : recentStockRequests.length === 0 ? (
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">
                      No stock requests yet. Use the Submit Request button to suggest a company.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentStockRequests.map((request, index) => (
                      <div
                        key={`${request.subjectTarget}-${request.createdAt ?? index}`}
                        className="px-4 py-2.5 transition-colors hover:bg-background/50"
                      >
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {request.subjectTarget}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Stock request
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(request.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <a
                  href="#request-intake-fab"
                  className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent sm:text-sm"
                >
                  Request a stock
                </a>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Uses the floating Submit Request button at bottom-right.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-[95%] sm:w-[90%] pt-6 sm:pt-8">
          <div className="rounded-2xl border border-border bg-gradient-to-r from-card via-card to-muted/40 p-4 sm:p-5 lg:p-6">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground">
              For Long-Term Investors
            </p>
            <h2 className="mt-2 max-w-4xl text-xl font-bold leading-tight text-foreground sm:text-2xl lg:text-3xl">
              Prices chase earnings. We help you understand what drives them.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              For long-term investors, the real edge is understanding the
              business beyond the numbers. This portal helps you track how
              strategy, execution, and management commentary shape a company&apos;s
              earnings potential over time, not just what shows up in the
              accounting statements.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Earnings Potential",
                  body: "See the business drivers that shape future earnings, not just the reported quarter.",
                  dotClass: "bg-emerald-400/90",
                },
                {
                  title: "Strategy Shifts",
                  body: "Track how management priorities, expansion plans, and capital allocation evolve over time.",
                  dotClass: "bg-sky-400/90",
                },
                {
                  title: "Execution Evidence",
                  body: "Follow what the company is actually delivering through updates in operations, milestones, and guidance.",
                  dotClass: "bg-slate-400/90",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border/50 bg-muted/25 p-3 sm:p-4"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${item.dotClass}`} />
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[11px] text-muted-foreground sm:text-xs">
                Start with the signal, then go deeper into the story.
              </p>
              <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/leaderboards"
                className="inline-flex items-center rounded-md border border-white/15 bg-white/95 px-3 py-2 text-xs sm:text-sm font-semibold text-black hover:bg-white transition-colors"
              >
                Explore Leaderboards
              </Link>
              <Link
                href="/how-scores-work"
                className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                How Scores Work
              </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-[95%] sm:w-[90%] py-4 sm:py-6">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl">
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground">
                How It Works
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground leading-tight max-w-xl">
                Decision support in 3 steps
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted-foreground">
                We transform raw quarterly commentary into a consistent system
                you can scan, compare, and track over time.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  title: "1) Parse & structure",
                  body: "Convert dense concalls and disclosures into crisp, comparable points.",
                },
                {
                  title: "2) Score what matters",
                  body: "Apply a structured scoring framework to highlight strength, weakness, and direction.",
                },
                {
                  title: "3) Track & compare",
                  body: "Use timelines and leaderboards to monitor change and prioritize research.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4 min-h-32 hover:bg-accent transition-colors"
                >
                  <p className="text-sm font-semibold text-foreground leading-snug flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                    {item.title}
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-border pt-6">
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Top Features
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    title: "Quarter Score Timeline",
                    body: "See how a company’s quarterly score evolves over time, not just one data point.",
                  },
                  {
                    title: "Growth Outlook Scenarios",
                    body: "Base, upside, and downside growth cases with confidence and key risk/driver context.",
                  },
                  {
                    title: "Concall Detail Drawer",
                    body: "Open quarter-level rationale, guidance, results summary, and risks in one place.",
                  },
                  {
                    title: "Latest Updates Feed",
                    body: "Know what changed recently across quarter-score and growth updates.",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-lg border border-border bg-muted/30 p-3 min-h-28 hover:bg-accent transition-colors"
                  >
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400/90" />
                      {feature.title}
                    </p>
                    <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {feature.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
        <div className="py-4 sm:py-8 lg:py-12 flex flex-col gap-8 sm:gap-12 lg:gap-16 w-full p-5 items-center"></div>

        <footer className="sm:w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-4 sm:gap-8 py-10 sm:py-16">
          <p>
            An experimental project by{" "}
            <a
              href="https://pranavyadav.dev/"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Pranav Yadav
            </a>
          </p>
          {/* <ThemeSwitcher /> */}
        </footer>
      </div>
    </main>
  );
}
