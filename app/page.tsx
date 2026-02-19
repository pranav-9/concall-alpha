import { Suspense } from "react";
import { Hero } from "@/components/hero";
import TopStocks from "./(hero)/top-stocks";
import FeatureOne from "./(hero)/feature-1";
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
        <Hero />
        <div className="py-12 sm:py-20 lg:py-32 flex flex-col gap-8 sm:gap-12 lg:gap-20 w-full p-5 items-center">
          {/* <h1>Search</h1> */}
          {/* <InputWithButton></InputWithButton>
          <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" /> */}
          {/* <h1>top lists</h1> */}

          <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
          {/* <h1>Our Features</h1> */}
        </div>

        {/* <CarouselSize></CarouselSize> */}
        <FeatureOne />

        {/* <CarouselDemo></CarouselDemo> */}
        {/* <FeatureOne></FeatureOne> */}

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
