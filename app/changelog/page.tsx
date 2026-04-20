import type { Metadata } from "next";
import Link from "next/link";
import {
  IconArrowRight,
  IconListDetails,
  IconSparkles,
  IconTimeline,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import { changelogEntries } from "./changelog-data";

export const metadata: Metadata = {
  title: "Changelog – Story of a Stock",
  description: "Release notes and portal updates for Story of a Stock.",
};

const PAGE_BACKGROUND_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.78),_transparent_62%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.34),_transparent_62%)]";

const PAGE_SHELL_CLASS =
  "mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5 lg:px-8";

const HERO_CARD_CLASS =
  "rounded-[1.6rem] border border-violet-200/35 bg-gradient-to-br from-background/97 via-background/92 to-violet-50/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_18px_36px_-30px_rgba(15,23,42,0.26)] backdrop-blur-sm dark:border-violet-700/25 dark:from-background/90 dark:via-background/84 dark:to-violet-950/12";

const PANEL_CARD_CLASS =
  "rounded-[1.45rem] border border-violet-200/25 bg-gradient-to-br from-background/97 via-background/93 to-violet-50/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_28px_-26px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-violet-700/20 dark:from-background/90 dark:via-background/84 dark:to-violet-950/10";

const RELEASE_CARD_CLASS =
  "rounded-[1.5rem] border border-border/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92),rgba(245,243,255,0.7))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_16px_30px_-28px_rgba(15,23,42,0.25)] transition-colors hover:border-border/55 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(17,24,39,0.92),rgba(49,46,129,0.14))]";

const CHIP_CLASS =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors";

const CHIP_NEUTRAL_CLASS =
  "border-border/60 bg-background/80 text-foreground";

const CHIP_PRIMARY_CLASS =
  "border-violet-200/60 bg-violet-100/70 text-violet-800 dark:border-violet-700/35 dark:bg-violet-900/30 dark:text-violet-200";

const KIND_CLASSES: Record<"added" | "improved" | "fixed", string> = {
  added:
    "border-emerald-200/70 bg-emerald-100/80 text-emerald-800 dark:border-emerald-700/35 dark:bg-emerald-900/30 dark:text-emerald-200",
  improved:
    "border-sky-200/70 bg-sky-100/80 text-sky-800 dark:border-sky-700/35 dark:bg-sky-900/30 dark:text-sky-200",
  fixed:
    "border-amber-200/70 bg-amber-100/80 text-amber-800 dark:border-amber-700/35 dark:bg-amber-900/30 dark:text-amber-200",
};

const ACCENT_CLASSES: Record<
  "violet" | "sky" | "emerald" | "amber",
  {
    panel: string;
    badge: string;
  }
> = {
  violet: {
    panel:
      "border-violet-200/55 bg-violet-50/60 dark:border-violet-700/35 dark:bg-violet-950/16",
    badge:
      "border-violet-200/60 bg-violet-100/80 text-violet-800 dark:border-violet-700/35 dark:bg-violet-900/30 dark:text-violet-200",
  },
  sky: {
    panel:
      "border-sky-200/55 bg-sky-50/60 dark:border-sky-700/35 dark:bg-sky-950/16",
    badge:
      "border-sky-200/60 bg-sky-100/80 text-sky-800 dark:border-sky-700/35 dark:bg-sky-900/30 dark:text-sky-200",
  },
  emerald: {
    panel:
      "border-emerald-200/55 bg-emerald-50/60 dark:border-emerald-700/35 dark:bg-emerald-950/16",
    badge:
      "border-emerald-200/60 bg-emerald-100/80 text-emerald-800 dark:border-emerald-700/35 dark:bg-emerald-900/30 dark:text-emerald-200",
  },
  amber: {
    panel:
      "border-amber-200/55 bg-amber-50/60 dark:border-amber-700/35 dark:bg-amber-950/16",
    badge:
      "border-amber-200/60 bg-amber-100/80 text-amber-800 dark:border-amber-700/35 dark:bg-amber-900/30 dark:text-amber-200",
  },
};

const READING_RULES = [
  {
    title: "Newest first",
    body: "The top card should always be the latest shipped change, not the next thing on the roadmap.",
  },
  {
    title: "Short bullets",
    body: "Keep each highlight focused on one shipped improvement, fix, or addition.",
  },
  {
    title: "Workflow context",
    body: "If an update changes how users research stocks, call out the affected page or flow.",
  },
];

