import { Suspense } from "react";
import { ChevronDown } from "lucide-react";
import ConcallScore from "@/components/concall-score";
import TopStocks from "./(hero)/top-stocks";
import CoverageStrip, { CoverageStripFallback } from "./(hero)/coverage-strip";
import LatestUpdatesCarousel, {
  LatestUpdatesCarouselFallback,
} from "./(hero)/latest-updates-carousel";
import { CompanySearch } from "@/components/company-search";
import { getCachedCompanySearchRows } from "@/lib/company-search-cache";
import { QuarterTrackerBanner } from "@/components/quarter-tracker-banner";
import { cn } from "@/lib/utils";
import {
  INNER_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PANEL_CARD_NEUTRAL,
} from "@/lib/design/shell";

function TopStocksHeroFallback() {
  return (
    <section className="w-full">
      <div className="rounded-xl border border-border bg-card p-4 h-80 animate-pulse" />
    </section>
  );
}

export default async function Home() {
  const companies = await getCachedCompanySearchRows().catch(() => []);

  const analysisFramework = [
    {
      title: "Business Snapshot",
      eyebrow: "Business layer",
      body:
        "Break the company into segments, revenue drivers, business mix, and the historical economics that explain how it has made money.",
      stripClass: "bg-emerald-500/80",
      badge: { kind: "text" as const, label: "25% 4 yr CAGR" },
    },
    {
      title: "Moat Analysis",
      eyebrow: "Durability layer",
      body:
        "The durability layer: competitive position, structural advantages, and what could erode them.",
      stripClass: "bg-emerald-500/80",
      badge: { kind: "moat" as const, label: "Narrow Moat" },
    },
    {
      title: "Quarterly Score",
      eyebrow: "Score layer",
      body:
        "Get a compact read on the latest quarter so a beginner can orient quickly and an advanced investor can spot signal changes fast.",
      stripClass: "bg-amber-500/80",
      badge: { kind: "score" as const, value: 8.2 },
    },
    {
      title: "Key Variables",
      eyebrow: "Operating layer",
      body:
        "Track the few non-financial business variables that best explain whether growth quality is strengthening or weakening.",
      stripClass: "bg-violet-500/80",
      badge: { kind: "text" as const, label: "18% volume growth" },
    },
    {
      title: "Future Growth",
      eyebrow: "Forward layer",
      body:
        "Move from what has happened to what could happen next through catalysts, scenarios, and the forward setup.",
      stripClass: "bg-sky-500/80",
      badge: { kind: "score" as const, value: 8.7, scoreKind: "growth" as const },
    },
    {
      title: "Guidance Tracker",
      eyebrow: "Management layer",
      body:
        "See how management has guided over time, what changed, and whether credibility is strengthening or deteriorating.",
      stripClass: "bg-amber-500/80",
      badge: { kind: "text" as const, label: "15% growth" },
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <QuarterTrackerBanner />
      <div className={cn(PAGE_BACKGROUND_ATMOSPHERIC, "-top-28 h-[56rem]")} />
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-6 sm:px-6 sm:pb-8 lg:gap-10 lg:px-10 lg:pb-10">
        {/* Row 1 — full-viewport hero: title, subtitle, search, coverage strip */}
        <section className="flex min-h-[calc(100svh-var(--global-navbar-height,4.25rem))] flex-col items-center text-center">
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
            <div className="space-y-4">
              <h1 className="mx-auto max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl">
                Research, not just numbers.
              </h1>
              <p className="mx-auto max-w-2xl text-sm leading-7 text-foreground/78 sm:text-base">
                Every concall, read for you — the quarter, in a minute.
              </p>
            </div>

            <CompanySearch
              className="w-full max-w-xl"
              instanceId="hero-search"
              initialCompanies={companies}
            />

            <Suspense fallback={<CoverageStripFallback />}>
              <CoverageStrip />
            </Suspense>
          </div>

          <a
            href="#latest-updates"
            className="flex flex-col items-center gap-1 pb-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Latest updates</span>
            <ChevronDown className="h-4 w-4 motion-safe:animate-bounce" />
          </a>
        </section>

        {/* Row 2 — latest updates carousel */}
        <section id="latest-updates" className="scroll-mt-24">
          <Suspense fallback={<LatestUpdatesCarouselFallback />}>
            <LatestUpdatesCarousel />
          </Suspense>
        </section>

        <section className="space-y-6">
          <div className={cn(PANEL_CARD_NEUTRAL, "sm:p-6")}>
            <div className="mb-5">
              <h2 className="text-2xl font-bold leading-tight text-foreground">
                Top-rated companies
              </h2>
            </div>
            <Suspense fallback={<TopStocksHeroFallback />}>
              <TopStocks heroPanel />
            </Suspense>
          </div>

          <div className={cn(PANEL_CARD_NEUTRAL, "sm:p-6 lg:p-8")}>
            <div className="max-w-4xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Analysis framework
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                6-layer framework
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 sm:mt-8">
              {analysisFramework.map((item) => (
                <div
                  key={item.title}
                  className={cn(
                    INNER_CARD,
                    "group relative overflow-hidden p-4 transition-transform hover:-translate-y-0.5 sm:min-h-48 sm:p-5",
                  )}
                >
                  <div className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 ${item.stripClass}`} />
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {item.eyebrow}
                      </p>
                      <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">
                        {item.title}
                      </h3>
                    </div>
                    {item.badge.kind === "score" ? (
                      <ConcallScore
                        score={item.badge.value}
                        size="sm"
                        className="ring-2"
                        kind={"scoreKind" in item.badge ? item.badge.scoreKind : "quarterly"}
                      />
                    ) : item.badge.kind === "moat" ? (
                      <span className="shrink-0 rounded-full border border-violet-200/60 bg-violet-100/70 px-2.5 py-1 text-[10px] font-medium text-violet-800 dark:border-violet-700/35 dark:bg-violet-900/30 dark:text-violet-200">
                        {item.badge.label}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-foreground">
                        {item.badge.label}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm leading-5 text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(PANEL_CARD_NEUTRAL, "overflow-hidden sm:p-7 lg:p-8")}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-rose-200/60 bg-rose-100/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-800 dark:border-rose-700/35 dark:bg-rose-900/30 dark:text-rose-200">
                    Video research
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Company walkthroughs
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  Watch the research in action
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Company walkthroughs using Story of a Stock to connect business context,
                  management commentary, and numbers.
                </p>
              </div>
              <a
                href="https://www.youtube.com/@pranavyadav6958"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-foreground/90 sm:w-fit"
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
