// Themes teaser (Desk section), in the "house" skin (not the atmospheric shell
// the /themes page itself wears). Counts only — no board build — so it never adds
// a full scoreboard assembly to the render. Renders the whole section or nothing:
// with no featured themes it returns null, leaving no empty shell.

import Link from "next/link";

import { getFeaturedThemeTeasers } from "@/lib/themes/data";

export async function HotThemesTeaser() {
  const themes = await getFeaturedThemeTeasers().catch(() => []);
  if (themes.length === 0) return null;

  return (
    <section aria-labelledby="themes-heading" className="house-block">
      <p className="house-data house-micro text-[var(--ink-soft)]">What&apos;s working now</p>
      <h2 id="themes-heading" className="house-display mt-2 text-2xl sm:text-3xl">
        Hot themes
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
        The themes moving this quarter — and which companies we cover are riding them, on the same
        four scores as the leaderboard.
      </p>

      <ul className="mt-6 flex flex-col">
        {themes.map((theme) => (
          <li
            key={theme.slug}
            className="flex items-baseline justify-between gap-4 border-t border-[var(--rule)] py-3"
          >
            <span className="house-display text-base text-[var(--ink)]">{theme.title}</span>
            <span className="house-data house-micro shrink-0 text-[var(--ink-soft)]">
              {theme.memberCount} {theme.memberCount === 1 ? "name" : "names"}
            </span>
          </li>
        ))}
      </ul>

      <Link href="/themes" prefetch={false} className="house-link mt-5 inline-block">
        Explore themes →
      </Link>
    </section>
  );
}
