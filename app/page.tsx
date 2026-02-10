import { Hero } from "@/components/hero";
import TopStocks from "./(hero)/top-stocks";
import FeatureOne from "./(hero)/feature-1";

export default async function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-[90%] sm:w-full flex flex-col gap-0 justify-items-center items-center">
        {/* <Navbar></Navbar> */}
        <TopStocks></TopStocks>
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