const QUICK_LINKS = [
  { href: "/requests", label: "Submit a request" },
  { href: "/how-scores-work", label: "Review the score model" },
  { href: "/leaderboards", label: "Open leaderboards" },
];

export default function ChangelogPage() {
  const latestEntry = changelogEntries[0];
  const uniqueScopeCount = new Set(changelogEntries.map((entry) => entry.scope)).size;

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL_CLASS}>
        <section className={HERO_CARD_CLASS}>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Changelog</span>
                <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>Release ledger</span>
                <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>Portal updates</span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                Product surface
              </p>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                What changed in the portal
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Track shipped portal changes in reverse chronological order. The newest release is
                always first, with each card showing what changed, where it landed, and how it
                affects the research workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/45 bg-background/72 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Latest version
                </p>
                <p className="mt-2 text-[2rem] font-black leading-none text-foreground">
                  {latestEntry.version}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Released {latestEntry.releasedLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-border/45 bg-background/72 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Release entries
                </p>
                <p className="mt-2 text-[2rem] font-black leading-none text-foreground">
                  {changelogEntries.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Curated portal notes in this ledger.
                </p>
              </div>
              <div className="rounded-2xl border border-border/45 bg-background/72 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Coverage
                </p>
                <p className="mt-2 text-[2rem] font-black leading-none text-foreground">
                  {uniqueScopeCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Portal areas currently represented.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <section className={PANEL_CARD_CLASS}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Release trail
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground">Latest changes first</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Each entry is compact by design: the version, release date, scope, and the small
                  set of shipped changes that matter to users.
                </p>
              </div>
              <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
                {changelogEntries.length} releases
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {changelogEntries.map((entry, index) => {
                const accent = ACCENT_CLASSES[entry.accent];
                const isLatest = index === 0;

                return (
                  <article
                    key={entry.version}
                    className={cn(
                      RELEASE_CARD_CLASS,
                      isLatest ? accent.panel : "border-border/35 bg-background/74",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn(CHIP_CLASS, accent.badge)}>{entry.version}</span>
                          <span className={cn(CHIP_CLASS, CHIP_NEUTRAL_CLASS)}>
                            {entry.releasedLabel}
                          </span>
                          <span className={cn(CHIP_CLASS, CHIP_NEUTRAL_CLASS)}>
                            {entry.scope}
                          </span>
                          {isLatest ? (
                            <span className={cn(CHIP_CLASS, accent.badge)}>Latest</span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-foreground">
                          {entry.title}
                        </h3>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                          {entry.summary}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                          accent.badge,
                        )}
                      >
                        Release
                      </span>
                    </div>

                    <ul className="mt-4 space-y-2">
                      {entry.highlights.map((item) => (
                        <li
                          key={item.text}
                          className="flex gap-3 rounded-2xl border border-border/35 bg-background/68 px-3 py-3"
                        >
                          <span
                            className={cn(
                              "mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                              KIND_CLASSES[item.kind],
                            )}
                          >
                            {item.kind}
                          </span>
                          <p className="text-sm leading-6 text-foreground/82">{item.text}</p>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className={PANEL_CARD_CLASS}>
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Reading guide
              </p>
              <h2 className="text-xl font-bold text-foreground">How this log is used</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                The changelog is the product memory for the portal: shipped changes, the affected
                workflow, and the compact reason it matters.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {READING_RULES.map((rule, index) => (
                <div
                  key={rule.title}
                  className="rounded-[1.3rem] border border-border/35 bg-background/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                        index === 0
                          ? "border-violet-200/60 bg-violet-100/80 text-violet-800 dark:border-violet-700/35 dark:bg-violet-900/30 dark:text-violet-200"
                          : index === 1
                            ? "border-sky-200/60 bg-sky-100/80 text-sky-800 dark:border-sky-700/35 dark:bg-sky-900/30 dark:text-sky-200"
                            : "border-emerald-200/60 bg-emerald-100/80 text-emerald-800 dark:border-emerald-700/35 dark:bg-emerald-900/30 dark:text-emerald-200",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{rule.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{rule.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-border/45 bg-background/72 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Quick links
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className="inline-flex items-center justify-between rounded-full border border-border/60 bg-background/80 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <span>{item.label}</span>
                    <IconArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-violet-200/35 bg-violet-50/70 p-4 dark:border-violet-700/25 dark:bg-violet-950/16">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                <IconTimeline className="h-4 w-4" />
                Release policy
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <IconSparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  Shipped changes only
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <IconListDetails className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  Compact notes that stay easy to scan
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
