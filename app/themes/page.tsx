// /themes — Hot Themes. An editorial discovery door: 2-3 hand-picked, positively
// framed themes, each a compact ranked board of the covered companies riding it,
// on the same four scores as /leaderboards. Atmospheric surface family (matches
// /sectors and /leaderboards). If no themes are featured, the route renders nothing
// but the header — never an empty shell.

import type { Metadata } from "next";

import { currentReportingQuarter } from "@/lib/current-quarter";
import { HERO_CARD, PAGE_BACKGROUND_ATMOSPHERIC, PAGE_SHELL } from "@/lib/design/shell";
import { getFeaturedThemeBlocks } from "@/lib/themes/data";
import { BelowSm, FromSm } from "@/components/viewport-gate";
import { MOBILE_DEK, MobileMasthead } from "@/components/mobile-card";
import { ThemeBlockPhone } from "./theme-block-phone";
import { ThemeCard } from "./theme-card";

export const metadata: Metadata = {
  title: "Hot Themes – Story of a Stock",
  description:
    "What's working this quarter, and which of the companies we cover are riding it — on the same four scores as the leaderboard.",
  alternates: { canonical: "/themes" },
};

const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

export default async function ThemesPage() {
  const blocks = await getFeaturedThemeBlocks();
  const quarterLabel = currentReportingQuarter().label;
  const showInFocusLegend = blocks.some((b) => b.hotness != null);

  return (
    <main className="relative isolate overflow-hidden">
      {/* Phone (handoff 2026-09-13, "Themes — mobile"): the house skin, a compact
          masthead and one card per theme. From sm the atmospheric shell below
          stays as it was. Both trees are server-rendered and CSS-toggled; the
          hidden one unmounts once matchMedia answers (components/viewport-gate). */}
      <BelowSm className="house min-h-screen pb-6">
        <MobileMasthead eyebrow="What’s working now" title="Hot Themes">
          <p className={MOBILE_DEK}>
            What&apos;s working this quarter, and which covered names are riding it — on the
            same four scores as the leaderboard.
            {showInFocusLegend
              ? " Ordered by In\u00a0Focus, a measure of attention, not advice."
              : ""}
          </p>
        </MobileMasthead>
        {blocks.length > 0 ? (
          blocks.map((block) => (
            <ThemeBlockPhone key={block.slug} block={block} quarterLabel={quarterLabel} />
          ))
        ) : (
          <p className="mx-4 mt-4 text-[12.5px] leading-[1.5] text-[var(--ink-soft)]">
            No hot themes featured this quarter. Check back after results season — or explore
            the{" "}
            <a href="/leaderboards" className="house-link">
              full leaderboard
            </a>{" "}
            in the meantime.
          </p>
        )}
      </BelowSm>
      <FromSm>
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <div className="space-y-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              What&apos;s working now
            </p>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
              Hot Themes
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              What&apos;s working this quarter, the one factor driving it, the numbers behind it, and
              which of the companies we cover are riding it. Open a theme for every name on the
              leaderboard&apos;s four scores — Quarter, Growth, Valuation, and our overall Read.
            </p>
            {showInFocusLegend && (
              <p className="text-xs leading-relaxed text-muted-foreground/80">
                Themes are ordered by <span className="font-medium text-foreground">In Focus</span> —
                how much each is drawing attention now (earnings momentum, re-rating, community buzz).
                It is a measure of attention, not investment advice.
              </p>
            )}
          </div>
        </section>

        {blocks.length > 0 ? (
          <div className="mt-8 flex flex-col gap-8">
            {blocks.map((block) => (
              <ThemeCard key={block.slug} block={block} quarterLabel={quarterLabel} />
            ))}
          </div>
        ) : (
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            No hot themes featured this quarter. Check back after results season — or explore the{" "}
            <a href="/leaderboards" className="font-medium text-foreground underline underline-offset-2">
              full leaderboard
            </a>{" "}
            in the meantime.
          </p>
        )}
      </div>
      </FromSm>
    </main>
  );
}
