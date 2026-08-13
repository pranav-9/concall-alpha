import {
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  TABLE_CARD_SKY,
} from "@/lib/design/shell";

// Route-level loading state for /watchlists AND /watchlists/[id] (no nested
// loading.tsx below, so this one covers both). The index route is a redirect
// hop and the detail page joins the watchlist against the full covered
// universe (getConcallData + company + growth_outlook), so a click from the
// nav otherwise reads as dead. Shell mirrors the detail page — tab rail, hero
// card, board card — so the skeleton is replaced in place rather than jumping.
const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

export default function WatchlistsLoading() {
  return (
    <>
      {/* Tab rail stand-in (WatchlistTabs renders above <main> on the detail page). */}
      <nav className="flex items-center gap-2 border-b border-border/45 bg-background/70 px-2 backdrop-blur-sm">
        <div className="flex h-11 items-center gap-6 px-4">
          <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted/35" />
        </div>
      </nav>
      <main className="relative isolate overflow-hidden">
        <div className={PAGE_BACKGROUND_CLASS} />
        <div className={PAGE_SHELL}>
          <section className={HERO_CARD}>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="h-6 w-24 animate-pulse rounded-full bg-muted/40" />
                <div className="h-6 w-36 animate-pulse rounded-full bg-muted/30" />
              </div>
              <div className="h-9 w-52 max-w-full animate-pulse rounded-md bg-muted/50" />
            </div>
          </section>

          <div className="w-full space-y-3">
            {/* Band summary line stand-in. */}
            <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted/40" />

            {/* Watchlist board stand-in: header row, then a run of table rows. */}
            <div className={TABLE_CARD_SKY}>
              <div className="flex items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
                <div className="h-3 w-28 animate-pulse rounded bg-muted/50" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted/40" />
              </div>
              <div className="divide-y divide-border/25">
                {Array.from({ length: 8 }).map((_, i) => (
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
    </>
  );
}
