import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WatchlistCreateButton } from "@/components/watchlist-create-button";
import { createClient } from "@/lib/supabase/server";
import {
  CHIP_BASE,
  CHIP_NEUTRAL,
  CHIP_PRIMARY,
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_SKY,
} from "@/lib/design/shell";

type WatchlistRow = {
  id: number;
  name: string;
  created_at: string | null;
  updated_at: string | null;
  watchlist_items: Array<{ count: number }> | { count: number } | null;
};

export const metadata: Metadata = {
  title: "Watchlists – Story of a Stock",
  description: "All of your watchlists in one place.",
};

const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;
const PAGE_SHELL_CLASS = PAGE_SHELL;
const HERO_CARD_CLASS = HERO_CARD;
const PANEL_CARD_CLASS = PANEL_CARD_SKY;
const CHIP_CLASS = CHIP_BASE;
const CHIP_PRIMARY_CLASS = CHIP_PRIMARY;
const CHIP_NEUTRAL_CLASS = CHIP_NEUTRAL;

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
      <div className={PAGE_SHELL_CLASS}>
        <section className={HERO_CARD_CLASS}>
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

function itemCountFor(row: WatchlistRow): number {
  if (!row.watchlist_items) return 0;
  if (Array.isArray(row.watchlist_items)) {
    return row.watchlist_items[0]?.count ?? 0;
  }
  return row.watchlist_items.count ?? 0;
}

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
    .select("id, name, created_at, updated_at, watchlist_items(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (watchlistError) {
    return (
      <WatchlistShell
        title="Watchlists"
        description="Unable to load your watchlists right now."
        chips={<span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Watchlists</span>}
      >
        <div className={PANEL_CARD_CLASS}>
          <p className="text-sm text-muted-foreground">
            Please refresh the page or try again in a moment.
          </p>
        </div>
      </WatchlistShell>
    );
  }

  const rows = (watchlistRows ?? []) as WatchlistRow[];

  if (rows.length === 0) {
    return (
      <WatchlistShell
        title="Your watchlists"
        description="You haven't created a watchlist yet."
        chips={<span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Private lists</span>}
        actions={<WatchlistCreateButton />}
      >
        <div className={PANEL_CARD_CLASS + " space-y-4"}>
          <p className="text-sm text-muted-foreground">
            Create a watchlist to start saving companies and tracking blended scores. You can
            create as many as you like — one per theme, sector, or conviction level.
          </p>
        </div>
      </WatchlistShell>
    );
  }

  const totalCompanies = rows.reduce((sum, row) => sum + itemCountFor(row), 0);

  return (
    <WatchlistShell
      title="Your watchlists"
      description={`${rows.length} ${rows.length === 1 ? "list" : "lists"} · ${totalCompanies} ${
        totalCompanies === 1 ? "company" : "companies"
      } tracked`}
      chips={
        <>
          <span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Private lists</span>
          <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>{rows.length} lists</span>
        </>
      }
      actions={<WatchlistCreateButton />}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const count = itemCountFor(row);
          return (
            <Link
              key={row.id}
              href={`/watchlists/${row.id}`}
              prefetch={false}
              className={`${PANEL_CARD_CLASS} group block transition-colors hover:border-sky-300/70 hover:bg-sky-50/40 dark:hover:bg-sky-950/15`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Watchlist
              </p>
              <p className="mt-2 text-lg font-bold leading-tight text-foreground group-hover:underline">
                {row.name}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {count} {count === 1 ? "company" : "companies"}
              </p>
            </Link>
          );
        })}
      </div>
    </WatchlistShell>
  );
}
