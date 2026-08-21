import {
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  TABLE_CARD_SKY,
} from "@/lib/design/shell";

// Route-level loading state. The Overall board fans out to two Supabase queries
// (getConcallData + fetchLeaderboardData) plus a full board-read pass, so the
// server render is the slowest on the site — long enough for a click from the
// nav to read as dead. Shell (background height, PAGE_SHELL column, hero card,
// tab strip, table card) mirrors page.tsx exactly so the skeleton is replaced in
// place rather than jumping.
const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

export default function LeaderboardsLoading() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <div className="space-y-2">
            {/* Title + subtitle stand-ins matching the "Leaderboards" heading. */}
            <div className="h-9 w-52 max-w-full animate-pulse rounded-md bg-muted/50" />
            <div className="h-4 w-full max-w-3xl animate-pulse rounded-md bg-muted/40" />
          </div>
        </section>

        <div className="w-full space-y-4">
          {/* Tab strip stand-in: four pills in the rounded rail. */}
          <div className="inline-flex w-fit gap-1 rounded-full border border-sky-200/35 bg-background/80 p-1 dark:border-sky-700/20">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-9 w-20 animate-pulse rounded-full bg-muted/40"
              />
            ))}
          </div>

          {/* Band summary line stand-in. */}
          <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted/40" />

          {/* Table card stand-in: header row, then a run of table rows. The
              min-h floor matters: the real Overall board is 100+ rows, so a
              short skeleton put the footer on screen and the streamed page
              then shoved it down — a 0.08 CLS on its own (Lighthouse, desktop).
              Pinning the card to at least a viewport keeps the footer below the
              fold in both frames for the Overall board (the default tab), and
              an element off-screen in both frames doesn't score. Plain vh on
              purpose: a taller floor is harmless, and it holds on browsers
              without svh. */}
          <div className={`${TABLE_CARD_SKY} min-h-screen`}>
            <div className="flex items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
              <div className="h-3 w-28 animate-pulse rounded bg-muted/50" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted/40" />
            </div>
            <div className="divide-y divide-border/25">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-3 w-6 shrink-0 animate-pulse rounded bg-muted/30" />
                  <div className="h-4 w-40 max-w-[40%] animate-pulse rounded bg-muted/45" />
                  <div className="ml-auto flex items-center gap-4">
                    <div className="h-4 w-10 animate-pulse rounded bg-muted/35" />
                    <div className="h-4 w-10 animate-pulse rounded bg-muted/35" />
                    <div className="h-4 w-10 animate-pulse rounded bg-muted/35" />
                    <div className="h-4 w-12 animate-pulse rounded bg-muted/40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
