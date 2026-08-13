import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WatchlistCreateButton } from "@/components/watchlist-create-button";
import { createClient } from "@/lib/supabase/server";
import {
  CHIP_BASE,
  CHIP_PRIMARY,
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_SKY,
} from "@/lib/design/shell";

export const metadata: Metadata = {
  title: "Watchlists – Story of a Stock",
  description: "All of your watchlists in one place.",
};

const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

function WatchlistShell({
  title,
  description,
  chips,
  actions,
  children,
}: {
  title: string;
  description: string;
  chips?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              {chips ? <div className="flex flex-wrap items-center gap-2">{chips}</div> : null}
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description}
              </p>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}

// This route is a router, not a destination: the detail page carries a tab bar
// across all of the user's watchlists, so an index of cards was a dead click.
// With at least one list we go straight to the leftmost tab; only the zero-list
// and error states still render here.
export default async function WatchlistsPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId =
    !claimsError && typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  if (!userId) {
    redirect("/auth/login?next=/watchlists");
  }

  const { data: watchlistRows, error: watchlistError } = await supabase
    .from("watchlists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (watchlistError) {
    return (
      <WatchlistShell
        title="Watchlists"
        description="Unable to load your watchlists right now."
        chips={<span className={`${CHIP_BASE} ${CHIP_PRIMARY}`}>Watchlists</span>}
      >
        <div className={PANEL_CARD_SKY}>
          <p className="text-sm text-muted-foreground">
            Please refresh the page or try again in a moment.
          </p>
        </div>
      </WatchlistShell>
    );
  }

  const firstWatchlist = watchlistRows?.[0] as { id: number } | undefined;

  if (firstWatchlist) {
    redirect(`/watchlists/${firstWatchlist.id}`);
  }

  return (
    <WatchlistShell
      title="Your watchlists"
      description="You haven't created a watchlist yet."
      chips={<span className={`${CHIP_BASE} ${CHIP_PRIMARY}`}>Private lists</span>}
      actions={<WatchlistCreateButton />}
    >
      <div className={PANEL_CARD_SKY + " space-y-4"}>
        <p className="text-sm text-muted-foreground">
          Create a watchlist to start saving companies and tracking blended scores. You can
          create as many as you like — one per theme, sector, or conviction level.
        </p>
      </div>
    </WatchlistShell>
  );
}
