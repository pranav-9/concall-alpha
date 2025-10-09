import { Hero } from "@/components/hero";
import TopStocks from "./(hero)/top-stocks";
import FeatureOne from "./(hero)/feature-1";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  let isLoggedIn: boolean = false;
  if (error || !data?.claims) {
    // redirect("/auth/login");
    console.log("not logged in");
  } else {
    console.log("logged in ");
    isLoggedIn = true;
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-[90%] sm:w-full flex flex-col gap-0 justify-items-center items-center">
        {/* <Navbar></Navbar> */}
        {!isLoggedIn && <Hero />}
        <TopStocks></TopStocks>
        <div className="py-32 flex flex-col gap-20 w-full p-5 items-center">
          {/* <h1>Search</h1> */}
          {/* <InputWithButton></InputWithButton>
          <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" /> */}
          {/* <h1>top lists</h1> */}

          <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
          {/* <h1>Our Features</h1> */}
        </div>

        {/* <CarouselSize></CarouselSize> */}
        {!isLoggedIn && <FeatureOne />}

        {/* <CarouselDemo></CarouselDemo> */}
        {/* <FeatureOne></FeatureOne> */}

        <footer className="sm:w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
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
