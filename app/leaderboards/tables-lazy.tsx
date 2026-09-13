"use client";

import dynamic from "next/dynamic";
import type { CompanyRow } from "@/app/company/leaderboard-table";
import type { ScoreBoardRow } from "@/components/score-board-table";
import type { GrowthRowTable } from "./growth-table";
import type { MoatRowTable } from "./moat-table";
import type {
  PhoneGrowthBoard as PhoneGrowthBoardImpl,
  PhoneMoatBoard as PhoneMoatBoardImpl,
  PhoneOverallBoard as PhoneOverallBoardImpl,
  PhoneQuarterBoard as PhoneQuarterBoardImpl,
} from "./phone-boards";

// SSR stays ON. These were `ssr: false` (commit eaaac82 "speed"), which left a
// five-row skeleton on the server HTML and let a 100+-row table pop in on the
// client — the footer jumped by thousands of pixels and Speed Insights put
// /leaderboards CLS at 0.27 (field) / 0.288 (lab). The tables only touch
// `window` inside event handlers, so rendering them on the server is safe; the
// dynamic() wrapper still code-splits each tab, which was the point of the
// original change. The skeleton now only shows during client-side tab swaps.
//
// Rows only, no card. Every caller already sits inside its own shell — the
// Overall tab wraps in TABLE_CARD_SKY (app/leaderboards/page.tsx), the Moat
// table wraps itself — so a carded skeleton nested a card inside a card on
// load, and hand-rolled the TABLE_CARD_SKY recipe to do it.
function TableSkeleton() {
  return (
    <div className="p-6">
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
    loading: () => <TableSkeleton />,
  },
);

export const GrowthTable = dynamic<{ data: GrowthRowTable[] }>(
  () => import("./growth-table").then((mod) => mod.GrowthTable),
  {
    loading: () => <TableSkeleton />,
  },
);

export const MoatTable = dynamic<{ data: MoatRowTable[] }>(
  () => import("./moat-table").then((mod) => mod.MoatTable),
  {
    loading: () => <TableSkeleton />,
  },
);

// The "Overall" tab: four score columns (Quarter / Growth / Valuation / Read)
// over the whole mid/small universe, below-cut names included as a greyed tail.
// The same board renders a watchlist (with a Remove column and nothing greyed) —
// see components/score-board-table.tsx.
export const OverallTable = dynamic<{
  rows: ScoreBoardRow[];
  priorRankByCode?: Record<string, number>;
  coverageCutRank?: number;
}>(
  () => import("@/components/score-board-table").then((mod) => mod.ScoreBoardTable),
  {
    loading: () => <TableSkeleton />,
  },
);

// The phone paints (app/leaderboards/phone-boards.tsx), split the same way so a
// desktop visitor — whose BelowSm tree unmounts right after hydration — never
// downloads them. SSR stays on (same reasoning as above); they use no `useId`.
// One card-shaped skeleton: the phone card is `mx-4`, so the stand-in is too.
function PhoneBoardSkeleton() {
  return (
    <div className="mx-4 mt-3 space-y-px overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] p-3.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-[58px] animate-pulse rounded-md bg-[var(--paper)]" />
      ))}
    </div>
  );
}

export const PhoneOverallBoard = dynamic<React.ComponentProps<typeof PhoneOverallBoardImpl>>(
  () => import("./phone-boards").then((mod) => mod.PhoneOverallBoard),
  { loading: () => <PhoneBoardSkeleton /> },
);
export const PhoneQuarterBoard = dynamic<React.ComponentProps<typeof PhoneQuarterBoardImpl>>(
  () => import("./phone-boards").then((mod) => mod.PhoneQuarterBoard),
  { loading: () => <PhoneBoardSkeleton /> },
);
export const PhoneGrowthBoard = dynamic<React.ComponentProps<typeof PhoneGrowthBoardImpl>>(
  () => import("./phone-boards").then((mod) => mod.PhoneGrowthBoard),
  { loading: () => <PhoneBoardSkeleton /> },
);
export const PhoneMoatBoard = dynamic<React.ComponentProps<typeof PhoneMoatBoardImpl>>(
  () => import("./phone-boards").then((mod) => mod.PhoneMoatBoard),
  { loading: () => <PhoneBoardSkeleton /> },
);
