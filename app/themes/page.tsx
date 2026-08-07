// /themes — Hot Themes. An editorial discovery door: 2-3 hand-picked, positively
// framed themes, each a compact ranked board of the covered companies riding it,
// on the same four scores as /leaderboards. Atmospheric surface family (matches
// /sectors and /leaderboards). If no themes are featured, the route renders nothing
// but the header — never an empty shell.

import type { Metadata } from "next";

import { HERO_CARD, PAGE_BACKGROUND_ATMOSPHERIC, PAGE_SHELL } from "@/lib/design/shell";
import { getFeaturedThemeBlocks } from "@/lib/themes/data";
import { ThemeBlockView } from "./theme-block";

export const metadata: Metadata = {
  title: "Hot Themes – Story of a Stock",
  description:
    "What's working this quarter, and which of the companies we cover are riding it — on the same four scores as the leaderboard.",
  alternates: { canonical: "/themes" },
};

const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

export default async function ThemesPage() {
  const blocks = await getFeaturedThemeBlocks();

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
              Hot Themes
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              What&apos;s working this quarter, and which of the companies we cover are riding it.
              Each name carries the same four scores as the leaderboard — Quarter, Growth, Valuation,
              and our overall Read. Ranked by Read; rank 1 is the strongest overall pick in the theme.
            </p>
          </div>
        </section>

        {blocks.length > 0 && (
          <div className="mt-8 flex flex-col gap-10">
            {blocks.map((block) => (
              <ThemeBlockView key={block.slug} block={block} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
