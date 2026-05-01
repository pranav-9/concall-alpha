import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";

type WatchlistButtonProps = {
  companyCode: string;
  loginRedirectPath: string;
  initialIsAuthenticated: boolean;
  initialHasWatchlist: boolean;
  initialIsInWatchlist: boolean;
  initialWatchlistName?: string | null;
};

const WatchlistButton = dynamic<WatchlistButtonProps>(
  () => import("@/components/watchlist-button").then((mod) => mod.WatchlistButton),
);

function WatchlistSlotShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="shrink-0 self-start rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm backdrop-blur-sm lg:ml-auto lg:pt-1">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Track this name
      </p>
      {children}
    </div>
  );
}

export function WatchlistSlotFallback() {
  return (
    <WatchlistSlotShell>
      <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
    </WatchlistSlotShell>
  );
}

export default async function CompanyWatchlistSlot({
  companyCode,
}: {
  companyCode: string;
}) {
  const supabase = await createClient();
  const { data: authClaimsData } = await supabase.auth.getClaims();
  const authenticatedUserId =
    typeof authClaimsData?.claims?.sub === "string"
      ? authClaimsData.claims.sub
      : null;

  let firstWatchlist: { id: number; name: string } | null = null;
  let isInFirstWatchlist = false;

  if (authenticatedUserId) {
    const { data: watchlistRows } = await supabase
      .from("watchlists")
      .select("id, name")
      .eq("user_id", authenticatedUserId)
      .order("created_at", { ascending: true })
      .limit(1);

    firstWatchlist =
      (watchlistRows?.[0] as { id: number; name: string } | undefined) ?? null;

    if (firstWatchlist) {
      const { data: watchlistItemRows } = await supabase
        .from("watchlist_items")
        .select("id")
        .eq("watchlist_id", firstWatchlist.id)
        .eq("company_code", companyCode)
        .limit(1);
      isInFirstWatchlist = (watchlistItemRows?.length ?? 0) > 0;
    }
  }

  return (
    <WatchlistSlotShell>
      <WatchlistButton
        companyCode={companyCode}
        loginRedirectPath={`/company/${companyCode}`}
        initialIsAuthenticated={Boolean(authenticatedUserId)}
        initialHasWatchlist={Boolean(firstWatchlist)}
        initialIsInWatchlist={isInFirstWatchlist}
        initialWatchlistName={firstWatchlist?.name ?? null}
      />
    </WatchlistSlotShell>
  );
}
