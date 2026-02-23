import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TopStocks from "./(hero)/top-stocks";
import RecentScoreUpdates from "./(hero)/recent-score-updates";

function TopStocksFallback() {
  return (
    <div className="flex w-[95%] flex-col items-center gap-4 pt-8 sm:pt-12">
      <div className="text-center space-y-1">
        <p className="text-2xl sm:text-3xl lg:text-5xl font-extrabold !leading-tight">
          Concall Signals
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground px-2">
          Loading latest rankings...
        </p>
      </div>
      <div className="w-full sm:w-[90%] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-card p-3 h-44 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function TopStocksHeroFallback() {
  return (
    <section className="w-full">
      <div className="rounded-xl border border-border bg-card p-4 h-80 animate-pulse" />
    </section>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { count: totalCompanies } = await supabase
    .from("company")
    .select("code", { count: "exact", head: true });

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

        <div className="lg:hidden w-full">
          <RecentScoreUpdates />
          <Suspense fallback={<TopStocksFallback />}>
            <TopStocks />
          </Suspense>
        </div>
        <section className="w-[95%] sm:w-[90%] pt-6 sm:pt-8">
          <div className="rounded-2xl border border-border bg-gradient-to-r from-card via-card to-muted/40 p-4 sm:p-5 lg:p-6">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Who This Is For
            </p>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold text-foreground leading-tight max-w-3xl">
              Built for investors who want signal over noise
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
              If you track Indian equities quarter by quarter, this platform
              helps you see what changed, why it matters, and where to focus
              next in minutes.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] border border-border bg-muted text-foreground">
                For serious retail investors
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] border border-border bg-muted text-foreground">
                For portfolio trackers
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] border border-border bg-muted text-foreground">
                For faster quarterly review
              </span>
              {typeof totalCompanies === "number" && (
                <span className="px-2.5 py-1 rounded-full text-[11px] border border-emerald-700/60 bg-emerald-900/30 text-emerald-200">
                  {totalCompanies} companies covered
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
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
