import Link from "next/link";

import { getCachedFeaturedReads } from "@/lib/home-featured-read";
import { getCachedHomeTrails } from "@/lib/home-trails";
import ReadEquation from "./read-equation";
import ScorePlate from "./score-plate";
import WhyDifferent from "./why-different";
import CompareSectors from "./compare-sectors";

export function HeroExhibitFallback() {
  // Approximates the loaded hero (eyebrow + handwritten headline + equation-circle
  // row) so the Suspense boundary doesn't flash a mismatched shape.
  return (
    <div className="hero-canvas">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
        <div className="h-6 w-44 rounded-full bg-[var(--rule)]" />
        <div className="h-10 w-3/4 rounded bg-[var(--rule)]" />
        <div className="h-5 w-1/2 rounded bg-[var(--rule)]" />
      </div>
      <div className="mt-8 flex items-center justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-12 rounded-full bg-[var(--rule)]" />
        ))}
      </div>
    </div>
  );
}

const DeskCta = () => (
  <Link
    href="/desk"
    className="house-data house-micro inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 text-[var(--paper-2)] transition-opacity hover:opacity-90"
  >
    Open the Desk →
  </Link>
);

export default async function HeroExhibit() {
  const [{ exhibits }, reads] = await Promise.all([
    getCachedHomeTrails(),
    getCachedFeaturedReads(),
  ]);

  if (reads.length === 0 && exhibits.length === 0) return <HeroExhibitFallback />;

  // Primary hero: the read equation, laid out per the approved mockup — one
  // centered composition on the soft gradient canvas.
  if (reads.length > 0) {
    return (
      <div className="hero-canvas">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <span className="hero-eyebrow house-data house-micro">Smart research · AI-read</span>
          <h1 className="house-display text-4xl leading-[1.08] sm:text-5xl">
            Go beyond the numbers. A fundamental research platform
          </h1>
          <p className="max-w-xl text-lg leading-7 text-[var(--ink-soft)] sm:text-xl">
            Ranking India&apos;s top 100 mid- &amp; small-cap companies
          </p>
        </div>

        <div className="mt-10">
          <ReadEquation featured={reads[0]} />
        </div>

        <hr className="mx-auto my-10 max-w-5xl border-[var(--rule)]" />

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-2">
          <WhyDifferent />
          <CompareSectors reads={reads.slice(0, 3)} />
        </div>

        <div className="mt-10 flex justify-center">
          <DeskCta />
        </div>
      </div>
    );
  }

  // Fallback: no company currently clears all three legs (e.g. valuations went
  // stale as a cohort). Show the scored-trail plate instead of an empty hero.
  const fallbackCopy = (
    <div className="flex h-full flex-col justify-center gap-3">
      <span className="hero-eyebrow house-data house-micro w-fit">Smart research · AI-read</span>
      <h1 className="house-display text-4xl leading-[1.08] sm:text-5xl">
        Go beyond the numbers. A fundamental research platform
      </h1>
      <p className="text-lg leading-7 text-[var(--ink-soft)]">
        Ranking India&apos;s top 100 mid- &amp; small-cap companies
      </p>
      <div className="mt-2">
        <DeskCta />
      </div>
    </div>
  );

  return <ScorePlate trails={exhibits}>{fallbackCopy}</ScorePlate>;
}
