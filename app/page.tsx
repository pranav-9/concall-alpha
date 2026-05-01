import { Suspense } from "react";
import ConcallScore from "@/components/concall-score";
import TopStocks from "./(hero)/top-stocks";
import RecentScoreUpdates from "./(hero)/recent-score-updates";
import HeroCoverageStats, {
  HeroCoverageStatsFallback,
} from "./(hero)/hero-coverage-stats";
import { Q4FY26Banner } from "@/components/q4fy26-banner";

function TopStocksHeroFallback() {
  return (
    <section className="w-full">
      <div className="rounded-xl border border-border bg-card p-4 h-80 animate-pulse" />
    </section>
  );
}

function RecentScoreUpdatesHeroFallback() {
  return (
    <div className="h-full w-full rounded-xl border border-border bg-card animate-pulse" />
  );
}

export default function Home() {
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
      <Q4FY26Banner />
      <div className="absolute inset-x-0 -top-28 -z-10 h-[42rem] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_36%),linear-gradient(180deg,_rgba(15,23,42,0.03),_transparent_58%)]" />
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:gap-10 lg:px-10 lg:py-10">
        <section className="grid grid-cols-1 gap-4 lg:min-h-[80vh] supports-[height:100dvh]:lg:min-h-[80dvh] lg:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)] lg:items-stretch">
          <div className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92),rgba(240,249,255,0.88))] p-4 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.35)] sm:p-6 lg:h-full lg:p-8 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(17,24,39,0.94),rgba(8,47,73,0.72))]">
            <div className="flex h-full flex-col gap-5 lg:justify-between">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:gap-2 sm:text-[11px]">
                  <span className="rounded-full border border-emerald-300/60 bg-emerald-100/80 px-3 py-1 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/25 dark:text-emerald-200">
                    Business Analysis portal
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1">
                    Built for long-term investors
                  </span>
                </div>

                <div className="max-w-4xl space-y-3">
                  <h1 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl">
                    India&apos;s first fundamental screener
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-foreground/78 sm:text-base">
                    We turn commentary, guidance, and business context into a structured research
                    layer on top of quantitative data, so the numbers come with a real story.
                  </p>
                </div>

                <Suspense fallback={<HeroCoverageStatsFallback />}>
                  <HeroCoverageStats />
                </Suspense>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:h-full">
            <Suspense fallback={<RecentScoreUpdatesHeroFallback />}>
              <RecentScoreUpdates heroPanel />
            </Suspense>
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

          <div className="rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.92),rgba(255,255,255,0.98))] p-4 shadow-[0_18px_70px_-42px_rgba(15,23,42,0.4)] dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.95),rgba(15,23,42,0.95),rgba(2,6,23,0.95))] sm:p-6 lg:p-8">
            <div className="max-w-4xl">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Analysis framework
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                7-step framework
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 sm:mt-8">
              {analysisFramework.map((item) => (
                <div
                  key={item.title}
                  className={`group rounded-[1.65rem] border p-4 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.35)] transition-transform transition-colors hover:-translate-y-0.5 sm:min-h-48 sm:p-5 ${item.borderClass}`}
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

          <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-4 shadow-[0_18px_70px_-46px_rgba(15,23,42,0.42)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] sm:p-7 lg:p-8">
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
                className="inline-flex w-full items-center justify-center rounded-full border border-border bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-[0_18px_45px_-30px_rgba(15,23,42,0.7)] transition-transform hover:-translate-y-0.5 sm:w-fit"
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
