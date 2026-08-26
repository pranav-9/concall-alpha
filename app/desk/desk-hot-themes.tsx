// Desk "Hot themes" — featured lead + ranked rail (mockup 2b). Mirrors the
// /themes editorial structure: the hottest theme (highest average Read of its
// covered names) gets real estate — a why-now line and its top names with reads
// — while the rest sit as a compact ranked strip below. Counts + averages only;
// the full member boards live on /themes. Reads the same live board as /themes,
// so a name's Read is identical on both. Renders the whole section or nothing.

import Link from "next/link";

import { BANDS, bandForScore } from "@/lib/score-band";
import { getFeaturedThemeBlocks } from "@/lib/themes/data";
import type { ThemeBlock, ThemeMember } from "@/lib/themes/types";
import { cn } from "@/lib/utils";

// On-brand keyboard-focus ring for the whole-row links (house skin has none by
// default). Inset teal, matching the recency ledger.
const ROW_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";

type ScoredTheme = ThemeBlock & {
  /** Mean Read of the theme's scored, discovery-listed members; null if none. */
  avgRead: number | null;
  /** Top members by Read (already sorted in assemble), scored + not below cut. */
  leaders: ThemeMember[];
};

function scoreThemes(blocks: ThemeBlock[]): ScoredTheme[] {
  return blocks
    .map((block) => {
      const scored = block.members.filter((m) => !m.belowCut && m.readScore != null);
      const avgRead =
        scored.length > 0
          ? scored.reduce((sum, m) => sum + (m.readScore ?? 0), 0) / scored.length
          : null;
      return { ...block, avgRead, leaders: scored.slice(0, 3) };
    })
    .sort((a, b) => (b.avgRead ?? -1) - (a.avgRead ?? -1));
}

/** Small band-coloured dot — the same colour a company's score circle carries. */
function ReadDot({ read }: { read: number }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: BANDS[bandForScore(read)].chartHex }}
    />
  );
}

function ReadValue({ read }: { read: number }) {
  const band = BANDS[bandForScore(read)];
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="house-data text-sm font-bold tabular-nums text-[var(--ink)]">
        {read.toFixed(1)}
      </span>
      <span className={`house-data house-micro ${band.textClass}`}>{band.label}</span>
    </span>
  );
}

