import { Suspense } from "react";
import Link from "next/link";
import TopStocks from "./(hero)/top-stocks";
import RecentScoreUpdates from "./(hero)/recent-score-updates";

function TopStocksFallback() {
  return (
    <div className="flex w-[95%] flex-col items-center gap-4 pt-8 sm:pt-12">
      <div className="text-center space-y-1">
        <p className="text-2xl sm:text-3xl lg:text-5xl font-extrabold !leading-tight">
          Concall Signals
        </p>
        <p className="text-xs sm:text-sm text-gray-400 px-2">
          Loading latest rankings...
        </p>
      </div>
      <div className="w-full sm:w-[90%] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-gray-800 bg-gray-950/70 p-3 h-44 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function TopStocksHeroFallback() {
  return (
    <section className="w-full">
      <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4 h-80 animate-pulse" />
    </section>
  );
}

export default async function Home() {
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
        <section className="w-[95%] sm:w-[90%] py-10 sm:py-14">
          <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl">
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-gray-400">
                What This Website Does
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white leading-tight">
                Converts textual data into crisp points for decision-making
              </h2>
              <p className="mt-4 text-sm sm:text-base text-gray-400">
                Story of a Stock turns dense management commentary into clearer
                insights and uses a structured scoring framework to show what is
                strong, weak, or changing so investors can learn nuance over
                time.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  title: "High quality research",
                  body: "Reads between the lines of concalls and disclosures to surface sharper investment insight.",
                },
                {
                  title: "Standardized comparison",
                  body: "Quarter score and growth score make cross-company ranking easier.",
                },
                {
                  title: "Tracks trend, not noise",
                  body: "Shows direction across quarters so changes are visible early.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-gray-800/80 bg-black/30 p-3 sm:p-4 min-h-32 hover:bg-black/40 hover:border-gray-700 transition-colors"
                >
                  <p className="text-sm font-semibold text-white leading-snug flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                    {item.title}
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-gray-400 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                href="/leaderboards"
                className="inline-flex items-center rounded-md border border-white/15 bg-white/95 px-3 py-2 text-xs sm:text-sm font-semibold text-black hover:bg-white transition-colors"
              >
                Explore Leaderboards
              </Link>
              <Link
                href="/how-scores-work"
                className="inline-flex items-center rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs sm:text-sm font-medium text-gray-200 hover:bg-gray-800 transition-colors"
              >
                How Scores Work
              </Link>
            </div>

            <div className="mt-6 border-t border-gray-800 pt-6">
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-gray-400">
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
                    className="rounded-lg border border-gray-800/80 bg-black/25 p-3 min-h-28 hover:bg-black/40 hover:border-gray-700 transition-colors"
                  >
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400/90" />
                      {feature.title}
                    </p>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-400 leading-relaxed">
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
