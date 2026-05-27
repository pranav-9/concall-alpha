import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";

type WatchlistOption = {
  id: number;
  name: string;
};

type WatchlistButtonProps = {
  companyCode: string;
  loginRedirectPath: string;
  initialIsAuthenticated: boolean;
  initialWatchlists: WatchlistOption[];
  initialContainingIds: number[];
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

  let watchlists: WatchlistOption[] = [];
  let containingIds: number[] = [];

  if (authenticatedUserId) {
    const { data: watchlistRows } = await supabase
      .from("watchlists")
      .select("id, name")
      .eq("user_id", authenticatedUserId)
      .order("created_at", { ascending: true });

    watchlists = ((watchlistRows ?? []) as WatchlistOption[]).map((row) => ({
      id: row.id,
      name: row.name,
    }));

    if (watchlists.length > 0) {
      const watchlistIds = watchlists.map((row) => row.id);
      const { data: membershipRows } = await supabase
        .from("watchlist_items")
        .select("watchlist_id")
        .in("watchlist_id", watchlistIds)
        .eq("company_code", companyCode);

      const seen = new Set<number>();
      ((membershipRows ?? []) as Array<{ watchlist_id: number }>).forEach((row) => {
        seen.add(row.watchlist_id);
      });
      containingIds = Array.from(seen);
    }
  }

  return (
    <WatchlistSlotShell>
      <WatchlistButton
        companyCode={companyCode}
        loginRedirectPath={`/company/${companyCode}`}
        initialIsAuthenticated={Boolean(authenticatedUserId)}
        initialWatchlists={watchlists}
        initialContainingIds={containingIds}
      />
    </WatchlistSlotShell>
  );
}