function FeaturedTheme({ theme }: { theme: ScoredTheme }) {
  return (
    <div className="rounded-lg border border-[var(--rule)] border-l-2 border-l-[var(--signal)] bg-[var(--paper-2)] p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          <p className="house-data house-micro text-[var(--signal)]">#1 hottest · this quarter</p>
          <h3 className="house-display mt-2 text-xl sm:text-2xl">
            <Link
              href="/themes"
              prefetch={false}
              className={cn("rounded-sm transition-colors hover:text-[var(--signal)]", ROW_FOCUS)}
            >
              {theme.title}
            </Link>
          </h3>
          {theme.blurb && (
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-[var(--ink-soft)]">{theme.blurb}</p>
          )}
          {theme.avgRead != null && (
            <p className="house-data mt-4 flex flex-wrap items-baseline gap-x-2 text-xs text-[var(--ink-soft)]">
              <span className="house-micro">Avg read</span>
              <ReadValue read={theme.avgRead} />
              <span aria-hidden>·</span>
              <span>
                {theme.memberCount} covered name{theme.memberCount === 1 ? "" : "s"}
              </span>
            </p>
          )}
        </div>

        {theme.leaders.length > 0 && (
          <div className="lg:border-l lg:border-[var(--rule)] lg:pl-6">
            <p className="house-data house-micro mb-3 text-[var(--ink-soft)]">Leading the theme</p>
            <ul>
              {theme.leaders.map((m) => (
                <li key={m.companyCode}>
                  <Link
                    href={`/company/${m.companyCode}`}
                    prefetch={false}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-3 border-b border-[var(--rule)] py-2 transition-colors last:border-b-0 hover:text-[var(--signal)] sm:min-h-0",
                      ROW_FOCUS,
                    )}
                  >
                    <span className="house-display min-w-0 truncate text-sm text-[var(--ink)]">
                      {m.companyName}
                    </span>
                    {m.readScore != null && (
                      <span className="flex shrink-0 items-center gap-1.5">
                        <ReadDot read={m.readScore} />
                        <span className="house-data text-sm font-bold tabular-nums text-[var(--ink)]">
                          {m.readScore.toFixed(1)}
                        </span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Match-final-state fallback: mirrors the populated section's house-block header
// + featured block + a few ranked rows, so the space is reserved during stream-in
// and the settled layout doesn't jump. On the rare empty case the section renders
// null (below) — an accepted, infrequent collapse rather than the every-load
// shift a fallback={null} produced.
export function DeskHotThemesFallback() {
  return (
    <section aria-hidden className="house-block">
      <div className="h-3 w-28 animate-pulse rounded bg-[var(--rule)]" />
      <div className="mt-2 h-8 w-40 animate-pulse rounded bg-[var(--rule)]" />
      <div className="mt-6 h-28 w-full animate-pulse rounded bg-[var(--rule)]" />
      <div className="mt-2 space-y-px">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-full animate-pulse rounded bg-[var(--rule)]" />
        ))}
      </div>
      <div className="mt-5 h-4 w-32 animate-pulse rounded bg-[var(--rule)]" />
    </section>
  );
}

export async function DeskHotThemes() {
  const blocks = await getFeaturedThemeBlocks().catch(() => []);
  if (blocks.length === 0) return null;

  const themes = scoreThemes(blocks);
  const [featured, ...rest] = themes;

  return (
    <section aria-labelledby="desk-themes" className="house-block">
      <p className="house-data house-micro text-[var(--ink-soft)]">What&apos;s working now</p>
      <h2 id="desk-themes" className="house-display mt-2 text-2xl sm:text-3xl">
        Hot themes
      </h2>

      <div className="mt-6">
        <FeaturedTheme theme={featured} />
      </div>

      {rest.length > 0 && (
        <ul className="mt-2">
          {rest.map((theme, i) => {
            const metrics = (
              <>
                {theme.avgRead != null ? (
                  <ReadValue read={theme.avgRead} />
                ) : (
                  <span className="house-data house-micro text-[var(--ink-soft)]">not yet scored</span>
                )}
                <span className="house-data house-micro w-16 text-right text-[var(--ink-soft)]">
                  {theme.memberCount} name{theme.memberCount === 1 ? "" : "s"}
                </span>
              </>
            );
            return (
              <li key={theme.slug}>
                <Link
                  href="/themes"
                  prefetch={false}
                  className={cn(
                    "block min-h-11 border-b border-[var(--rule)] py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--signal)_7%,transparent)] sm:min-h-0",
                    ROW_FOCUS,
                  )}
                >
                  {/* Desktop: rank · title · metrics on one line. */}
                  <div className="hidden items-baseline gap-4 sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_auto]">
                    <span className="house-data house-micro text-[var(--ink-soft)]">{i + 2}</span>
                    <span className="house-display min-w-0 truncate text-base text-[var(--ink)]">
                      {theme.title}
                    </span>
                    <span className="flex items-baseline gap-4 justify-self-end">{metrics}</span>
                  </div>

                  {/* Mobile: rank + title on line one, metrics on line two. */}
                  <div className="sm:hidden">
                    <div className="flex items-baseline gap-3">
                      <span className="house-data house-micro shrink-0 text-[var(--ink-soft)]">
                        {i + 2}
                      </span>
                      <span className="house-display min-w-0 flex-1 truncate text-base text-[var(--ink)]">
                        {theme.title}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-4 pl-[2rem]">{metrics}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/themes" prefetch={false} className="house-link mt-5 inline-block">
        Explore all themes →
      </Link>
    </section>
  );
}
