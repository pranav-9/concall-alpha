// /themes/[slug] — one Hot Theme in full: the story card (driving factor + KPI
// tiles) on top, then the scored member board that used to live on the index
// (Quarter / Growth / Valuation / Read, ranked, best-read tagged). Built from
// the same featured set as /themes, so index, ranking and best-read agree; a
// slug that is not a featured theme with members 404s. Renders per request.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { currentReportingQuarter } from "@/lib/current-quarter";
import { PAGE_BACKGROUND_ATMOSPHERIC, PAGE_SHELL } from "@/lib/design/shell";
import { getFeaturedThemeBlock } from "@/lib/themes/data";
import { BelowSm, FromSm } from "@/components/viewport-gate";

import { ThemeBlockView } from "../theme-block";
import { ThemeBlockPhone } from "../theme-block-phone";
import { ThemeCard } from "../theme-card";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const block = await getFeaturedThemeBlock(slug);
  if (!block) return { title: "Hot Themes – Story of a Stock" };
  return {
    title: `${block.title} – Hot Themes – Story of a Stock`,
    description: block.blurb ?? `Which covered companies are riding ${block.title}, on the leaderboard's four scores.`,
    alternates: { canonical: `/themes/${block.slug}` },
  };
}

const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

export default async function ThemePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const block = await getFeaturedThemeBlock(slug);
  if (!block) notFound();
  const quarterLabel = currentReportingQuarter().label;

  return (
    <main className="relative isolate overflow-hidden">
      {/* Phone: the theme card already carries title, blurb and In Focus, so no
          masthead above it (it would print them twice) — just the way back. */}
      <BelowSm className="house min-h-screen pb-6">
        <p className="house-data mx-4 pt-4 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          <Link href="/themes" className="house-link">
            ← Hot themes
          </Link>
        </p>
        <ThemeBlockPhone block={block} quarterLabel={quarterLabel} />
      </BelowSm>
      <FromSm>
        <div className={PAGE_BACKGROUND_CLASS} />
        <div className={PAGE_SHELL}>
          {/* The story card is the page's hero: the title inside it is the h1 for
              the route (ThemeCard renders an h2 for the index grid; a visually
              identical standalone card is fine for the one-theme page). */}
          <p className="pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Link href="/themes" prefetch={false} className="hover:text-foreground">
              ← Hot Themes
            </Link>
          </p>
          <div className="mt-4">
            <ThemeCard block={block} quarterLabel={quarterLabel} standalone />
          </div>
          <div className="mt-10">
            <ThemeBlockView block={block} quarterLabel={quarterLabel} headless />
          </div>
        </div>
      </FromSm>
    </main>
  );
}
