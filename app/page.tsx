import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import TopStocks from "./(hero)/top-stocks";
import HeroExhibit, { HeroExhibitFallback } from "./(hero)/hero-exhibit";
import LatestUpdatesCarousel, {
  LatestUpdatesCarouselFallback,
} from "./(hero)/latest-updates-carousel";
import { getCachedCompanySearchRows } from "@/lib/company-search-cache";
import { QuarterTrackerBanner } from "@/components/quarter-tracker-banner";
import { HotThemesTeaser } from "./themes/hot-themes-teaser";

// Title/description are inherited from the root layout; this exists only to
// pin the canonical so query-string variants don't get indexed separately.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// The six reads we publish per company. Not a sequence — six lenses on the same
// documents — so they carry no step numbers; the question each one answers is
// the structure that matters.
const READS = [
  {
    layer: "Business Snapshot",
    question: "What does this company actually sell, and to whom?",
    body:
      "Segments, revenue drivers, business mix, and the historical economics that explain how the money has been made.",
    example: "25% 4-yr revenue CAGR",
  },
  {
    layer: "Moat Analysis",
    question: "Can it keep earning this?",
    body:
      "The competitive position, the structural advantages holding it up, and what would erode them.",
    example: "Narrow moat",
  },
  {
    layer: "Quarterly Score",
    question: "Was this call better or worse than the last one?",
    body:
      "One score per concall with the reasoning printed beside it — the trail on this page is made of these.",
    example: "8.2 this quarter",
  },
  {
    layer: "Key Variables",
    question: "Which few numbers actually move the story?",
    body:
      "The non-financial operating variables management keeps returning to, tracked call over call.",
    example: "Volume +18%",
  },
  {
    layer: "Future Growth",
    question: "What has to happen next?",
    body:
      "Catalysts, scenarios, and the forward setup management has laid out — separated from what already happened.",
    example: "Growth read 8.7",
  },
  {
    layer: "Guidance Tracker",
    question: "Do they do what they said they would?",
    body:
      "What management guided, what landed, and whether their credibility is building or leaking.",
    example: "Guided 15%, hit 14%",
  },
];

function TopStocksFallback() {
  return (
    <div className="h-80 animate-pulse rounded border border-[var(--rule)] bg-[var(--paper-2)]" />
  );
}

export default async function Home() {
  const companies = await getCachedCompanySearchRows().catch(() => []);

  return (
    <main className="house relative min-h-screen">
      <QuarterTrackerBanner />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-4 pb-16 sm:px-6 lg:gap-16 lg:px-10">
        {/* The exhibit — one company's whole scored history, full viewport. */}
        <section className="flex min-h-[calc(100svh-var(--global-navbar-height,4.25rem)-var(--quarter-tracker-banner-height,2.25rem))] flex-col justify-center py-6">
          <Suspense fallback={<HeroExhibitFallback />}>
            <HeroExhibit companies={companies} />
          </Suspense>
        </section>

        <section aria-labelledby="updates-heading" className="house-block">
          <Suspense fallback={<LatestUpdatesCarouselFallback />}>
            <LatestUpdatesCarousel
              heading={
                <>
                  <p className="house-data house-micro text-[var(--ink-soft)]">
                    Plate 02 — Fresh reads
                  </p>
                  <h2 id="updates-heading" className="house-display mt-2 text-2xl sm:text-3xl">
                    What landed most recently
                  </h2>
                </>
              }
            />
          </Suspense>
        </section>

        <section aria-labelledby="leaders-heading" className="house-block">
          <p className="house-data house-micro text-[var(--ink-soft)]">Plate 03 — Where the reads are strongest</p>
          <h2 id="leaders-heading" className="house-display mt-2 text-2xl sm:text-3xl">
            Top-rated right now
          </h2>
          <div className="mt-6">
            <Suspense fallback={<TopStocksFallback />}>
              <TopStocks heroPanel />
            </Suspense>
          </div>
        </section>

        <Suspense fallback={null}>
          <HotThemesTeaser />
        </Suspense>

        <section aria-labelledby="reads-heading" className="house-block">
          <div className="max-w-2xl">
            <p className="house-data house-micro text-[var(--ink-soft)]">Plate 05 — What we publish</p>
            <h2 id="reads-heading" className="house-display mt-2 text-2xl sm:text-3xl">
              Six reads on the same documents
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              Every company page is built from concall transcripts, investor presentations,
              and annual reports — read six different ways.
            </p>
          </div>

          <div className="house-ledger">
            <div className="house-ledger-row house-ledger-head house-data house-micro text-[var(--ink-soft)]">
              <span>Read</span>
              <span>What it answers</span>
              <span className="md:text-right">Example output</span>
            </div>
            {READS.map((read) => (
              <div key={read.layer} className="house-ledger-row">
                <p className="house-display text-base">{read.layer}</p>
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{read.question}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{read.body}</p>
                </div>
                <p className="house-data house-micro text-[var(--ink-soft)] md:text-right">
                  {read.example}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="watch-heading" className="house-block">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="house-data house-micro text-[var(--ink-soft)]">Plate 06 — On video</p>
              <h2 id="watch-heading" className="house-display mt-2 text-2xl sm:text-3xl">
                Watch a company get read
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                Walkthroughs that connect the business context, the management commentary,
                and the numbers — the same route the site takes, narrated.
              </p>
            </div>
            <a
              href="https://www.youtube.com/@pranavyadav6958"
              target="_blank"
              rel="noreferrer"
              className="house-data house-micro w-fit border-b-2 border-[var(--mark)] pb-1 text-[var(--ink)] transition-colors hover:text-[var(--signal)]"
            >
              Watch on YouTube →
            </a>
          </div>
        </section>

        <p className="house-data house-micro border-t border-[var(--rule)] pt-5 text-[var(--ink-soft)]">
          Scores read documents, not prices.{" "}
          <Link href="/how-scores-work" prefetch={false} className="house-link">
            How scores work
          </Link>
        </p>
      </div>
    </main>
  );
}
