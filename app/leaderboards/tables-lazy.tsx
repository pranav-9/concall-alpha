"use client";

import dynamic from "next/dynamic";
import type { CompanyRow } from "@/app/company/leaderboard-table";
import type { WatchlistTableRow } from "@/app/watchlists/watchlist-table";
import type { GrowthRowTable } from "./growth-table";
import type { MoatRowTable } from "./moat-table";

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.45rem] border border-sky-200/25 bg-background/40 p-6">
      <div className="space-y-2">
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/40" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/30" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/30" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/30" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/30" />
      </div>
    </div>
  );
}

export const LeaderboardTable = dynamic<{
  quarterLabels: string[];
  data: CompanyRow[];
}>(
  () =>
    import("@/app/company/leaderboard-table").then((mod) => mod.LeaderboardTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
);

export const GrowthTable = dynamic<{ data: GrowthRowTable[] }>(
  () => import("./growth-table").then((mod) => mod.GrowthTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
);

export const MoatTable = dynamic<{ data: MoatRowTable[] }>(
  () => import("./moat-table").then((mod) => mod.MoatTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
);

// The "Overall" tab reuses the watchlist's multi-signal table (Band / Qtr /
// Trend / Forward / Moat / Read) over the whole universe — no watchlistId, so
// it renders in leaderboard mode (no per-row Remove).
export const OverallTable = dynamic<{ rows: WatchlistTableRow[] }>(
  () => import("@/app/watchlists/watchlist-table").then((mod) => mod.WatchlistTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
);
