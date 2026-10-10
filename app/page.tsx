import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_MARK_VIEWBOX, BrandGlyph } from "@/components/brand/logo";
import { TelegramJoinLink } from "@/components/telegram-join-link";
import { getTelegramJoinUrl } from "@/lib/community";
import {
  COVER_TILES,
  CommunityFigure,
  ResearchFigure,
  ScanFigure,
  TrackFigure,
} from "./(hero)/home-figures";

// Title/description are inherited from the root layout; this exists only to
// pin the canonical so query-string variants don't get indexed separately.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const WRAP = "mx-auto w-full max-w-[1180px] px-5 sm:px-8 lg:px-10";

// The poster headings ("Find it.", "Signal, not noise.") and the two-column
// rows they sit in; the right column starts just past the middle, as drawn.
const POSTER = "home-display text-[clamp(2.75rem,5.8vw,5.5rem)]";
const ROW = "grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10";
const FIGURE = "h-auto w-full max-w-[21rem]";

const STEPS = [
  { heading: "Find it.", step: "01", label: "Scan", Figure: ScanFigure },
  { heading: "Understand it.", step: "02", label: "Research", Figure: ResearchFigure },
  { heading: "Follow it.", step: "03", label: "Track", Figure: TrackFigure },
] as const;

function DeskButton() {
  return (
    <Link href="/desk" className="home-cta">
      Open the Desk <span aria-hidden>→</span>
    </Link>
  );
}

export default function Home() {
  const telegramUrl = getTelegramJoinUrl();

  return (
    <main className="house home flex min-h-screen flex-col gap-24 pb-20 lg:gap-32 lg:pb-28">
      {/* Hero — one viewport: the line, who it's for, the way in. The brand
          mark sits behind it as a watermark, not a picture. */}
      <section className="relative overflow-hidden">
        <div
          className={`${WRAP} relative flex min-h-[calc(100svh-var(--global-navbar-height))] flex-col`}
        >
          <svg
            viewBox={BRAND_MARK_VIEWBOX}
            aria-hidden
            className="home-watermark pointer-events-none absolute right-[-34%] top-1/2 aspect-square h-[52%] -translate-y-1/2 sm:right-[-10%] lg:left-[77.5%] lg:right-auto lg:h-[56%] lg:-translate-x-1/2"
          >
            <BrandGlyph />
          </svg>

          <div className="relative flex flex-1 items-center py-14">
            <div>
              <h1 className="home-display text-[clamp(3.5rem,7.8vw,7.25rem)]">
                <span className="block">Every stock</span>
                <span className="block text-[var(--ink-soft)]">has a story.</span>
              </h1>
              <p className="mt-6 text-lg text-[var(--ink-soft)] sm:mt-8 sm:text-xl lg:text-[1.375rem]">
                For the long-term fundamental investor.
              </p>
              <div className="mt-8 sm:mt-10">
                <DeskButton />
              </div>
            </div>
          </div>

          <p className="house-data house-micro relative flex items-center gap-2.5 pb-8 text-[var(--ink-soft)] sm:pb-12">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[var(--signal)]" />
            A fundamental scanner and stock research platform
          </p>
        </div>
      </section>

      {/* How it's used — three verbs, each with its drawing. */}
      <section aria-label="How it works" className={WRAP}>
        <ol className="border-y border-[var(--rule-strong)]">
          {STEPS.map(({ heading, step, label, Figure }, i) => (
            <li
              key={label}
              className={`${ROW} py-10 lg:py-11 ${i > 0 ? "border-t border-[var(--rule)]" : ""}`}
            >
              <h2 className={POSTER}>{heading}</h2>
              <div className="lg:pt-12">
                <p className="flex items-baseline gap-3">
                  <span className="house-data text-[0.7rem] text-[var(--ink-soft)]">{step}</span>
                  <span className="home-label text-2xl">{label}</span>
                </p>
                <Figure className={`mt-5 ${FIGURE}`} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* What every company page carries. The blank cell completes the grid
          at two and five columns; at three, nine tiles already fill it. */}
      <section aria-labelledby="cover-heading" className={WRAP}>
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="cover-heading" className="house-data house-micro text-[var(--ink-soft)]">
            What we cover
          </h2>
          <p className="house-data house-micro text-[var(--ink-soft)]">Every company page</p>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3 lg:grid-cols-5">
          {COVER_TILES.map(({ label, Glyph }) => (
            <li
              key={label}
              className="flex aspect-[1.31] flex-col justify-between gap-3 bg-[var(--paper)] p-4 sm:p-5"
            >
              <Glyph className="h-auto w-full" />
              <p className="home-label text-base sm:text-lg lg:text-[1.3rem]">{label}</p>
            </li>
          ))}
          <li aria-hidden className="bg-[var(--paper)] sm:hidden lg:block" />
        </ul>
      </section>

      {/* The community. Env-gated like every join affordance: no invite URL,
          no section, never a dead link. */}
      {telegramUrl ? (
        <section aria-labelledby="community-heading" className={`${WRAP} ${ROW}`}>
          <h2 className={POSTER}>
            <span className="block">Signal,</span>
            <span className="block">not noise.</span>
          </h2>
          <div className="lg:pt-10">
            <h3 id="community-heading" className="home-label text-2xl">
              The community
            </h3>
            <CommunityFigure className={`mt-4 ${FIGURE}`} />
            <p className="mt-4 text-[0.95rem] text-[var(--ink-soft)]">
              Deep-research people who obsess over quality.
            </p>
            <TelegramJoinLink
              href={telegramUrl}
              surface="home"
              className="house-data house-link mt-4 inline-block text-[0.8rem]"
            >
              Join on Telegram →
            </TelegramJoinLink>
          </div>
        </section>
      ) : null}

      <section className={WRAP}>
        <div className="flex flex-col gap-6 border-y border-[var(--rule)] py-9 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <h2 className="home-display text-[clamp(2rem,3vw,2.75rem)]">
            Your own research starts here.
          </h2>
          <div className="shrink-0">
            <DeskButton />
          </div>
        </div>
      </section>
    </main>
  );
}
