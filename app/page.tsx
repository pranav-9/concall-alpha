import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isCompanyNew } from "@/lib/company-freshness";
import ConcallScore from "@/components/concall-score";
import { slugifySector } from "@/app/sector/utils";
import TopStocks from "./(hero)/top-stocks";
import RecentScoreUpdates from "./(hero)/recent-score-updates";
import { latestChangelogEntry } from "./changelog/changelog-data";

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
  const analysisFramework = [
    {
      title: "Industry Context",
      eyebrow: "Industry layer",
      body:
        "Understand the industry overview, value chain, classification map, regulations, tailwinds, and headwinds shaping the business.",
      accentClass: "bg-sky-400/90",
      borderClass:
        "border-sky-200/70 bg-[linear-gradient(180deg,rgba(240,249,255,0.95),rgba(255,255,255,0.98))] dark:border-sky-700/35 dark:bg-[linear-gradient(180deg,rgba(12,74,110,0.3),rgba(15,23,42,0.92))]",
      badge: { kind: "text" as const, label: "Maps + drivers" },
    },
    {
      title: "Business Snapshot",
      eyebrow: "Business layer",
      body:
        "Break the company into segments, revenue drivers, business mix, and the historical economics that explain how it has made money.",
      accentClass: "bg-amber-400/90",
      borderClass:
        "border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,255,255,0.98))] dark:border-amber-700/35 dark:bg-[linear-gradient(180deg,rgba(120,53,15,0.28),rgba(15,23,42,0.92))]",
      badge: { kind: "text" as const, label: "25% 4 yr CAGR" },
    },
    {
      title: "Quarterly Score",
      eyebrow: "Score layer",
      body:
        "Get a compact read on the latest quarter so a beginner can orient quickly and an advanced investor can spot signal changes fast.",
      accentClass: "bg-rose-400/90",
      borderClass:
        "border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,241,242,0.95),rgba(255,255,255,0.98))] dark:border-rose-700/35 dark:bg-[linear-gradient(180deg,rgba(127,29,29,0.28),rgba(15,23,42,0.92))]",
      badge: { kind: "score" as const, value: 8.2 },
    },
    {
      title: "Key Variables",
      eyebrow: "Operating layer",
      body:
        "Track the few non-financial business variables that best explain whether growth quality is strengthening or weakening.",
      accentClass: "bg-emerald-400/90",
      borderClass:
        "border-teal-200/70 bg-[linear-gradient(180deg,rgba(240,253,250,0.95),rgba(255,255,255,0.98))] dark:border-teal-700/35 dark:bg-[linear-gradient(180deg,rgba(19,78,74,0.3),rgba(15,23,42,0.92))]",
      badge: { kind: "text" as const, label: "18% volume growth" },
    },
    {
      title: "Future Growth",
      eyebrow: "Forward layer",
      body:
        "Move from what has happened to what could happen next through catalysts, scenarios, and the forward setup.",
      accentClass: "bg-sky-400/90",
      borderClass:
        "border-cyan-200/70 bg-[linear-gradient(180deg,rgba(236,254,255,0.95),rgba(255,255,255,0.98))] dark:border-cyan-700/35 dark:bg-[linear-gradient(180deg,rgba(14,116,144,0.28),rgba(15,23,42,0.92))]",
      badge: { kind: "score" as const, value: 8.7 },
    },
    {
      title: "Guidance Tracker",
      eyebrow: "Management layer",
      body:
        "See how management has guided over time, what changed, and whether credibility is strengthening or deteriorating.",
      accentClass: "bg-amber-400/90",
      borderClass:
        "border-orange-200/70 bg-[linear-gradient(180deg,rgba(255,247,237,0.95),rgba(255,255,255,0.98))] dark:border-orange-700/35 dark:bg-[linear-gradient(180deg,rgba(124,45,18,0.28),rgba(15,23,42,0.92))]",
      badge: { kind: "text" as const, label: "15% growth" },
    },
    {
      title: "Moat Analysis",
      eyebrow: "Durability layer",
      body:
        "Close with the durability layer: competitive position, structural advantages, and what could erode them.",
      accentClass: "bg-violet-400/90",
      borderClass:
        "border-violet-200/70 bg-[linear-gradient(180deg,rgba(245,243,255,0.95),rgba(255,255,255,0.98))] dark:border-violet-700/35 dark:bg-[linear-gradient(180deg,rgba(91,33,182,0.24),rgba(15,23,42,0.92))]",
      badge: { kind: "moat" as const, label: "Narrow Moat" },
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
            <section className="rounded-[2rem] border border-violet-200/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94),rgba(245,243,255,0.76))] p-4 shadow-[0_18px_70px_-42px_rgba(15,23,42,0.4)] dark:border-violet-700/25 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94),rgba(49,46,129,0.16))]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-200/60 bg-violet-100/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-800 dark:border-violet-700/35 dark:bg-violet-900/30 dark:text-violet-200">
                  Portal updates
                </span>
                <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {latestChangelogEntry.releasedLabel}
                </span>
              </div>

              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Changelog
                  </p>
                  <h3 className="mt-1 text-lg font-bold leading-tight text-foreground">
                    {latestChangelogEntry.title}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full border border-violet-200/60 bg-violet-100/70 px-2.5 py-1 text-[10px] font-medium text-violet-800 dark:border-violet-700/35 dark:bg-violet-900/30 dark:text-violet-200">
                  {latestChangelogEntry.version}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-foreground/75">
                {latestChangelogEntry.summary}
              </p>

              <ul className="mt-3 space-y-2">
                {latestChangelogEntry.highlights.slice(0, 2).map((item) => (
                  <li
                    key={item.text}
                    className="flex gap-2 rounded-2xl border border-border/35 bg-background/68 px-3 py-2.5"
                  >
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        item.kind === "added"
                          ? "border-emerald-200/70 bg-emerald-100/80 text-emerald-800 dark:border-emerald-700/35 dark:bg-emerald-900/30 dark:text-emerald-200"
                          : item.kind === "improved"
                            ? "border-sky-200/70 bg-sky-100/80 text-sky-800 dark:border-sky-700/35 dark:bg-sky-900/30 dark:text-sky-200"
                            : "border-amber-200/70 bg-amber-100/80 text-amber-800 dark:border-amber-700/35 dark:bg-amber-900/30 dark:text-amber-200"
                      }`}
                    >
                      {item.kind}
                    </span>
                    <p className="text-sm leading-6 text-foreground/80">{item.text}</p>
                  </li>
                ))}
              </ul>

              <Link
                href="/changelog"
                prefetch={false}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-violet-100/70 px-3 py-1.5 text-xs font-semibold text-violet-800 transition-colors hover:bg-violet-100 dark:border-violet-700/35 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/40"
              >
                Open changelog
                <span aria-hidden="true">→</span>
              </Link>
            </section>
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

          <div className="rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.92),rgba(255,255,255,0.98))] p-6 shadow-[0_18px_70px_-42px_rgba(15,23,42,0.4)] dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.95),rgba(15,23,42,0.95),rgba(2,6,23,0.95))] sm:p-6 lg:p-8">
            <div className="max-w-4xl">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Analysis framework
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                7-step framework
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {analysisFramework.map((item) => (
                <div
                  key={item.title}
                  className={`group min-h-48 rounded-[1.65rem] border p-4 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.35)] transition-transform transition-colors hover:-translate-y-0.5 sm:p-5 ${item.borderClass}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        <span className={`h-1.5 w-1.5 rounded-full ${item.accentClass}`} />
                        {item.eyebrow}
                      </p>
                      <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">
                        {item.title}
                      </h3>
                    </div>
                    {item.badge.kind === "score" ? (
                      <ConcallScore score={item.badge.value} size="sm" className="ring-2" />
                    ) : item.badge.kind === "moat" ? (
                      <span className="shrink-0 rounded-full border border-violet-200 bg-violet-100 px-2.5 py-1 text-[10px] font-medium text-violet-800 dark:border-violet-700/40 dark:bg-violet-900/30 dark:text-violet-200">
                        {item.badge.label}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-border/55 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-foreground/85">
                        {item.badge.label}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm leading-5 text-foreground/78">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-6 shadow-[0_18px_70px_-46px_rgba(15,23,42,0.42)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] sm:p-7 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-200">
                    Video research
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Company walkthroughs
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  Watch the research in action
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/75 sm:text-base">
                  Company walkthroughs using Story of a Stock to connect business context,
                  management commentary, and numbers.
                </p>
              </div>
              <a
                href="https://www.youtube.com/@pranavyadav6958"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center justify-center rounded-full border border-border bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-[0_18px_45px_-30px_rgba(15,23,42,0.7)] transition-transform hover:-translate-y-0.5"
              >
                Watch on YouTube →
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
